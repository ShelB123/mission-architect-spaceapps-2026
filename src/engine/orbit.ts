import type { MissionConfig, OrbitProfile } from "../types/contracts";

export const EARTH_RADIUS_KM = 6371;
export const EARTH_MU_KM3_S2 = 398600.4418;

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
  const phase = ((orbitFraction % 1) + 1) % 1;
  const half = eclipseFraction / 2;
  return phase >= 0.5 - half && phase < 0.5 + half;
}

/** A fictional ground contact window; not a real visibility calculation. */
export function hasGroundContact(orbitFraction: number): boolean {
  const phase = ((orbitFraction % 1) + 1) % 1;
  return phase >= 0.78 && phase < 0.96;
}
