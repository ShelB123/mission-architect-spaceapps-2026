import { describe, expect, it } from "vitest";
import { components, defaultMission, launchers } from "../src/data/catalog";
import { evaluateDesign, getSelectedComponents } from "../src/engine/resources";
import { computeOrbitProfile } from "../src/engine/orbit";
import { runMission } from "../src/engine/game";

describe("engineering review", () => {
  it("evaluates default craft within limits", () => {
    const x = evaluateDesign(defaultMission);
    expect(x.violations).toEqual([]);
    expect(x.totalMassKg).toBeLessThanOrEqual(x.massLimitKg);
  });
  it("detects overweight design", () => {
    const x = evaluateDesign({ ...defaultMission, selectedComponentIds: ["camera-hd", "solar-advanced", "battery-advanced", "radio-advanced"] });
    expect(x.violations.some((m) => m.includes("mass"))).toBe(true);
  });
  it("rejects missing category", () => {
    const x = evaluateDesign({ ...defaultMission, selectedComponentIds: ["camera-basic", "solar-basic", "battery-basic"] });
    expect(x.violations.some((m) => m.includes("communications"))).toBe(true);
  });
  it("detects invalid mission duration", () => {
    expect(evaluateDesign({ ...defaultMission, durationOrbits: 0 }).violations.length).toBeGreaterThan(0);
  });
});

/**
 * Resource-system acceptance tests. All fixture values are synthetic
 * gameplay parameters, NOT NASA or vendor hardware specifications.
 */
describe("spacecraft resource accounting", () => {
  const replaceComponent = (oldId: string, newId: string) => ({
    ...defaultMission,
    selectedComponentIds: defaultMission.selectedComponentIds.map((id) => id === oldId ? newId : id),
  });

  it("uses the synthetic bus and selected components once, in kg, W, Wh and credits", () => {
    const design = evaluateDesign(defaultMission);
    expect(design.totalMassKg).toBe(20);
    expect(design.totalCostCredits).toBe(595);
    expect(design.nominalPowerW).toBe(28);
    expect(design.solarGenerationW).toBe(60);
    expect(design.batteryCapacityWh).toBe(110);
    expect(design.massLimitKg).toBe(28);
    expect(design.budgetLimitCredits).toBe(1400);
    expect(design.violations).toEqual([]);
    expect(design.warnings).toEqual([]);
  });

  it("updates mass, price and load when upgrading a payload", () => {
    const base = evaluateDesign(defaultMission);
    const updated = evaluateDesign(replaceComponent("camera-basic", "camera-hd"));
    expect(updated.totalMassKg - base.totalMassKg).toBe(9);
    expect(updated.totalCostCredits - base.totalCostCredits).toBe(300);
    expect(updated.nominalPowerW - base.nominalPowerW).toBe(35);
    expect(updated.solarGenerationW).toBe(base.solarGenerationW);
  });

  it("increases daylight production without silently changing electrical load for a solar upgrade", () => {
    const base = evaluateDesign(defaultMission);
    const updated = evaluateDesign(replaceComponent("solar-basic", "solar-advanced"));
    expect(updated.totalMassKg - base.totalMassKg).toBe(3);
    expect(updated.totalCostCredits - base.totalCostCredits).toBe(140);
    expect(updated.solarGenerationW - base.solarGenerationW).toBe(90);
    expect(updated.nominalPowerW).toBe(base.nominalPowerW);
  });

  it("accounts for a larger battery in Wh rather than W", () => {
    const base = evaluateDesign(defaultMission);
    const updated = evaluateDesign(replaceComponent("battery-basic", "battery-advanced"));
    expect(updated.totalMassKg - base.totalMassKg).toBe(4);
    expect(updated.totalCostCredits - base.totalCostCredits).toBe(115);
    expect(updated.batteryCapacityWh - base.batteryCapacityWh).toBe(270);
    expect(updated.nominalPowerW).toBe(base.nominalPowerW);
  });

  it("counts the radio power penalty while leaving solar generation and battery reserve unchanged", () => {
    const base = evaluateDesign(defaultMission);
    const updated = evaluateDesign(replaceComponent("radio-basic", "radio-advanced"));
    expect(updated.totalMassKg - base.totalMassKg).toBe(2);
    expect(updated.totalCostCredits - base.totalCostCredits).toBe(130);
    expect(updated.nominalPowerW - base.nominalPowerW).toBe(9);
    expect(updated.solarGenerationW).toBe(base.solarGenerationW);
    expect(updated.batteryCapacityWh).toBe(base.batteryCapacityWh);
  });

  it("computes full-eclipse demand using orbital duration and Wh conversion", () => {
    const orbit = computeOrbitProfile(defaultMission);
    const expectedDemandWh = 28 * orbit.periodSeconds * orbit.eclipseFraction / 3600;
    expect(expectedDemandWh).toBeGreaterThan(0);
    expect(expectedDemandWh).toBeLessThan(110);
    const missingBattery = {
      ...defaultMission,
      selectedComponentIds: defaultMission.selectedComponentIds.filter((id) => id !== "battery-basic"),
    };
    const design = evaluateDesign(missingBattery);
    expect(design.violations.join(" ")).toMatch(/battery/);
    expect(design.warnings.join(" ")).toContain(expectedDemandWh.toFixed(2) + " Wh");
    expect(design.warnings.join(" ")).toMatch(/eclipse/i);
  });

  it("warns if sunlight alone cannot power the continuous load", () => {
    const highDemand = {
      ...replaceComponent("camera-basic", "camera-hd"),
      launcherId: "dedicated",
    };
    const design = evaluateDesign(highDemand);
    expect(design.violations).toEqual([]);
    expect(design.warnings.join(" ")).toMatch(/Daylight solar generation/);
    expect(design.warnings.join(" ")).toMatch(/Orbit-average solar generation/);
  });

  it("distinguishes sufficient daylight W from insufficient orbit-average W", () => {
    const radioUpgrade = evaluateDesign(replaceComponent("radio-basic", "radio-advanced"));
    expect(radioUpgrade.solarGenerationW).toBeGreaterThan(radioUpgrade.nominalPowerW);
    expect(radioUpgrade.warnings.join(" ")).not.toMatch(/Daylight solar generation/);
    expect(radioUpgrade.warnings.join(" ")).toMatch(/Orbit-average solar generation/);
  });

  it("warns about a peak radio throughput bottleneck without inventing contact availability", () => {
    const highPayload = evaluateDesign({
      ...replaceComponent("camera-basic", "camera-hd"),
      launcherId: "dedicated",
    });
    expect(highPayload.warnings.join(" ")).toMatch(/Radio peak downlink/);
    expect(highPayload.warnings.join(" ")).toMatch(/intermittent contact/);
    expect(evaluateDesign(defaultMission).warnings.join(" ")).not.toMatch(/Radio peak downlink/);
  });

  it("rejects missing, repeated or unknown hardware rather than accepting fabricated resources", () => {
    const withoutRadio = evaluateDesign({
      ...defaultMission,
      selectedComponentIds: defaultMission.selectedComponentIds.filter((id) => id !== "radio-basic"),
    });
    expect(withoutRadio.violations.join(" ")).toMatch(/communications/);
    const twice = evaluateDesign({
      ...defaultMission,
      selectedComponentIds: [...defaultMission.selectedComponentIds, "solar-basic"],
    });
    expect(twice.violations.join(" ")).toMatch(/exactly one solar component \(currently 2\)/);
    expect(() => getSelectedComponents({
      ...defaultMission,
      selectedComponentIds: [...defaultMission.selectedComponentIds, "solar-fictional"],
    })).toThrow(/unknown component/);
    expect(() => evaluateDesign({ ...defaultMission, launcherId: "unknown" })).toThrow(/Unknown launcher/);
  });

  it("rejects invalid duration, launcher mass and budget without changing shared constraints", () => {
    for (const durationOrbits of [0, -1, 1.5, 31, NaN, Infinity]) {
      expect(evaluateDesign({ ...defaultMission, durationOrbits }).violations.join(" ")).toMatch(/duration/);
    }
    const allAdvanced = {
      ...defaultMission,
      selectedComponentIds: ["camera-hd", "solar-advanced", "battery-advanced", "radio-advanced"],
      launcherId: "rideshare",
    };
    const assessment = evaluateDesign(allAdvanced);
    expect(assessment.violations.join(" ")).toMatch(/mass/i);
    expect(assessment.violations.join(" ")).toMatch(/Budget/);
    expect(runMission(allAdvanced).events).toEqual(["Engineering review failed."]);
    expect(runMission(allAdvanced).batteryHistoryWh).toEqual([]);
  });

  it("preserves ordering, caller immutability and synthetic provenance", () => {
    const before = structuredClone(defaultMission);
    const reversed = { ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds].reverse() };
    expect(evaluateDesign(reversed)).toEqual(evaluateDesign(defaultMission));
    expect(getSelectedComponents(reversed).map((item) => item.id)).toEqual(reversed.selectedComponentIds);
    expect(defaultMission).toEqual(before);
    expect(new Set(components.map((item) => item.id)).size).toBe(components.length);
    expect(components.every((item) => item.isSynthetic)).toBe(true);
    expect(launchers.every((item) => item.isSynthetic)).toBe(true);
    for (const item of components) {
      for (const value of [item.massKg, item.costCredits, item.nominalPowerW,
        item.solarGenerationW ?? 0, item.batteryCapacityWh ?? 0,
        item.scienceMBperMinute ?? 0, item.downlinkMBperMinute ?? 0]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("resource/operations integration under synthetic mission assumptions", () => {
  const setup = (ids: string[], durationOrbits = 12) => ({
    ...defaultMission,
    selectedComponentIds: ids,
    durationOrbits,
    launcherId: "dedicated",
  });
  const weak = setup(["camera-hd", "solar-basic", "battery-basic", "radio-basic"]);
  const strong = setup(["camera-hd", "solar-advanced", "battery-basic", "radio-basic"]);

  it("a power deficit in eclipse/repeated orbits causes outages; additional solar prevents them", () => {
    const low = runMission(weak, 2026);
    const high = runMission(strong, 2026);
    expect(low.design.violations).toEqual([]);
    expect(high.design.violations).toEqual([]);
    expect(low.energyOutageCount).toBeGreaterThan(0);
    expect(high.energyOutageCount).toBe(0);
    expect(high.transmittedMB).toBeGreaterThan(low.transmittedMB);
  });

  it("a larger battery delays a sustained deficit but does not create energy", () => {
    const extended = setup(["camera-hd", "solar-basic", "battery-advanced", "radio-basic"]);
    const low = runMission(weak, 2026);
    const large = runMission(extended, 2026);
    expect(large.energyOutageCount).toBeLessThan(low.energyOutageCount);
    expect(large.energyOutageCount).toBeGreaterThan(0);
    expect(evaluateDesign(extended).warnings.join(" ")).toMatch(/Orbit-average solar generation/);
  });

  it("a faster radio returns more science data under identical events", () => {
    const fast = {
      ...defaultMission,
      selectedComponentIds: ["camera-basic", "solar-basic", "battery-basic", "radio-advanced"],
    };
    const basic = runMission(defaultMission, 2026);
    const upgraded = runMission(fast, 2026);
    expect(upgraded.design.violations).toEqual([]);
    expect(upgraded.transmittedMB).toBeGreaterThan(basic.transmittedMB);
    expect(upgraded.producedMB).toBeCloseTo(basic.producedMB, 6);
  });

  it("a faster camera alone cannot exceed an unchanged radio's downlink window", () => {
    const slow = setup(["camera-basic", "solar-advanced", "battery-basic", "radio-basic"], 6);
    const fast = setup(["camera-hd", "solar-advanced", "battery-basic", "radio-basic"], 6);
    const a = runMission(slow, 2026);
    const b = runMission(fast, 2026);
    expect(b.producedMB).toBeGreaterThan(a.producedMB);
    expect(b.transmittedMB).toBeCloseTo(a.transmittedMB, 6);
  });

  it("never produces negative energy or more downlinked than produced data", () => {
    for (const config of [defaultMission, weak, strong]) {
      const result = runMission(config, 2026);
      expect(result.producedMB).toBeGreaterThanOrEqual(0);
      expect(result.transmittedMB).toBeGreaterThanOrEqual(0);
      expect(result.transmittedMB).toBeLessThanOrEqual(result.producedMB + 1e-8);
      for (const energy of result.batteryHistoryWh) {
        expect(energy).toBeGreaterThanOrEqual(0);
        expect(energy).toBeLessThanOrEqual(result.design.batteryCapacityWh);
      }
    }
  });
});
