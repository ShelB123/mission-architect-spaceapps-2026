import { describe, expect, it } from "vitest";
import { computeOrbitProfile, hasGroundContact, isInEclipse } from "../src/engine/orbit";

describe("ideal circular orbit", () => {
  it("returns plausible LEO period around 450 km", () => {
    const orbit = computeOrbitProfile({ altitudeKm: 450 });
    expect(orbit.periodSeconds / 60).toBeGreaterThan(90);
    expect(orbit.periodSeconds / 60).toBeLessThan(100);
    expect(orbit.eclipseFraction).toBeGreaterThan(0);
    expect(orbit.eclipseFraction).toBeLessThan(0.5);
  });
  it("period increases with altitude", () => {
    expect(computeOrbitProfile({ altitudeKm: 800 }).periodSeconds)
      .toBeGreaterThan(computeOrbitProfile({ altitudeKm: 400 }).periodSeconds);
  });
  it("rejects invalid altitude", () => {
    expect(() => computeOrbitProfile({ altitudeKm: -5 })).toThrow();
  });
  it("has distinct eclipse and contact windows", () => {
    expect(isInEclipse(0.5, 0.35)).toBe(true);
    expect(isInEclipse(0.1, 0.35)).toBe(false);
    expect(hasGroundContact(0.85)).toBe(true);
    expect(hasGroundContact(0.5)).toBe(false);
  });
});
