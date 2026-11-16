/** Shared interfaces. Any breaking change requires integrator approval. */
export type ComponentCategory = "payload" | "solar" | "battery" | "communications"
  | "attitude" | "computer" | "thermal" | "propulsion";

export interface SpaceComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  massKg: number;
  costCredits: number;
  nominalPowerW: number;
  solarGenerationW?: number;
  batteryCapacityWh?: number;
  scienceMBperMinute?: number;
  downlinkMBperMinute?: number;
  /** Synthetic multipliers (1 = no effect). See resources.ts designEffects. */
  scienceRateMultiplier?: number;
  downlinkRateMultiplier?: number;
  batteryCapacityMultiplier?: number;
  /** Fraction of the calibration pause that remains (1 = full pause). */
  calibrationFactor?: number;
  /** Fraction of the ground-station outage that remains (1 = full outage). */
  stationOutageFactor?: number;
  /** Capability tags matched by DesignSynergy.requiresTags. */
  tags?: string[];
  /** Qualitative real-world example of the technology class (no borrowed numbers). */
  context?: string;
  sourceUrl?: string;
  isSynthetic: boolean;
}

/** Synthetic combination bonus, active when all tags are present in the design. */
export interface DesignSynergy {
  id: string;
  name: string;
  description: string;
  requiresTags: string[];
  scienceRateMultiplier?: number;
  downlinkRateMultiplier?: number;
  batteryCapacityMultiplier?: number;
  stationOutageFactor?: number;
}

/** Combined effect of support subsystems and active synergies. All 1 for the MVP kit. */
export interface DesignEffects {
  scienceRateMultiplier: number;
  downlinkRateMultiplier: number;
  batteryCapacityMultiplier: number;
  calibrationFactor: number;
  stationOutageFactor: number;
  activeSynergyIds: string[];
}

export interface Launcher {
  id: string;
  name: string;
  massLimitKg: number;
  costCredits: number;
  isSynthetic: boolean;
}

export interface MissionConfig {
  altitudeKm: number;
  durationOrbits: number;
  selectedComponentIds: string[];
  launcherId: string;
}

export interface OrbitProfile {
  altitudeKm: number;
  orbitalRadiusKm: number;
  periodSeconds: number;
  speedKmPerSecond: number;
  eclipseFraction: number;
  sunlightFraction: number;
}

export interface DesignAssessment {
  totalMassKg: number;
  totalCostCredits: number;
  nominalPowerW: number;
  solarGenerationW: number;
  batteryCapacityWh: number;
  massLimitKg: number;
  budgetLimitCredits: number;
  violations: string[];
  warnings: string[];
}

export interface MissionResult {
  success: boolean;
  score: number;
  scienceCompletion: number;
  producedMB: number;
  transmittedMB: number;
  targetMB: number;
  energyOutageCount: number;
  batteryHistoryWh: number[];
  dataHistoryMB: number[];
  events: string[];
  explanations: string[];
  orbit: OrbitProfile;
  design: DesignAssessment;
}

export type MissionPhase = "briefing" | "design" | "review" | "operations" | "debrief";
