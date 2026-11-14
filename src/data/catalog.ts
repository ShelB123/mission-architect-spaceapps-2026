import type { Launcher, MissionConfig, SpaceComponent } from "../types/contracts";

/**
 * All hardware parameters, prices, and launcher limits below are FICTIONAL
 * game balance values, NOT NASA performance or vendor specifications.
 */
export const components: SpaceComponent[] = [
  { id: "camera-basic", name: "Survey Camera", category: "payload", description: "Lower power, moderate science return.", massKg: 3, costCredits: 120, nominalPowerW: 7, scienceMBperMinute: 1.3, isSynthetic: true },
  { id: "camera-hd", name: "High-Resolution Imager", category: "payload", description: "More data, substantially higher power draw.", massKg: 12, costCredits: 420, nominalPowerW: 42, scienceMBperMinute: 4.8, isSynthetic: true },
  { id: "solar-basic", name: "Standard Solar Array", category: "solar", description: "Lightweight solar generation.", massKg: 4, costCredits: 80, nominalPowerW: 0, solarGenerationW: 60, isSynthetic: true },
  { id: "solar-advanced", name: "Expanded Solar Array", category: "solar", description: "Higher generation at mass and budget cost.", massKg: 7, costCredits: 220, nominalPowerW: 0, solarGenerationW: 150, isSynthetic: true },
  { id: "battery-basic", name: "Compact Battery", category: "battery", description: "A limited energy reserve.", massKg: 3, costCredits: 75, nominalPowerW: 0, batteryCapacityWh: 110, isSynthetic: true },
  { id: "battery-advanced", name: "Extended Battery", category: "battery", description: "More reserve capacity for eclipse.", massKg: 7, costCredits: 190, nominalPowerW: 0, batteryCapacityWh: 380, isSynthetic: true },
  { id: "radio-basic", name: "Basic Downlink", category: "communications", description: "Small science data transmission capacity.", massKg: 2, costCredits: 80, nominalPowerW: 9, downlinkMBperMinute: 3.5, isSynthetic: true },
  { id: "radio-advanced", name: "High-Rate Downlink", category: "communications", description: "More data transmitted per communication window.", massKg: 4, costCredits: 210, nominalPowerW: 18, downlinkMBperMinute: 14, isSynthetic: true },
];

export const launchers: Launcher[] = [
  { id: "rideshare", name: "Shared Launch", massLimitKg: 28, costCredits: 120, isSynthetic: true },
  { id: "dedicated", name: "Dedicated Launch", massLimitKg: 55, costCredits: 300, isSynthetic: true },
];

export const categoryOrder = ["payload", "solar", "battery", "communications"] as const;
export const fixedBusMassKg = 8;
export const fixedBusPowerW = 12;
export const fixedBusCostCredits = 120;
export const budgetLimitCredits = 1400;
export const scienceTargetMB = 250;

export const defaultMission: MissionConfig = {
  altitudeKm: 450,
  durationOrbits: 6,
  selectedComponentIds: ["camera-basic", "solar-basic", "battery-basic", "radio-basic"],
  launcherId: "rideshare",
};
