import {
  budgetLimitCredits,
  components,
  fixedBusCostCredits,
  fixedBusMassKg,
  fixedBusPowerW,
  launchers,
} from "../data/catalog";
import type { DesignAssessment, MissionConfig, SpaceComponent } from "../types/contracts";

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
  if (solarGenerationW <= nominalPowerW) warnings.push("Solar generation cannot cover nominal load during sunlight.");
  if (batteryCapacityWh < nominalPowerW) warnings.push("Battery capacity is low relative to one hour of nominal demand.");
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
