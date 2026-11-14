import { scienceTargetMB } from "../data/catalog";
import { computeOrbitProfile, hasGroundContact, isInEclipse } from "./orbit";
import { evaluateDesign, getSelectedComponents } from "./resources";
import type { MissionConfig, MissionResult } from "../types/contracts";

/** A deterministic educational mission. `seed` reserves reproducibility for future events. */
export function runMission(config: MissionConfig, seed = 1): MissionResult {
  if (!Number.isInteger(seed)) throw new Error("Seed must be an integer.");
  const orbit = computeOrbitProfile(config);
  const design = evaluateDesign(config);
  const selected = getSelectedComponents(config);
  const payload = selected.find((c) => c.category === "payload");
  const radio = selected.find((c) => c.category === "communications");
  const targetMB = scienceTargetMB;
  const events: string[] = [];
  const explanations: string[] = [];
  if (design.violations.length) {
    return {
      success: false, score: 0, scienceCompletion: 0, producedMB: 0, transmittedMB: 0, targetMB,
      energyOutageCount: 0, batteryHistoryWh: [], dataHistoryMB: [], events: ["Engineering review failed."],
      explanations: [...design.violations], orbit, design,
    };
  }

  const stepSeconds = 60;
  const steps = Math.ceil((orbit.periodSeconds * config.durationOrbits) / stepSeconds);
  let batteryWh = design.batteryCapacityWh;
  let storedMB = 0;
  let producedMB = 0;
  let transmittedMB = 0;
  let outages = 0;
  const batteryHistoryWh: number[] = [];
  const dataHistoryMB: number[] = [];

  for (let step = 0; step < steps; step++) {
    const elapsed = step * stepSeconds;
    const remaining = orbit.periodSeconds * config.durationOrbits - elapsed;
    const dt = Math.min(stepSeconds, remaining);
    const phase = (elapsed % orbit.periodSeconds) / orbit.periodSeconds;
    const eclipse = isInEclipse(phase, orbit.eclipseFraction);
    const generationW = eclipse ? 0 : design.solarGenerationW;
    const requiredWh = Math.max(0, (design.nominalPowerW - generationW) * dt / 3600);
    const availableWh = batteryWh + Math.max(0, generationW - design.nominalPowerW) * dt / 3600;
    const powered = availableWh + 1e-9 >= requiredWh;
    batteryWh = Math.max(0, Math.min(design.batteryCapacityWh,
      batteryWh + (generationW - design.nominalPowerW) * dt / 3600));

    if (!powered) {
      outages++;
    } else {
      const made = (payload?.scienceMBperMinute ?? 0) * dt / 60;
      producedMB += made;
      storedMB += made;
      if (hasGroundContact(phase)) {
        const sent = Math.min(storedMB, (radio?.downlinkMBperMinute ?? 0) * dt / 60);
        storedMB -= sent;
        transmittedMB += sent;
      }
    }
    if (step % 5 === 0 || step === steps - 1) {
      batteryHistoryWh.push(Number(batteryWh.toFixed(2)));
      dataHistoryMB.push(Number(storedMB.toFixed(2)));
    }
  }

  const scienceCompletion = Math.min(1, transmittedMB / targetMB);
  const success = outages === 0 && scienceCompletion >= 1;
  const reliability = Math.max(0, 1 - outages / steps);
  const score = Math.round(100 * (0.7 * scienceCompletion + 0.3 * reliability));
  events.push(`Completed ${config.durationOrbits} modeled orbits at ${config.altitudeKm} km.`);
  events.push(`Produced ${producedMB.toFixed(1)} MB and downlinked ${transmittedMB.toFixed(1)} MB.`);

  if (outages > 0) explanations.push(`Power deficit occurred in ${outages} time steps; consider a larger battery, better solar array or lower-power payload.`);
  if (scienceCompletion < 1) explanations.push("Science return below target: consider a faster radio, lighter data production or longer mission.");
  if (success) explanations.push("The spacecraft met its modeled energy and science-return goals.");
  explanations.push("Educational result only: sunlight and ground-contact geometry are idealized, and all component parameters are synthetic.");

  return {
    success, score, scienceCompletion, producedMB, transmittedMB, targetMB,
    energyOutageCount: outages, batteryHistoryWh, dataHistoryMB, events, explanations,
    orbit, design,
  };
}
