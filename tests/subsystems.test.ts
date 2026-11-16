import { describe, expect, it } from "vitest";
import { categoryOrder, components, defaultMission, optionalCategories, synergies } from "../src/data/catalog";
import { componentLessons } from "../src/data/componentLessons";
import { runMission } from "../src/engine/game";
import { designEffects, evaluateDesign, getSelectedComponents } from "../src/engine/resources";
import type { MissionConfig } from "../src/types/contracts";

const withParts = (...ids: string[]): MissionConfig => ({ ...defaultMission, launcherId: "dedicated", selectedComponentIds: [...defaultMission.selectedComponentIds, ...ids] });
const effectsOf = (config: MissionConfig) => designEffects(getSelectedComponents(config));

describe("eight-subsystem catalog", () => {
  it("offers eight synthetic units in each of eight subsystems with unique IDs and context", () => {
    expect(categoryOrder).toHaveLength(8);
    for (const category of categoryOrder) expect(components.filter(c => c.category === category), category).toHaveLength(8);
    expect(new Set(components.map(c => c.id)).size).toBe(64);
    for (const c of components) { expect(c.isSynthetic).toBe(true); expect(c.context, c.id).toBeTruthy(); }
  });
  it("supplies a visual lesson and a choice tip for every unit in both languages", () => {
    expect(Object.keys(componentLessons).sort()).toEqual(components.map(c => c.id).sort());
    for (const [id, lesson] of Object.entries(componentLessons)) {
      expect(lesson.flow, id).toBeTruthy();
      for (const [how, when] of [lesson.es, lesson.en]) {
        expect(how.trim(), id).not.toBe("");
        expect(when.trim(), id).not.toBe("");
      }
    }
  });
  it("gives every optional subsystem a free, effect-neutral bus baseline", () => {
    for (const category of optionalCategories) {
      const baseline = components.find(c => c.category === category)!;
      expect([baseline.massKg, baseline.costCredits, baseline.nominalPowerW]).toEqual([0, 0, 0]);
      expect(effectsOf(withParts(baseline.id))).toEqual(effectsOf(defaultMission));
    }
  });
  it("requires every synergy tag to be provided by some component", () => {
    const tags = new Set(components.flatMap(c => c.tags ?? []));
    for (const synergy of synergies) for (const tag of synergy.requiresTags) expect(tags.has(tag), `${synergy.id}: ${tag}`).toBe(true);
  });
});

describe("support subsystem effects", () => {
  it("leaves the original four-subsystem model exactly unchanged", () => {
    expect(effectsOf(defaultMission)).toEqual({ scienceRateMultiplier: 1, downlinkRateMultiplier: 1, batteryCapacityMultiplier: 1, calibrationFactor: 1, stationOutageFactor: 1, activeSynergyIds: [] });
  });
  it("rejects two units of one optional subsystem", () => {
    expect(evaluateDesign(withParts("adcs-wheels", "adcs-cmg")).violations).toContain("Select at most one attitude component (currently 2).");
    expect(evaluateDesign(withParts("adcs-wheels")).violations).toEqual([]);
  });
  it("scales usable battery capacity with thermal control and its synergy", () => {
    const base = evaluateDesign(defaultMission).batteryCapacityWh;
    expect(evaluateDesign(withParts("thermal-heaters")).batteryCapacityWh).toBeCloseTo(base * 1.1, 9);
    const rival = { ...defaultMission, selectedComponentIds: ["cam-thermal", "solar-basic", "battery-basic", "radio-basic", "thermal-radiator"] };
    expect(effectsOf(rival).activeSynergyIds).toEqual(["cold-detector"]);
    expect(effectsOf(rival).scienceRateMultiplier).toBeCloseTo(1.12, 9);
  });
  it("returns more data with better pointing and never less with a shorter outage", () => {
    const seed = 7;
    const base = runMission({ ...defaultMission, launcherId: "dedicated" }, seed);
    const pointed = runMission({ ...defaultMission, launcherId: "dedicated", selectedComponentIds: ["camera-basic", "solar-advanced", "battery-basic", "radio-basic", "adcs-wheels"] }, seed);
    expect(pointed.producedMB).toBeGreaterThan(base.producedMB);
    const propelled = runMission(withParts("prop-coldgas"), seed);
    expect(propelled.transmittedMB).toBeGreaterThanOrEqual(base.transmittedMB);
  });
});
