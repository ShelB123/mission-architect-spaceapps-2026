import { useCallback, useEffect, useRef, useState } from "react";
import { defaultMission } from "../data/catalog";
import { runMission } from "../engine/game";
import type { MissionConfig, MissionPhase, MissionResult } from "../types/contracts";

function initialMission(): MissionConfig {
  return { ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] };
}

/** Owns launch lifetime and result freshness; engineering remains in the engines. */
export function useMissionSession() {
  const [mission, setMission] = useState<MissionConfig>(initialMission);
  const [phase, setPhase] = useState<MissionPhase>("briefing");
  const [result, setResult] = useState<MissionResult | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  const cancelPending = useCallback(() => {
    generation.current++;
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  function updateMission(update: (previous: MissionConfig) => MissionConfig) {
    cancelPending();
    setMission(update);
    setResult(null);
    setError("");
    setPhase((previous) => previous === "operations" || previous === "debrief" ? "design" : previous);
  }

  function navigate(next: Exclude<MissionPhase, "operations">) {
    if (next === "debrief" && !result) return;
    cancelPending();
    setError("");
    setPhase(next);
  }

  function launch() {
    // Ref guard also covers two clicks before React commits the Operations view.
    if (timer.current !== null || phase !== "review") return;
    cancelPending();
    const launchGeneration = generation.current;
    const snapshot = { ...mission, selectedComponentIds: [...mission.selectedComponentIds] };
    setResult(null);
    setError("");
    setPhase("operations");
    timer.current = setTimeout(() => {
      timer.current = null;
      if (launchGeneration !== generation.current) return;
      try {
        const next = runMission(snapshot, 2026);
        if (launchGeneration !== generation.current) return;
        setResult(next);
        setPhase("debrief");
      } catch (cause) {
        if (launchGeneration !== generation.current) return;
        setResult(null);
        setError(cause instanceof Error ? cause.message : "Simulation failed. Please retry.");
        setPhase("review");
      }
    }, 450);
  }

  function reset() {
    cancelPending();
    setMission(initialMission());
    setResult(null);
    setError("");
    setPhase("briefing");
  }

  function improveDesign() {
    cancelPending();
    setResult(null);
    setError("");
    setPhase("design");
  }

  return { mission, phase, result, error, updateMission, navigate, launch, reset, improveDesign };
}
