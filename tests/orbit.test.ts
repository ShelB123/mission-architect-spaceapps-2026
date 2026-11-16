import { describe, expect, it } from "vitest";
import {
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  GROUND_CONTACT_END_FRACTION,
  GROUND_CONTACT_START_FRACTION,
  ORBIT_MODEL_NOTICE,
  buildOrbitTimeline,
  computeOrbitFacts,
  computeOrbitProfile,
  criticalBetaDeg,
  eclipseFractionAtBeta,
  hasGroundContact,
  isInEclipse,
  nextOrbitEvents,
  orbitModelNotice,
  orbitStateAt,
  orbitValidityNotes,
  withBetaAngle,
} from "../src/engine/orbit";

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

/**
 * Reference values computed outside the engine (Python floats) from the same closed forms with
 * R = 6371 km and μ = 398600.4418 km³/s². They check equations and units, not real spacecraft.
 */
describe("reference values for period, speed and eclipse", () => {
  it.each([
    { altitudeKm: 160, periodSeconds: 5252.6747, speedKmPerSecond: 7.812302, eclipseFraction: 0.429397, eclipseMinutes: 37.5913 },
    { altitudeKm: 400, periodSeconds: 5544.8551, speedKmPerSecond: 7.672599, eclipseFraction: 0.390041, eclipseMinutes: 36.0454 },
    { altitudeKm: 1000, periodSeconds: 6297.9701, speedKmPerSecond: 7.353696, eclipseFraction: 0.332259, eclipseMinutes: 34.876 },
    { altitudeKm: 40000, periodSeconds: 99375.808, speedKmPerSecond: 2.931876, eclipseFraction: 0.043872, eclipseMinutes: 72.6635 },
  ])("matches the closed-form reference at $altitudeKm km", (ref) => {
    const orbit = computeOrbitProfile({ altitudeKm: ref.altitudeKm });
    expect(orbit.orbitalRadiusKm).toBe(EARTH_RADIUS_KM + ref.altitudeKm);
    expect(Math.abs(orbit.periodSeconds - ref.periodSeconds)).toBeLessThan(1e-3);
    expect(Math.abs(orbit.speedKmPerSecond - ref.speedKmPerSecond)).toBeLessThan(1e-6);
    expect(Math.abs(orbit.eclipseFraction - ref.eclipseFraction)).toBeLessThan(1e-6);
    expect(Math.abs((orbit.periodSeconds * orbit.eclipseFraction) / 60 - ref.eclipseMinutes)).toBeLessThan(1e-3);
  });

  it("reproduces one sidereal day at the geostationary radius", () => {
    // Textbook sanity check of units: r ≈ 42,164.17 km ↔ T ≈ 86,164.09 s (one sidereal day).
    const orbit = computeOrbitProfile({ altitudeKm: 42164.17 - EARTH_RADIUS_KM });
    expect(Math.abs(orbit.periodSeconds - 86164.09)).toBeLessThan(1);
    expect(orbit.speedKmPerSecond).toBeCloseTo(3.0747, 3);
  });

  it.each([160, 250, 450, 1000, 20000, 40000])("satisfies circular two-body identities at %d km", (altitudeKm) => {
    const { orbitalRadiusKm: r, periodSeconds: T, speedKmPerSecond: v, eclipseFraction, sunlightFraction } =
      computeOrbitProfile({ altitudeKm });
    expect((v * T) / (2 * Math.PI * r)).toBeCloseTo(1, 12); // circumference = speed × period
    expect((v * v * r) / EARTH_MU_KM3_S2).toBeCloseTo(1, 12); // vis-viva with a = r
    expect((T * T * EARTH_MU_KM3_S2) / (4 * Math.PI ** 2 * r ** 3)).toBeCloseTo(1, 12); // Kepler's third law
    expect(Math.sin(Math.PI * eclipseFraction)).toBeCloseTo(EARTH_RADIUS_KM / r, 12); // shadow half-angle
    expect(eclipseFraction + sunlightFraction).toBe(1);
  });

  it("eclipse fraction falls with altitude while eclipse duration does not vanish", () => {
    const altitudes = [160, 250, 450, 700, 1000];
    const profiles = altitudes.map((altitudeKm) => computeOrbitProfile({ altitudeKm }));
    for (let i = 1; i < profiles.length; i++) {
      expect(profiles[i].eclipseFraction).toBeLessThan(profiles[i - 1].eclipseFraction);
      expect(profiles[i].speedKmPerSecond).toBeLessThan(profiles[i - 1].speedKmPerSecond);
    }
    for (const p of profiles) expect(p.eclipseFraction).toBeLessThan(0.5);
  });

  it("enforces the altitude domain and rejects non-finite input", () => {
    expect(computeOrbitProfile({ altitudeKm: 160 }).altitudeKm).toBe(160);
    expect(computeOrbitProfile({ altitudeKm: 40000 }).altitudeKm).toBe(40000);
    for (const altitudeKm of [159.999, 40000.001, NaN, Infinity, -Infinity]) {
      expect(() => computeOrbitProfile({ altitudeKm })).toThrow(RangeError);
    }
  });
});

describe("phase windows", () => {
  it("eclipse interval is centered at 0.5 with inclusive start and exclusive end", () => {
    expect(isInEclipse(0.25, 0.5)).toBe(true);
    expect(isInEclipse(0.75, 0.5)).toBe(false);
    expect(isInEclipse(0.375, 0.25)).toBe(true);
    expect(isInEclipse(0.625, 0.25)).toBe(false);
    expect(isInEclipse(0.374, 0.25)).toBe(false);
    expect(isInEclipse(0.5, 0)).toBe(false);
  });
  it("is periodic and accepts negative fractions", () => {
    for (const phase of [0.1, 0.45, 0.5, 0.6, 0.9]) {
      expect(isInEclipse(phase + 7, 0.38)).toBe(isInEclipse(phase, 0.38));
      expect(isInEclipse(phase - 3, 0.38)).toBe(isInEclipse(phase, 0.38));
      expect(hasGroundContact(phase + 7)).toBe(hasGroundContact(phase));
      expect(hasGroundContact(phase - 3)).toBe(hasGroundContact(phase));
    }
  });
  it("contact window is [0.78, 0.96)", () => {
    expect(GROUND_CONTACT_START_FRACTION).toBe(0.78);
    expect(GROUND_CONTACT_END_FRACTION).toBe(0.96);
    expect(hasGroundContact(0.78)).toBe(true);
    expect(hasGroundContact(0.7799)).toBe(false);
    expect(hasGroundContact(0.9599)).toBe(true);
    expect(hasGroundContact(0.96)).toBe(false);
  });
  it("throws instead of reporting sunlight for invalid input", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => isInEclipse(bad, 0.3)).toThrow(RangeError);
      expect(() => isInEclipse(0.5, bad)).toThrow(RangeError);
      expect(() => hasGroundContact(bad)).toThrow(RangeError);
    }
    expect(() => isInEclipse(0.5, -0.01)).toThrow(RangeError);
    expect(() => isInEclipse(0.5, 0.51)).toThrow(RangeError);
  });
});

describe("time-tagged orbit state", () => {
  const profile = computeOrbitProfile({ altitudeKm: 450 });
  const T = profile.periodSeconds;

  it("places mission start at the subsolar point and mid-eclipse opposite the Sun", () => {
    const start = orbitStateAt(profile, 0);
    expect(start).toMatchObject({ timeSeconds: 0, orbitIndex: 0, orbitFraction: 0, sunAngleRad: 0, illumination: "sunlight" });
    expect(start.positionKm.x).toBe(profile.orbitalRadiusKm);
    expect(start.positionKm.y).toBe(0);

    const quarter = orbitStateAt(profile, T / 4);
    expect(quarter.positionKm.x).toBeCloseTo(0, 6);
    expect(quarter.positionKm.y).toBeCloseTo(profile.orbitalRadiusKm, 6);
    expect(quarter.illumination).toBe("sunlight");

    const half = orbitStateAt(profile, T / 2);
    expect(half.positionKm.x).toBeCloseTo(-profile.orbitalRadiusKm, 6);
    expect(half.illumination).toBe("eclipse");
  });

  it("counts revolutions and keeps the fraction in [0, 1)", () => {
    const state = orbitStateAt(profile, 3.25 * T);
    expect(state.orbitIndex).toBe(3);
    expect(state.orbitFraction).toBeCloseTo(0.25, 12);
    for (let k = 0; k <= 30; k++) {
      const boundary = orbitStateAt(profile, k * T);
      expect(boundary.orbitIndex).toBe(k);
      expect(boundary.orbitFraction).toBe(0);
    }
  });

  it("illumination equals the cylindrical-shadow test on the position", () => {
    for (const altitudeKm of [160, 450, 1000, 20000]) {
      const p = computeOrbitProfile({ altitudeKm });
      for (let i = 0; i < 2000; i++) {
        // Offset avoids sampling exactly on a shadow edge, where rounding decides.
        const state = orbitStateAt(p, ((i + 0.37) / 2000) * 2 * p.periodSeconds);
        const { x, y } = state.positionKm;
        expect(Math.hypot(x, y)).toBeCloseTo(p.orbitalRadiusKm, 6);
        const shadowed = x < 0 && Math.abs(y) < EARTH_RADIUS_KM;
        expect(state.illumination === "eclipse").toBe(shadowed);
      }
    }
  });

  it("agrees with the phase convention used by the mission engine", () => {
    for (let i = 0; i < 500; i++) {
      const t = (i + 0.5) * 61.7;
      const enginePhase = (t % T) / T; // expression in src/engine/game.ts
      const state = orbitStateAt(profile, t);
      expect(state.orbitFraction).toBeCloseTo(enginePhase, 10);
      expect(state.illumination === "eclipse").toBe(isInEclipse(enginePhase, profile.eclipseFraction));
      expect(state.inGroundContact).toBe(hasGroundContact(enginePhase));
    }
  });

  it("rejects invalid time and profiles", () => {
    for (const t of [-1, NaN, Infinity]) expect(() => orbitStateAt(profile, t)).toThrow(RangeError);
    expect(() => orbitStateAt({ ...profile, periodSeconds: 0 }, 10)).toThrow(RangeError);
    expect(() => orbitStateAt({ ...profile, orbitalRadiusKm: EARTH_RADIUS_KM }, 10)).toThrow(RangeError);
    expect(() => orbitStateAt({ ...profile, eclipseFraction: NaN }, 10)).toThrow(RangeError);
  });
});

describe("orbit timeline", () => {
  const profile = computeOrbitProfile({ altitudeKm: 450 });
  const T = profile.periodSeconds;
  const timeline = buildOrbitTimeline(profile, 6);

  it("labels itself as an educational idealization", () => {
    expect(timeline.model).toEqual({
      kind: "circular-two-body-beta-zero",
      fidelity: "educational-idealization",
      frame: "sun-fixed-orbital-plane",
      betaDeg: 0,
      notice: ORBIT_MODEL_NOTICE,
    });
    expect(ORBIT_MODEL_NOTICE).toMatch(/not a high-fidelity/i);
    expect(timeline.earthRadiusKm).toBe(EARTH_RADIUS_KM);
  });

  it("samples uniformly from 0 s to the mission end", () => {
    expect(timeline.durationSeconds).toBe(6 * T);
    expect(timeline.stepSeconds).toBeCloseTo(T / 120, 12);
    expect(timeline.samples).toHaveLength(6 * 120 + 1);
    expect(timeline.samples[0].timeSeconds).toBe(0);
    expect(timeline.samples.at(-1)!.timeSeconds).toBe(timeline.durationSeconds);
    expect(timeline.samples.at(-1)!.orbitIndex).toBe(6);
    timeline.samples.forEach((sample, i) => {
      expect(sample.timeSeconds).toBeCloseTo(i * timeline.stepSeconds, 6);
      expect(sample).toEqual(orbitStateAt(profile, sample.timeSeconds));
    });
  });

  it("gives one eclipse and one fictional contact per orbit with the model durations", () => {
    expect(timeline.eclipseIntervals).toHaveLength(6);
    expect(timeline.groundContactIntervals).toHaveLength(6);
    timeline.eclipseIntervals.forEach((interval, k) => {
      expect(interval.orbitIndex).toBe(k);
      expect(interval.endSeconds - interval.startSeconds).toBeCloseTo(profile.eclipseFraction * T, 6);
      expect((interval.startSeconds + interval.endSeconds) / 2).toBeCloseTo((k + 0.5) * T, 6);
    });
    timeline.groundContactIntervals.forEach((interval, k) => {
      expect(interval.startSeconds).toBeCloseTo((k + 0.78) * T, 6);
      expect(interval.endSeconds).toBeCloseTo((k + 0.96) * T, 6);
    });
    // 450 km reference: 35.86 min of eclipse per revolution (docs/PHYSICS_ASSUMPTIONS.md).
    const first = timeline.eclipseIntervals[0];
    expect((first.endSeconds - first.startSeconds) / 60).toBeCloseTo(35.8557, 3);
  });

  it("sample flags are consistent with the intervals", () => {
    const within = (intervals: typeof timeline.eclipseIntervals, t: number) =>
      intervals.some((interval) => t >= interval.startSeconds && t < interval.endSeconds);
    const edge = 1e-6; // s; rounding may decide a sample that falls exactly on a transition
    const nearEdge = (intervals: typeof timeline.eclipseIntervals, t: number) =>
      intervals.some((interval) => Math.abs(t - interval.startSeconds) < edge || Math.abs(t - interval.endSeconds) < edge);
    for (const sample of timeline.samples) {
      if (!nearEdge(timeline.eclipseIntervals, sample.timeSeconds)) {
        expect(sample.illumination === "eclipse").toBe(within(timeline.eclipseIntervals, sample.timeSeconds));
      }
      if (!nearEdge(timeline.groundContactIntervals, sample.timeSeconds)) {
        expect(sample.inGroundContact).toBe(within(timeline.groundContactIntervals, sample.timeSeconds));
      }
    }
    const eclipsed = timeline.samples.filter((sample) => sample.illumination === "eclipse").length;
    expect(Math.abs(eclipsed / timeline.samples.length - profile.eclipseFraction)).toBeLessThan(1 / 120);
  });

  it("is deterministic, does not alias or mutate its input", () => {
    const frozen = Object.freeze({ ...profile });
    const again = buildOrbitTimeline(frozen, 6);
    expect(again).toEqual(timeline);
    expect(again.profile).not.toBe(frozen);
    expect(again.profile).toEqual(computeOrbitProfile({ altitudeKm: 450 }));
  });

  it("honours sampling options and rejects invalid ones", () => {
    expect(buildOrbitTimeline(profile, 1, 4).samples.map((s) => s.orbitFraction)).toEqual([0, 0.25, 0.5, 0.75, 0]);
    for (const orbits of [0, -1, 2.5, NaN]) expect(() => buildOrbitTimeline(profile, orbits)).toThrow(RangeError);
    for (const n of [3, 10.5, NaN]) expect(() => buildOrbitTimeline(profile, 2, n)).toThrow(RangeError);
    expect(() => buildOrbitTimeline(profile, 30, 5000)).toThrow(RangeError);
  });
});

describe("solar beta angle", () => {
  const profile = computeOrbitProfile({ altitudeKm: 450 });
  const r = profile.orbitalRadiusKm;

  it("is bit-identical to the mission profile at beta 0", () => {
    for (const altitudeKm of [160, 450, 1000, 40000]) {
      const p = computeOrbitProfile({ altitudeKm });
      expect(eclipseFractionAtBeta(p.orbitalRadiusKm)).toBe(p.eclipseFraction);
      expect(eclipseFractionAtBeta(p.orbitalRadiusKm, 0)).toBe(p.eclipseFraction);
      expect(withBetaAngle(p, 0)).toEqual(p);
    }
  });

  // Computed outside the engine (Python floats) from f = acos(√(r²−R²)/(r·cos β))/π.
  it.each([
    { altitudeKm: 450, betaDeg: 30, fraction: 0.364669, minutes: 34.0746 },
    { altitudeKm: 450, betaDeg: 60, fraction: 0.246698, minutes: 23.0514 },
    { altitudeKm: 450, betaDeg: 69, fraction: 0.025687, minutes: 2.4002 },
    { altitudeKm: 450, betaDeg: 70, fraction: 0, minutes: 0 },
    { altitudeKm: 1000, betaDeg: 30, fraction: 0.302771, minutes: 31.7807 },
    { altitudeKm: 1000, betaDeg: 60, fraction: 0, minutes: 0 },
  ])("matches the reference at $altitudeKm km, beta $betaDeg°", ({ altitudeKm, betaDeg, fraction, minutes }) => {
    const p = computeOrbitProfile({ altitudeKm });
    const f = eclipseFractionAtBeta(p.orbitalRadiusKm, betaDeg);
    expect(Math.abs(f - fraction)).toBeLessThan(1e-6);
    expect(Math.abs((f * p.periodSeconds) / 60 - minutes)).toBeLessThan(1e-3);
    expect(eclipseFractionAtBeta(p.orbitalRadiusKm, -betaDeg)).toBe(f); // symmetric in the sign of beta
  });

  it("is continuous at beta 0, decreases with |beta| and vanishes at the critical angle", () => {
    expect(eclipseFractionAtBeta(r, 1e-6)).toBeCloseTo(profile.eclipseFraction, 9);
    let previous = profile.eclipseFraction;
    for (let beta = 1; beta <= 90; beta++) {
      const f = eclipseFractionAtBeta(r, beta);
      expect(f).toBeLessThanOrEqual(previous);
      expect(f).toBeGreaterThanOrEqual(0);
      previous = f;
    }
    const critical = criticalBetaDeg(r);
    expect(critical).toBeCloseTo(69.0716, 3);
    expect(eclipseFractionAtBeta(r, critical - 0.01)).toBeGreaterThan(0);
    expect(eclipseFractionAtBeta(r, critical + 0.01)).toBe(0);
    expect(eclipseFractionAtBeta(r, 90)).toBe(0);
  });

  it("timeline illumination equals the 3D cylindrical-shadow test", () => {
    for (const betaDeg of [0, 20, 45, 65, -45, 80]) {
      const timeline = buildOrbitTimeline(profile, 1, { samplesPerOrbit: 997, betaDeg });
      const b = (betaDeg * Math.PI) / 180;
      const sun = { x: Math.cos(b), z: Math.sin(b) }; // unit vector; the orbit lies in z = 0
      // The first and last samples sit at the subsolar point; none of 997 steps lands on a shadow edge.
      for (const sample of timeline.samples) {
        const along = sample.positionKm.x * sun.x;
        const perpendicular = Math.sqrt(r * r - along * along);
        const shadowed = along < 0 && perpendicular < EARTH_RADIUS_KM;
        expect(sample.illumination === "eclipse").toBe(shadowed);
      }
    }
  });

  it("timeline reports the beta it used and leaves the input profile alone", () => {
    const frozen = Object.freeze({ ...profile });
    const tilted = buildOrbitTimeline(frozen, 2, { betaDeg: 60 });
    expect(tilted.model.kind).toBe("circular-two-body-fixed-beta");
    expect(tilted.model.betaDeg).toBe(60);
    expect(tilted.model.notice).toBe(orbitModelNotice(60));
    expect(tilted.model.notice).toMatch(/60°/);
    expect(tilted.model.notice).toMatch(/not a high-fidelity/i);
    expect(tilted.profile.eclipseFraction).toBeCloseTo(0.246698, 6);
    expect(tilted.profile.eclipseFraction + tilted.profile.sunlightFraction).toBe(1);
    expect(tilted.profile.periodSeconds).toBe(profile.periodSeconds);
    expect(tilted.eclipseIntervals).toHaveLength(2);

    const sunlit = buildOrbitTimeline(profile, 2, { betaDeg: 75 });
    expect(sunlit.eclipseIntervals).toEqual([]);
    expect(sunlit.samples.every((sample) => sample.illumination === "sunlight")).toBe(true);

    expect(buildOrbitTimeline(profile, 2, { betaDeg: 0 })).toEqual(buildOrbitTimeline(profile, 2));
    expect(buildOrbitTimeline(profile, 2, { samplesPerOrbit: 60 })).toEqual(buildOrbitTimeline(profile, 2, 60));
  });

  it("rejects invalid beta and radius", () => {
    for (const beta of [NaN, Infinity, 90.01, -91]) {
      expect(() => eclipseFractionAtBeta(r, beta)).toThrow(RangeError);
      expect(() => buildOrbitTimeline(profile, 1, { betaDeg: beta })).toThrow(RangeError);
    }
    for (const radius of [NaN, EARTH_RADIUS_KM, 100]) {
      expect(() => eclipseFractionAtBeta(radius, 10)).toThrow(RangeError);
      expect(() => criticalBetaDeg(radius)).toThrow(RangeError);
    }
  });
});

describe("velocity in the timeline frame", () => {
  const profile = computeOrbitProfile({ altitudeKm: 450 });
  it("has the circular speed, is perpendicular to position and matches a finite difference", () => {
    const dt = 0.01;
    for (let i = 0; i < 50; i++) {
      const t = i * 173.3;
      const a = orbitStateAt(profile, t);
      const b = orbitStateAt(profile, t + dt);
      const { x: vx, y: vy } = a.velocityKmPerSecond;
      expect(Math.hypot(vx, vy)).toBeCloseTo(profile.speedKmPerSecond, 12);
      expect(vx * a.positionKm.x + vy * a.positionKm.y).toBeCloseTo(0, 8);
      expect((b.positionKm.x - a.positionKm.x) / dt).toBeCloseTo(vx, 3);
      expect((b.positionKm.y - a.positionKm.y) / dt).toBeCloseTo(vy, 3);
    }
    expect(orbitStateAt(profile, 0).velocityKmPerSecond).toEqual({ x: -0, y: profile.speedKmPerSecond });
  });
  it("rejects a profile without a valid speed", () => {
    expect(() => orbitStateAt({ ...profile, speedKmPerSecond: NaN }, 0)).toThrow(RangeError);
  });
});

describe("event countdowns", () => {
  const profile = computeOrbitProfile({ altitudeKm: 450 });
  const T = profile.periodSeconds;
  const f = profile.eclipseFraction;

  it("counts down to the next eclipse and contact transitions", () => {
    const start = nextOrbitEvents(profile, 0);
    expect(start.illumination).toBe("sunlight");
    expect(start.secondsToEclipseStart).toBeCloseTo((0.5 - f / 2) * T, 6);
    expect(start.secondsToEclipseEnd).toBeCloseTo((0.5 + f / 2) * T, 6);
    expect(start.inGroundContact).toBe(false);
    expect(start.secondsToContactStart).toBeCloseTo(0.78 * T, 6);
    expect(start.secondsToContactEnd).toBeCloseTo(0.96 * T, 6);

    const mid = nextOrbitEvents(profile, 2.5 * T);
    expect(mid.illumination).toBe("eclipse");
    expect(mid.secondsToEclipseEnd).toBeCloseTo((f / 2) * T, 6);
    expect(mid.secondsToEclipseStart).toBeCloseTo((1 - f / 2) * T, 6); // next orbit's eclipse

    const late = nextOrbitEvents(profile, 0.9 * T);
    expect(late.inGroundContact).toBe(true);
    expect(late.secondsToContactEnd).toBeCloseTo(0.06 * T, 6);
    expect(late.secondsToContactStart).toBeCloseTo(0.88 * T, 6);
  });

  it("is consistent with the timeline intervals and the state at the predicted time", () => {
    const timeline = buildOrbitTimeline(profile, 3);
    for (let i = 0; i < 300; i++) {
      const t = (i + 0.31) * (2 * T / 300);
      const next = nextOrbitEvents(profile, t);
      for (const seconds of [next.secondsToEclipseStart!, next.secondsToEclipseEnd!, next.secondsToContactStart, next.secondsToContactEnd]) {
        expect(seconds).toBeGreaterThan(0);
        expect(seconds).toBeLessThanOrEqual(T);
      }
      const nextStart = timeline.eclipseIntervals.find((interval) => interval.startSeconds > t)!.startSeconds;
      const nextEnd = timeline.eclipseIntervals.find((interval) => interval.endSeconds > t)!.endSeconds;
      expect(t + next.secondsToEclipseStart!).toBeCloseTo(nextStart, 5);
      expect(t + next.secondsToEclipseEnd!).toBeCloseTo(nextEnd, 5);
      expect(orbitStateAt(profile, t + next.secondsToEclipseStart! + 1).illumination).toBe("eclipse");
      expect(orbitStateAt(profile, t + next.secondsToEclipseEnd! + 1).illumination).toBe("sunlight");
    }
  });

  it("reports a transition happening now one period ahead and null without eclipse", () => {
    expect(nextOrbitEvents(profile, T / 2 + 0).secondsToEclipseStart).toBeLessThanOrEqual(T);
    const quarter = nextOrbitEvents({ ...profile, eclipseFraction: 0.5 }, T / 4); // start exactly at 0.25
    expect(quarter.illumination).toBe("eclipse");
    expect(quarter.secondsToEclipseStart).toBe(T);
    const sunlit = nextOrbitEvents(withBetaAngle(profile, 80), 100);
    expect(sunlit.secondsToEclipseStart).toBeNull();
    expect(sunlit.secondsToEclipseEnd).toBeNull();
    expect(() => nextOrbitEvents(profile, -1)).toThrow(RangeError);
  });
});

describe("configurable fictional contact window", () => {
  const profile = computeOrbitProfile({ altitudeKm: 450 });
  const T = profile.periodSeconds;
  const window = { startFraction: 0.1, endFraction: 0.3 };

  it("defaults to the mission engine's window", () => {
    for (const phase of [0, 0.5, 0.78, 0.9, 0.96]) {
      expect(hasGroundContact(phase, { startFraction: 0.78, endFraction: 0.96 })).toBe(hasGroundContact(phase));
    }
  });
  it("applies a custom window to predicate, state, countdown and timeline", () => {
    expect(hasGroundContact(0.1, window)).toBe(true);
    expect(hasGroundContact(0.3, window)).toBe(false);
    expect(hasGroundContact(0.85, window)).toBe(false);
    expect(orbitStateAt(profile, 0.2 * T, { contactWindow: window }).inGroundContact).toBe(true);
    expect(orbitStateAt(profile, 0.2 * T).inGroundContact).toBe(false);
    expect(nextOrbitEvents(profile, 0, { contactWindow: window }).secondsToContactStart).toBeCloseTo(0.1 * T, 6);
    const timeline = buildOrbitTimeline(profile, 2, { contactWindow: window });
    expect(timeline.groundContactIntervals[1].startSeconds).toBeCloseTo(1.1 * T, 6);
    expect(timeline.groundContactIntervals[1].endSeconds).toBeCloseTo(1.3 * T, 6);
    const inContact = timeline.samples.filter((sample) => sample.inGroundContact).length;
    expect(inContact / timeline.samples.length).toBeCloseTo(0.2, 2);
  });
  it("rejects malformed windows", () => {
    for (const bad of [
      { startFraction: 0.5, endFraction: 0.5 },
      { startFraction: 0.6, endFraction: 0.4 },
      { startFraction: -0.1, endFraction: 0.4 },
      { startFraction: 0.2, endFraction: 1.1 },
      { startFraction: NaN, endFraction: 0.4 },
    ]) {
      expect(() => hasGroundContact(0.2, bad)).toThrow(RangeError);
      expect(() => buildOrbitTimeline(profile, 1, { contactWindow: bad })).toThrow(RangeError);
    }
  });
});

describe("derived facts and validity notes", () => {
  // Computed outside the engine (Python floats) with R = 6371 km and the engine's μ.
  it.each([
    { altitudeKm: 450, revolutionsPerDay: 15.410995, horizonDistanceKm: 2436.4729, horizonCentralAngleDeg: 20.928443, visibleSurfaceFraction: 0.032986, criticalBeta: 69.071557 },
    { altitudeKm: 1000, revolutionsPerDay: 13.718706, horizonDistanceKm: 3707.0204, horizonCentralAngleDeg: 30.193348, visibleSurfaceFraction: 0.067833, criticalBeta: 59.806652 },
  ])("matches the reference at $altitudeKm km", (ref) => {
    const profile = computeOrbitProfile({ altitudeKm: ref.altitudeKm });
    const facts = computeOrbitFacts(profile);
    expect(Math.abs(facts.revolutionsPerDay - ref.revolutionsPerDay)).toBeLessThan(1e-5);
    expect(Math.abs(facts.horizonDistanceKm - ref.horizonDistanceKm)).toBeLessThan(1e-3);
    expect(Math.abs(facts.horizonCentralAngleDeg - ref.horizonCentralAngleDeg)).toBeLessThan(1e-5);
    expect(Math.abs(facts.visibleSurfaceFraction - ref.visibleSurfaceFraction)).toBeLessThan(1e-6);
    expect(Math.abs(facts.criticalBetaDeg - ref.criticalBeta)).toBeLessThan(1e-5);
    expect(facts.eclipseSecondsPerOrbit).toBe(profile.eclipseFraction * profile.periodSeconds);
    // Horizon and critical-beta angles are complementary: acos(R/r) + asin(R/r) = 90°.
    expect(facts.horizonCentralAngleDeg + facts.criticalBetaDeg).toBeCloseTo(90, 10);
    // Pythagoras on the tangent line.
    expect(facts.horizonDistanceKm ** 2 + EARTH_RADIUS_KM ** 2).toBeCloseTo(profile.orbitalRadiusKm ** 2, 4);
  });

  it("emits advisory notes only where they apply", () => {
    const codes = (altitudeKm: number, orbits?: number) =>
      orbitValidityNotes(computeOrbitProfile({ altitudeKm }), orbits).map((note) => note.code);
    expect(codes(450)).toEqual([]);
    expect(codes(450, 6)).toEqual([]);
    expect(codes(250)).toEqual(["drag-not-modeled"]);
    expect(codes(300)).toEqual([]);
    expect(codes(2000)).toEqual([]);
    expect(codes(20000)).toEqual(["above-leo"]);
    expect(codes(450, 30)).toEqual(["fixed-sun-direction"]); // 30 × 93.4 min > 1 day
    expect(codes(450, 15)).toEqual([]); // 15 × 93.4 min < 1 day
    expect(codes(250, 30)).toEqual(["drag-not-modeled", "fixed-sun-direction"]);
    for (const note of orbitValidityNotes(computeOrbitProfile({ altitudeKm: 250 }), 30)) {
      expect(note.message.length).toBeGreaterThan(20);
    }
    expect(() => orbitValidityNotes(computeOrbitProfile({ altitudeKm: 450 }), 0)).toThrow(RangeError);
    expect(() => orbitValidityNotes(computeOrbitProfile({ altitudeKm: 450 }), NaN)).toThrow(RangeError);
  });
});
