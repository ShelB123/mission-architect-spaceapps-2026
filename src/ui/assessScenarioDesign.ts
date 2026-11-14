import { missionScenarios, type MissionScenarioId } from "../engine/game";
import { evaluateDesign } from "../engine/resources";
import type { DesignAssessment, MissionConfig } from "../types/contracts";

/**
 * Preflight policy overlay only: all engineering quantities come from resources.
 * game.ts currently exposes no standalone scenario assessment; parity tests keep
 * these two scenario gates aligned with its authoritative launch validation.
 * Never call runMission during rendering just to obtain its design assessment.
 */
export function assessScenarioDesign(config: MissionConfig, scenarioId: MissionScenarioId): DesignAssessment {
  const assessment = evaluateDesign(config);
  const scenario = missionScenarios[scenarioId];
  const budgetLimitCredits = Math.min(assessment.budgetLimitCredits, scenario.budgetCredits);
  const violations = [...assessment.violations];
  if (assessment.totalCostCredits > budgetLimitCredits &&
      assessment.totalCostCredits <= assessment.budgetLimitCredits) {
    violations.push(`Scenario budget exceeded by ${assessment.totalCostCredits - budgetLimitCredits} credits.`);
  }
  if (config.durationOrbits > scenario.maxOrbits) {
    violations.push(`Scenario deadline exceeded: at most ${scenario.maxOrbits} orbits.`);
  }
  return { ...assessment, budgetLimitCredits, violations, warnings: [...assessment.warnings] };
}
