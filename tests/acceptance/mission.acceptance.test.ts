import { describe, expect, it } from "vitest";
import { components, launchers } from "../../src/data/catalog";
import { runMission } from "../../src/engine/game";
import { computeOrbitProfile } from "../../src/engine/orbit";
import { evaluateDesign } from "../../src/engine/resources";
import type { MissionConfig, MissionResult } from "../../src/types/contracts";

const surveyMission: MissionConfig = {
  altitudeKm: 450,
  durationOrbits: 6,
  selectedComponentIds: ["camera-basic", "solar-basic", "battery-basic", "radio-basic"],
  launcherId: "rideshare",
};
const highLoadMission: MissionConfig = {
  ...surveyMission,
  selectedComponentIds: ["camera-hd", "solar-basic", "battery-basic", "radio-basic"],
  launcherId: "dedicated",
};
const upgradedMission: MissionConfig = {
  ...highLoadMission,
  selectedComponentIds: ["camera-hd", "solar-advanced", "battery-basic", "radio-basic"],
};
const fullyUpgraded = ["camera-hd", "solar-advanced", "battery-advanced", "radio-advanced"];
const demonstrationSeed = 2026;

function expectResourceBounds(result: MissionResult) {
  expect(result.batteryHistoryWh.length).toBeGreaterThan(0);
  expect(result.batteryHistoryWh).toHaveLength(result.dataHistoryMB.length);
  for (const energyWh of result.batteryHistoryWh) {
    expect(energyWh).toBeGreaterThanOrEqual(0);
    expect(energyWh).toBeLessThanOrEqual(result.design.batteryCapacityWh);
  }
  for (const storedMB of result.dataHistoryMB) {
    expect(Number.isFinite(storedMB)).toBe(true);
    expect(storedMB).toBeGreaterThanOrEqual(0);
  }
  expect(result.transmittedMB).toBeGreaterThanOrEqual(0);
  expect(result.transmittedMB).toBeLessThanOrEqual(result.producedMB);
  // The engine rounds stored-data samples to 0.01 MB.
  expect(result.dataHistoryMB.at(-1)).toBeCloseTo(result.producedMB - result.transmittedMB, 2);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
}

describe("independent science and mission acceptance", () => {
  it.each([
    { altitudeKm: 450, radiusKm: 6821, periodSeconds: 5606.3868, speedKmPerSecond: 7.644426, eclipseFraction: 0.383731 },
    { altitudeKm: 550, radiusKm: 6921, periodSeconds: 5730.1271, speedKmPerSecond: 7.588998, eclipseFraction: 0.372244 },
  ])("matches the circular beta-zero reference at $altitudeKm km", (reference) => {
    const profile = computeOrbitProfile({ altitudeKm: reference.altitudeKm });
    expect(profile.orbitalRadiusKm).toBe(reference.radiusKm);
    // Independent fixtures from the NASA/JPL GM and mean radius in docs/PHYSICS_ASSUMPTIONS.md.
    expect(Math.abs(profile.periodSeconds - reference.periodSeconds)).toBeLessThan(0.01);
    expect(Math.abs(profile.speedKmPerSecond - reference.speedKmPerSecond)).toBeLessThan(0.00001);
    expect(Math.abs(profile.eclipseFraction - reference.eclipseFraction)).toBeLessThan(0.00001);
    expect(profile.sunlightFraction + profile.eclipseFraction).toBeCloseTo(1, 10);
  });

  it("labels every current hardware and launcher entry as synthetic", () => {
    for (const component of components) {
      expect(component.isSynthetic, component.id).toBe(true);
    }
    for (const launcher of launchers) {
      expect(launcher.isSynthetic, launcher.id).toBe(true);
    }
  });

  it("adds the bus, hardware and launcher exactly once", () => {
    const assessment = evaluateDesign(surveyMission);
    expect(assessment).toMatchObject({
      totalMassKg: 20,
      totalCostCredits: 595,
      nominalPowerW: 28,
      solarGenerationW: 60,
      batteryCapacityWh: 110,
      massLimitKg: 28,
      budgetLimitCredits: 1400,
      violations: [],
    });
  });

  it.each([
    { launcherId: "rideshare", costCredits: 1280, massLimitKg: 28, violated: /mass/i },
    { launcherId: "dedicated", costCredits: 1460, massLimitKg: 55, violated: /budget/i },
  ])("blocks a design that exceeds only the $violated constraint", (fixture) => {
    const mission = { ...surveyMission, launcherId: fixture.launcherId, selectedComponentIds: fullyUpgraded };
    const assessment = evaluateDesign(mission);
    expect(assessment.totalMassKg).toBe(38);
    expect(assessment.massLimitKg).toBe(fixture.massLimitKg);
    expect(assessment.totalCostCredits).toBe(fixture.costCredits);
    expect(assessment.violations).toHaveLength(1);
    expect(assessment.violations[0]).toMatch(fixture.violated);
    expect(runMission(mission, demonstrationSeed)).toMatchObject({
      success: false,
      score: 0,
      producedMB: 0,
      transmittedMB: 0,
      batteryHistoryWh: [],
      dataHistoryMB: [],
    });
  });

  it("replays the survey with bounded resources and preserves the player's configuration", () => {
    const mission = structuredClone(surveyMission);
    const result = runMission(mission, demonstrationSeed);
    expect(result.success).toBe(true);
    expect(result.energyOutageCount).toBe(0);
    expect(result.transmittedMB).toBeGreaterThanOrEqual(250);
    expectResourceBounds(result);
    expect(runMission(structuredClone(surveyMission), demonstrationSeed)).toEqual(result);
    expect(mission).toEqual(surveyMission);
  });

  it("converts 3 W of net discharge over 60 seconds into 0.05 Wh", () => {
    const result = runMission(highLoadMission, demonstrationSeed);
    expect(result.design.nominalPowerW).toBe(63);
    expect(result.design.solarGenerationW).toBe(60);
    // Initial battery is 110 Wh. The first minute is illuminated at beta zero.
    expect(result.batteryHistoryWh[0]).toBe(109.95);
  });

  it("can recover an energy-limited mission by changing only the solar array", () => {
    const deficit = runMission(highLoadMission, demonstrationSeed);
    const recovered = runMission(upgradedMission, demonstrationSeed);
    expect(deficit.design.violations).toEqual([]);
    expect(recovered.design.violations).toEqual([]);
    expect(deficit.design.nominalPowerW).toBe(recovered.design.nominalPowerW);
    expect(deficit.design.batteryCapacityWh).toBe(recovered.design.batteryCapacityWh);
    expectResourceBounds(deficit);
    expectResourceBounds(recovered);
    expect(deficit.success).toBe(false);
    expect(deficit.energyOutageCount).toBeGreaterThan(0);
    expect(recovered.success).toBe(true);
    expect(recovered.energyOutageCount).toBe(0);
    expect(recovered.transmittedMB).toBeGreaterThan(deficit.transmittedMB);
  });
});
