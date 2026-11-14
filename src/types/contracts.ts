/** Shared interfaces. Any breaking change requires integrator approval. */
export type ComponentCategory = "payload" | "solar" | "battery" | "communications";

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
  sourceUrl?: string;
  isSynthetic: boolean;
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
