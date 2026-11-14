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

/** Fictional contact window as orbit fractions [startFraction, endFraction), 0 ≤ start < end ≤ 1. */
export interface ContactWindow {
  startFraction: number;
  endFraction: number;
}

export const DEFAULT_CONTACT_WINDOW: Readonly<ContactWindow> = Object.freeze({
  startFraction: GROUND_CONTACT_START_FRACTION,
  endFraction: GROUND_CONTACT_END_FRACTION,
});

function assertContactWindow(window: ContactWindow): void {
  const { startFraction: a, endFraction: b } = window;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b > 1 || a >= b) {
    throw new RangeError("Contact window must satisfy 0 <= start < end <= 1.");
  }
}

/**
 * A fictional ground contact window; not a real visibility calculation.
 * A scenario may pass another window; it stays a game parameter either way.
 */
export function hasGroundContact(orbitFraction: number, window: ContactWindow = DEFAULT_CONTACT_WINDOW): boolean {
  if (!Number.isFinite(orbitFraction)) throw new RangeError("Orbit fraction must be finite.");
  assertContactWindow(window);
  const phase = ((orbitFraction % 1) + 1) % 1;
  return phase >= window.startFraction && phase < window.endFraction;
}

/* -------------------------------------------------------------------------------------------
 * Solar beta angle (optional). computeOrbitProfile keeps beta = 0; nothing below changes it.
 * ----------------------------------------------------------------------------------------- */

const DEG = Math.PI / 180;

function assertBeta(betaDeg: number): void {
  if (!Number.isFinite(betaDeg) || betaDeg < -90 || betaDeg > 90) {
    throw new RangeError("Beta angle must be between -90 and 90 degrees.");
  }
}

function assertRadius(orbitalRadiusKm: number): void {
  if (!Number.isFinite(orbitalRadiusKm) || orbitalRadiusKm <= EARTH_RADIUS_KM) {
    throw new RangeError("Orbital radius must exceed the Earth radius.");
  }
}

/**
 * Largest |beta| (degrees) at which a circular orbit of this radius still crosses the
 * cylindrical shadow: asin(R/r). Above it the idealized orbit is continuously sunlit.
 */
export function criticalBetaDeg(orbitalRadiusKm: number): number {
  assertRadius(orbitalRadiusKm);
  return Math.asin(EARTH_RADIUS_KM / orbitalRadiusKm) / DEG;
}

/**
 * Eclipse fraction of a circular orbit for a fixed solar beta angle (angle between the Sun
 * direction and the orbital plane, degrees), cylindrical shadow, spherical Earth:
 *   f = acos( sqrt(r² − R²) / (r·cos β) ) / π   for |β| < asin(R/r), otherwise 0.
 * Beta is held constant; its real seasonal and precession-driven drift is not modeled.
 */
export function eclipseFractionAtBeta(orbitalRadiusKm: number, betaDeg = 0): number {
  assertRadius(orbitalRadiusKm);
  assertBeta(betaDeg);
  // Same expression as computeOrbitProfile, so beta = 0 is bit-identical to the mission engine.
  if (betaDeg === 0) return Math.asin(EARTH_RADIUS_KM / orbitalRadiusKm) / Math.PI;
  const ratio = Math.sqrt(orbitalRadiusKm ** 2 - EARTH_RADIUS_KM ** 2) / (orbitalRadiusKm * Math.cos(betaDeg * DEG));
  return ratio >= 1 ? 0 : Math.acos(ratio) / Math.PI;
}

/** Copy of a profile with eclipse and sunlight fractions recomputed for a fixed beta angle. */
export function withBetaAngle(profile: OrbitProfile, betaDeg: number): OrbitProfile {
  const eclipseFraction = eclipseFractionAtBeta(profile.orbitalRadiusKm, betaDeg);
  return { ...profile, eclipseFraction, sunlightFraction: 1 - eclipseFraction };
}

/* -------------------------------------------------------------------------------------------
 * Derived teaching quantities and validity notes. Closed forms of the same spherical model.
 * ----------------------------------------------------------------------------------------- */

export interface OrbitFacts {
  /** Revolutions per 86,400 s day. */
  revolutionsPerDay: number;
  /** Straight-line distance from the spacecraft to the horizon of the reference sphere, km: sqrt(r² − R²). */
  horizonDistanceKm: number;
  /** Earth-central angle from the sub-satellite point to the horizon, degrees: acos(R/r). No refraction, no elevation mask. */
  horizonCentralAngleDeg: number;
  /** Fraction of the sphere's surface inside that horizon: (1 − R/r)/2. */
  visibleSurfaceFraction: number;
  /** See criticalBetaDeg. */
  criticalBetaDeg: number;
  /** Eclipse duration per revolution at the profile's eclipse fraction, s. */
  eclipseSecondsPerOrbit: number;
}

export function computeOrbitFacts(profile: OrbitProfile): OrbitFacts {
  assertProfile(profile);
  const r = profile.orbitalRadiusKm;
  return {
    revolutionsPerDay: 86400 / profile.periodSeconds,
    horizonDistanceKm: Math.sqrt(r ** 2 - EARTH_RADIUS_KM ** 2),
    horizonCentralAngleDeg: Math.acos(EARTH_RADIUS_KM / r) / DEG,
    visibleSurfaceFraction: (1 - EARTH_RADIUS_KM / r) / 2,
    criticalBetaDeg: criticalBetaDeg(r),
    eclipseSecondsPerOrbit: profile.eclipseFraction * profile.periodSeconds,
  };
}

/** Advisory thresholds chosen for the game's messages; they are not physical limits or NASA values. */
export const DRAG_NOTE_BELOW_KM = 300;
export const LEO_UPPER_ALTITUDE_KM = 2000;
export const FIXED_SUN_NOTE_ABOVE_SECONDS = 86400;

export interface OrbitValidityNote {
  code: "drag-not-modeled" | "above-leo" | "fixed-sun-direction";
  message: string;
}

/**
 * Plain-language reminders of where the idealized model stops being representative.
 * Advisory only: they never change a result and are not an exhaustive error budget.
 */
export function orbitValidityNotes(profile: OrbitProfile, durationOrbits?: number): OrbitValidityNote[] {
  assertProfile(profile);
  if (durationOrbits !== undefined && (!Number.isFinite(durationOrbits) || durationOrbits <= 0)) {
    throw new RangeError("Duration must be a positive number of orbits.");
  }
  const altitudeKm = profile.orbitalRadiusKm - EARTH_RADIUS_KM;
  const notes: OrbitValidityNote[] = [];
  if (altitudeKm < DRAG_NOTE_BELOW_KM) {
    notes.push({
      code: "drag-not-modeled",
      message: "Atmospheric drag is not modeled. A real spacecraft this low gradually loses altitude; this game keeps the orbit fixed.",
    });
  }
  if (altitudeKm > LEO_UPPER_ALTITUDE_KM) {
    notes.push({
      code: "above-leo",
      message: "This altitude is above low Earth orbit. The game's eclipse and contact idealizations were chosen for LEO and are less representative here.",
    });
  }
  if (durationOrbits !== undefined && durationOrbits * profile.periodSeconds > FIXED_SUN_NOTE_ABOVE_SECONDS) {
    notes.push({
      code: "fixed-sun-direction",
      message: "The Sun direction is held fixed. Over more than a day the real geometry drifts (Earth moves about 1° per day around the Sun).",
    });
  }
  return notes;
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
   * Position in the orbital plane, km, Earth-centered and Sun-fixed: +x points to the Sun
   * (to its projection on the orbital plane when beta ≠ 0), +y is the direction of motion there. This is not ECI/ECEF; the model has
   * no inclination, no node and no Earth rotation, so no ground track can be derived from it.
   */
  positionKm: { x: number; y: number };
  /** Velocity in the same frame, km/s: constant magnitude, perpendicular to the position. */
  velocityKmPerSecond: { x: number; y: number };
  illumination: "sunlight" | "eclipse";
  /** True inside the fictional contact window; unrelated to any real ground station. */
  inGroundContact: boolean;
}

export interface OrbitTimeline {
  model: {
    kind: "circular-two-body-beta-zero" | "circular-two-body-fixed-beta";
    fidelity: "educational-idealization";
    frame: "sun-fixed-orbital-plane";
    /** Sun elevation above the orbital plane (+z), degrees. 0 unless requested. */
    betaDeg: number;
    notice: string;
  };
  profile: OrbitProfile;
  /** Radius of the reference sphere and of the cylindrical shadow (axis opposite to the Sun direction), km. */
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

export interface OrbitStateOptions {
  /** Fictional contact window; defaults to DEFAULT_CONTACT_WINDOW. */
  contactWindow?: ContactWindow;
}

export interface OrbitTimelineOptions extends OrbitStateOptions {
  /** Integer ≥ 4; default 120 (3° per sample). */
  samplesPerOrbit?: number;
  /** Fixed solar beta angle, degrees. When given, it replaces the profile's eclipse fraction. */
  betaDeg?: number;
}

/** Countdowns for UI indicators. All values in seconds, strictly positive. */
export interface OrbitEventCountdown {
  timeSeconds: number;
  illumination: "sunlight" | "eclipse";
  /** null when this orbit has no eclipse. */
  secondsToEclipseStart: number | null;
  secondsToEclipseEnd: number | null;
  inGroundContact: boolean;
  secondsToContactStart: number;
  secondsToContactEnd: number;
}

const MAX_TIMELINE_SAMPLES = 100_000;
/** Revolutions; about 6e-9 s at 450 km, far below any displayed resolution. */
const REVOLUTION_SNAP = 1e-12;

function assertProfile(profile: OrbitProfile): void {
  const { orbitalRadiusKm: r, periodSeconds: T, eclipseFraction: f } = profile;
  if (!Number.isFinite(r) || r <= EARTH_RADIUS_KM) throw new RangeError("Orbital radius must exceed the Earth radius.");
  if (!Number.isFinite(T) || T <= 0) throw new RangeError("Orbital period must be positive.");
  if (!Number.isFinite(f) || f < 0 || f > 0.5) throw new RangeError("Eclipse fraction must be between 0 and 0.5.");
  if (!Number.isFinite(profile.speedKmPerSecond) || profile.speedKmPerSecond <= 0) throw new RangeError("Orbital speed must be positive.");
}

/**
 * State of the idealized orbit at a mission elapsed time (s ≥ 0).
 * Uniform circular motion: angle = 2π·t/T, |position| = orbital radius.
 * Uses the same eclipse and contact predicates as the mission engine.
 */
export function orbitStateAt(profile: OrbitProfile, timeSeconds: number, options: OrbitStateOptions = {}): OrbitStateSample {
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
    velocityKmPerSecond: {
      x: -profile.speedKmPerSecond * Math.sin(sunAngleRad),
      y: profile.speedKmPerSecond * Math.cos(sunAngleRad),
    },
    illumination: isInEclipse(orbitFraction, profile.eclipseFraction) ? "eclipse" : "sunlight",
    inGroundContact: hasGroundContact(orbitFraction, options.contactWindow),
  };
}

/**
 * Time until the next change of each indicator, from the same state as orbitStateAt.
 * A transition happening exactly now is reported one full period ahead, never as 0.
 */
export function nextOrbitEvents(profile: OrbitProfile, timeSeconds: number, options: OrbitStateOptions = {}): OrbitEventCountdown {
  const state = orbitStateAt(profile, timeSeconds, options);
  const window = options.contactWindow ?? DEFAULT_CONTACT_WINDOW;
  const until = (targetFraction: number): number => {
    const delta = (((targetFraction - state.orbitFraction) % 1) + 1) % 1;
    return (delta === 0 ? 1 : delta) * profile.periodSeconds;
  };
  const half = profile.eclipseFraction / 2;
  return {
    timeSeconds,
    illumination: state.illumination,
    secondsToEclipseStart: half > 0 ? until(0.5 - half) : null,
    secondsToEclipseEnd: half > 0 ? until(0.5 + half) : null,
    inGroundContact: state.inGroundContact,
    secondsToContactStart: until(window.startFraction),
    secondsToContactEnd: until(window.endFraction),
  };
}

/** Notice for a timeline built with a non-zero beta angle. */
export function orbitModelNotice(betaDeg = 0): string {
  assertBeta(betaDeg);
  if (betaDeg === 0) return ORBIT_MODEL_NOTICE;
  return (
    `Idealized educational model: circular two-body orbit, spherical Earth, Sun held ${betaDeg}° from the orbital plane ` +
    "(fixed beta angle), cylindrical shadow and a fictional ground-contact window. Not a high-fidelity propagation; not for mission planning."
  );
}

/**
 * Deterministic timeline for a whole mission: uniform samples plus exact eclipse/contact intervals.
 * @param durationOrbits positive integer number of revolutions (MissionConfig.durationOrbits)
 * @param samplingOrOptions samples per orbit (integer ≥ 4; 120 gives a 3° step, about 47 s at 450 km) or an options object
 */
export function buildOrbitTimeline(
  inputProfile: OrbitProfile,
  durationOrbits: number,
  samplingOrOptions: number | OrbitTimelineOptions = {},
): OrbitTimeline {
  const options: OrbitTimelineOptions =
    typeof samplingOrOptions === "number" ? { samplesPerOrbit: samplingOrOptions } : samplingOrOptions;
  const samplesPerOrbit = options.samplesPerOrbit ?? 120;
  const betaDeg = options.betaDeg ?? 0;
  const window = options.contactWindow ?? DEFAULT_CONTACT_WINDOW;
  assertProfile(inputProfile);
  assertContactWindow(window);
  // Without an explicit beta the caller's eclipse fraction is used as given.
  const profile = options.betaDeg === undefined ? inputProfile : withBetaAngle(inputProfile, betaDeg);
  if (!Number.isInteger(durationOrbits) || durationOrbits < 1) throw new RangeError("Duration must be a positive integer number of orbits.");
  if (!Number.isInteger(samplesPerOrbit) || samplesPerOrbit < 4) throw new RangeError("Samples per orbit must be an integer of at least 4.");
  const sampleCount = durationOrbits * samplesPerOrbit + 1;
  if (sampleCount > MAX_TIMELINE_SAMPLES) throw new RangeError(`Timeline is limited to ${MAX_TIMELINE_SAMPLES} samples.`);

  const T = profile.periodSeconds;
  const samples: OrbitStateSample[] = [];
  for (let i = 0; i < sampleCount; i++) samples.push(orbitStateAt(profile, (i / samplesPerOrbit) * T, { contactWindow: window }));

  const half = profile.eclipseFraction / 2;
  const eclipseIntervals: OrbitInterval[] = [];
  const groundContactIntervals: OrbitInterval[] = [];
  for (let orbitIndex = 0; orbitIndex < durationOrbits; orbitIndex++) {
    if (half > 0) {
      eclipseIntervals.push({ orbitIndex, startSeconds: (orbitIndex + 0.5 - half) * T, endSeconds: (orbitIndex + 0.5 + half) * T });
    }
    groundContactIntervals.push({
      orbitIndex,
      startSeconds: (orbitIndex + window.startFraction) * T,
      endSeconds: (orbitIndex + window.endFraction) * T,
    });
  }

  return {
    model: {
      kind: betaDeg === 0 ? "circular-two-body-beta-zero" : "circular-two-body-fixed-beta",
      fidelity: "educational-idealization",
      frame: "sun-fixed-orbital-plane",
      betaDeg,
      notice: orbitModelNotice(betaDeg),
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
