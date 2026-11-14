import {
  budgetLimitCredits,
  components,
  fixedBusCostCredits,
  fixedBusMassKg,
  fixedBusPowerW,
  launchers,
} from "../data/catalog";
import type { DesignAssessment, MissionConfig, SpaceComponent } from "../types/contracts";
import { computeOrbitProfile } from "./orbit";

export function getSelectedComponents(config: MissionConfig): SpaceComponent[] {
  const selected = config.selectedComponentIds.map((id) => components.find((c) => c.id === id));
  if (selected.some((c) => c === undefined)) {
    throw new Error("The mission includes an unknown component.");
  }
  return selected as SpaceComponent[];
}

export function evaluateDesign(config: MissionConfig): DesignAssessment {
  const selected = getSelectedComponents(config);
  const launcher = launchers.find((l) => l.id === config.launcherId);
  if (!launcher) throw new Error("Unknown launcher.");

  const totalMassKg = fixedBusMassKg + selected.reduce((v, c) => v + c.massKg, 0);
  const totalCostCredits = fixedBusCostCredits + launcher.costCredits
    + selected.reduce((v, c) => v + c.costCredits, 0);
  const nominalPowerW = fixedBusPowerW + selected.reduce((v, c) => v + c.nominalPowerW, 0);
  const solarGenerationW = selected.reduce((v, c) => v + (c.solarGenerationW ?? 0), 0);
  const batteryCapacityWh = selected.reduce((v, c) => v + (c.batteryCapacityWh ?? 0), 0);
  const violations: string[] = [];
  const warnings: string[] = [];

  for (const category of ["payload", "solar", "battery", "communications"] as const) {
    const count = selected.filter((c) => c.category === category).length;
    if (count !== 1) violations.push(`Select exactly one ${category} component (currently ${count}).`);
  }
  if (totalMassKg > launcher.massLimitKg) violations.push(`Launch mass exceeded by ${(totalMassKg - launcher.massLimitKg).toFixed(1)} kg.`);
  if (totalCostCredits > budgetLimitCredits) violations.push(`Budget exceeded by ${totalCostCredits - budgetLimitCredits} credits.`);
  // Educational idealization: continuous nominal loads, ideal storage, and
  // full rated panel output in sunlight. Orbital geometry comes from orbit.ts.
  const orbit = computeOrbitProfile(config);
  const averageGenerationW = solarGenerationW * orbit.sunlightFraction;
  const eclipseDemandWh = nominalPowerW * orbit.periodSeconds * orbit.eclipseFraction / 3600;

  if (solarGenerationW < nominalPowerW) {
    warnings.push(`Daylight solar generation (${solarGenerationW.toFixed(2)} W) is below continuous nominal load (${nominalPowerW.toFixed(2)} W).`);
  } else if (solarGenerationW === nominalPowerW) {
    warnings.push("Daylight generation equals nominal load; no surplus remains to recharge after eclipse.");
  }
  if (averageGenerationW + 1e-9 < nominalPowerW) {
    warnings.push(`Orbit-average solar generation (${averageGenerationW.toFixed(2)} W) is below nominal load (${nominalPowerW.toFixed(2)} W); batteries cannot sustain that deficit indefinitely.`);
  }
  if (batteryCapacityWh + 1e-9 < eclipseDemandWh) {
    warnings.push(`Full-eclipse energy demand (${eclipseDemandWh.toFixed(2)} Wh) exceeds battery capacity (${batteryCapacityWh.toFixed(2)} Wh) at continuous nominal load.`);
  }

  const payloadRate = selected.find((c) => c.category === "payload")?.scienceMBperMinute ?? 0;
  const radioRate = selected.find((c) => c.category === "communications")?.downlinkMBperMinute ?? 0;
  if (payloadRate > 0 && radioRate <= payloadRate) {
    warnings.push(`Radio peak downlink (${radioRate.toFixed(2)} MB/min) does not exceed payload production (${payloadRate.toFixed(2)} MB/min); intermittent contact further limits returned data.`);
  }
  if (config.durationOrbits < 1 || config.durationOrbits > 30 || !Number.isInteger(config.durationOrbits)) {
    violations.push("Mission duration must be an integer between 1 and 30 orbits.");
  }
  return {
    totalMassKg,
    totalCostCredits,
    nominalPowerW,
    solarGenerationW,
    batteryCapacityWh,
    massLimitKg: launcher.massLimitKg,
    budgetLimitCredits,
    violations,
    warnings,
  };
}
