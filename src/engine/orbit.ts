import type { MissionConfig, OrbitProfile } from "../types/contracts";

export const EARTH_RADIUS_KM = 6371;
export const EARTH_MU_KM3_S2 = 398600.4418;

/** Fictional ground-contact window as orbit fractions [start, end). Game parameter, not visibility geometry. */
export const GROUND_CONTACT_START_FRACTION = 0.78;
export const GROUND_CONTACT_END_FRACTION = 0.96;

/** Text a UI should show next to any view driven by the timeline below. */
export const ORBIT_MODEL_NOTICE =
  "Idealized educational model: circular two-body orbit, spherical Earth, Sun in the orbital plane (beta 0°), " +
  "cylindrical shadow and a fictional ground-contact window. Not a high-fidelity propagation; not for mission planning.";

/**
 * Educational circular orbit with maximal eclipse (solar beta angle = 0).
 * Assumes a spherical Earth, point-like Sun and no perturbations.
 */
export function computeOrbitProfile(config: Pick<MissionConfig, "altitudeKm">): OrbitProfile {
  const h = config.altitudeKm;
  if (!Number.isFinite(h) || h < 160 || h > 40000) {
    throw new RangeError("Altitude must be between 160 and 40,000 km.");
  }
  const radius = EARTH_RADIUS_KM + h;
  const periodSeconds = 2 * Math.PI * Math.sqrt(radius ** 3 / EARTH_MU_KM3_S2);
  const eclipseFraction = Math.asin(EARTH_RADIUS_KM / radius) / Math.PI;
  return {
    altitudeKm: h,
    orbitalRadiusKm: radius,
    periodSeconds,
    speedKmPerSecond: Math.sqrt(EARTH_MU_KM3_S2 / radius),
    eclipseFraction,
    sunlightFraction: 1 - eclipseFraction,
  };
}

/** The eclipsed interval is centered at 50% of each idealized orbit. */
export function isInEclipse(orbitFraction: number, eclipseFraction: number): boolean {
  if (!Number.isFinite(orbitFraction)) throw new RangeError("Orbit fraction must be finite.");
  if (!Number.isFinite(eclipseFraction) || eclipseFraction < 0 || eclipseFraction > 0.5) {
    throw new RangeError("Eclipse fraction must be between 0 and 0.5.");
  }
  const phase = ((orbitFraction % 1) + 1) % 1;
  const half = eclipseFraction / 2;
  return phase >= 0.5 - half && phase < 0.5 + half;
}

/** A fictional ground contact window; not a real visibility calculation. */
export function hasGroundContact(orbitFraction: number): boolean {
  if (!Number.isFinite(orbitFraction)) throw new RangeError("Orbit fraction must be finite.");
  const phase = ((orbitFraction % 1) + 1) % 1;
  return phase >= GROUND_CONTACT_START_FRACTION && phase < GROUND_CONTACT_END_FRACTION;
}

/* -------------------------------------------------------------------------------------------
 * Time-tagged output for presentation layers (orbit view, illumination/position/clock indicators).
 *
 * These types are deliberately local to the orbit engine: src/types/contracts.ts is unchanged.
 * Everything here is a closed-form evaluation of the idealized model above. Nothing is propagated
 * numerically and no perturbation, inclination, Earth rotation or ephemeris is involved.
 * ----------------------------------------------------------------------------------------- */

/** Half-open time interval [startSeconds, endSeconds) in mission elapsed time. */
export interface OrbitInterval {
  /** Zero-based revolution that contains the interval. */
  orbitIndex: number;
  startSeconds: number;
  endSeconds: number;
}

export interface OrbitStateSample {
  /** Mission elapsed time, s. Mission start (0 s) is at the subsolar point. */
  timeSeconds: number;
  /** Zero-based count of completed revolutions. */
  orbitIndex: number;
  /** Fraction of the current revolution in [0, 1). 0 = subsolar point, 0.5 = middle of the eclipse. */
  orbitFraction: number;
  /** Angle from the Sun direction to the spacecraft, measured in the direction of motion, rad in [0, 2π). */
  sunAngleRad: number;
  /**
   * Position in the orbital plane, km, Earth-centered and Sun-fixed: +x points to the Sun,
   * +y is the direction of motion at the subsolar point. This is not ECI/ECEF; the model has
   * no inclination, no node and no Earth rotation, so no ground track can be derived from it.
   */
  positionKm: { x: number; y: number };
  illumination: "sunlight" | "eclipse";
  /** True inside the fictional contact window; unrelated to any real ground station. */
  inGroundContact: boolean;
}

export interface OrbitTimeline {
  model: {
    kind: "circular-two-body-beta-zero";
    fidelity: "educational-idealization";
    frame: "sun-fixed-orbital-plane";
    notice: string;
  };
  profile: OrbitProfile;
  /** Radius of the reference sphere and of the cylindrical shadow (axis along −x), km. */
  earthRadiusKm: number;
  durationSeconds: number;
  /** Uniform spacing of `samples`, s. */
  stepSeconds: number;
  /** Uniform samples from 0 s to durationSeconds inclusive. */
  samples: OrbitStateSample[];
  /** Exact model transitions; prefer these over sample flags to place sunlight/eclipse boundaries. */
  eclipseIntervals: OrbitInterval[];
  groundContactIntervals: OrbitInterval[];
}

const MAX_TIMELINE_SAMPLES = 100_000;
/** Revolutions; about 6e-9 s at 450 km, far below any displayed resolution. */
const REVOLUTION_SNAP = 1e-12;

function assertProfile(profile: OrbitProfile): void {
  const { orbitalRadiusKm: r, periodSeconds: T, eclipseFraction: f } = profile;
  if (!Number.isFinite(r) || r <= EARTH_RADIUS_KM) throw new RangeError("Orbital radius must exceed the Earth radius.");
  if (!Number.isFinite(T) || T <= 0) throw new RangeError("Orbital period must be positive.");
  if (!Number.isFinite(f) || f < 0 || f > 0.5) throw new RangeError("Eclipse fraction must be between 0 and 0.5.");
}

/**
 * State of the idealized orbit at a mission elapsed time (s ≥ 0).
 * Uniform circular motion: angle = 2π·t/T, |position| = orbital radius.
 * Uses the same eclipse and contact predicates as the mission engine.
 */
export function orbitStateAt(profile: OrbitProfile, timeSeconds: number): OrbitStateSample {
  assertProfile(profile);
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) throw new RangeError("Time must be a finite, non-negative number of seconds.");
  let revolutions = timeSeconds / profile.periodSeconds;
  // k·T / T can round to just below k; snap so a completed revolution reads (k, 0), not (k − 1, 0.999…).
  const nearest = Math.round(revolutions);
  if (Math.abs(revolutions - nearest) < REVOLUTION_SNAP) revolutions = nearest;
  const orbitIndex = Math.floor(revolutions);
  const orbitFraction = revolutions - orbitIndex;
  const sunAngleRad = 2 * Math.PI * orbitFraction;
  return {
    timeSeconds,
    orbitIndex,
    orbitFraction,
    sunAngleRad,
    positionKm: {
      x: profile.orbitalRadiusKm * Math.cos(sunAngleRad),
      y: profile.orbitalRadiusKm * Math.sin(sunAngleRad),
    },
    illumination: isInEclipse(orbitFraction, profile.eclipseFraction) ? "eclipse" : "sunlight",
    inGroundContact: hasGroundContact(orbitFraction),
  };
}

/**
 * Deterministic timeline for a whole mission: uniform samples plus exact eclipse/contact intervals.
 * @param durationOrbits positive integer number of revolutions (MissionConfig.durationOrbits)
 * @param samplesPerOrbit integer ≥ 4; 120 gives a 3° step, about 47 s at 450 km
 */
export function buildOrbitTimeline(profile: OrbitProfile, durationOrbits: number, samplesPerOrbit = 120): OrbitTimeline {
  assertProfile(profile);
  if (!Number.isInteger(durationOrbits) || durationOrbits < 1) throw new RangeError("Duration must be a positive integer number of orbits.");
  if (!Number.isInteger(samplesPerOrbit) || samplesPerOrbit < 4) throw new RangeError("Samples per orbit must be an integer of at least 4.");
  const sampleCount = durationOrbits * samplesPerOrbit + 1;
  if (sampleCount > MAX_TIMELINE_SAMPLES) throw new RangeError(`Timeline is limited to ${MAX_TIMELINE_SAMPLES} samples.`);

  const T = profile.periodSeconds;
  const samples: OrbitStateSample[] = [];
  for (let i = 0; i < sampleCount; i++) samples.push(orbitStateAt(profile, (i / samplesPerOrbit) * T));

  const half = profile.eclipseFraction / 2;
  const eclipseIntervals: OrbitInterval[] = [];
  const groundContactIntervals: OrbitInterval[] = [];
  for (let orbitIndex = 0; orbitIndex < durationOrbits; orbitIndex++) {
    if (half > 0) {
      eclipseIntervals.push({ orbitIndex, startSeconds: (orbitIndex + 0.5 - half) * T, endSeconds: (orbitIndex + 0.5 + half) * T });
    }
    groundContactIntervals.push({
      orbitIndex,
      startSeconds: (orbitIndex + GROUND_CONTACT_START_FRACTION) * T,
      endSeconds: (orbitIndex + GROUND_CONTACT_END_FRACTION) * T,
    });
  }

  return {
    model: {
      kind: "circular-two-body-beta-zero",
      fidelity: "educational-idealization",
      frame: "sun-fixed-orbital-plane",
      notice: ORBIT_MODEL_NOTICE,
    },
    profile: { ...profile },
    earthRadiusKm: EARTH_RADIUS_KM,
    durationSeconds: durationOrbits * T,
    stepSeconds: T / samplesPerOrbit,
    samples,
    eclipseIntervals,
    groundContactIntervals,
  };
}
