import type { MissionReplay } from "../engine/game";
/** Reasons limited to what the recorded run establishes; no inferred disaster impact. */
export function missionDiagnosis(replay:MissionReplay):{title:string;action:string;firstDeficitSeconds:number|null} {
 const r=replay.result;
 const first=replay.frames.find(f=>f.unpoweredSeconds>0);
 if(r.energyOutageCount) return {title:"Power interrupted the mission.",action:"Try a lower-power camera, more solar generation, or camera-off intervals. A bigger battery alone may only postpone the problem.",firstDeficitSeconds:first?.timeSeconds ?? null};
 if(r.producedMB<r.targetMB) return {title:"Not enough observations were acquired.",action:"Check observing time and camera-off commands before buying a faster radio.",firstDeficitSeconds:null};
 if(r.transmittedMB<r.targetMB) return {title:"Enough data were collected, but not delivered.",action:"Inspect radio capacity and usable contacts. More camera data alone cannot fix this delivery gap.",firstDeficitSeconds:null};
 return {title:"The data arrived and power stayed available.",action:"Try the same seed with a cheaper design or fewer orbits. Compare the result before deciding it is better.",firstDeficitSeconds:null};
}
