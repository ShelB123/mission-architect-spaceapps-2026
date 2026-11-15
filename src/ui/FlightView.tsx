import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import type { MissionFrame } from "../engine/game";
import { buildSpacecraftVisualModel } from "../visualization/buildSpacecraftVisualModel";
import { visualCatalog } from "../visualization/catalog";
import { components } from "../data/catalog";
import { detectWebGLSupport } from "../visualization/SpacecraftViewer";
import { useLanguage } from "../i18n/Language";
import { EnvironmentExplorer } from "./EnvironmentExplorer";
import type { EnvironmentId } from "../visualization/environment";
import { MissionOrbit } from "./MissionOrbit";

const Scene = lazy(() => import("../visualization/FlightScene"));
class FlightBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function FlightView({ frame, selectedComponentIds, onExplore }: { frame: MissionFrame; selectedComponentIds: string[]; onExplore: () => void }) {
  const { t, language } = useLanguage();
  const [exploring, setExploring] = useState<EnvironmentId | null>(null);
  const inspect = (id: EnvironmentId) => { onExplore(); setExploring(id); };
  const [view, setView] = useState<"chase" | "onboard" | "map">("chase");
  const [supported] = useState(() => detectWebGLSupport());
  const [lost, setLost] = useState(false);
  const model = useMemo(() => buildSpacecraftVisualModel(selectedComponentIds, visualCatalog, components), [selectedComponentIds]);
  const fallback = <MissionOrbit frame={frame}/>;
  return <div className="flight-view"><div className="flight-cameras" aria-label={t("Flight camera")}>
    <button aria-pressed={view === "chase"} onClick={() => setView("chase")}>{t("Follow satellite")}</button>
    <button aria-pressed={view === "onboard"} onClick={() => setView("onboard")}>{t("Onboard camera")}</button>
    <button aria-pressed={view === "map"} onClick={() => setView("map")}>{t("2D orbit")}</button>
    <button className="explore-button" onClick={() => inspect("earth")}>{language === "es" ? "Explorar espacio" : "Explore space"}</button>
  </div><div className="flight-world">
    {view === "map" || !supported || lost ? fallback : <FlightBoundary fallback={fallback} onFailure={() => setLost(true)}><Suspense fallback={fallback}><Scene model={model} orbitFraction={frame.orbitFraction} eclipse={frame.eclipse} contact={frame.contact && !frame.stationOffline} view={view} onInspect={inspect} onContextLost={() => setLost(true)}/></Suspense></FlightBoundary>}
    <div className="world-state"><span>{t(frame.eclipse ? "ECLIPSE · BATTERY POWER" : "SUNLIGHT · SOLAR POWER")}</span><span>{t(frame.contact && !frame.stationOffline ? "TRANSMITTING TO EARTH" : "NO DOWNLINK")}</span></div>
  </div><small className="flight-model-note">{t(!supported || lost ? "3D unavailable. The complete mission remains playable in 2D." : (language === "es" ? "Texturas: NASA · Objetos y distancias ilustrativos; sin seguimiento ni colisiones. La vista no cambia la física." : "Textures: NASA · Illustrative objects and distances; no tracking or collisions. The view does not change physics."))}</small>{exploring && <EnvironmentExplorer initialId={exploring} supported={supported && !lost} onClose={() => setExploring(null)}/>}</div>;
}
