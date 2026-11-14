import { useMemo, useState } from "react";
import { budgetLimitCredits, categoryOrder, components, defaultMission, launchers, scienceTargetMB } from "./data/catalog";
import { computeOrbitProfile } from "./engine/orbit";
import { evaluateDesign } from "./engine/resources";
import { runMission } from "./engine/game";
import type { ComponentCategory, MissionConfig, MissionPhase, MissionResult } from "./types/contracts";

const steps: { phase: MissionPhase; label: string }[] = [
  { phase: "briefing", label: "Briefing" },
  { phase: "design", label: "Design" },
  { phase: "review", label: "Review" },
  { phase: "operations", label: "Operations" },
  { phase: "debrief", label: "Debrief" },
];
const categoryLabels: Record<ComponentCategory, string> = {
  payload: "Scientific payload",
  solar: "Solar power",
  battery: "Energy storage",
  communications: "Communications",
};

function MiniChart({ data, max, unit }: { data: number[]; max: number; unit: string }) {
  const sample = data.length > 100 ? data.filter((_, i) => i % Math.ceil(data.length / 100) === 0) : data;
  const points = sample.map((n, i) => `${(i / Math.max(1, sample.length - 1)) * 600},${130 - (n / Math.max(1, max)) * 122}`).join(" ");
  return (
    <div className="mini-chart">
      <svg viewBox="0 0 600 140" role="img" aria-label={`Simulated history of ${unit}`} preserveAspectRatio="none">
        <line x1="0" y1="130" x2="600" y2="130" stroke="#477392" strokeDasharray="4 6" />
        <line x1="0" y1="70" x2="600" y2="70" stroke="#477392" strokeDasharray="4 6" opacity=".5" />
        <polyline points={points} fill="none" stroke="#59cde1" strokeWidth="2.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <small>0–{max.toFixed(0)} {unit} · Time progression →</small>
    </div>
  );
}

function Stat({ title, value, sub, warn = false }: { title: string; value: string; sub: string; warn?: boolean }) {
  return <div className={`stat ${warn ? "stat-warn" : ""}`}><small>{title}</small><strong>{value}</strong><span>{sub}</span></div>;
}

function App() {
  const [phase, setPhase] = useState<MissionPhase>("briefing");
  const [mission, setMission] = useState<MissionConfig>({ ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] });
  const [result, setResult] = useState<MissionResult | null>(null);
  const [error, setError] = useState("");
  const design = useMemo(() => evaluateDesign(mission), [mission]);
  const orbit = useMemo(() => computeOrbitProfile({ altitudeKm: mission.altitudeKm }), [mission.altitudeKm]);
  const activeStep = steps.findIndex((s) => s.phase === phase);

  function selectComponent(category: ComponentCategory, id: string) {
    setMission((prev) => {
      const without = prev.selectedComponentIds.filter((itemId) => components.find((c) => c.id === itemId)?.category !== category);
      return { ...prev, selectedComponentIds: [...without, id] };
    });
    setResult(null);
  }

  function simulate() {
    try {
      const next = runMission(mission, 2026);
      setResult(next);
      setError("");
      setPhase("debrief");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed.");
    }
  }

  function reset() {
    setMission({ ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] });
    setResult(null);
    setError("");
    setPhase("briefing");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-icon">◈</span><div><strong>MISSION ARCHITECT</strong><small>SPACE APPS CHALLENGE 2026</small></div></div>
        <span className="top-tag">ENGINEERING STRATEGY GAME <i>•</i> MVP 0.1</span>
      </header>
      <main className="main-content">
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow">MISSION CONTROL / EARTH OBSERVATION</span><h1>Design the mission.<br /><em>Prove it works.</em></h1><p>Every spacecraft choice is a tradeoff. Engineer an Earth-observation satellite, balance your resources, and survive a simulated low Earth orbit mission.</p></div>
          <div className="planet-visual" aria-hidden="true"><div className="planet"><span className="planet-glow" /></div><div className="orbit-ring" /><div className="satellite">✦</div><div className="space-label">LEO / {mission.altitudeKm} KM</div></div>
        </section>
        <nav className="stepper" aria-label="Mission progress">
          {steps.map((step, index) => <button type="button" key={step.phase} className={index === activeStep ? "step active" : index < activeStep ? "step done" : "step"} onClick={() => {
            if (index < 3 || (index === 4 && result)) setPhase(step.phase);
          }} disabled={index === 3 || (index === 4 && !result)}>
            <span>{String(index + 1).padStart(2, "0")}</span>{step.label}</button>)}
        </nav>
        <section className="panel">
          {phase === "briefing" && <>
            <div className="section-header"><span className="eyebrow">01 / YOUR MISSION</span><h2>Eyes on Earth</h2><p>Build a small Earth-observation spacecraft that acquires science imagery and transmits at least <strong>{scienceTargetMB} MB</strong> of data during a modeled six-orbit mission.</p></div>
            <div className="objectives">
              <div><span className="objective-symbol">◎</span><strong>Science return</strong><p>Downlink at least {scienceTargetMB} MB of imagery.</p></div>
              <div><span className="objective-symbol">ϟ</span><strong>Power survival</strong><p>Keep spacecraft loads powered through sunlight and eclipse.</p></div>
              <div><span className="objective-symbol">◫</span><strong>Design limits</strong><p>Stay within the launcher mass capacity and {budgetLimitCredits} game-credit budget.</p></div>
            </div>
            <div className="note">This is an educational simulation. Hardware parameters and launch costs are fictional game values; orbital and eclipse geometry are deliberately simplified.</div>
            <div className="actions"><button className="primary" onClick={() => setPhase("design")}>Begin engineering →</button></div>
          </>}
          {phase === "design" && <>
            <div className="section-header"><span className="eyebrow">02 / SPACECRAFT BUILDER</span><h2>Choose your spacecraft systems</h2><p>Each subsystem changes your budget, mass, energy balance or scientific output.</p></div>
            <div className="builder-layout">
              <div className="choices">
                {categoryOrder.map((category) => <div className="category" key={category}><h3>{categoryLabels[category]}</h3><div className="card-grid">
                  {components.filter((c) => c.category === category).map((c) =>
                    <button key={c.id} type="button" onClick={() => selectComponent(category, c.id)} className={`choice-card ${mission.selectedComponentIds.includes(c.id) ? "selected" : ""}`} aria-pressed={mission.selectedComponentIds.includes(c.id)}>
                      <span className="choice-heading">{c.name} {mission.selectedComponentIds.includes(c.id) && <span className="check">✓</span>}</span><span className="choice-description">{c.description}</span>
                      <span className="choice-meta">{c.massKg} kg · {c.costCredits} credits · {c.nominalPowerW} W load</span>
                    </button>)}
                </div></div>)}
                <div className="category"><h3>Launch strategy</h3><div className="card-grid">{launchers.map((l) => <button type="button" key={l.id} aria-pressed={mission.launcherId === l.id} onClick={() => setMission((m) => ({ ...m, launcherId: l.id }))} className={`choice-card ${mission.launcherId === l.id ? "selected" : ""}`}><span className="choice-heading">{l.name}</span><span className="choice-meta">Capacity {l.massLimitKg} kg · {l.costCredits} credits</span></button>)}</div></div>
              </div>
              <aside className="builder-aside">
                <h3>MISSION PARAMETERS</h3>
                <label className="range-label" htmlFor="altitude">Orbit altitude <strong>{mission.altitudeKm} km</strong></label>
                <input id="altitude" type="range" min="250" max="1000" step="50" value={mission.altitudeKm} onChange={(e) => setMission((m) => ({ ...m, altitudeKm: Number(e.target.value) }))}/>
                <label className="range-label" htmlFor="duration">Mission duration <strong>{mission.durationOrbits} orbits</strong></label>
                <input id="duration" type="range" min="2" max="12" step="1" value={mission.durationOrbits} onChange={(e) => setMission((m) => ({ ...m, durationOrbits: Number(e.target.value) }))}/>
                <p className="aside-note">Initial component specifications are synthetic, not manufacturer or NASA performance claims.</p>
                <hr />
                <Stat title="Total spacecraft mass" value={`${design.totalMassKg.toFixed(1)} kg`} sub={`Maximum ${design.massLimitKg} kg`} warn={design.totalMassKg > design.massLimitKg}/>
                <Stat title="Mission budget" value={`${design.totalCostCredits} credits`} sub={`Maximum ${design.budgetLimitCredits}`} warn={design.totalCostCredits > design.budgetLimitCredits}/>
                <Stat title="Generation / load" value={`${design.solarGenerationW} / ${design.nominalPowerW} W`} sub="In illuminated operations" />
                <Stat title="Stored energy" value={`${design.batteryCapacityWh} Wh`} sub="Nominal battery capacity" />
              </aside>
            </div>
            <div className="actions"><button className="ghost" onClick={() => setPhase("briefing")}>← Back</button><button className="primary" onClick={() => setPhase("review")}>Review engineering →</button></div>
          </>}
          {phase === "review" && <>
            <div className="section-header"><span className="eyebrow">03 / ENGINEERING REVIEW</span><h2>{design.violations.length ? "Design requires revisions" : "Ready for mission operations"}</h2><p>Before launch, verify spacecraft constraints and orbital assumptions.</p></div>
            <div className="stats-row">
              <Stat title="Orbital period" value={`${(orbit.periodSeconds / 60).toFixed(1)} min`} sub="Circular two-body orbit"/>
              <Stat title="Estimated eclipse" value={`${(orbit.eclipseFraction * 100).toFixed(1)}%`} sub="Assumes solar beta angle 0°"/>
              <Stat title="Total launch mass" value={`${design.totalMassKg} kg`} sub={`Limit ${design.massLimitKg} kg`} warn={design.totalMassKg > design.massLimitKg}/>
              <Stat title="Total mission cost" value={`${design.totalCostCredits}`} sub={`Limit ${design.budgetLimitCredits} credits`} warn={design.totalCostCredits > design.budgetLimitCredits}/>
            </div>
            <div className="review-box"><h3>Engineering findings</h3>
              {design.violations.length === 0 && <p className="positive">✓ All hard design constraints passed.</p>}
              {design.violations.map((v) => <p className="negative" key={v}>✕ {v}</p>)}
              {design.warnings.map((v) => <p className="caution" key={v}>! {v}</p>)}
            </div>
            <div className="note">Eclipse: maximum-eclipse idealization. Ground contact: fictional window. These outputs cannot be used for actual mission planning.</div>
            <div className="actions"><button className="ghost" onClick={() => setPhase("design")}>← Modify spacecraft</button><button className="primary" disabled={design.violations.length > 0} onClick={() => { setPhase("operations"); window.setTimeout(simulate, 450); }}>Launch simulation →</button></div>
          </>}
          {phase === "operations" && <div className="loading"><div className="loading-orbit">✦</div><h2>Simulating orbital operations</h2><p>Computing illumination, resource consumption, science acquisition, and communication windows.</p></div>}
          {phase === "debrief" && result && <>
            <div className="section-header"><span className="eyebrow">05 / MISSION DEBRIEF</span><h2>{result.success ? "Mission accomplished" : "Mission needs improvement"}</h2><p>Your engineering decisions produced these modeled outcomes.</p></div>
            <div className="result-status"><div><span className="eyebrow">MISSION SCORE</span><strong>{result.score}<small>/ 100</small></strong></div><span className={result.success ? "success-pill" : "failure-pill"}>{result.success ? "OBJECTIVES MET" : "OBJECTIVES NOT MET"}</span></div>
            <div className="stats-row">
              <Stat title="Science returned" value={`${result.transmittedMB.toFixed(1)} MB`} sub={`Target ${result.targetMB} MB`}/>
              <Stat title="Data produced" value={`${result.producedMB.toFixed(1)} MB`} sub="Payload observation data"/>
              <Stat title="Power outages" value={String(result.energyOutageCount)} sub="One-minute model steps" warn={result.energyOutageCount > 0}/>
              <Stat title="Science completion" value={`${(result.scienceCompletion * 100).toFixed(0)}%`} sub="Relative to science objective"/>
            </div>
            <div className="chart-grid"><div><h3>Battery capacity throughout mission</h3><MiniChart data={result.batteryHistoryWh} max={Math.max(1, result.design.batteryCapacityWh)} unit="Wh" /></div><div><h3>Stored science data</h3><MiniChart data={result.dataHistoryMB} max={Math.max(1, ...result.dataHistoryMB)} unit="MB" /></div></div>
            <div className="review-box"><h3>Engineering insights</h3>{result.explanations.map((line, i) => <p key={i}>{line}</p>)}</div>
            <div className="actions"><button className="ghost" onClick={reset}>↺ Start new mission</button><button className="primary" onClick={() => { setResult(null); setPhase("design"); }}>Improve design →</button></div>
          </>}
          {error && <p role="alert" className="negative">{error}</p>}
        </section>
        <footer><span>MISSION ARCHITECT · SPACE APPS 2026</span><span>AI-ASSISTED OPEN SOURCE PROTOTYPE · EDUCATIONAL MODELS</span></footer>
      </main>
    </div>
  );
}

export default App;
