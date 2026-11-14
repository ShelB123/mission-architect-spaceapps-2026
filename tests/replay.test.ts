import { describe, expect, it } from "vitest";
import { defaultMission } from "../src/data/catalog";
import { replayMission, runMission, missionScenarios, type MissionScenarioId } from "../src/engine/game";
import { challengeStart } from "../src/ui/challenges";
import { frameAt } from "../src/ui/useMissionSession";

const scenarioIds = Object.keys(missionScenarios) as MissionScenarioId[];

describe("authoritative mission playback", () => {
  it.each(scenarioIds)("preserves legacy results and resource invariants for %s", id => {
    for (const seed of [0, 2026, 0xffffffff]) {
      const replay = replayMission(defaultMission, seed, id);
      expect(replay.result).toEqual(runMission(defaultMission, seed, id));
      expect(replay.frames[0]).toMatchObject({ timeSeconds: 0, producedMB: 0, transmittedMB: 0, batteryWh: 110 });
      const final = replay.frames.at(-1)!;
      expect(final.timeSeconds).toBe(replay.result.orbit.periodSeconds * defaultMission.durationOrbits);
      expect(final.producedMB).toBe(replay.result.producedMB);
      expect(final.transmittedMB).toBe(replay.result.transmittedMB);
      expect(final.batteryWh).toBe(replay.result.batteryHistoryWh.at(-1));
      for (const [index, frame] of replay.frames.entries()) {
        expect(frame.batteryWh).toBeGreaterThanOrEqual(0);
        expect(frame.batteryWh).toBeLessThanOrEqual(replay.result.design.batteryCapacityWh);
        expect(frame.storedMB).toBeGreaterThanOrEqual(0);
        expect(frame.producedMB - frame.transmittedMB).toBeCloseTo(frame.storedMB, 8);
        if (index) expect(frame.timeSeconds).toBeGreaterThan(replay.frames[index-1].timeSeconds);
        expect(frame.generationW).toBe(frame.eclipse ? 0 : replay.result.design.solarGenerationW);
      }
      expect(replay.frames.some(f => f.eclipse)).toBe(true);
      expect(replay.frames.some(f => f.calibration)).toBe(true);
      expect(replay.frames.some(f => f.stationOffline)).toBe(true);
    }
  });

  it("holds computed states instead of inventing interpolated resources", () => {
    const { frames } = replayMission(defaultMission, 2026);
    expect(frameAt(frames, 30)).toBe(frames[0]);
    expect(frameAt(frames, 60)).toBe(frames[1]);
    expect(frameAt(frames, Infinity)).toBe(frames.at(-1));
    expect(frameAt([], 0)).toBeUndefined();
  });

  it("does not generate a flight for a rejected design", () => {
    const replay = replayMission(challengeStart("budget-survey"), 2026, "budget-survey");
    expect(replay.frames).toEqual([]);
    expect(replay.result.design.violations.join(" ")).toMatch(/budget/i);
  });
});

describe("deterministic operational decisions", () => {
  it("camera off saves actual energy but cannot produce science", () => {
    const config = challengeStart("survey");
    const baseline = replayMission(config, 2026);
    const off = replayMission(config, 2026, "survey", [{ timeSeconds: 0, cameraOn: false }]);
    expect(baseline.result.energyOutageCount).toBeGreaterThan(0);
    expect(off.result.energyOutageCount).toBe(0);
    expect(off.result.producedMB).toBe(0);
    expect(off.result.transmittedMB).toBe(0);
    expect(off.result.success).toBe(false);
    expect(off.frames[0].loadW).toBe(baseline.frames[0].loadW - 42);
    expect(off.frames.at(-1)!.batteryWh).toBeGreaterThan(baseline.frames.at(-1)!.batteryWh);
  });

  it("keeps the past intact, transmits stored data with camera off and resumes observations", () => {
    const baseline = replayMission(defaultMission, 2026);
    const time = 600;
    const commands = Object.freeze([Object.freeze({ timeSeconds: time, cameraOn: false }), Object.freeze({ timeSeconds: 6000, cameraOn: true })]);
    const replay = replayMission(defaultMission, 2026, "survey", commands);
    expect(replay).toEqual(replayMission(defaultMission, 2026, "survey", commands));
    expect(replay.frames.filter(f => f.timeSeconds < time)).toEqual(baseline.frames.filter(f => f.timeSeconds < time));
    const atCommand = replay.frames.find(f => f.timeSeconds === time)!;
    const atResume = replay.frames.find(f => f.timeSeconds === 6000)!;
    expect(atCommand.cameraOn).toBe(false);
    expect(atResume.cameraOn).toBe(true);
    expect(atResume.producedMB).toBe(atCommand.producedMB);
    expect(atResume.transmittedMB).toBeGreaterThan(atCommand.transmittedMB);
    expect(replay.result.producedMB).toBeLessThan(baseline.result.producedMB);
    expect(replay.result.producedMB).toBeGreaterThan(atResume.producedMB);
    expect(replay.commands).toEqual(commands);
    expect(replay.commands[0]).not.toBe(commands[0]);
  });

  it.each([-1, NaN, Infinity, 1e9])("rejects an invalid command time %s", timeSeconds => {
    expect(() => replayMission(defaultMission, 2026, "survey", [{ timeSeconds, cameraOn: false }])).toThrow(RangeError);
  });
  it("rejects ambiguous or unordered command logs", () => {
    for (const time of [60, 120]) {
      expect(() => replayMission(defaultMission, 2026, "survey", [{timeSeconds:120,cameraOn:false},{timeSeconds:time,cameraOn:true}])).toThrow(RangeError);
    }
  });

  it("can rescue a high-load survey by conserving power in eclipses without buying new parts", () => {
    const config = challengeStart("survey");
    const baseline = replayMission(config, 2026);
    let previousEclipse = false;
    const commands = baseline.frames.flatMap(frame => {
      if (frame.eclipse === previousEclipse || frame.timeSeconds === baseline.frames.at(-1)!.timeSeconds) return [];
      previousEclipse = frame.eclipse;
      return [{ timeSeconds: frame.timeSeconds, cameraOn: !frame.eclipse }];
    });
    const rescued = replayMission(config, 2026, "survey", commands);
    expect(baseline.result.success).toBe(false);
    expect(rescued.result.success).toBe(true);
    expect(rescued.result.design).toEqual(baseline.result.design);
    expect(rescued.result.energyOutageCount).toBe(0);
  });
});

describe("repair challenges are winnable through engineering", () => {
  it.each(scenarioIds)("starts %s with a verifiable problem and supports a viable repair", id => {
    const start = challengeStart(id);
    const failed = replayMission(start, 2026, id).result;
    expect(failed.success).toBe(false);
    let repaired = { ...start, selectedComponentIds: [...start.selectedComponentIds] };
    if (id === "budget-survey") repaired.selectedComponentIds = repaired.selectedComponentIds.map(c => c === "radio-advanced" ? "radio-basic" : c);
    else if (id === "rapid-science") repaired = { ...repaired, launcherId: "dedicated", selectedComponentIds: ["camera-hd", "solar-advanced", "battery-basic", "radio-advanced"] };
    else repaired.selectedComponentIds = repaired.selectedComponentIds.map(c => c === "solar-basic" ? "solar-advanced" : c);
    const success = replayMission(repaired, 2026, id).result;
    expect(success.design.violations).toEqual([]);
    expect(success.success).toBe(true);
    expect(success.transmittedMB).toBeGreaterThanOrEqual(success.targetMB);
    expect(success.energyOutageCount).toBe(0);
    if (id === "budget-survey") expect(success.design.totalCostCredits).toBeLessThan(failed.design.totalCostCredits);
    else if (id === "rapid-science") expect(success.transmittedMB).toBeGreaterThan(failed.transmittedMB);
    else expect(failed.energyOutageCount).toBeGreaterThan(0);
  });

  it.each(scenarioIds)("allows an alternative strategy for %s", id => {
    const alternative = id === "rapid-science"
      ? { ...defaultMission, altitudeKm: 1000, launcherId: "dedicated", selectedComponentIds: ["camera-hd", "solar-advanced", "battery-basic", "radio-advanced"] }
      : id === "budget-survey" ? { ...defaultMission, altitudeKm: 1000, durationOrbits: 5 }
      : id === "endurance" ? { ...defaultMission, durationOrbits: 12 } : defaultMission;
    expect(replayMission(alternative, 2026, id).result.success).toBe(true);
  });
});
