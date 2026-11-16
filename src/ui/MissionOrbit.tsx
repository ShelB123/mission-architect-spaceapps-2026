import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../i18n/Language";
import type { MissionFrame } from "../engine/game";
import { BriefingOrbit } from "./BriefingOrbit";
import { displayTurns, useOrbitTween } from "../visualization/orbitMotion";
import "./orbit-atlas.css";

/**
 * Presentation-only 2D map with four zoom levels. Level 0 is the mission
 * schematic driven by engine frames. Levels 1-3 are an educational atlas:
 * semi-major axes, eccentricities and periods are rounded textbook values,
 * and positions use mean motion from the J2000 epoch (no perturbations), so
 * they are approximate. Nothing here feeds the engines.
 */
const CX = 320, CY = 260, TAU = Math.PI * 2, DEG = Math.PI / 180;
const LEVELS = ["Low orbit", "Earth–Moon", "Inner planets", "Solar system"] as const;
interface Body { name: string; a: number; e: number; peri: number; L0: number; days: number; color: string; size: number; fact: string }
const PLANETS: readonly Body[] = [
  { name: "Mercury", a: 0.387, e: 0.206, peri: 77.5, L0: 252.25, days: 87.97, color: "#b5aa9d", size: 2.6, fact: "The smallest planet; its year lasts 88 Earth days." },
  { name: "Venus", a: 0.723, e: 0.007, peri: 131.5, L0: 181.98, days: 224.7, color: "#e3c98b", size: 3.8, fact: "The hottest planet, wrapped in thick carbon-dioxide clouds." },
  { name: "Earth", a: 1, e: 0.017, peri: 102.9, L0: 100.46, days: 365.26, color: "#4aa8d8", size: 4, fact: "Your satellite circles it about 15 times every day." },
  { name: "Mars", a: 1.524, e: 0.093, peri: 336, L0: 355.45, days: 686.98, color: "#d1603d", size: 3.2, fact: "The red planet; robotic rovers explore its surface." },
  { name: "Jupiter", a: 5.203, e: 0.048, peri: 14.7, L0: 34.4, days: 4332.6, color: "#d9b38c", size: 8, fact: "The largest planet; its Great Red Spot is a giant storm." },
  { name: "Saturn", a: 9.537, e: 0.054, peri: 92.4, L0: 49.94, days: 10759, color: "#e8d5a3", size: 7, fact: "Its bright rings are made of ice and rock." },
  { name: "Uranus", a: 19.19, e: 0.047, peri: 170.9, L0: 313.23, days: 30689, color: "#9fe0e6", size: 5.5, fact: "An ice giant that rotates tipped on its side." },
  { name: "Neptune", a: 30.07, e: 0.009, peri: 44.9, L0: 304.88, days: 60182, color: "#5b7fe0", size: 5.4, fact: "The most distant planet; one year lasts about 165 Earth years." },
];
const J2000_MS = Date.UTC(2000, 0, 1, 12);
function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** Heliocentric distance (AU) and ecliptic longitude (rad); true anomaly approximated by mean anomaly. */
function place(body: Body, anomaly: number) {
  return { r: body.a * (1 - body.e ** 2) / (1 + body.e * Math.cos(anomaly)), angle: anomaly + body.peri * DEG };
}
const point = (radius: number, angle: number) => [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)] as const;

function Stars() {
  const stars = useMemo(() => { const random = seeded(11); return Array.from({ length: 90 }, () => [random() * 640, random() * 520, 0.3 + random() * 0.9, 0.25 + random() * 0.6]); }, []);
  return <g>{stars.map(([x, y, r, o], i) => <circle key={i} cx={x} cy={y} r={r} fill="#dcebff" opacity={o}/>)}</g>;
}

function SolarSystem({ outer, picked, onPick }: { outer: boolean; picked: string; onPick: (name: string) => void }) {
  const { t } = useLanguage();
  const days = (Date.now() - J2000_MS) / 86400000;
  const scale = (au: number) => outer ? 200 * Math.sqrt(au / 30.4) : 58 * au;
  const bodies = outer ? PLANETS : PLANETS.slice(0, 4);
  const belt = useMemo(() => { const random = seeded(outer ? 5 : 3); return Array.from({ length: outer ? 150 : 260 }, () => [2.15 + random() * 1.1, random() * TAU, 0.4 + random() * 0.7]); }, [outer]);
  const kuiper = useMemo(() => { const random = seeded(9); return Array.from({ length: 170 }, () => [31.5 + random() * 12, random() * TAU, 0.4 + random() * 0.6]); }, []);
  const chosen = PLANETS.find(body => body.name === picked) ?? PLANETS[2];
  return <g>
    <circle cx={CX} cy={CY} r="26" fill="url(#sunGlow)"/><circle cx={CX} cy={CY} r={outer ? 5 : 8} fill="#ffe9a8"/>
    <text x={CX} y={CY + (outer ? 16 : 22)} textAnchor="middle" fill="#c7ba78" fontSize="8" letterSpacing="1.5">{t("SUN")}</text>
    {belt.map(([a, angle, r], i) => { const [x, y] = point(scale(a), angle); return <circle key={i} cx={x} cy={y} r={r * (outer ? 0.6 : 1)} fill="#8d8474" opacity=".55"/>; })}
    {outer && kuiper.map(([a, angle, r], i) => { const [x, y] = point(scale(a), angle); return x > 4 && x < 636 && y > 4 && y < 420 ? <circle key={i} cx={x} cy={y} r={r} fill="#7f97b8" opacity=".4"/> : null; })}
    {!outer && <text x={CX + scale(2.7) * 0.72} y={CY - scale(2.7) * 0.72} fill="#8d8474" fontSize="8" letterSpacing="1.5">{t("ASTEROID BELT")}</text>}
    {outer && <text x="14" y="24" fill="#7f97b8" fontSize="8" letterSpacing="1.5">{t("KUIPER BELT")}</text>}
    {bodies.map(body => {
      const path = Array.from({ length: 73 }, (_, i) => { const p = place(body, i / 72 * TAU); return point(scale(p.r), p.angle).map(v => v.toFixed(1)).join(" "); }).join("L");
      const now = place(body, (body.L0 + 360 * days / body.days - body.peri) * DEG);
      const [x, y] = point(scale(now.r), now.angle), active = body.name === chosen.name;
      return <g key={body.name}>
        <path d={`M${path}Z`} fill="none" stroke={active ? "#a9ef63" : "#3f6474"} strokeWidth={active ? 1.2 : 0.7} strokeDasharray={active ? undefined : "2 4"}/>
        <g className="atlas-body" role="button" tabIndex={0} aria-label={t(body.name)} aria-pressed={active} onClick={() => onPick(body.name)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(body.name); } }}>
          <circle cx={x} cy={y} r="13" fill="transparent"/>
          {body.name === "Saturn" && <ellipse cx={x} cy={y} rx={body.size * 1.9} ry={body.size * 0.55} fill="none" stroke="#cbb98a" strokeWidth="1.6" transform={`rotate(-20 ${x} ${y})`}/>}
          <circle cx={x} cy={y} r={body.size} fill={body.color} stroke={active ? "#f4ffe2" : "#0a1217"} strokeWidth={active ? 1.4 : 0.6}/>
          {body.name === "Jupiter" && <path d={`M${x - 7} ${y - 2}h14M${x - 7.5} ${y + 2.5}h15`} stroke="#a67c52" strokeWidth="1.3"/>}
          {body.name === "Earth" && <circle cx={x + 7} cy={y - 5} r="1.3" fill="#cfd3d6"/>}
          {(!outer || body.a > 2 || active) && <text x={x} y={y - body.size - 5} textAnchor="middle" fill={active ? "#eaffd0" : "#9fb7c2"} fontSize="8.5" letterSpacing="1">{t(body.name).toUpperCase()}</text>}
        </g>
      </g>;
    })}
    <rect x="110" y="424" width="420" height="62" rx="4" fill="#050b10" opacity=".82"/>
    <text x="320" y="440" textAnchor="middle" fill="#eaf4f7" fontSize="11">{t(chosen.name)} · {chosen.a} {t("AU")} {t("from the Sun")} · {t("orbit")}: {chosen.days < 700 ? `${chosen.days.toFixed(0)} ${t("days")}` : `${(chosen.days / 365.256).toFixed(1)} ${t("years")}`}</text>
    <text x="320" y="455" textAnchor="middle" fill="#9fb7c2" fontSize="10">{t(chosen.fact)}</text>
    <text x="320" y="469" textAnchor="middle" fill="#6f8a94" fontSize="8.5" letterSpacing="1.5">{t(outer ? "SOLAR SYSTEM • RADIAL SCALE COMPRESSED (SQUARE ROOT)" : "INNER SOLAR SYSTEM • ORBITS TO SCALE, BODIES ENLARGED")}</text>
    <text x="320" y="481" textAnchor="middle" fill="#6f8a94" fontSize="8">{t("Approximate positions for today (mean motion).")}</text>
  </g>;
}

function EarthMoon() {
  const { t } = useLanguage();
  const K = 196 / 384400; // px per km: distances to scale
  const days = (Date.now() - J2000_MS) / 86400000;
  const moon = { name: "Moon", a: 1, e: 0.0549, peri: 83.35, L0: 218.32, days: 27.3217, color: "", size: 0, fact: "" };
  const path = Array.from({ length: 73 }, (_, i) => { const p = place(moon, i / 72 * TAU); return point(p.r * 196, p.angle).map(v => v.toFixed(1)).join(" "); }).join("L");
  const now = place(moon, (moon.L0 + 360 * days / moon.days - moon.peri) * DEG), [mx, my] = point(now.r * 196, now.angle);
  return <g>
    <path d={`M${path}Z`} fill="none" stroke="#4d7784" strokeDasharray="3 6"/>
    <circle cx={CX} cy={CY} r={42164 * K} fill="none" stroke="#c7ba78" strokeWidth=".8" strokeDasharray="2 3"/>
    <text x={CX + 42164 * K + 6} y={CY - 8} fill="#c7ba78" fontSize="8.5" letterSpacing="1">{t("GEO 35,786 km")}</text>
    <circle cx={CX} cy={CY} r="8.5" fill="none" stroke="#a9ef63" strokeWidth="1"/><circle cx={CX} cy={CY} r="6" fill="url(#ocean)" stroke="#4ba4b5"/>
    <path d={`M${CX + 9} ${CY + 9}l22 22`} stroke="#a9ef63" strokeWidth=".7"/><text x={CX + 34} y={CY + 40} fill="#a9ef63" fontSize="8.5" letterSpacing="1">{t("YOUR ORBIT")}</text>
    <path d={`M${CX + 9} ${CY}L${mx} ${my}`} stroke="#7dc5f2" strokeWidth=".6" strokeDasharray="1 5"/>
    <circle cx={mx} cy={my} r="5" fill="#bdbdb6" stroke="#eeeeea" strokeWidth=".6"/><circle cx={mx - 1.5} cy={my - 1} r="1.2" fill="#8f8f89"/><circle cx={mx + 1.8} cy={my + 1.6} r=".8" fill="#8f8f89"/>
    <text x={mx} y={my - 11} textAnchor="middle" fill="#eaf4f7" fontSize="9" letterSpacing="1.5">{t("MOON")}</text>
    <text x={mx} y={my + 17} textAnchor="middle" fill="#9fb7c2" fontSize="8">{t("384,400 km · 27.3 days")}</text>
    <path d={`M40 416h${100000 * K}m0-4v8M40 412v8`} stroke="#9fb7c2"/><text x="40" y="406" fill="#9fb7c2" fontSize="8.5">{t("100,000 km")}</text>
    <text x="320" y="455" textAnchor="middle" fill="#9fb7c2" fontSize="10">{t("Radio signal: about 1.3 s each way")}</text>
    <text x="320" y="469" textAnchor="middle" fill="#6f8a94" fontSize="8.5" letterSpacing="1.5">{t("EARTH–MOON SYSTEM • DISTANCES TO SCALE, BODIES ENLARGED")}</text>
    <text x="320" y="481" textAnchor="middle" fill="#6f8a94" fontSize="8">{t("Approximate positions for today (mean motion).")}</text>
  </g>;
}

const StaticStars = memo(Stars);
const StaticEarthMoon = memo(EarthMoon);
const SolarMap = memo(SolarSystem);

interface OrbitMapProps { frame?: MissionFrame; orbitTurns?: number; moving?: boolean }

export function MissionOrbit({ compact = false, ...flight }: OrbitMapProps & { compact?: boolean }) {
  return compact ? <BriefingOrbit /> : <OrbitAtlas {...flight} />;
}

function OrbitAtlas({ frame, orbitTurns = frame?.orbitFraction ?? 0.08, moving = false }: OrbitMapProps) {
  const { t } = useLanguage();
  const [level, setLevel] = useState(0);
  const [picked, setPicked] = useState("Earth");
  const marker = useRef<SVGGElement>(null);
  const beam = useRef<SVGPathElement>(null);
  const tween = useOrbitTween(orbitTurns, moving);
  const angle = orbitTurns * TAU;
  const x = 320 + 238 * Math.cos(angle), y = 260 - 202 * Math.sin(angle);
  const linked = Boolean(frame?.contact && !frame.stationOffline && frame.batteryWh > 0);
  const debris = useMemo(() => { const random = seeded(21); return Array.from({ length: 64 }, () => { const a = random() * TAU, k = 1.07 + random() * 0.09; return [320 + 238 * k * Math.cos(a), 260 - 202 * k * Math.sin(a), 0.5 + random() * 1.1, random() * 180]; }); }, []);
  const shown = level;
  useLayoutEffect(() => {
    if (shown !== 0) return;
    let request = 0;
    function paint(now: number) {
      const phase = displayTurns(tween.current, now) * TAU;
      const px = 320 + 238 * Math.cos(phase), py = 260 - 202 * Math.sin(phase);
      marker.current?.setAttribute("transform", `translate(${px} ${py}) rotate(${-phase * 180 / Math.PI})`);
      beam.current?.setAttribute("d", `M${px} ${py}L355 352`);
      if (now < tween.current.endsAt) request = requestAnimationFrame(paint);
    }
    paint(performance.now());
    return () => cancelAnimationFrame(request);
  }, [shown, orbitTurns, moving, linked, tween]);
  return <div className="orbit-stage">
    <div className="orbit-zoom" role="group" aria-label={t("Map scale")}>
      <button aria-label={t("Zoom in")} disabled={level === 0} onClick={() => setLevel(level - 1)}>＋</button>
      {LEVELS.map((label, i) => <button key={label} aria-pressed={level === i} onClick={() => setLevel(i)}>{t(label)}</button>)}
      <button aria-label={t("Zoom out")} disabled={level === LEVELS.length - 1} onClick={() => setLevel(level + 1)}>－</button>
    </div>
    <svg viewBox="0 0 640 520" role="img" aria-label={t(shown === 0 ? "Schematic orbital plane. Sunlight from the right, Earth's shadow to the left." : "Solar-system map. Select a body for details.")}>
      <defs>
        <radialGradient id="ocean"><stop stopColor="#1f7189"/><stop offset=".75" stopColor="#153f60"/><stop offset="1" stopColor="#101e36"/></radialGradient>
        <linearGradient id="night"><stop stopColor="#020a15" stopOpacity=".94"/><stop offset=".58" stopColor="#020a15" stopOpacity=".2"/><stop offset="1" stopColor="#7ae9ff" stopOpacity=".08"/></linearGradient>
        <radialGradient id="atmos"><stop offset=".7" stopColor="#51dfea" stopOpacity="0"/><stop offset=".83" stopColor="#51dfea" stopOpacity=".15"/><stop offset="1" stopColor="#51dfea" stopOpacity="0"/></radialGradient>
        <radialGradient id="sunGlow"><stop stopColor="#fff2b8" stopOpacity=".9"/><stop offset=".35" stopColor="#ffc860" stopOpacity=".3"/><stop offset="1" stopColor="#ffb040" stopOpacity="0"/></radialGradient>
        <clipPath id="globe"><circle cx="320" cy="260" r="110"/></clipPath>
      </defs>
      <StaticStars/>
      {shown === 1 && <StaticEarthMoon/>}
      {shown >= 2 && <SolarMap outer={shown === 3} picked={picked} onPick={setPicked}/>}
      {shown === 0 && <g>
        <path className="atlas-eclipse-fill" d="M0 150H320V370H0Z" fill="#020611" opacity=".56"/>
        <path d="M0 150H320M0 370H320" stroke="#31465a" strokeWidth=".6" strokeDasharray="6 6"/>
        <ellipse cx="320" cy="260" rx="238" ry="202" fill="none" stroke="#4d7784" strokeWidth="1" strokeDasharray="3 8"/>
        <ellipse cx="320" cy="260" rx="254" ry="216" fill="none" stroke="#203340" strokeWidth=".6"/>
        <ellipse cx="320" cy="260" rx="277" ry="236" fill="none" stroke="#203340" strokeWidth=".6"/>
        {debris.map(([dx, dy, size, turn], i) => <rect key={i} x={dx - size} y={dy - size / 2} width={size * 2} height={size} fill="#a39f92" opacity=".7" transform={`rotate(${turn} ${dx} ${dy})`}/>)}
        <text x="620" y="62" textAnchor="end" fill="#8d897e" fontSize="8" letterSpacing="1.5">{t("DEBRIS BAND · DECORATIVE")}</text>
        {[0.25, 0.75].map(f => { const a = f * TAU + 0.5, px = 320 + 238 * Math.cos(a), py = 260 - 202 * Math.sin(a); return <path key={f} d="M-5 4L0-5L5 4" fill="none" stroke="#6fa3b3" transform={`translate(${px} ${py}) rotate(${-a * 180 / Math.PI})`}/>; })}
        <circle cx="320" cy="260" r="136" fill="url(#atmos)"/>
        <circle cx="320" cy="260" r="110" fill="url(#ocean)" stroke="#4ba4b5"/>
        <g clipPath="url(#globe)" fill="#3b877a" opacity=".8">
          <path d="M242 176l30-11 17 14 31-5 8 26-25 18-8 27-24-5-5-25-22-7-12-19Z"/>
          <path d="M287 248l34 1 25 28-9 28-17 33-12 24-11-12-4-40-19-30Z"/>
          <path d="M348 170l42 10 31 27-9 18-27-1-7 21-29-5-12-31Z"/>
          <path d="M355 250l35 8 16 32-22 39-21-23-16-30Z"/>
        </g>
        <g clipPath="url(#globe)" fill="none" stroke="#8fd3e0" strokeWidth=".5" opacity=".35">
          <ellipse cx="320" cy="260" rx="37" ry="110"/><ellipse cx="320" cy="260" rx="78" ry="110"/><path d="M320 150V370M210 260H430M222 210H418M222 310H418M255 172H385M255 348H385"/>
        </g>
        <g clipPath="url(#globe)" fill="none" stroke="#e8f6fa" strokeWidth="3" strokeLinecap="round" opacity=".28">
          <path d="M250 225q30-14 60 2M340 200q28-10 50 6M300 315q35 12 70-4M360 280q20-8 44 4"/>
        </g>
        <circle cx="320" cy="260" r="110" fill="url(#night)"/>
        <image className="atlas-earth-photo" href={`${import.meta.env.BASE_URL}textures/briefing-earth.jpg`} x="210" y="150" width="220" height="220" clipPath="url(#globe)"/>
        <g transform="translate(355 352)"><path d="M-6 0h12M0 0V-9M-6-14a7 7 0 0 0 12 0" stroke="#a9ef63" strokeWidth="1.2" fill="none"/><circle r="1.8" cy="-14" fill="#a9ef63"/></g>
        <text x="368" y="370" fill="#a9ef63" fontSize="8" letterSpacing="1.5">{t("GROUND STATION")}</text>
        <path d="M566 168h46m-38 30h38m-47 30h47" stroke="#c7ba78" opacity=".5"/>
        <text x="564" y="150" fill="#c7ba78" fontSize="10" letterSpacing="2">{t("SUN")}</text>
        <text x="32" y="260" fill="#688496" fontSize="10" letterSpacing="2">{t("ECLIPSE")}</text>
        <text x="330" y="140" fill="#8fb9c5" fontSize="8" letterSpacing="1.5">{t("DAY")}</text><text x="282" y="140" fill="#688496" fontSize="8" letterSpacing="1.5">{t("NIGHT")}</text>
        <text x="620" y="410" textAnchor="end" fill="#6f8a94" fontSize="8" letterSpacing="1">{t("TO GEO 35,786 km")} →</text>
        {linked && <path ref={beam} d={`M${x} ${y}L355 352`} stroke="#a9ef63" strokeWidth="2" strokeDasharray="5 6" className="downlink-beam"/>}
        <g ref={marker} className="orbit-satellite" transform={`translate(${x} ${y}) rotate(${-angle * 180 / Math.PI})`}>
          <circle r="27" fill={frame?.eclipse ? "#6077ab" : "#9cea65"} opacity=".08"/>
          <rect x="-27" y="-9" width="18" height="18" rx="2" fill="#234d75" stroke="#7dc5f2"/>
          <rect x="9" y="-9" width="18" height="18" rx="2" fill="#234d75" stroke="#7dc5f2"/>
          <rect x="-8" y="-11" width="16" height="22" rx="3" fill="#dbc9a1" stroke="#fff3c4"/>
          <path d="M-22-9V9m8-18V9M14-9V9m8-18V9M-27 0h18M9 0h18" stroke="#7dc5f2" strokeWidth=".5"/>
          <circle r="3.2" fill="#1c2128" stroke="#4aa8d8"/><path d="M0-11V-17M-3-17h6" stroke="#fff3c4" strokeWidth="1"/>
        </g>
        <text x="320" y="458" textAnchor="middle" fill="#83a0ac" fontSize="10" letterSpacing="2">{t("ORBIT SCHEMATIC • NOT TO SCALE")}</text>
      </g>}
    </svg>
    {shown === 0 && <div className="orbit-badges"><span className={frame?.eclipse ? "tag amber" : "tag"}>{t(frame?.eclipse ? "In eclipse" : "Sunlit")}</span><span className={linked ? "tag lime" : "tag muted"}>{t(frame?.stationOffline ? "Station offline" : linked ? "Downlink window" : "Awaiting contact")}</span></div>}
  </div>;
}
