import type { MissionFrame } from "./game";

export type DecisionKind = "eclipse" | "sunrise" | "station-offline" | "contact" | "calibration";
export interface MissionDecision { id: string; kind: DecisionKind; timeSeconds: number }

/** Teaching checkpoints only. All transitions come from the computed engine trace.
 * First occurrence per kind avoids turning a long flight into repetitive popups. */
export function missionDecisions(frames: readonly MissionFrame[]): MissionDecision[] {
  const seen = new Set<DecisionKind>();
  const decisions: MissionDecision[] = [];
  const duration = frames.at(-1)?.timeSeconds ?? 0;
  frames.forEach((frame, index) => {
    if (frame.timeSeconds >= duration) return;
    const previous = frames[index - 1];
    const kinds: DecisionKind[] = [];
    if (frame.eclipse && !previous?.eclipse) kinds.push("eclipse");
    if (!frame.eclipse && previous?.eclipse) kinds.push("sunrise");
    if (frame.stationOffline && !previous?.stationOffline) kinds.push("station-offline");
    if (frame.contact && !frame.stationOffline && (!previous?.contact || previous.stationOffline)) kinds.push("contact");
    if (frame.calibration && !previous?.calibration) kinds.push("calibration");
    kinds.forEach(kind => {
      if (!seen.has(kind)) {
        seen.add(kind);
        decisions.push({ kind, timeSeconds: frame.timeSeconds, id: `${kind}:${frame.timeSeconds}` });
      }
    });
  });
  return decisions;
}

/** Never skip a checkpoint, including multiple decisions at the same timestamp. */
export function advanceToDecision(time: number, nextTime: number, decisions: readonly MissionDecision[], handled: readonly string[]): number {
  const next = decisions.find(item => item.timeSeconds >= time && !handled.includes(item.id));
  return Math.min(nextTime, next?.timeSeconds ?? nextTime);
}
