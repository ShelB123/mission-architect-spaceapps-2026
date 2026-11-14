import { budgetLimitCredits, scienceTargetMB } from "../data/catalog";
import { computeOrbitProfile, hasGroundContact, isInEclipse } from "./orbit";
import { evaluateDesign, getSelectedComponents } from "./resources";
import type { MissionConfig, MissionResult, OrbitProfile } from "../types/contracts";

/** Targets, deadlines and budgets are synthetic training settings, not NASA data. */
export const missionScenarios = Object.freeze({
  survey: Object.freeze({
    name: "Eyes on Earth", targetMB: scienceTargetMB, budgetCredits: budgetLimitCredits, maxOrbits: 30,
    lesson: "Balance energy availability and returned data; acquiring data alone does not complete the mission.",
  }),
  "budget-survey": Object.freeze({
    name: "Lean Survey", targetMB: 250, budgetCredits: 700, maxOrbits: 6,
    lesson: "Buy only the capacity needed: larger components also consume budget and launch mass.",
  }),
  "rapid-science": Object.freeze({
    name: "Rapid Science Return", targetMB: 1000, budgetCredits: budgetLimitCredits, maxOrbits: 6,
    lesson: "Match payload production to downlink capacity; a faster camera alone cannot remove a radio bottleneck.",
  }),
  endurance: Object.freeze({
    name: "Sustained Operations", targetMB: 600, budgetCredits: budgetLimitCredits, maxOrbits: 12,
    lesson: "Battery capacity bridges deficits; solar generation and load determine whether reserves recover.",
  }),
});
export type MissionScenarioId = keyof typeof missionScenarios;

interface TrainingEvent {
  kind: "calibration" | "station-offline";
  startSeconds: number;
  endSeconds: number;
}

/** Local Mulberry32 stream: uint32 input, no global state or wall-clock dependency. */
function randomStream(seed: number): () => number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError("Seed must be an integer between 0 and 4294967295.");
  }
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function scheduleEvents(random: () => number, periodSeconds: number, orbits: number): TrainingEvent[] {
  const calibrationOrbit = Math.floor(random() * orbits);
  const calibrationStart = (calibrationOrbit + 0.05 + 0.1 * random()) * periodSeconds;
  const stationOrbit = Math.floor(random() * orbits);
  return [
    { kind: "calibration", startSeconds: calibrationStart, endSeconds: calibrationStart + 600 },
    { kind: "station-offline", startSeconds: stationOrbit * periodSeconds, endSeconds: (stationOrbit + 1) * periodSeconds },
  ].sort((a, b) => a.startSeconds - b.startSeconds);
}

/**
 * Split resource integration at changes of illumination, fictional contact and training events.
 * Contact fractions mirror orbit.ts (0.78..0.96); coordinate changes with its owner.
 * This changes numerical integration, not the orbital model or contact geometry.
 */
function integrationBoundaries(orbit: OrbitProfile, orbits: number, events: TrainingEvent[]): number[] {
  const boundaries = events.flatMap((event) => [event.startSeconds, event.endSeconds]);
  const phases = [0, 0.5 - orbit.eclipseFraction / 2, 0.5 + orbit.eclipseFraction / 2, 0.78, 0.96, 1];
  for (let index = 0; index < orbits; index++) {
    for (const phase of phases) boundaries.push((index + phase) * orbit.periodSeconds);
  }
  return [...new Set(boundaries)].sort((a, b) => a - b);
}

/** Compatible with the MVP call; explicit scenarios require only an optional third argument. */
export function runMission(config: MissionConfig, seed = 1, scenarioId: MissionScenarioId = "survey"): MissionResult {
  const random = randomStream(seed);
  if (!Object.prototype.hasOwnProperty.call(missionScenarios, scenarioId)) {
    throw new RangeError("Unknown mission scenario.");
  }
  const scenario = missionScenarios[scenarioId];
  const orbit = computeOrbitProfile(config);
  const assessment = evaluateDesign(config);
  const design = { ...assessment, budgetLimitCredits: Math.min(assessment.budgetLimitCredits, scenario.budgetCredits),
    violations: [...assessment.violations], warnings: [...assessment.warnings] };
  if (design.totalCostCredits > design.budgetLimitCredits && design.totalCostCredits <= assessment.budgetLimitCredits) {
    design.violations.push(`Scenario budget exceeded by ${design.totalCostCredits - design.budgetLimitCredits} credits.`);
  }
  if (config.durationOrbits > scenario.maxOrbits) {
    design.violations.push(`Scenario deadline exceeded: at most ${scenario.maxOrbits} orbits.`);
  }
  const targetMB = scenario.targetMB;
  const events: string[] = [];
  const explanations: string[] = [
    `Scenario: ${scenario.name}. Return at least ${targetMB} MB with no power outages in at most ${scenario.maxOrbits} orbits.`,
    `Budget: ${design.totalCostCredits} / ${design.budgetLimitCredits} synthetic credits. ${scenario.lesson}`,
  ];
  if (design.violations.length) {
    return {
      success: false, score: 0, scienceCompletion: 0, producedMB: 0, transmittedMB: 0, targetMB,
      energyOutageCount: 0, batteryHistoryWh: [], dataHistoryMB: [], events: ["Engineering review failed."],
      explanations: [...explanations, ...design.violations], orbit, design,
    };
  }

  const selected = getSelectedComponents(config);
  const payloadRate = selected.find((c) => c.category === "payload")?.scienceMBperMinute ?? 0;
  const radioRate = selected.find((c) => c.category === "communications")?.downlinkMBperMinute ?? 0;
  const trainingEvents = scheduleEvents(random, orbit.periodSeconds, config.durationOrbits);
  for (const event of trainingEvents) {
    const effect = event.kind === "calibration" ? "payload acquisition paused; nominal load remains on"
      : "ground station unavailable; downlink paused; nominal load remains on";
    events.push(`Synthetic training event [${event.kind}]: ${(event.startSeconds / 60).toFixed(2)}–${(event.endSeconds / 60).toFixed(2)} min; ${effect}.`);
  }
  explanations.push(`Replay seed: ${seed}. Events are synthetic training operations, not real failure predictions.`, ...events);

  const durationSeconds = orbit.periodSeconds * config.durationOrbits;
  const stepSeconds = 60;
  const steps = Math.ceil(durationSeconds / stepSeconds);
  const boundaries = integrationBoundaries(orbit, config.durationOrbits, trainingEvents);
  let boundaryIndex = 0;
  let batteryWh = design.batteryCapacityWh;
  let storedMB = 0;
  let producedMB = 0;
  let transmittedMB = 0;
  let outages = 0;
  let unpoweredSeconds = 0;
  const batteryHistoryWh: number[] = [];
  const dataHistoryMB: number[] = [];

  for (let step = 0; step < steps; step++) {
    let elapsed = step * stepSeconds;
    const stepEnd = Math.min(elapsed + stepSeconds, durationSeconds);
    let stepOutage = false;
    while (elapsed < stepEnd) {
      while (boundaryIndex < boundaries.length && boundaries[boundaryIndex] <= elapsed) boundaryIndex++;
      const end = Math.min(stepEnd, boundaries[boundaryIndex] ?? stepEnd);
      const dt = end - elapsed;
      // Midpoint is inside a segment bounded by every modeled state transition.
      const midpoint = elapsed + dt / 2;
      const phase = (midpoint % orbit.periodSeconds) / orbit.periodSeconds;
      const generationW = isInEclipse(phase, orbit.eclipseFraction) ? 0 : design.solarGenerationW;
      const energyChangeWh = (generationW - design.nominalPowerW) * dt / 3600;
      const powered = batteryWh + energyChangeWh >= -1e-9;
      batteryWh = Math.max(0, Math.min(design.batteryCapacityWh, batteryWh + energyChangeWh));
      if (!powered) {
        stepOutage = true;
        unpoweredSeconds += dt;
      } else {
        const active = trainingEvents.filter((event) => midpoint >= event.startSeconds && midpoint < event.endSeconds);
        // MB/min × seconds/60. Calibration deliberately retains full nominal load.
        if (!active.some((event) => event.kind === "calibration")) {
          const made = payloadRate * dt / 60;
          producedMB += made;
          storedMB += made;
        }
        if (hasGroundContact(phase) && !active.some((event) => event.kind === "station-offline")) {
          const sent = Math.min(storedMB, radioRate * dt / 60);
          storedMB -= sent;
          transmittedMB += sent;
        }
      }
      elapsed = end;
    }
    if (stepOutage) outages++;
    if (step % 5 === 0 || step === steps - 1) {
      // Full precision preserves bounds; formatting belongs to presentation.
      batteryHistoryWh.push(batteryWh);
      dataHistoryMB.push(storedMB);
    }
  }

  const scienceCompletion = Math.min(1, transmittedMB / targetMB);
  const success = outages === 0 && scienceCompletion >= 1;
  const reliability = Math.max(0, 1 - unpoweredSeconds / durationSeconds);
  const economy = Math.max(0, 1 - design.totalCostCredits / design.budgetLimitCredits);
  const sciencePoints = 70 * scienceCompletion;
  const reliabilityPoints = 20 * reliability;
  const economyPoints = 10 * economy;
  const score = Math.min(success ? 100 : 99, Math.floor(sciencePoints + reliabilityPoints + economyPoints));
  events.push(`Completed ${config.durationOrbits} modeled orbits at ${config.altitudeKm} km.`);
  events.push(`Produced ${producedMB.toFixed(1)} MB and downlinked ${transmittedMB.toFixed(1)} MB.`);
  explanations.push(`Returned ${transmittedMB.toFixed(1)} / ${targetMB} MB; ${storedMB.toFixed(1)} MB remain on board. Only returned data count toward the objective.`);
  explanations.push(`Score (floored): science ${sciencePoints.toFixed(2)}/70 + powered time ${reliabilityPoints.toFixed(2)}/20 + unused budget ${economyPoints.toFixed(2)}/10; failures capped at 99. The score is not a probability of success.`);
  if (outages > 0) {
    explanations.push(`Power deficit in ${outages} reporting steps (${(unpoweredSeconds / 60).toFixed(2)} modeled unavailable minutes). A larger battery bridges deficits; more solar generation or a lower-power payload addresses recurring demand.`);
  }
  if (scienceCompletion < 1) {
    if (producedMB < targetMB) explanations.push("Payload production below target: restore power, increase payload rate or extend the mission within its deadline. A faster radio cannot transmit data never acquired.");
    if (storedMB > 1e-9) explanations.push("Downlink backlog remains: a faster radio or more contact opportunities within the deadline can return more data. Increasing camera output alone does not increase radio capacity.");
  }
  if (success) explanations.push("The spacecraft met its modeled energy and science-return goals.");
  explanations.push("Educational result only: sunlight and ground-contact geometry are idealized, and all component parameters and training events are synthetic. MB measure data quantity, not scientific quality.");

  return {
    success, score, scienceCompletion, producedMB, transmittedMB, targetMB,
    energyOutageCount: outages, batteryHistoryWh, dataHistoryMB, events, explanations, orbit, design,
  };
}
