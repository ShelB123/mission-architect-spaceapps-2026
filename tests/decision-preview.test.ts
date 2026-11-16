import {describe,it,expect} from "vitest";
import {defaultMission} from "../src/data/catalog";
import {missionScenarios,replayMission,type MissionScenarioId} from "../src/engine/game";
import {compareCameraDecision} from "../src/ui/decisionPreview";
import {missionDiagnosis} from "../src/ui/missionDiagnosis";
import {challengeStart} from "../src/ui/challenges";

describe("decision comparisons",()=>{
 for(const id of Object.keys(missionScenarios) as MissionScenarioId[])it(`preserves history and matches actual orders in ${id}`,()=>{
   const before=replayMission(defaultMission,2026,id);
   const at=before.frames.find(f=>f.eclipse)!.timeSeconds;
   const past=[{timeSeconds:0,cameraOn:true}];
   const snapshot=structuredClone({before,past,config:defaultMission});
   const preview=compareCameraDecision(defaultMission,2026,id,past,at);
   for(const [cameraOn,actual] of [[true,preview.observing],[false,preview.saving]] as const){
     const branch=replayMission(defaultMission,2026,id,[...past,{timeSeconds:at,cameraOn}]);
     expect(branch.frames.find(f=>f.timeSeconds===preview.untilSeconds)).toEqual(actual);
     expect(branch.frames.filter(f=>f.timeSeconds<at)).toEqual(before.frames.filter(f=>f.timeSeconds<at));
   }
   expect(preview.saving.batteryWh).toBeGreaterThan(preview.observing.batteryWh);
   expect(preview.saving.producedMB).toBeLessThan(preview.observing.producedMB);
   expect({before,past,config:defaultMission}).toEqual(snapshot);
   expect(compareCameraDecision(defaultMission,2026,id,past,at)).toEqual(preview);
 });
 it("limits the comparison to mission end and replaces future orders",()=>{
   const base=replayMission(defaultMission,7);
   const at=base.frames.at(-2)!.timeSeconds;
   const result=compareCameraDecision(defaultMission,7,"survey",[{timeSeconds:at,cameraOn:false},{timeSeconds:at+1,cameraOn:true}],at);
   expect(result.untilSeconds).toBe(base.frames.at(-1)!.timeSeconds);
   expect(result.saving.cameraOn).toBe(false);
 });
});
describe("Riverwatch exercise",()=>{
 it("fails without repairs and admits two hardware solutions and an operational solution",()=>{
   const broken=challengeStart("survey");
   const failed=replayMission(broken,2026);
   expect(failed.result.success).toBe(false);
   expect(missionDiagnosis(failed).title).toBe("Power interrupted the mission.");
   expect(missionDiagnosis(failed).firstDeficitSeconds).toBeGreaterThan(0);
   for(const [from,to] of [["camera-hd","camera-basic"],["solar-basic","solar-advanced"]]){
     const solution={...broken,selectedComponentIds:broken.selectedComponentIds.map(id=>id===from?to:id)};
     expect(replayMission(solution,2026).result.success).toBe(true);
   }
   const commands=failed.frames.filter((f,i,frames)=>i===0||f.eclipse!==frames[i-1].eclipse).map(f=>({timeSeconds:f.timeSeconds,cameraOn:!f.eclipse}));
   expect(replayMission(broken,2026,"survey",commands).result.success).toBe(true);
 });
 it("distinguishes missing acquisition from undelivered data and a powered success",()=>{
   const empty=replayMission(defaultMission,2026,"survey",[{timeSeconds:0,cameraOn:false}]);
   expect(missionDiagnosis(empty).title).toBe("Not enough observations were acquired.");
   const slow=replayMission({...defaultMission,selectedComponentIds:["camera-hd","solar-advanced","battery-basic","radio-basic"],launcherId:"dedicated"},2026,"rapid-science");
   expect(slow.result.producedMB).toBeGreaterThan(1000);
   expect(missionDiagnosis(slow).title).toBe("Enough data were collected, but not delivered.");
   expect(missionDiagnosis(replayMission(defaultMission,2026)).title).toBe("The data arrived and power stayed available.");
 });
});
