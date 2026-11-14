import { useEffect, useMemo, useRef, useState } from "react";
import { categoryOrder, components, launchers } from "./data/catalog";
import { computeOrbitProfile } from "./engine/orbit";
import { missionScenarios, type MissionScenarioId } from "./engine/game";
import { assessScenarioDesign } from "./ui/assessScenarioDesign";
import { useMissionSession } from "./ui/useMissionSession";
import { SpacecraftPreview, type SpacecraftInspectionLoader } from "./ui/SpacecraftPreview";
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
};
const signed = (n: number) => `${n > 0 ? "+" : ""}${Number(n.toFixed(1))}`;
function Meter({ title, value, caption, ratio = 0, warn = false }: { title: string; value: string; caption: string; ratio?: number; warn?: boolean }) {
  return <div className={`hud-meter ${warn ? "warn" : ""}`}><div className="meter-label">{title}<span>{value}</span></div><div className="meter-track"><i style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}/></div><small>{caption}</small></div>;
}
function capability(c: SpaceComponent) {
  if (c.category === "payload") return `${c.scienceMBperMinute} MB/min`;
  if (c.category === "solar") return `${c.solarGenerationW} W generation`;
  if (c.category === "battery") return `${c.batteryCapacityWh} Wh reserve`;
  return `${c.downlinkMBperMinute} MB/min`;
}
function capabilityDelta(next: SpaceComponent, prior: SpaceComponent) {
  if (next.category === "payload") return `${signed((next.scienceMBperMinute ?? 0)-(prior.scienceMBperMinute ?? 0))} MB/min acquisition`;
  if (next.category === "solar") return `${signed((next.solarGenerationW ?? 0)-(prior.solarGenerationW ?? 0))} W generation`;
  if (next.category === "battery") return `${signed((next.batteryCapacityWh ?? 0)-(prior.batteryCapacityWh ?? 0))} Wh reserve`;
  return `${signed((next.downlinkMBperMinute ?? 0)-(prior.downlinkMBperMinute ?? 0))} MB/min downlink`;
}
export interface AppProps { readonly loadSpacecraftViewer?: SpacecraftInspectionLoader }
export default function App({ loadSpacecraftViewer }: AppProps = {}) {
  const session = useMissionSession();
  const { mission, scenarioId, selectScenario, seed, changeSeed, phase, result, replay, frame, cursor, duration, paused, setPaused,
    speed, setSpeed, previousAttempt, error, updateMission, navigate, launch, reset, improveDesign, commandCamera, finish } = session;
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
  const equipped = components.find(c => c.category === highlighted.category && mission.selectedComponentIds.includes(c.id)) ?? highlighted;
  const justChanged = mission.selectedComponentIds.includes(highlighted.id) && lastChange?.to === highlighted.id;
  const deltaBase = justChanged && lastChange ? lastChange.from : equipped;
  const telemetry = phase === "operations" ? frame : phase === "debrief" ? replay?.frames.at(-1) : undefined;
  const returned = telemetry?.transmittedMB ?? 0;
  const energy = telemetry?.batteryWh ?? design.batteryCapacityWh;
  const progress = returned / scenario.targetMB;
  function selectComponent(category: ComponentCategory, id: string) {
    if (equippedFor(category).id !== id) setLastChange({ from: equippedFor(category), to: id });
    updateMission(prev => ({ ...prev, selectedComponentIds: [...prev.selectedComponentIds.filter(item => components.find(c => c.id === item)?.category !== category), id] }));
    setInspected(id);
  }
  const eventText = !frame ? "Preparing telemetry…" : frame.stationOffline ? "Ground station unavailable. Data remain on board." : frame.calibration ? "Camera calibration. Acquisition temporarily paused." : !frame.cameraOn ? "Camera off. Saving power; no new observations." : frame.batteryWh === 0 ? "Energy reserve depleted. Operations may be interrupted." : frame.eclipse ? "In Earth's shadow. Running on the battery." : frame.contact ? "Contact window. Returning observations to Earth." : "Sunlit flight. Observing Earth; watch the energy balance.";

  return <div className="cockpit">
    <header className="command-header">
      <a className="wordmark" href="#" onClick={e => { e.preventDefault(); navigate("briefing"); }}><span className="brand-mark">M<span>↗</span></span><span>MISSION<span>ARCHITECT</span></span></a>
      <div className="header-center"><span className="status-dot"/> FLIGHT DESIGN LAB <span className="header-divider">/</span> EARTH OBSERVATION</div>
      <div className="header-actions"><label className="scenario-select"><span className="sr-only">Training scenario</span><select value={scenarioId} onChange={e => { selectScenario(e.target.value as MissionScenarioId); setHintLevel(0); }}>{Object.entries(missionScenarios).map(([id,s]) => <option key={id} value={id}>{s.name}</option>)}</select></label><button className="icon-button" aria-label="Help and model assumptions" onClick={() => { if (phase === "operations") setPaused(true); setHelp(true); }}>?</button></div>
    </header>
    <nav className="phase-nav" aria-label="Mission progress">{steps.map((step,i) => <button key={step.phase} className={phase === step.phase ? "active" : ""} disabled={step.phase === "operations" || (step.phase === "debrief" && !result)} onClick={() => step.phase !== "operations" && navigate(step.phase)}><span>{String(i+1).padStart(2,"0")}</span>{step.label}{phase === step.phase && <i/>}</button>)}</nav>
    <div className="hud" aria-label="Mission resources">
      <Meter title="BUDGET" value={`${design.totalCostCredits} / ${design.budgetLimitCredits}`} caption="synthetic credits" ratio={design.totalCostCredits/design.budgetLimitCredits} warn={design.totalCostCredits > design.budgetLimitCredits}/>
      <Meter title="LAUNCH MASS" value={`${design.totalMassKg} / ${design.massLimitKg} kg`} caption="spacecraft / launcher limit" ratio={design.totalMassKg/design.massLimitKg} warn={design.totalMassKg > design.massLimitKg}/>
      <Meter title={telemetry ? "BATTERY" : "POWER"} value={telemetry ? `${energy.toFixed(1)} Wh` : `${design.solarGenerationW} / ${design.nominalPowerW} W`} caption={telemetry ? `${telemetry.generationW} W generation · ${telemetry.loadW} W load` : "sunlit generation / continuous load"} ratio={telemetry ? energy/design.batteryCapacityWh : design.nominalPowerW/design.solarGenerationW} warn={telemetry ? energy/design.batteryCapacityWh < .15 : design.solarGenerationW*orbit.sunlightFraction < design.nominalPowerW}/>
      <Meter title="SCIENCE RETURN" value={`${returned.toFixed(0)} / ${scenario.targetMB} MB`} caption={telemetry ? "received on Earth" : "objective · data must reach Earth"} ratio={progress}/>
    </div>

    <main className={`game-area phase-${phase}`}>
      {phase === "briefing" && <div className="briefing-layout">
        <section className="briefing-art"><div className="eyebrow">YOUR NEXT MISSION / {challenge.number}</div><h1>Build it.<br/>Fly it.<br/><em>Make it work.</em></h1><MissionOrbit compact/><span className="art-caption">ONE SATELLITE. EVERY DECISION CONNECTED.</span></section>
        <section className="briefing-content panel-scroll"><div className="eyebrow">SELECT YOUR CHALLENGE</div><div className="mission-cards">{(Object.keys(challenges) as MissionScenarioId[]).map(id => <button className={`mission-card ${id === scenarioId ? "selected" : ""}`} key={id} aria-pressed={id === scenarioId} onClick={() => { selectScenario(id); setHintLevel(0); }}><span className="mission-number">{challenges[id].number}</span><div><small>{challenges[id].difficulty}</small><strong>{challenges[id].title}</strong><p>{challenges[id].hook}</p></div><span className="mission-arrow">↗</span></button>)}</div>
          <div className="selected-brief"><h2>{scenario.name}</h2><p>{challenge.task}</p><small>Budget {scenario.budgetCredits} credits · Up to {scenario.maxOrbits} orbits · No power outages</small></div>
          <div className="briefing-buttons"><button className="primary" onClick={() => navigate("design")}>Begin engineering <span>→</span></button><button className="secondary" onClick={() => { setLastChange(null); updateMission(() => challengeStart(scenarioId)); navigate("design"); }}>Try a repair challenge</button></div>
        </section>
      </div>}

      {phase === "design" && <div className="design-grid">
        <aside className="equipment-panel panel-scroll"><div className="eyebrow">01 / EQUIP</div><h2>Choose your spacecraft systems</h2>
          {categoryOrder.map(category => <section className="equipment-group" key={category}><h3><span>{categories[category].glyph}</span>{categories[category].label}</h3><div className="equipment-options">{components.filter(c => c.category === category).map(c => <button key={c.id} className={`equipment-card ${mission.selectedComponentIds.includes(c.id) ? "selected" : ""}`} aria-pressed={mission.selectedComponentIds.includes(c.id)} onMouseEnter={() => setInspected(c.id)} onFocus={() => setInspected(c.id)} onClick={() => selectComponent(category,c.id)}><strong>{c.name}</strong><small>{capability(c)}</small><span>{mission.selectedComponentIds.includes(c.id) ? "EQUIPPED" : `${signed(c.costCredits-equippedFor(category).costCredits)} cr`}</span></button>)}</div></section>)}
        </aside>
        <section className="assembly-stage"><div className="stage-title"><span className="eyebrow">02 / ASSEMBLE</span><span className="tag">SYNTHETIC SMALLSAT</span></div>
          <SpacecraftPreview selectedComponentIds={mission.selectedComponentIds} loadViewer={loadSpacecraftViewer} initiallyOpen={Boolean(loadSpacecraftViewer)} onInspectComponent={setInspected}/>
          {!loadSpacecraftViewer && <div className="schematic-ship" aria-hidden="true"><span className="schematic-panel"/><span className="schematic-bus">◉</span><span className="schematic-panel"/></div>}
          <div className="component-detail" aria-live="polite"><span className="eyebrow">{justChanged ? "CHANGE APPLIED · COMPARED WITH PREVIOUS PART" : mission.selectedComponentIds.includes(highlighted.id) ? "EQUIPPED COMPONENT" : "UPGRADE PREVIEW"}</span><strong>{highlighted.name}</strong><p>{highlighted.description}</p><div className="delta-row"><span>{capabilityDelta(highlighted,deltaBase)}</span><span>{signed(highlighted.costCredits-deltaBase.costCredits)} cr</span><span>{signed(highlighted.massKg-deltaBase.massKg)} kg</span><span>{signed(highlighted.nominalPowerW-deltaBase.nominalPowerW)} W load</span></div></div>
        </section>
        <aside className="plan-panel panel-scroll"><div className="eyebrow">03 / PLAN</div><h2>Flight plan</h2>
          <label className="range-label" htmlFor="altitude">Orbit altitude <strong>{mission.altitudeKm} km</strong></label><input id="altitude" type="range" min="250" max="1000" step="50" value={mission.altitudeKm} onChange={e => updateMission(m => ({...m,altitudeKm:Number(e.target.value)}))}/>
          <label className="range-label" htmlFor="duration">Mission duration <strong>{mission.durationOrbits} orbits</strong></label><input id="duration" type="range" min="1" max="30" step="1" value={mission.durationOrbits} onChange={e => updateMission(m => ({...m,durationOrbits:Number(e.target.value)}))}/>
          <small>Deadline: {scenario.maxOrbits} orbits</small><h3 className="launcher-label">Launch strategy</h3>{launchers.map(l => <button className={`launcher-card ${l.id === mission.launcherId ? "selected" : ""}`} key={l.id} aria-pressed={l.id===mission.launcherId} onClick={() => updateMission(m=>({...m,launcherId:l.id}))}><strong>{l.name}</strong><small>{l.costCredits} cr · {l.massLimitKg} kg limit</small></button>)}
          <div className="mini-readout"><span>Battery capacity</span><strong>{design.batteryCapacityWh} Wh</strong></div><div className="mini-readout"><span>Orbit period</span><strong>{(orbit.periodSeconds/60).toFixed(1)} min</strong></div>
          <details><summary>Replay seed & model</summary><label className="seed-label">Replay seed<input type="number" min="0" max="4294967295" value={seed} onChange={e=>changeSeed(Number(e.target.value))}/></label><p>Identical design, seed and commands reproduce the outcome. Hardware values and contacts are synthetic.</p></details>
        </aside>
      </div>}

      {phase === "review" && <div className="review-layout"><section className="review-orbit"><MissionOrbit/><div className="review-orbit-caption"><strong>{mission.altitudeKm} km</strong><span>{(orbit.periodSeconds/60).toFixed(1)} MIN / ORBIT</span></div></section><section className="review-panel panel-scroll"><div className="eyebrow">PRE-FLIGHT CHECK</div><h1>{design.violations.length ? "Resolve before launch." : "Ready for orbit."}</h1><h2>{design.violations.length ? "Design requires revisions" : "Ready for mission operations"}</h2><p>{challenge.task}</p>
        <div className="checks"><div><span>Science return target</span><strong>{scenario.targetMB} MB</strong></div><div><span>Mission budget</span><strong>{design.totalCostCredits} credits</strong><small>Limit {scenario.budgetCredits} credits</small></div><div><span>Planned duration</span><strong>{mission.durationOrbits} orbits</strong><small>Maximum {scenario.maxOrbits} orbits</small></div></div>
        {design.violations.map(v=><p className="violation" key={v}>× {v}</p>)}
        {!design.violations.length && <p className="ready-message">✓ Hard constraints cleared. Your design still needs to survive the mission.</p>}
        <details open={design.warnings.length > 0}><summary>Engineering hints ({design.warnings.length})</summary>{design.warnings.map(w=><p key={w}>{w}</p>)}</details>
        <div className="control-tip"><span>⌁</span><p>During flight, turn the camera off to save energy. You can still transmit stored data, but you will stop making new observations.</p></div>
      </section></div>}

      {phase === "operations" && (!replay || !frame ? <div className="launching"><div className="launch-symbol">↗</div><h1>Simulating orbital operations</h1><p>Preparing your mission timeline…</p></div> : <div className="operations-grid">
        <section className="flight-stage"><div className="flight-stage-top"><span className="eyebrow">MISSION CONTROL</span><span className="tag">{paused ? "PAUSED" : `${speed}× ACCELERATED`}</span></div><MissionOrbit frame={frame}/><div className="mission-clock"><strong>{(frame.timeSeconds/60).toFixed(1)}<small> MIN</small></strong><span>ORBIT {Math.min(mission.durationOrbits,Math.floor(frame.timeSeconds/orbit.periodSeconds)+1)} / {mission.durationOrbits}</span></div>
          <div className="playback"><button className="secondary" onClick={()=>setPaused(!paused)}>{paused ? "Resume playback" : "Pause playback"}</button><label>Speed<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={120}>120×</option><option value={600}>600×</option><option value={1800}>1800×</option></select></label><div className="time-progress" role="progressbar" aria-label="Mission elapsed time" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cursor/duration*100)}><i style={{width:`${cursor/duration*100}%`}}/></div></div>
        </section>
        <aside className="flight-console panel-scroll"><div className="eyebrow">LIVE TELEMETRY</div><h2>{progress >= 1 ? "Data target reached." : "Bring the data home."}</h2><div className="science-count">{frame.transmittedMB.toFixed(1)}<small> / {scenario.targetMB} MB</small></div><div className="mini-readout"><span>Data produced</span><strong>{frame.producedMB.toFixed(1)} MB</strong></div><div className="mini-readout"><span>Waiting onboard</span><strong>{frame.storedMB.toFixed(1)} MB</strong></div><div className="mini-readout"><span>Battery energy remaining</span><strong>{frame.batteryWh.toFixed(1)} Wh</strong></div>
          <div className="event-message" role="status"><span className="status-dot"/>{eventText}</div><h3>Camera command</h3><div className="mode-buttons"><button className={frame.cameraOn ? "selected" : ""} aria-pressed={frame.cameraOn} onClick={()=>commandCamera(true)}>Observe<small>Acquire data · full load</small></button><button className={!frame.cameraOn ? "selected" : ""} aria-pressed={!frame.cameraOn} onClick={()=>commandCamera(false)}>Save power<small>Camera off · radio stays on</small></button></div>
          <small className="model-note">Commands act at the displayed simulation time. The model recalculates the remaining mission.</small><details><summary>Command log ({replay.commands.length})</summary>{replay.commands.length ? replay.commands.map(c=><p key={c.timeSeconds}>{(c.timeSeconds/60).toFixed(1)} min · camera {c.cameraOn ? "on" : "off"}</p>) : <p>No manual commands yet.</p>}</details>
        </aside>
      </div>)}

      {phase === "debrief" && result && <div className="debrief-layout">
        <section className={`outcome-stage ${result.success ? "won" : ""}`}><div className="eyebrow">MISSION DEBRIEF / {challenge.number}</div><div className="outcome-icon">{result.success ? "✓" : "↗"}</div><h1>{result.success ? "Mission accomplished" : "One more iteration."}</h1><p>{result.success ? "Your observations made it home. Your spacecraft stayed powered." : result.energyOutageCount ? "Your spacecraft could not keep every interval powered." : "Your spacecraft returned less data than the mission needs."}</p><div className="return-pill"><strong>{result.transmittedMB.toFixed(1)} MB</strong><span>Target {result.targetMB} MB</span></div><div className="score-line"><span>MISSION SCORE</span><strong>{result.score}<small>/100</small></strong></div></section>
        <section className="debrief-panel panel-scroll"><div className="eyebrow">LEARN BY TRYING AGAIN</div><h2>{result.success ? "Can you do it with less?" : "Change one thing. Try again."}</h2>
          <div className="mini-readout"><span>Data produced</span><strong>{result.producedMB.toFixed(1)} MB</strong></div><div className="mini-readout"><span>Steps with power deficit</span><strong>{result.energyOutageCount}</strong></div><small>Reporting intervals up to 60 seconds; not distinct failures.</small>
          {previousAttempt ? <div className="comparison"><h3>Compared with your last attempt</h3><p>Same scenario and seed {seed}. Design, duration and commands may differ.</p><div><span>Data returned</span><strong>{signed(result.transmittedMB-previousAttempt.result.transmittedMB)} MB</strong></div><div><span>Mission cost</span><strong>{signed(result.design.totalCostCredits-previousAttempt.result.design.totalCostCredits)} cr</strong></div><div><span>Power-deficit intervals</span><strong>{signed(result.energyOutageCount-previousAttempt.result.energyOutageCount)}</strong></div></div> : <p className="empty-comparison">Your next attempt will be compared here. Keep the seed to test your engineering changes fairly.</p>}
          <button className="secondary hint-button" onClick={()=>setHintLevel(v=>Math.min(v+1,2))}>{hintLevel ? "Show another hint" : "Give me a hint"}</button>{hintLevel>0 && <p className="hint">{challenge.hint}</p>}{hintLevel>1 && <p className="hint">{result.energyOutageCount ? "Compare solar generation across the whole orbit with continuous load. Battery capacity only bridges a temporary deficit." : result.producedMB < result.targetMB ? "Even a faster radio cannot send observations never acquired. Check camera rate, operating time and camera-off commands." : "You acquired enough data. Examine how much the radio can return during its contact windows."}</p>}
          <details><summary>Full technical report</summary>{result.explanations.map((line,i)=><p key={i}>{line}</p>)}</details>
        </section>
      </div>}
      {error && <div className="error-toast" role="alert">{error}</div>}
    </main>
    <footer className="action-bar"><span className="model-note">SYNTHETIC TRAINING · IDEALIZED PHYSICS <span className="footer-seed">/ SEED {seed}</span></span><div>
      {phase === "design" && <><button className="secondary" onClick={()=>navigate("briefing")}>← Missions</button><button className="primary" onClick={()=>navigate("review")}>Review engineering →</button></>}
      {phase === "review" && <><button className="secondary" onClick={()=>navigate("design")}>← Modify spacecraft</button><button className="primary" disabled={design.violations.length>0} onClick={launch}>Launch simulation ↗</button></>}
      {phase === "operations" && <><button className="secondary" onClick={()=>navigate("review")}>Cancel launch</button><button className="primary" disabled={!replay} onClick={finish}>Finish remaining simulation →</button></>}
      {phase === "debrief" && <><button className="secondary" onClick={reset}>Start new mission</button><button className="primary" onClick={()=>{setHintLevel(0);improveDesign();}}>Improve design →</button></>}
      {phase === "briefing" && <span className="footer-note">DESIGN → FLY → DISCOVER → IMPROVE</span>}
    </div></footer>
    {help && <div ref={helpPanel} className="help-overlay" role="dialog" aria-modal="true" aria-label="How to play"><section><button className="icon-button close-help" onClick={()=>setHelp(false)} aria-label="Close help">×</button><div className="eyebrow">FLIGHT MANUAL</div><h2>A mission, not a perfect satellite.</h2><p>Choose a challenge. Equip your satellite. Review the limits, then watch it fly. Switch the camera off to conserve energy, or keep observing to build up data.</p><p>Only data received on Earth count. A large camera needs enough power and a radio that can deliver its observations.</p><p>All hardware, budgets and training events are synthetic. Orbit and contact geometry are idealized. MB measure quantity, not scientific quality. The 3D model is a schematic and never determines the physics.</p><p>No camera power savings are assumed during automatic calibration. A manual camera-off command removes its entire nominal load; bus and radio stay on.</p><button className="primary" onClick={()=>setHelp(false)}>Back to the mission</button></section></div>}
  </div>;
  function equippedFor(category: ComponentCategory) { return components.find(c=>c.category===category && mission.selectedComponentIds.includes(c.id))!; }
}
