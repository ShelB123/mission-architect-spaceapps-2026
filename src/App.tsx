import { LanguageProvider, LanguageSelector, useLanguage } from "./i18n/Language";
import { useEffect, useMemo, useRef, useState } from "react";
import { categoryOrder, components, launchers, synergies } from "./data/catalog";
import { designEffects, getSelectedComponents } from "./engine/resources";
import { ComponentDossier, effectSummary } from "./ui/ComponentDossier";
import { computeOrbitProfile } from "./engine/orbit";
import { missionScenarios, type MissionScenarioId } from "./engine/game";
import { assessScenarioDesign } from "./ui/assessScenarioDesign";
import { useMissionSession } from "./ui/useMissionSession";
import { SpacecraftPreview, type SpacecraftInspectionLoader } from "./ui/SpacecraftPreview";
import { InfoTip } from "./ui/InfoTip";
import { DetailDialog } from "./ui/DetailDialog";
import { MissionPurpose } from "./ui/MissionPurpose";
import { compareCameraDecision } from "./ui/decisionPreview";
import { missionDiagnosis } from "./ui/missionDiagnosis";
import { DecisionCard } from "./ui/DecisionCard";
import { ScienceArchive } from "./ui/ScienceArchive";
import { FlightView } from "./ui/FlightView";
import { MissionOrbit } from "./ui/MissionOrbit";
import { challenges, challengeStart } from "./ui/challenges";
import type { ComponentCategory, MissionPhase, SpaceComponent } from "./types/contracts";

const steps: { phase: MissionPhase; label: string }[] = [
  { phase: "briefing", label: "Briefing" }, { phase: "design", label: "Design" },
  { phase: "review", label: "Review" }, { phase: "operations", label: "Operations" }, { phase: "debrief", label: "Debrief" },
];
const categories: Record<ComponentCategory, { label: string; glyph: string }> = {
  payload: { label: "Camera", glyph: "◉" }, solar: { label: "Solar array", glyph: "☀" },
  battery: { label: "Battery", glyph: "▥" }, communications: { label: "Radio", glyph: "⌁" },
  attitude: { label: "Attitude", glyph: "⟲" }, computer: { label: "Computer", glyph: "▣" },
  thermal: { label: "Thermal", glyph: "❄" }, propulsion: { label: "Propulsion", glyph: "▲" },
};
const categoryInfo: Record<ComponentCategory, string> = {
  payload: "The camera produces observations in MB/min. A faster instrument needs more power. Acquisition stops when you turn it off.",
  solar: "Panels generate electricity in sunlight. The two-unit kit doubles the basic array generation, mass and price; it does not generate during eclipse.",
  battery: "Batteries store energy in Wh. Two basic units double capacity, mass and price. A larger reserve cannot fix a permanent generation deficit.",
  communications: "The radio sends stored observations during contact. A higher MB/min rate clears data faster, but adds mass, cost and power demand.",
  attitude: "Attitude control points the satellite. Steadier pointing makes more of each observation usable (a synthetic science bonus). One optional unit; the bus includes a basic one.",
  computer: "The onboard computer stores and prepares data. Compression raises the effective downlink; robust computers shorten calibration pauses. One optional unit.",
  thermal: "Thermal control keeps every part within its temperature range. Batteries kept warm hold more usable energy (a synthetic capacity bonus). One optional unit.",
  propulsion: "Propulsion adjusts the orbit. In this game it shortens the ground-station outage by re-phasing toward a backup station (a synthetic rule). One optional unit.",
};
const signed = (n: number) => `${n > 0 ? "+" : ""}${Number(n.toFixed(1))}`;
function Meter({ title, value, caption, info, ratio = 0, warn = false }: { title: string; value: string; caption: string; info: string; ratio?: number; warn?: boolean }) {
  const { t } = useLanguage();
  return <div className={`hud-meter ${warn ? "warn" : ""}`}><div className="meter-label"><label>{t(title)} <InfoTip label={title} text={info}/></label><span>{value}</span></div><div className="meter-track"><i style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}/></div><small>{t(caption)}</small></div>;
}
function capability(c: SpaceComponent) {
  if (c.category === "payload") return `${c.scienceMBperMinute} MB/min`;
  if (c.category === "solar") return `${c.solarGenerationW} W generation`;
  if (c.category === "battery") return `${c.batteryCapacityWh} Wh reserve`;
  if (c.category === "communications") return `${c.downlinkMBperMinute} MB/min`;
  return effectSummary(c);
}
function capabilityDelta(next: SpaceComponent, prior: SpaceComponent) {
  if (next.category === "payload") return `${signed((next.scienceMBperMinute ?? 0)-(prior.scienceMBperMinute ?? 0))} MB/min acquisition`;
  if (next.category === "solar") return `${signed((next.solarGenerationW ?? 0)-(prior.solarGenerationW ?? 0))} W generation`;
  if (next.category === "battery") return `${signed((next.batteryCapacityWh ?? 0)-(prior.batteryCapacityWh ?? 0))} Wh reserve`;
  if (next.category === "communications") return `${signed((next.downlinkMBperMinute ?? 0)-(prior.downlinkMBperMinute ?? 0))} MB/min downlink`;
  return effectSummary(next);
}
export interface AppProps { readonly loadSpacecraftViewer?: SpacecraftInspectionLoader; readonly initialAssisted?: boolean }
export default function App(props: AppProps = {}) {
  return <LanguageProvider><MissionApp {...props}/></LanguageProvider>;
}
function MissionApp({ loadSpacecraftViewer, initialAssisted = true }: AppProps) {
  const { t } = useLanguage();
  const [purpose,setPurpose]=useState(false);
  const [riverwatch,setRiverwatch]=useState(false);
  const [assisted, setAssisted] = useState(initialAssisted);
  const session = useMissionSession(assisted);
  const [equipmentTab, setEquipmentTab] = useState<ComponentCategory>("payload");
  const [workspaceTab, setWorkspaceTab] = useState("equipment");
  const [planTab, setPlanTab] = useState("flight");
  const [consoleTab, setConsoleTab] = useState("data");
  const [helpPage, setHelpPage] = useState(0);
  const [detail, setDetail] = useState<{ title: string; lines: readonly string[] } | null>(null);
  const { mission, scenarioId, selectScenario, seed, changeSeed, phase, result, replay, frame, cursor, duration, paused, setPaused,
    speed, setSpeed, previousAttempt, error, updateMission, navigate, launch, reset, improveDesign, commandCamera, finish, pendingDecision, resolveDecision, nextDecision } = session;
  const [inspected, setInspected] = useState("camera-basic");
  const [hintLevel, setHintLevel] = useState(0);
  const [help, setHelp] = useState(false);
  const helpPanel = useRef<HTMLDivElement>(null);
  const [lastChange, setLastChange] = useState<{ from: SpaceComponent; to: string } | null>(null);
  useEffect(() => {
    if (!help) return;
    const origin = document.activeElement as HTMLElement | null;
    const panel = helpPanel.current;
    const buttons = panel?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setHelp(false); }
      if (event.key === "Tab" && buttons?.length) {
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    panel?.addEventListener("keydown", onKey);
    return () => { panel?.removeEventListener("keydown", onKey); origin?.focus(); };
  }, [help]);
  const scenario = missionScenarios[scenarioId], challenge = challenges[scenarioId];
  const design = useMemo(() => assessScenarioDesign(mission, scenarioId), [mission, scenarioId]);
  const orbit = useMemo(() => computeOrbitProfile(mission), [mission.altitudeKm]);
  const highlighted = components.find(c => c.id === inspected) ?? components[0];
  const equipped = equippedFor(highlighted.category);
  const highlightedEquipped = equipped.id === highlighted.id;
  const effects = useMemo(() => designEffects(getSelectedComponents(mission)), [mission.selectedComponentIds]);
  const justChanged = highlightedEquipped && lastChange?.to === highlighted.id;
  const deltaBase = justChanged && lastChange ? lastChange.from : equipped;
  const telemetry = phase === "operations" ? frame : phase === "debrief" ? replay?.frames.at(-1) : undefined;
  const returned = telemetry?.transmittedMB ?? 0;
  const energy = telemetry?.batteryWh ?? design.batteryCapacityWh;
  const progress = returned / scenario.targetMB;
  function selectComponent(category: ComponentCategory, id: string) {
    if (equippedFor(category).id !== id) setLastChange({ from: equippedFor(category), to: id });
    updateMission(prev => ({ ...prev, selectedComponentIds: [...prev.selectedComponentIds.filter(item => components.find(c => c.id === item)?.category !== category), id] }));
    setInspected(id);
    // Bring the context card into view after a deliberate choice (absent in non-browser test DOMs).
    requestAnimationFrame(() => document.querySelector(".dossier")?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }));
  }
  useEffect(()=>{setWorkspaceTab("equipment");},[phase]);
  useEffect(()=>{if(pendingDecision)setWorkspaceTab("equipment");},[pendingDecision?.id]);
  const diagnosis = result && replay ? missionDiagnosis(replay) : null;
  const eventText = !frame ? "Preparing telemetry…" : frame.stationOffline ? "Ground station unavailable. Data remain on board." : frame.calibration ? "Camera calibration. Acquisition temporarily paused." : !frame.cameraOn ? "Camera off. Saving power; no new observations." : frame.batteryWh === 0 ? "Energy reserve depleted. Operations may be interrupted." : frame.eclipse ? "In Earth's shadow. Running on the battery." : frame.contact ? "Contact window. Returning observations to Earth." : "Sunlit flight. Observing Earth; watch the energy balance.";

  return <div className="cockpit">
    <header className="command-header">
      <a className="wordmark" href="#" onClick={e => { e.preventDefault(); navigate("briefing"); }}><span className="brand-mark">{t("M")}<span>↗</span></span><span>{t("MISSION")}<span>{t("ARCHITECT")}</span></span></a>
      <div className="header-center"><span className="status-dot"/> {t("FLIGHT DESIGN LAB ")}<span className="header-divider">/</span> {t(riverwatch && scenarioId === "survey" ? "Operation Riverwatch" : "EARTH OBSERVATION")}</div>
      <div className="header-actions"><LanguageSelector/><label className="scenario-select"><span className="sr-only">{t("Training scenario")}</span><select value={scenarioId} onChange={e => { selectScenario(e.target.value as MissionScenarioId); setHintLevel(0); }}>{Object.entries(missionScenarios).map(([id,s]) => <option key={id} value={id}>{t(s.name)}</option>)}</select></label><button className="icon-button" aria-label={t("Help and model assumptions")} onClick={() => { if (phase === "operations") setPaused(true); setHelp(true); }}>?</button></div>
    </header>
    <nav className="phase-nav" aria-label={t("Mission progress")}>{steps.map((step,i) => <button key={step.phase} className={phase === step.phase ? "active" : ""} disabled={step.phase === "operations" || (step.phase === "debrief" && !result)} onClick={() => step.phase !== "operations" && navigate(step.phase)}><span>{String(i+1).padStart(2,"0")}</span>{t(step.label)}{phase === step.phase && <i/>}</button>)}</nav>
    <div className="hud" aria-label={t("Mission resources")}>
      <Meter info="Credits pay for the satellite parts, bus and launch. The first number is spent; the second is your limit. Prices are fictional." title={t("BUDGET")} value={`${design.totalCostCredits} / ${design.budgetLimitCredits}`} caption={t("synthetic credits")} ratio={design.totalCostCredits/design.budgetLimitCredits} warn={design.totalCostCredits > design.budgetLimitCredits}/>
      <Meter info="Kilograms measure spacecraft mass, including the bus and all selected units. Your launcher must carry at least this much." title={t("LAUNCH MASS")} value={`${design.totalMassKg} / ${design.massLimitKg} kg`} caption={t("spacecraft / launcher limit")} ratio={design.totalMassKg/design.massLimitKg} warn={design.totalMassKg > design.massLimitKg}/>
      <Meter info="W (watts) measure power: energy used or generated each second. Wh (watt-hours) measure stored energy. A 60 W load uses 60 Wh in one hour. Panels generate only in sunlight." title={t(telemetry ? "BATTERY" : "POWER")} value={telemetry ? `${energy.toFixed(1)} Wh` : `${design.solarGenerationW} / ${design.nominalPowerW} W`} caption={t(telemetry ? `${telemetry.generationW} W generation · ${telemetry.loadW} W load` : "sunlit generation / continuous load")} ratio={telemetry ? energy/design.batteryCapacityWh : design.nominalPowerW/design.solarGenerationW} warn={telemetry ? energy/design.batteryCapacityWh < .15 : design.solarGenerationW*orbit.sunlightFraction < design.nominalPowerW}/>
      <Meter info="MB measure data quantity. Only observations transmitted to Earth count toward the goal. Stored data are still waiting; MB do not measure scientific quality." title={t("SCIENCE RETURN")} value={`${returned.toFixed(0)} / ${scenario.targetMB} MB`} caption={t(telemetry ? "received on Earth" : "objective · data must reach Earth")} ratio={progress}/>
    </div>

    <main className={`game-area phase-${phase} tab-${workspaceTab}`}>
      {(phase === "design" || phase === "operations" || phase === "debrief") && <nav className="workspace-tabs" aria-label={t("Workspace panels")}>{(phase === "design" ? [["equipment","Components"],["view","Satellite"],["plan","Flight plan"]] : phase === "operations" ? [["equipment","Mission view"],["plan","Telemetry"]] : [["equipment","Outcome"],["plan","Analysis"]]).map(([id,label]) => <button key={id} aria-pressed={workspaceTab===id} onClick={()=>setWorkspaceTab(id)}>{t(label)}</button>)}</nav>}
      {phase === "briefing" && <div className="briefing-layout">
        <section className="briefing-art"><div className="eyebrow">{t("YOUR NEXT MISSION / ")}{challenge.number}</div><h1>{t("Build it.")}<br/>{t("Fly it.")}<br/><em>{t("Make it work.")}</em></h1><MissionOrbit compact/><span className="art-caption">{t("ONE SATELLITE. EVERY DECISION CONNECTED.")}</span></section>
        <section className="briefing-content panel-scroll"><div className="eyebrow">{t("SELECT YOUR CHALLENGE")}</div><div className="mission-cards">{(Object.keys(challenges) as MissionScenarioId[]).map(id => <button className={`mission-card ${id === scenarioId ? "selected" : ""}`} key={id} aria-pressed={id === scenarioId} onClick={() => { selectScenario(id); setHintLevel(0); }}><span className="mission-number">{challenges[id].number}</span><div><small>{t(challenges[id].difficulty)}</small><strong>{t(challenges[id].title)}</strong><p>{t(challenges[id].hook)}</p></div><span className="mission-arrow">↗</span></button>)}</div>
          <div className="selected-brief"><h2>{t(scenario.name)}</h2><p>{t(challenge.task)}</p><small>{t("Budget ")}{scenario.budgetCredits} {t("credits · Up to ")}{scenario.maxOrbits} {t("orbits · No power outages")}</small>{scenarioId === "survey" && <button className="secondary purpose-entry" onClick={()=>setPurpose(true)}>{t("Flood response briefing")}</button>}</div>
          <div className="briefing-buttons"><button className="primary" onClick={() => navigate("design")}>{t("Begin engineering ")}<span>→</span></button><button className="secondary" onClick={() => { setLastChange(null); updateMission(() => challengeStart(scenarioId)); navigate("design"); }}>{t("Try a repair challenge")}</button></div>
        </section>
      </div>}

      {phase === "design" && <div className="design-grid">
        <aside className="equipment-panel panel-scroll"><div className="eyebrow">{t("01 / EQUIP")}</div><h2>{t("Choose your spacecraft systems")}</h2>
          <div className="equipment-tabs" role="tablist" aria-label={t("Spacecraft systems")}>{categoryOrder.map(category=><button key={category} role="tab" aria-selected={equipmentTab===category} onClick={()=>{setEquipmentTab(category);setInspected(equippedFor(category).id);}}>{categories[category].glyph}<small>{t(categories[category].label)}</small></button>)}</div>
          {categoryOrder.map(category => <section className="equipment-group" data-active={equipmentTab===category} key={category}><h3><span>{categories[category].glyph}</span>{t(categories[category].label)}<InfoTip label={categories[category].label} text={categoryInfo[category]}/></h3><div className="equipment-options">{components.filter(c => c.category === category).map(c => <button key={c.id} className={`equipment-card ${equippedFor(category).id === c.id ? "selected" : ""}`} aria-pressed={equippedFor(category).id === c.id} onMouseEnter={() => setInspected(c.id)} onFocus={() => setInspected(c.id)} onClick={() => selectComponent(category,c.id)}><strong>{t(c.name)}</strong><small>{t(capability(c))}</small><span>{t(equippedFor(category).id === c.id ? "EQUIPPED" : `${signed(c.costCredits-equippedFor(category).costCredits)} cr`)}</span></button>)}</div></section>)}
          <ComponentDossier component={highlighted} selectedIds={mission.selectedComponentIds} effects={effects}/>
          <div className="kit-note"><strong>{t("An eight-subsystem smallsat")}</strong><p>{t("Four mandatory subsystems and four optional upgrades. Real missions are named only as examples; every number is fictional.")}</p></div>
        </aside>
        <section className="assembly-stage"><div className="stage-title"><span className="eyebrow">{t("02 / ASSEMBLE")}</span><span className="tag">{t("SYNTHETIC SMALLSAT")}</span></div>
          <SpacecraftPreview selectedComponentIds={mission.selectedComponentIds} loadViewer={loadSpacecraftViewer} initiallyOpen={Boolean(loadSpacecraftViewer)} onInspectComponent={setInspected}/>
          {!loadSpacecraftViewer && <div className="schematic-ship" aria-hidden="true"><span className="schematic-panel"/><span className="schematic-bus">◉</span><span className="schematic-panel"/></div>}
          <div className="component-detail" aria-live="polite"><span className="eyebrow">{t(justChanged ? "CHANGE APPLIED · COMPARED WITH PREVIOUS PART" : highlightedEquipped ? "EQUIPPED COMPONENT" : "UPGRADE PREVIEW")}</span><strong>{t(highlighted.name)}</strong><p>{t(highlighted.description)}</p><div className="delta-row"><span>{t(highlightedEquipped && !justChanged ? capability(highlighted) : capabilityDelta(highlighted,deltaBase))}</span><span>{highlightedEquipped && !justChanged ? highlighted.costCredits : signed(highlighted.costCredits-deltaBase.costCredits)} {t("cr")}</span><span>{highlightedEquipped && !justChanged ? highlighted.massKg : signed(highlighted.massKg-deltaBase.massKg)} {t("kg")}</span><span>{highlightedEquipped && !justChanged ? highlighted.nominalPowerW : signed(highlighted.nominalPowerW-deltaBase.nominalPowerW)} {t("W load")}</span></div><small className="combo-line">{t("Active combinations")}: <b>{effects.activeSynergyIds.length ? effects.activeSynergyIds.map(id => t(synergies.find(x => x.id === id)!.name)).join(" · ") : t("none yet")}</b></small></div>
        </section>
        <aside className="plan-panel panel-scroll"><div className="eyebrow">{t("03 / PLAN")}</div><h2>{t("Flight plan")}</h2><div className="plan-tabs"><button aria-pressed={planTab==="flight"} onClick={()=>setPlanTab("flight")}>{t("Orbit")}</button><button aria-pressed={planTab==="launch"} onClick={()=>setPlanTab("launch")}>{t("Launch")}</button><button aria-pressed={planTab==="seed"} onClick={()=>setPlanTab("seed")}>{t("Replay seed & model")}</button></div><div className="plan-page" data-active={planTab==="flight"}>
          <label className="range-label" htmlFor="altitude">{t("Orbit altitude ")}<strong>{mission.altitudeKm} {t("km")}</strong></label><input id="altitude" type="range" min="250" max="1000" step="50" value={mission.altitudeKm} onChange={e => updateMission(m => ({...m,altitudeKm:Number(e.target.value)}))}/>
          <label className="range-label" htmlFor="duration">{t("Mission duration ")}<strong>{mission.durationOrbits} {t("orbits")}</strong></label><input id="duration" type="range" min="1" max="30" step="1" value={mission.durationOrbits} onChange={e => updateMission(m => ({...m,durationOrbits:Number(e.target.value)}))}/>
          <small>{t("Deadline: ")}{scenario.maxOrbits} {t("orbits")}</small></div><div className="plan-page" data-active={planTab==="launch"}><h3 className="launcher-label">{t("Launch strategy")}</h3>{launchers.map(l => <button className={`launcher-card ${l.id === mission.launcherId ? "selected" : ""}`} key={l.id} aria-pressed={l.id===mission.launcherId} onClick={() => updateMission(m=>({...m,launcherId:l.id}))}><strong>{t(l.name)}</strong><small>{l.costCredits} {t("cr · ")}{l.massLimitKg} {t("kg limit")}</small></button>)}
          <div className="mini-readout"><span>{t("Battery capacity")}</span><strong>{design.batteryCapacityWh} {t("Wh")}</strong></div><div className="mini-readout"><span>{t("Orbit period")}</span><strong>{(orbit.periodSeconds/60).toFixed(1)} {t("min")}</strong></div>
          </div><div className="plan-page" data-active={planTab==="seed"}><label className="seed-label">{t("Replay seed")}<input type="number" min="0" max="4294967295" value={seed} onChange={e=>changeSeed(Number(e.target.value))}/></label><p>{t("Identical design, seed and commands reproduce the outcome. Hardware values and contacts are synthetic.")}</p></div>
        </aside>
      </div>}

      {phase === "review" && <div className="review-layout"><section className="review-orbit"><MissionOrbit/><div className="review-orbit-caption"><strong>{mission.altitudeKm} {t("km")}</strong><span>{(orbit.periodSeconds/60).toFixed(1)} {t("MIN / ORBIT")}</span></div></section><section className="review-panel panel-scroll"><div className="eyebrow">{t("PRE-FLIGHT CHECK")}</div><h1>{t(design.violations.length ? "Resolve before launch." : "Ready for orbit.")}</h1><h2>{t(design.violations.length ? "Design requires revisions" : "Ready for mission operations")}</h2><p>{t(challenge.task)}</p>
        <div className="checks"><div><span>{t("Science return target")}</span><strong>{scenario.targetMB} {t("MB")}</strong></div><div><span>{t("Mission budget")}</span><strong>{design.totalCostCredits} {t("credits")}</strong><small>{t("Limit ")}{scenario.budgetCredits} {t("credits")}</small></div><div><span>{t("Planned duration")}</span><strong>{mission.durationOrbits} {t("orbits")}</strong><small>{t("Maximum ")}{scenario.maxOrbits} {t("orbits")}</small></div></div>
        {design.violations.map(v=><p className="violation" key={v}>× {t(v)}</p>)}
        {!design.violations.length && <p className="ready-message">{t("✓ Hard constraints cleared. Your design still needs to survive the mission.")}</p>}
        <button className="secondary details-button" onClick={()=>setDetail({title:"Engineering hints",lines:design.warnings})}>{t("Engineering hints (")}{design.warnings.length})</button>
        <label className="guided-toggle"><input type="checkbox" checked={assisted} onChange={e=>setAssisted(e.target.checked)}/>{t("Commander mode: stop for decisions")}</label><small>{t("Turn off for uninterrupted replay. Both modes use the same physics.")}</small>
        <div className="control-tip"><span>⌁</span><p>{t("During flight, turn the camera off to save energy. You can still transmit stored data, but you will stop making new observations.")}</p></div>
      </section></div>}

      {phase === "operations" && (!replay || !frame ? <div className="launching"><div className="launch-symbol">↗</div><h1>{t("Simulating orbital operations")}</h1><p>{t("Preparing your mission timeline…")}</p></div> : <div className="operations-grid">
        <section className="flight-stage"><div className="flight-stage-top"><span className="eyebrow">{t("MISSION CONTROL")}</span><span className="tag">{t(paused || pendingDecision ? "PAUSED" : `${speed}× ACCELERATED`)}</span></div><FlightView frame={frame} selectedComponentIds={mission.selectedComponentIds} onExplore={()=>setPaused(true)}/><div className="mission-clock"><strong>{(frame.timeSeconds/60).toFixed(1)}<small> {t("MIN")}</small></strong><span>{t("ORBIT ")}{Math.min(mission.durationOrbits,Math.floor(frame.timeSeconds/orbit.periodSeconds)+1)} / {mission.durationOrbits}</span></div>
          {pendingDecision && <DecisionCard decision={pendingDecision} onChoose={resolveDecision} frame={frame} onCompare={()=>compareCameraDecision(mission,seed,scenarioId,replay.commands,frame.timeSeconds)}/>}<div className="playback"><button className="secondary" disabled={Boolean(pendingDecision)} onClick={()=>setPaused(!paused)}>{t(paused ? "Resume playback" : "Pause playback")}</button><label>{t("Speed")}<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={120}>120×</option><option value={600}>600×</option><option value={1800}>1800×</option></select></label><div className="time-progress" role="progressbar" aria-label={t("Mission elapsed time")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cursor/duration*100)}><i style={{width:`${cursor/duration*100}%`}}/></div></div>
        </section>
        <aside className="flight-console panel-scroll"><div className="plan-tabs"><button aria-pressed={consoleTab==="data"} onClick={()=>setConsoleTab("data")}>{t("Science & energy")}</button><button aria-pressed={consoleTab==="commands"} onClick={()=>setConsoleTab("commands")}>{t("Controls & events")}</button></div><div className="console-page" data-active={consoleTab==="data"}><ScienceArchive returnedMB={frame.transmittedMB} targetMB={scenario.targetMB}/><div className="eyebrow">{t("LIVE TELEMETRY")}</div><h2>{t(progress >= 1 ? "Data target reached." : "Bring the data home.")}</h2><div className="science-count">{frame.transmittedMB.toFixed(1)}<small> / {scenario.targetMB} {t("MB")}</small></div><div className="mini-readout"><span>{t("Data produced")}</span><strong>{frame.producedMB.toFixed(1)} {t("MB")}</strong></div><div className="mini-readout"><span>{t("Waiting onboard")}</span><strong>{frame.storedMB.toFixed(1)} {t("MB")}</strong></div><div className="mini-readout"><span>{t("Battery energy remaining")}</span><strong>{frame.batteryWh.toFixed(1)} {t("Wh")}</strong></div>
          </div><div className="console-page" data-active={consoleTab==="commands"}><div className="event-message" role="status"><span className="status-dot"/>{t(eventText)}</div><h3>{t("Camera command")}</h3><div className="mode-buttons"><button className={frame.cameraOn ? "selected" : ""} aria-pressed={frame.cameraOn} onClick={()=>commandCamera(true)}>{t("Observe")}<small>{t("Acquire data · full load")}</small></button><button className={!frame.cameraOn ? "selected" : ""} aria-pressed={!frame.cameraOn} onClick={()=>commandCamera(false)}>{t("Save power")}<small>{t("Camera off · radio stays on")}</small></button></div>
          <small className="model-note">{t("Commands act at the displayed simulation time. The model recalculates the remaining mission.")}</small><button className="secondary details-button" onClick={()=>setDetail({title:"Command log",lines:replay.commands.length ? replay.commands.map(c=>`${(c.timeSeconds/60).toFixed(1)} min · camera ${c.cameraOn ? "on" : "off"}`) : ["No manual commands yet."]})}>{t("Command log (")}{replay.commands.length})</button></div>
        </aside>
      </div>)}

      {phase === "debrief" && result && <div className="debrief-layout">
        <section className={`outcome-stage ${result.success ? "won" : ""}`}><div className="eyebrow">{t("MISSION DEBRIEF / ")}{challenge.number}</div><div className="outcome-icon">{t(result.success ? "✓" : "↗")}</div><h1>{t(result.success ? "Mission accomplished" : "One more iteration.")}</h1><p>{t(result.success ? "Your observations made it home. Your spacecraft stayed powered." : result.energyOutageCount ? "Your spacecraft could not keep every interval powered." : "Your spacecraft returned less data than the mission needs.")}</p><ScienceArchive returnedMB={result.transmittedMB} targetMB={result.targetMB}/><div className="return-pill"><strong>{result.transmittedMB.toFixed(1)} {t("MB")}</strong><span>{t("Target ")}{result.targetMB} {t("MB")}</span></div><div className="score-line"><span>{t("MISSION SCORE")}</span><strong>{result.score}<small>/100</small></strong></div></section>
        <section className="debrief-panel panel-scroll"><div className="eyebrow">{t("LEARN BY TRYING AGAIN")}</div><h2>{t(result.success ? "Can you do it with less?" : "Change one thing. Try again.")}</h2>
          <div className="mini-readout"><span>{t("Data produced")}</span><strong>{result.producedMB.toFixed(1)} {t("MB")}</strong></div><div className="mini-readout"><span>{t("Steps with power deficit")}</span><strong>{result.energyOutageCount}</strong></div><small>{t("Reporting intervals up to 60 seconds; not distinct failures.")}</small>
          {previousAttempt ? <div className="comparison"><h3>{t("Compared with your last attempt")}</h3><p>{t("Same scenario and seed ")}{seed}{t(". Design, duration and commands may differ.")}</p><div><span>{t("Data returned")}</span><strong>{signed(result.transmittedMB-previousAttempt.result.transmittedMB)} {t("MB")}</strong></div><div><span>{t("Mission cost")}</span><strong>{signed(result.design.totalCostCredits-previousAttempt.result.design.totalCostCredits)} {t("cr")}</strong></div><div><span>{t("Power-deficit intervals")}</span><strong>{signed(result.energyOutageCount-previousAttempt.result.energyOutageCount)}</strong></div></div> : <p className="empty-comparison">{t("Your next attempt will be compared here. Keep the seed to test your engineering changes fairly.")}</p>}
          {diagnosis && <><p className="diagnosis-summary">{t(diagnosis.title)}</p><button className="secondary details-button" onClick={()=>setDetail({title:"What to try next",lines:[diagnosis.action,...(diagnosis.firstDeficitSeconds===null ? [] : [t("First recorded power deficit at")+" "+(diagnosis.firstDeficitSeconds/60).toFixed(1)+" min."])]})}>{t("What to try next")}</button></>}
          <button className="secondary hint-button" onClick={()=>setHintLevel(v=>Math.min(v+1,2))}>{t(hintLevel ? "Show another hint" : "Give me a hint")}</button>{hintLevel>0 && <p className="hint">{t(challenge.hint)}</p>}{hintLevel>1 && <p className="hint">{t(result.energyOutageCount ? "Compare solar generation across the whole orbit with continuous load. Battery capacity only bridges a temporary deficit." : result.producedMB < result.targetMB ? "Even a faster radio cannot send observations never acquired. Check camera rate, operating time and camera-off commands." : "You acquired enough data. Examine how much the radio can return during its contact windows.")}</p>}
          <button className="secondary details-button" onClick={()=>setDetail({title:"Full technical report",lines:result.explanations})}>{t("Full technical report")}</button>
        </section>
      </div>}
      {error && <div className="error-toast" role="alert">{t(error)}</div>}
    </main>
    <footer className="action-bar"><span className="model-note">{t("SYNTHETIC TRAINING · IDEALIZED PHYSICS ")}<span className="footer-seed">{t("/ SEED ")}{seed}</span></span><div>
      {phase === "design" && <><button className="secondary" onClick={()=>navigate("briefing")}>{t("← Missions")}</button><button className="primary" onClick={()=>navigate("review")}>{t("Review engineering →")}</button></>}
      {phase === "review" && <><button className="secondary" onClick={()=>navigate("design")}>{t("← Modify spacecraft")}</button><button className="primary" disabled={design.violations.length>0} onClick={launch}>{t("Launch simulation ↗")}</button></>}
      {phase === "operations" && <><button className="secondary" onClick={()=>navigate("review")}>{t("Cancel launch")}</button><button className="primary" disabled={!replay || Boolean(pendingDecision)} onClick={assisted ? ()=>{setWorkspaceTab("equipment");nextDecision();} : finish}>{t(assisted ? "Next event →" : "Finish remaining simulation →")}</button></>}
      {phase === "debrief" && <><button className="secondary" onClick={()=>{setRiverwatch(false);reset();}}>{t("Start new mission")}</button><button className="primary" onClick={()=>{setHintLevel(0);improveDesign();}}>{t("Improve design →")}</button></>}
      {phase === "briefing" && <span className="footer-note">{t("DESIGN → FLY → DISCOVER → IMPROVE")}</span>}
    </div></footer>
    {purpose && <MissionPurpose onClose={()=>setPurpose(false)} onStart={()=>{setRiverwatch(true);setPurpose(false);setLastChange(null);updateMission(()=>challengeStart("survey"));navigate("design");}}/>}
    {detail && <DetailDialog title={detail.title} lines={detail.lines} onClose={()=>setDetail(null)}/>}
    {help && <div ref={helpPanel} className="help-overlay" role="dialog" aria-modal="true" aria-label={t("How to play")}><section><button className="icon-button close-help" onClick={()=>setHelp(false)} aria-label={t("Close help")}>×</button><div className="eyebrow">{t("FLIGHT MANUAL")}</div><h2>{t("A mission, not a perfect satellite.")}</h2><div className="help-page" data-active={helpPage===0}><p>{t("Choose a challenge. Equip your satellite. Review the limits, then watch it fly. Switch the camera off to conserve energy, or keep observing to build up data.")}</p></div><div className="help-page" data-active={helpPage===1}><p>{t("Only data received on Earth count. A large camera needs enough power and a radio that can deliver its observations.")}</p></div><div className="help-page" data-active={helpPage===2}><p>{t("All hardware, budgets and training events are synthetic. Orbit and contact geometry are idealized. MB measure quantity, not scientific quality. The 3D model is a schematic and never determines the physics.")}</p></div><div className="help-page" data-active={helpPage===3}><p>{t("No camera power savings are assumed during automatic calibration. A manual camera-off command removes its entire nominal load; bus and radio stay on.")}</p></div><div className="help-pagination"><button disabled={helpPage===0} onClick={()=>setHelpPage(p=>p-1)}>{t("Previous")}</button><span>{helpPage+1}/4</span><button disabled={helpPage===3} onClick={()=>setHelpPage(p=>p+1)}>{t("Next")}</button></div><button className="primary" onClick={()=>setHelp(false)}>{t("Back to the mission")}</button></section></div>}
  </div>;
  function equippedFor(category: ComponentCategory) { return components.find(c=>c.category===category && mission.selectedComponentIds.includes(c.id)) ?? components.find(c=>c.category===category)!; }
}
