import { describe, expect, it } from "vitest";
import { components, defaultMission } from "../src/data/catalog";
import { replayMission, missionScenarios, type MissionScenarioId } from "../src/engine/game";
import { missionDecisions, advanceToDecision } from "../src/engine/missionDecisions";
import { evaluateDesign } from "../src/engine/resources";
import { buildSpacecraftVisualModel } from "../src/visualization/buildSpacecraftVisualModel";
import { visualCatalog } from "../src/visualization/catalog";

describe("computed operational checkpoints", () => {
  it.each(Object.keys(missionScenarios) as MissionScenarioId[])("preserves deterministic %s events and never skips them", scenario => {
    const replay = replayMission(defaultMission,2026,scenario);
    const decisions = missionDecisions(replay.frames);
    expect(decisions).toEqual(missionDecisions(replayMission(defaultMission,2026,scenario).frames));
    expect(new Set(decisions.map(d=>d.kind)).size).toBe(decisions.length);
    expect(decisions.map(d=>d.kind)).toEqual(expect.arrayContaining(["eclipse","sunrise","station-offline","contact","calibration"]));
    const handled: string[] = [];
    let time = 0;
    for(const decision of decisions) {
      time = advanceToDecision(time,1e9,decisions,handled);
      expect(time).toBe(decision.timeSeconds);
      expect(replay.frames.some(f=>f.timeSeconds===time)).toBe(true);
      handled.push(decision.id);
    }
    expect(advanceToDecision(time,1e9,decisions,handled)).toBe(1e9);
  });
  it("changes real science and energy, while preserving states before a decision", () => {
    const config = {...defaultMission,launcherId:"dedicated",selectedComponentIds:["camera-hd","solar-basic","battery-basic","radio-basic"]};
    const before = replayMission(config,2026);
    const eclipse = missionDecisions(before.frames).find(d=>d.kind==="eclipse")!;
    const commands = [{timeSeconds:eclipse.timeSeconds,cameraOn:false}];
    const after = replayMission(config,2026,"survey",commands);
    expect(after.result.producedMB).toBeLessThan(before.result.producedMB);
    expect(after.result.energyOutageCount).toBeLessThan(before.result.energyOutageCount);
    expect(after.frames.filter(f=>f.timeSeconds<eclipse.timeSeconds)).toEqual(before.frames.filter(f=>f.timeSeconds<eclipse.timeSeconds));
    expect(after).toEqual(replayMission(config,2026,"survey",commands));
  });
  it("keeps a failed mission failed instead of awarding event-click points", () => {
    for(const scenario of Object.keys(missionScenarios) as MissionScenarioId[]) {
      const result = replayMission(defaultMission,2026,scenario,[{timeSeconds:0,cameraOn:false}]).result;
      expect(result.success).toBe(false);
      expect(result.transmittedMB).toBe(0);
    }
  });
});

describe("two-unit power kits", () => {
  it.each([['solar','solarGenerationW'],['battery','batteryCapacityWh']] as const)("sums %s capabilities and costs, with two visible units", (category,capability) => {
    const basic = components.find(c=>c.id===`${category}-basic`)!;
    const kit = components.find(c=>c.id===`${category}-double`)!;
    expect(kit[capability]).toBe(2*basic[capability]!);
    expect(kit.massKg).toBe(2*basic.massKg);
    expect(kit.costCredits).toBe(2*basic.costCredits);
    const config = {...defaultMission,selectedComponentIds:defaultMission.selectedComponentIds.map(id=>id===basic.id?kit.id:id)};
    const assessment = evaluateDesign(config);
    expect(assessment.totalMassKg).toBe(evaluateDesign(defaultMission).totalMassKg+basic.massKg);
    const visual = buildSpacecraftVisualModel(config.selectedComponentIds,visualCatalog,components);
    expect(visual.issues).toEqual([]);
    expect(visual.components.find(c=>c.componentId===kit.id)!.parts).toHaveLength(2*visualCatalog[basic.id].parts.length);
    expect(kit.isSynthetic).toBe(true);
  });
});
