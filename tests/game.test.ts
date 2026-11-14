import { afterEach, describe, expect, it, vi } from "vitest";
import { components, defaultMission } from "../src/data/catalog";
import { missionScenarios, runMission, type MissionScenarioId } from "../src/engine/game";
import * as resources from "../src/engine/resources";
import { computeOrbitProfile } from "../src/engine/orbit";
import type { MissionConfig } from "../src/types/contracts";

const seed = 2026;
const configure = (ids: string[], durationOrbits = 6, launcherId = "dedicated"): MissionConfig => ({
  ...defaultMission, selectedComponentIds: ids, durationOrbits, launcherId,
});
const weak = configure(["camera-hd", "solar-basic", "battery-basic", "radio-basic"]);
const reserve = configure(["camera-hd", "solar-basic", "battery-advanced", "radio-basic"]);
const balanced = configure(["camera-hd", "solar-advanced", "battery-basic", "radio-advanced"]);
const fastRadio = configure(["camera-basic", "solar-basic", "battery-basic", "radio-advanced"], 6, "rideshare");

afterEach(() => vi.restoreAllMocks());

describe("MVP compatibility and seeded operations", () => {
  it("preserves the original call and default objective", () => {
    expect(runMission(defaultMission)).toEqual(runMission(defaultMission, 1, "survey"));
    expect(runMission(defaultMission).targetMB).toBe(250);
    expect(runMission(defaultMission).success).toBe(true);
  });

  it.each([0, 1, 42, 2026, 0xffffffff])("replays complete results for seed %i, without cross-run state", (value) => {
    const first = runMission(weak, value);
    runMission(balanced, 7);
    expect(runMission(weak, value)).toEqual(first);
  });

  it.each([-1, 0.5, NaN, Infinity, -Infinity, 0x100000000, Number.MAX_SAFE_INTEGER])("rejects invalid seed %s", (value) => {
    expect(() => runMission(defaultMission, value)).toThrow(/Seed/);
  });

  it("different seeds affect outcomes, not only event text", () => {
    const first = runMission(weak, 0);
    const second = runMission(weak, 1);
    expect(first.events).not.toEqual(second.events);
    expect(first.transmittedMB).not.toBeCloseTo(second.transmittedMB);
  });

  it("uses neither Math.random nor wall-clock time", () => {
    vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("Unexpected random"); });
    vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Unexpected time"); });
    expect(runMission(defaultMission, seed).success).toBe(true);
  });

  it("keeps the same event schedule for different spacecraft and component ordering", () => {
    const a = runMission(defaultMission, seed);
    const b = runMission(balanced, seed);
    expect(a.events.slice(0, 2)).toEqual(b.events.slice(0, 2));
    expect(runMission({ ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds].reverse() }, seed)).toEqual(a);
  });

  it("does not mutate caller configuration or the catalog", () => {
    const beforeCatalog = structuredClone(components);
    const input = { ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] };
    const before = structuredClone(input);
    Object.freeze(input.selectedComponentIds);
    Object.freeze(input);
    runMission(input, seed);
    expect(input).toEqual(before);
    expect(components).toEqual(beforeCatalog);
  });

  it("rejects unknown scenarios, including inherited object keys", () => {
    for (const id of ["missing", "toString", "__proto__"]) {
      expect(() => runMission(defaultMission, seed, id as MissionScenarioId)).toThrow(/scenario/);
    }
  });

  it("labels training events and makes their effects visible to the existing debrief", () => {
    const result = runMission(defaultMission, seed);
    expect(result.events.filter((event) => event.startsWith("Synthetic training event"))).toHaveLength(2);
    for (const event of result.events.slice(0, 2)) expect(result.explanations).toContain(event);
    expect(result.explanations.join(" ")).toContain("Replay seed: 2026");
    expect(result.explanations.join(" ")).toContain("not real failure predictions");
  });
});

const scenarioCases: { id: MissionScenarioId; passing: MissionConfig; failing: MissionConfig; reason: RegExp }[] = [
  { id: "survey", passing: defaultMission, failing: weak, reason: /Power deficit/ },
  { id: "budget-survey", passing: defaultMission, failing: fastRadio, reason: /budget exceeded/ },
  { id: "rapid-science", passing: balanced, failing: reserve, reason: /Downlink backlog/ },
  { id: "endurance", passing: { ...defaultMission, durationOrbits: 12 }, failing: { ...reserve, durationOrbits: 12 }, reason: /Power deficit/ },
];

describe.each(scenarioCases)("scenario $id", ({ id, passing, failing, reason }) => {
  it("has a demonstrated winning design", () => {
    const result = runMission(passing, seed, id);
    expect(result.success).toBe(true);
    expect(result.transmittedMB).toBeGreaterThanOrEqual(missionScenarios[id].targetMB);
    expect(result.energyOutageCount).toBe(0);
    expect(result.design.violations).toEqual([]);
    expect(result.explanations.join(" ")).toContain(missionScenarios[id].lesson);
  });
  it("fails for an explicit and verifiable engineering reason", () => {
    const result = runMission(failing, seed, id);
    expect(result.success).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.explanations.join(" ")).toMatch(reason);
    expect(result.energyOutageCount > 0 || result.transmittedMB < result.targetMB || result.design.violations.length > 0).toBe(true);
  });
  it("enforces the scenario deadline before operations", () => {
    const result = runMission({ ...passing, durationOrbits: missionScenarios[id].maxOrbits + 1 }, seed, id);
    expect(result.success).toBe(false);
    expect(result.score).toBe(0);
    expect(result.batteryHistoryWh).toEqual([]);
    expect(result.design.violations.join(" ")).toMatch(/deadline/);
  });
});

describe("hard design limits", () => {
  it.each([0, -1, 1.5, 31, NaN, Infinity])("rejects duration %s without simulation", (durationOrbits) => {
    const result = runMission({ ...defaultMission, durationOrbits }, seed);
    expect(result.score).toBe(0);
    expect(result.batteryHistoryWh).toEqual([]);
  });
  it("does not run an incomplete spacecraft", () => {
    const result = runMission({ ...defaultMission, selectedComponentIds: [] });
    expect(result.success).toBe(false);
    expect(result.design.violations.length).toBeGreaterThan(0);
    expect(result.events).toEqual(["Engineering review failed."]);
    expect(result.batteryHistoryWh).toEqual([]);
  });
  it("preserves the resources engineer's mass and budget violations", () => {
    const heavy = { ...balanced, launcherId: "rideshare" };
    const expensive = configure(["camera-hd", "solar-advanced", "battery-advanced", "radio-advanced"]);
    for (const config of [heavy, expensive]) {
      const result = runMission(config);
      expect(result.success).toBe(false);
      expect(result.design.violations).toEqual(resources.evaluateDesign(config).violations);
      expect(result.producedMB).toBe(0);
    }
  });
  it.each([700, 701])("checks the scenario budget boundary at %i credits", (credits) => {
    // Synthetic assessment fixture isolates the budget boundary, not a catalog hardware claim.
    const assessment = resources.evaluateDesign(defaultMission);
    vi.spyOn(resources, "evaluateDesign").mockReturnValue({ ...assessment, totalCostCredits: credits });
    const result = runMission(defaultMission, seed, "budget-survey");
    expect(result.success).toBe(credits === 700);
    expect(result.design.budgetLimitCredits).toBe(700);
    if (credits === 701) expect(result.design.violations).toContain("Scenario budget exceeded by 1 credits.");
  });
});

describe("resource accounting and educational tradeoffs", () => {
  it("matches analytical acquisition and contact capacity with partial final reporting steps", () => {
    const result = runMission(defaultMission, seed);
    const minutes = result.orbit.periodSeconds / 60;
    // All six orbits powered, 10 minutes calibration, exactly one of six station windows unavailable.
    expect(result.producedMB).toBeCloseTo(1.3 * (6 * minutes - 10), 8);
    expect(result.transmittedMB).toBeCloseTo(3.5 * 0.18 * minutes * 5, 8);
    expect(result.dataHistoryMB.at(-1)).toBeCloseTo(result.producedMB - result.transmittedMB, 8);
    expect(result.orbit).toEqual(computeOrbitProfile(defaultMission));
  });
  it("a one-orbit station outage sends no data", () => {
    const result = runMission({ ...defaultMission, durationOrbits: 1 });
    expect(result.success).toBe(false);
    expect(result.producedMB).toBeGreaterThan(0);
    expect(result.transmittedMB).toBe(0);
    expect(result.energyOutageCount).toBe(0);
  });
  it("radio capacity improves return without increasing acquisition", () => {
    const slow = runMission(defaultMission, seed);
    const fast = runMission(fastRadio, seed);
    expect(fast.producedMB).toBeCloseTo(slow.producedMB, 8);
    expect(fast.transmittedMB).toBeGreaterThan(slow.transmittedMB);
    expect(fast.dataHistoryMB.at(-1)!).toBeLessThan(slow.dataHistoryMB.at(-1)!);
    expect(fast.design.nominalPowerW).toBeGreaterThan(slow.design.nominalPowerW);
    expect(fast.design.totalCostCredits).toBeGreaterThan(slow.design.totalCostCredits);
  });
  it("more payload data alone cannot overcome the same radio capacity", () => {
    const basic = runMission(defaultMission, seed);
    const hd = runMission(reserve, seed);
    expect(hd.energyOutageCount).toBe(0);
    expect(hd.producedMB).toBeGreaterThan(basic.producedMB);
    expect(hd.transmittedMB).toBeCloseTo(basic.transmittedMB, 8);
  });
  it("a radio alone cannot supply missing science data", () => {
    const result = runMission(fastRadio, seed, "rapid-science");
    expect(result.success).toBe(false);
    expect(result.energyOutageCount).toBe(0);
    expect(result.producedMB).toBeLessThan(result.targetMB);
    expect(result.explanations.join(" ")).toContain("Payload production below target");
  });
  it("extended reserves bridge six orbits but do not fix the long-term deficit", () => {
    expect(runMission(reserve, seed).energyOutageCount).toBeLessThan(runMission(weak, seed).energyOutageCount);
    expect(runMission(reserve, seed).success).toBe(true);
    expect(runMission({ ...reserve, durationOrbits: 12 }, seed, "endurance").energyOutageCount).toBeGreaterThan(0);
    expect(runMission({ ...balanced, durationOrbits: 12 }, seed, "endurance").success).toBe(true);
  });
  it("rewards budget efficiency after meeting the same science and reliability goals", () => {
    const efficient = runMission(defaultMission, seed);
    const costly = runMission(reserve, seed);
    expect(efficient.success && costly.success).toBe(true);
    expect(efficient.score).toBeGreaterThan(costly.score);
    expect(efficient.explanations.join(" ")).toContain("unused budget");
  });

  it.each([0, 2026, 0xffffffff])("preserves invariants across all 32 catalog/launcher combinations, seed %i", (value) => {
    for (const payload of ["camera-basic", "camera-hd"])
      for (const solar of ["solar-basic", "solar-advanced"])
        for (const battery of ["battery-basic", "battery-advanced"])
          for (const radio of ["radio-basic", "radio-advanced"])
            for (const launcher of ["rideshare", "dedicated"]) {
              const result = runMission(configure([payload, solar, battery, radio], 6, launcher), value);
              expect(Number.isInteger(result.score)).toBe(true);
              expect(result.score).toBeGreaterThanOrEqual(0);
              expect(result.score).toBeLessThanOrEqual(result.success ? 100 : 99);
              expect(result.transmittedMB).toBeGreaterThanOrEqual(0);
              expect(result.transmittedMB).toBeLessThanOrEqual(result.producedMB + 1e-8);
              expect(result.scienceCompletion).toBeGreaterThanOrEqual(0);
              expect(result.scienceCompletion).toBeLessThanOrEqual(1);
              for (const energy of result.batteryHistoryWh) {
                expect(Number.isFinite(energy)).toBe(true);
                expect(energy).toBeGreaterThanOrEqual(0);
                expect(energy).toBeLessThanOrEqual(result.design.batteryCapacityWh);
              }
              for (const backlog of result.dataHistoryMB) expect(backlog).toBeGreaterThanOrEqual(0);
              if (result.dataHistoryMB.length) {
                expect(result.dataHistoryMB.at(-1)).toBeCloseTo(result.producedMB - result.transmittedMB, 7);
              }
            }
  });
});
