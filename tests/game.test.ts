import { describe, expect, it } from "vitest";
import { defaultMission } from "../src/data/catalog";
import { runMission } from "../src/engine/game";

describe("mission simulation", () => {
  it("is reproducible", () => {
    expect(runMission(defaultMission, 42)).toEqual(runMission(defaultMission, 42));
  });
  it("measures science return", () => {
    const result = runMission(defaultMission);
    expect(result.producedMB).toBeGreaterThan(0);
    expect(result.transmittedMB).toBeGreaterThanOrEqual(0);
    expect(result.transmittedMB).toBeLessThanOrEqual(result.producedMB);
  });
  it("rejects invalid engineering design without running operations", () => {
    const result = runMission({ ...defaultMission, selectedComponentIds: [] });
    expect(result.success).toBe(false);
    expect(result.design.violations.length).toBeGreaterThan(0);
    expect(result.batteryHistoryWh).toEqual([]);
  });
  it("extended battery improves energy margin for high demand", () => {
    const weak = runMission({ ...defaultMission, selectedComponentIds: ["camera-hd", "solar-basic", "battery-basic", "radio-basic"], launcherId: "dedicated" });
    const strong = runMission({ ...defaultMission, selectedComponentIds: ["camera-hd", "solar-basic", "battery-advanced", "radio-basic"], launcherId: "dedicated" });
    expect(strong.energyOutageCount).toBeLessThanOrEqual(weak.energyOutageCount);
  });
});
