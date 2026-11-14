import { describe, expect, it } from "vitest";
import { defaultMission } from "../src/data/catalog";
import { evaluateDesign } from "../src/engine/resources";

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
