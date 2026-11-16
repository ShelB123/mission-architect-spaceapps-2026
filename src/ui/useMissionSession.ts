import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultMission } from "../data/catalog";
import { missionScenarios, replayMission, type MissionScenarioId, type MissionReplay, type MissionCommand, type MissionFrame } from "../engine/game";
import type { MissionConfig, MissionPhase, MissionResult } from "../types/contracts";
import { FLIGHT_UPDATE_MS } from "../visualization/orbitMotion";

import { advanceToDecision, missionDecisions } from "../engine/missionDecisions";

const initialMission = (): MissionConfig => ({ ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] });
const copyMission = (mission: MissionConfig): MissionConfig => ({ ...mission, selectedComponentIds: [...mission.selectedComponentIds] });
export interface MissionAttempt {
  config: MissionConfig; scenarioId: MissionScenarioId; seed: number;
  commands: MissionCommand[]; result: MissionResult;
}
/** Hold the latest computed state, never interpolate uncomputed resource values. */
export function frameAt(frames: readonly MissionFrame[], time: number): MissionFrame | undefined {
  if (!frames.length) return undefined;
  let low = 0, high = frames.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (frames[mid].timeSeconds <= time) low = mid; else high = mid - 1;
  }
  return frames[low];
}

export function useMissionSession(assisted = false) {
  const [handledDecisions, setHandledDecisions] = useState<string[]>([]);
  const [mission, setMission] = useState<MissionConfig>(initialMission);
  const [scenarioId, setScenarioId] = useState<MissionScenarioId>("survey");
  const [seed, setSeed] = useState(2026);
  const [phase, setPhase] = useState<MissionPhase>("briefing");
  const [result, setResult] = useState<MissionResult | null>(null);
  const [replay, setReplay] = useState<MissionReplay | null>(null);
  const [previousAttempt, setPreviousAttempt] = useState<MissionAttempt | null>(null);
  const lastCompleted = useRef<MissionAttempt | null>(null);
  const launched = useRef<{ config: MissionConfig; seed: number; scenarioId: MissionScenarioId } | null>(null);
  const [cursor, setCursor] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const finished = useRef(false);
  const duration = replay?.frames.at(-1)?.timeSeconds ?? 0;
  const frame = replay ? frameAt(replay.frames, cursor) : undefined;

  const decisions = useMemo(() => missionDecisions(replay?.frames ?? []), [replay]);
  const pendingDecision = assisted ? decisions.find(d => !handledDecisions.includes(d.id) && d.timeSeconds <= cursor) : undefined;

  const cancelPending = useCallback(() => {
    generation.current++;
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
  }, []);
  useEffect(() => cancelPending, [cancelPending]);

  const finish = useCallback(() => {
    if (!replay || !launched.current || finished.current) return;
    finished.current = true;
    const snapshot = launched.current;
    const prior = lastCompleted.current;
    setPreviousAttempt(prior && prior.scenarioId === snapshot.scenarioId && prior.seed === snapshot.seed ? prior : null);
    lastCompleted.current = { ...snapshot, config: copyMission(snapshot.config), commands: replay.commands.map(c => ({ ...c })), result: replay.result };
    setResult(replay.result);
    setCursor(replay.frames.at(-1)?.timeSeconds ?? 0);
    setPhase("debrief");
  }, [replay]);

  useEffect(() => {
    if (phase !== "operations" || !replay || paused || pendingDecision) return;
    const advanceSeconds = speed * FLIGHT_UPDATE_MS / 1000;
    const tick = setInterval(() => setCursor(time => assisted ? advanceToDecision(time, Math.min(duration, time + advanceSeconds), decisions, handledDecisions) : Math.min(duration, time + advanceSeconds)), FLIGHT_UPDATE_MS);
    return () => clearInterval(tick);
  }, [phase, replay, paused, speed, duration, assisted, decisions, handledDecisions, pendingDecision]);
  useEffect(() => { if (phase === "operations" && replay && cursor >= duration) finish(); }, [phase, replay, cursor, duration, finish]);

  function invalidateResult() {
    cancelPending(); setHandledDecisions([]); setResult(null); setReplay(null); setError(""); setCursor(0);
    setPhase(previous => previous === "operations" || previous === "debrief" ? "design" : previous);
  }
  function updateMission(update: (previous: MissionConfig) => MissionConfig) { invalidateResult(); setMission(update); }
  function selectScenario(next: MissionScenarioId) {
    if (!Object.prototype.hasOwnProperty.call(missionScenarios, next)) return;
    invalidateResult(); setScenarioId(next); setPreviousAttempt(null);
  }
  function changeSeed(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) return;
    invalidateResult(); setSeed(value); setPreviousAttempt(null);
  }
  function navigate(next: Exclude<MissionPhase, "operations">) {
    if (next === "debrief" && !result) return;
    cancelPending(); setError(""); setPhase(next);
    if (phase === "operations") { setReplay(null); setResult(null); }
  }
  function launch() {
    if (timer.current !== null || phase !== "review") return;
    cancelPending();
    const launchGeneration = generation.current;
    const snapshot = { config: copyMission(mission), seed, scenarioId };
    launched.current = snapshot; finished.current = false; setHandledDecisions([]);
    setResult(null); setReplay(null); setError(""); setCursor(0); setPaused(false); setPhase("operations");
    timer.current = setTimeout(() => {
      timer.current = null;
      if (launchGeneration !== generation.current) return;
      try {
        const next = replayMission(snapshot.config, snapshot.seed, snapshot.scenarioId);
        if (next.result.design.violations.length) { setError(next.result.design.violations.join(" ")); setPhase("review"); return; }
        setReplay(next);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Simulation failed. Please retry.");
        setReplay(null); setPhase("review");
      }
    }, 450);
  }
  function commandCamera(cameraOn: boolean) {
    if (phase !== "operations" || !replay || !frame || !launched.current || frame.timeSeconds >= duration) return;
    const snapshot = launched.current;
    const commands = [...replay.commands.filter(c => c.timeSeconds < frame.timeSeconds), { timeSeconds: frame.timeSeconds, cameraOn }];
    try { setReplay(replayMission(snapshot.config, snapshot.seed, snapshot.scenarioId, commands)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Command failed."); }
  }
  function resolveDecision(cameraOn: boolean) {
    if (!pendingDecision) return;
    commandCamera(cameraOn);
    setHandledDecisions(previous => [...previous, pendingDecision.id]);
    setPaused(false);
  }
  function nextDecision() {
    if (!replay || pendingDecision) return;
    const next = decisions.find(d => d.timeSeconds >= cursor && !handledDecisions.includes(d.id));
    if (next) setCursor(next.timeSeconds);
    else finish();
  }
  function reset() {
    setHandledDecisions([]);
    cancelPending(); setMission(initialMission()); setScenarioId("survey"); setSeed(2026);
    setResult(null); setReplay(null); setPreviousAttempt(null); lastCompleted.current = null;
    setCursor(0); setError(""); setPhase("briefing");
  }
  function improveDesign() { cancelPending(); setResult(null); setReplay(null); setError(""); setPhase("design"); }
  return { mission, scenarioId, selectScenario, seed, changeSeed, phase, result, replay, frame, cursor, duration, paused,
    setPaused, speed, setSpeed, previousAttempt, error, updateMission, navigate, launch, reset, improveDesign, commandCamera, finish, pendingDecision, resolveDecision, nextDecision, decisions, handledDecisions };
}
