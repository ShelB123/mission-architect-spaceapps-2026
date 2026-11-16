import "./graphics-recovery.css";
import { Component, lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import type { MissionFrame } from "../engine/game";
import { buildSpacecraftVisualModel } from "../visualization/buildSpacecraftVisualModel";
import { visualCatalog } from "../visualization/catalog";
import { components } from "../data/catalog";
import { detectWebGLSupport } from "../visualization/SpacecraftViewer";
import { useLanguage } from "../i18n/Language";
import { EnvironmentExplorer } from "./EnvironmentExplorer";
import type { EnvironmentId } from "../visualization/environment";
import { MissionOrbit } from "./MissionOrbit";


class FlightBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function FlightView({ frame, orbitTurns = frame.orbitFraction, moving = false, selectedComponentIds, onExplore }: {
  frame: MissionFrame; orbitTurns?: number; moving?: boolean; selectedComponentIds: string[]; onExplore: () => void;
}) {
  const { t, language } = useLanguage();
  const [exploring, setExploring] = useState<EnvironmentId | null>(null);
  const inspect = useCallback((id: EnvironmentId) => { onExplore(); setExploring(id); }, [onExplore]);
  const [view, setView] = useState<"chase" | "onboard" | "map">("chase");
  const [supported, setSupported] = useState(() => detectWebGLSupport());
  const [attempt, setAttempt] = useState(0);
  const Scene = useMemo(() => { void attempt; return lazy(() => import("../visualization/FlightScene")); }, [attempt]);
  const retry = () => { setSupported(detectWebGLSupport()); setLost(false); setAttempt(value => value + 1); };
  const [lost, setLost] = useState(false);
  const loseContext = useCallback(() => setLost(true), []);
  const model = useMemo(() => buildSpacecraftVisualModel(selectedComponentIds, visualCatalog, components), [selectedComponentIds]);
  const fallback = <MissionOrbit frame={frame} orbitTurns={orbitTurns} moving={moving}/>;
  return <div className="flight-view"><div className="flight-cameras" aria-label={t("Flight camera")}>
    <button aria-pressed={view === "chase" && supported && !lost} onClick={() => setView("chase")}>{t("Follow satellite")}</button>
    <button aria-pressed={view === "onboard" && supported && !lost} onClick={() => setView("onboard")}>{t("Onboard camera")}</button>
    <button aria-pressed={view === "map" || !supported || lost} onClick={() => setView("map")}>{t("2D orbit")}</button>
    <button className="explore-button" onClick={() => inspect("earth")}>{language === "es" ? "Explorar espacio" : "Explore space"}</button>
  </div><div className="flight-world">
    {view === "map" || !supported || lost ? fallback : <FlightBoundary key={attempt} fallback={fallback} onFailure={loseContext}><Suspense fallback={fallback}><Scene model={model} orbitTurns={orbitTurns} moving={moving} eclipse={frame.eclipse} contact={frame.contact && !frame.stationOffline} view={view} onInspect={inspect} onContextLost={loseContext}/></Suspense></FlightBoundary>}
    <div className="world-state"><span>{t(frame.eclipse ? "ECLIPSE · BATTERY POWER" : "SUNLIGHT · SOLAR POWER")}</span><span>{t(frame.contact && !frame.stationOffline ? "TRANSMITTING TO EARTH" : "NO DOWNLINK")}</span></div>
  </div>{(!supported || lost) && <div className="graphics-recovery" role="status"><span>{t(!supported ? "WebGL 2 is unavailable. The mission continues in 2D." : "The 3D view could not load or its graphics context was lost. Retry without restarting your mission.")}</span><button onClick={retry}>{t("Retry 3D")}</button></div>}<small className="flight-model-note">{t(!supported || lost ? "3D unavailable. The complete mission remains playable in 2D." : (language === "es" ? "Texturas: NASA · Objetos y distancias ilustrativos; sin seguimiento ni colisiones. La vista no cambia la física." : "Textures: NASA · Illustrative objects and distances; no tracking or collisions. The view does not change physics."))}</small>{exploring && <EnvironmentExplorer initialId={exploring} supported={supported} onClose={() => setExploring(null)}/>}</div>;
}
