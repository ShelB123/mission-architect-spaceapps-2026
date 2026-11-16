import { replayMission, type MissionCommand, type MissionFrame, type MissionScenarioId } from "../engine/game";
import type { MissionConfig } from "../types/contracts";
export interface DecisionPreview { untilSeconds:number; observing:MissionFrame; saving:MissionFrame }
/** Two camera settings held for five minutes. No mutation or new resource formulas. */
export function compareCameraDecision(config:MissionConfig,seed:number,scenarioId:MissionScenarioId,commands:readonly MissionCommand[],atSeconds:number):DecisionPreview {
  const branches=[true,false].map(cameraOn=>replayMission(config,seed,scenarioId,[...commands.filter(c=>c.timeSeconds<atSeconds),{timeSeconds:atSeconds,cameraOn}]));
  const untilSeconds=Math.min(atSeconds+300,branches[0].frames.at(-1)!.timeSeconds);
  const end=(frames:MissionFrame[])=>[...frames].reverse().find(f=>f.timeSeconds<=untilSeconds)!;
  return {untilSeconds:end(branches[0].frames).timeSeconds,observing:end(branches[0].frames),saving:end(branches[1].frames)};
}
