import { useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { components, synergies } from "../data/catalog";
import { componentLessons } from "../data/componentLessons";
import { useLanguage } from "../i18n/Language";
import { BUS_VISUAL_PARTS, visualCatalog } from "../visualization/catalog";
import { CATEGORY_LABELS, type VisualPart } from "../visualization/types";
import type { DesignEffects, DesignSynergy, SpaceComponent } from "../types/contracts";
import "./subsystems.css";
import "./component-guide.css";

type P3 = [number, number, number];
type Effectful = Pick<SpaceComponent, "scienceRateMultiplier" | "downlinkRateMultiplier" | "batteryCapacityMultiplier" | "calibrationFactor" | "stationOutageFactor">;

const percent = (factor: number) => { const v = Math.round((factor - 1) * 100); return `${v > 0 ? "+" : ""}${v}%`; };
/** Canonical English chips such as "+14% science"; translated at the presentation boundary. */
export function effectChips(source: Effectful | DesignSynergy): string[] {
  const s = source as Effectful;
  const chips: string[] = [];
  if (s.scienceRateMultiplier && s.scienceRateMultiplier !== 1) chips.push(`${percent(s.scienceRateMultiplier)} science`);
  if (s.downlinkRateMultiplier && s.downlinkRateMultiplier !== 1) chips.push(`${percent(s.downlinkRateMultiplier)} downlink`);
  if (s.batteryCapacityMultiplier && s.batteryCapacityMultiplier !== 1) chips.push(`${percent(s.batteryCapacityMultiplier)} battery`);
  if (s.calibrationFactor && s.calibrationFactor !== 1) chips.push(`${percent(s.calibrationFactor)} calibration pause`);
  if (s.stationOutageFactor && s.stationOutageFactor !== 1) chips.push(`${percent(s.stationOutageFactor)} station outage`);
  return chips;
}
export const effectSummary = (source: Effectful) => effectChips(source).join(", ") || "bus baseline";

/** Euler XYZ as used by the 3D scene: rotate about Z, then Y, then X. */
function rotate([x, y, z]: P3, [rx, ry, rz]: readonly number[]): P3 {
  let c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(ry); s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rx); s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}
const VIEW = [0.42, -0.7, 0] as const;
const SEGMENTS = 14;

function localFaces(part: VisualPart): { points: P3[]; open?: boolean }[] {
  const [w, h, d] = part.dimensionsM.map(v => v / 2);
  if (part.kind === "box" || part.kind === "panel") {
    const v = (sx: number, sy: number, sz: number): P3 => [sx * w, sy * h, sz * d];
    return [
      [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)], [v(1, -1, -1), v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1)],
      [v(1, -1, 1), v(1, -1, -1), v(1, 1, -1), v(1, 1, 1)], [v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)],
      [v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1), v(-1, 1, -1)], [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)],
    ].map(points => ({ points }));
  }
  const ring = (y: number, radius: number) => Array.from({ length: SEGMENTS }, (_, i): P3 => {
    const a = (i / SEGMENTS) * Math.PI * 2;
    return [Math.sin(a) * radius, y, Math.cos(a) * radius];
  });
  const bottom = ring(-h, w);
  if (part.kind === "cone") return bottom.map((point, i) => ({ points: [point, bottom[(i + 1) % SEGMENTS], [0, h, 0] as P3], open: true }));
  const top = ring(h, w);
  return [
    ...bottom.map((point, i) => ({ points: [point, bottom[(i + 1) % SEGMENTS], top[(i + 1) % SEGMENTS], top[i]] })),
    { points: top }, { points: [...bottom].reverse() },
  ];
}

function shade(hex: string, light: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(Math.min(255, v * light))).join(",")})`;
}

/** Small painter's-algorithm drawing of the synthetic parts. Presentation only. */
export function PartSketch({ componentId, label }: { componentId: string; label: string }) {
  const drawing = useMemo(() => {
    const parts = visualCatalog[componentId]?.parts ?? [];
    const ghost = BUS_VISUAL_PARTS.filter(part => part.partId === "body");
    const faces = [...ghost.map(part => ({ part, ghost: true })), ...parts.map(part => ({ part, ghost: false }))].flatMap(({ part, ghost }) =>
      localFaces(part).flatMap(face => {
        const points = face.points.map(point => {
          const world = rotate(point, part.rotationRad);
          return rotate([world[0] + part.positionM[0], world[1] + part.positionM[1], world[2] + part.positionM[2]], VIEW);
        });
        const [a, b, c] = points;
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const length = Math.hypot(...normal) || 1;
        const facing = normal[2] / length;
        if (facing <= 0 && !face.open && !ghost) return [];
        const light = 0.5 + 0.5 * Math.abs((normal[0] * -0.35 + normal[1] * 0.6 + normal[2] * 0.72) / length);
        return [{ points, ghost, depth: points.reduce((sum, point) => sum + point[2], 0) / points.length, fill: shade(part.colorHex, light) }];
      }));
    if (!faces.length) return null;
    faces.sort((a, b) => Number(b.ghost) - Number(a.ghost) || a.depth - b.depth);
    const hardware = faces.filter(face => !face.ghost);
    const framing = hardware.length ? hardware : faces;
    const xs = framing.flatMap(face => face.points.map(point => point[0])), ys = framing.flatMap(face => face.points.map(point => -point[1]));
    const minX = Math.min(...xs), minY = Math.min(...ys), width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
    const pad = Math.max(width, height) * 0.08;
    return { faces, viewBox: `${minX - pad} ${minY - pad} ${width + pad * 2} ${height + pad * 2}`, stroke: Math.max(width, height) / 260 };
  }, [componentId]);
  if (!drawing) return null;
  return <svg className="part-sketch" viewBox={drawing.viewBox} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
    {drawing.faces.map((face, i) => <polygon key={i} points={face.points.map(point => `${point[0].toFixed(4)},${(-point[1]).toFixed(4)}`).join(" ")}
      fill={face.ghost ? "#7fd6e8" : face.fill} fillOpacity={face.ghost ? 0.05 : 1} stroke={face.ghost ? "#7fd6e8" : "#0a1217"} strokeOpacity={face.ghost ? 0.35 : 0.55} strokeWidth={drawing.stroke} strokeLinejoin="round"/>)}
  </svg>;
}

type Step = readonly [icon: string, english: string, spanish: string];
const steps = {
  light: ["☀", "Light", "Luz"], ground: ["◒", "Ground", "Suelo"], lens: ["◉", "Lens", "Lente"],
  image: ["▧", "Image", "Imagen"], bands: ["▥", "Color bands", "Bandas de color"], material: ["◇", "Materials", "Materiales"],
  infrared: ["≋", "Infrared", "Infrarrojo"], sensor: ["◉", "Sensor", "Sensor"], temperature: ["♨", "Temperature", "Temperatura"],
  pulse: ["↟", "Pulse out", "Pulso de ida"], echo: ["↺", "Echo back", "Eco de vuelta"], map: ["▧", "Map", "Mapa"],
  laser: ["➝", "Laser", "Láser"], time: ["◷", "Travel time", "Tiempo de viaje"], height: ["↕", "Height", "Altura"],
  gps: ["⌁", "Navigation signal", "Señal de navegación"], air: ["≋", "Atmosphere", "Atmósfera"], layers: ["▤", "Air layers", "Capas de aire"],
  cells: ["▥", "Solar cells", "Celdas solares"], current: ["ϟ", "Electricity", "Electricidad"],
  reserve: ["▰", "Stored energy", "Energía guardada"], shadow: ["◐", "Eclipse", "Eclipse"],
  files: ["▤", "Data", "Datos"], signal: ["⌁", "Radio waves", "Ondas de radio"], earth: ["⊙", "Earth station", "Estación en Tierra"],
  direction: ["✧", "Reference", "Referencia"], turn: ["⟲", "Turn", "Giro"], aim: ["⊕", "Pointing", "Apuntado"], location: ["⊕", "Position or direction", "Posición u orientación"],
  command: ["↳", "Command", "Orden"], chip: ["▣", "Computer", "Computadora"], task: ["✓", "Action", "Acción"],
  stall: ["!", "Glitch", "Fallo"], recovery: ["↺", "Recovery", "Recuperación"],
  memory: ["▰", "Memory", "Memoria"], smaller: ["▪", "Smaller files", "Archivos pequeños"],
  warmth: ["♨", "Heat", "Calor"], blanket: ["▨", "Surface layers", "Capas exteriores"], exchange: ["⇄", "Heat exchange", "Intercambio térmico"],
  radiator: ["▥", "Radiator", "Radiador"], space: ["✧", "Space", "Espacio"], heater: ["♨", "Heater", "Calentador"], battery: ["▰", "Battery", "Batería"],
  propellant: ["◆", "Propellant", "Propelente"], exhaust: ["⇢", "Exhaust", "Gas expulsado"], push: ["➜", "Push", "Empujón"],
  launch: ["▲", "Launch", "Lanzamiento"], speed: ["➝", "Speed", "Velocidad"], orbit: ["◌", "Orbit", "Órbita"],
} satisfies Record<string, Step>;

const flows = {
  photo: [steps.ground, steps.lens, steps.image],
  spectrum: [steps.light, steps.bands, steps.material],
  temperature: [steps.infrared, steps.sensor, steps.temperature],
  echo: [steps.pulse, steps.echo, steps.map],
  range: [steps.laser, steps.time, steps.height],
  atmosphere: [steps.gps, steps.air, steps.layers],
  sun: [steps.light, steps.cells, steps.current],
  charge: [steps.current, steps.reserve, steps.shadow],
  radio: [steps.files, steps.signal, steps.earth],
  laser: [steps.files, steps.laser, steps.earth],
  point: [steps.direction, steps.turn, steps.aim],
  sense: [steps.direction, steps.sensor, steps.location],
  compute: [steps.command, steps.chip, steps.task],
  protect: [steps.stall, steps.chip, steps.recovery],
  compress: [steps.files, steps.chip, steps.smaller],
  store: [steps.files, steps.memory, steps.earth],
  retain: [steps.warmth, steps.blanket, steps.exchange],
  cool: [steps.warmth, steps.radiator, steps.space],
  heat: [steps.current, steps.heater, steps.battery],
  thrust: [steps.propellant, steps.exhaust, steps.push],
  coast: [steps.launch, steps.speed, steps.orbit],
};

/** Read-only guide. Opening it leaves the equipped configuration alone. */
export function ComponentGuide({ component, selectedIds, effects, onClose }: {
  component: SpaceComponent;
  selectedIds: readonly string[];
  effects: DesignEffects;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const title = useId();
  const panel = useRef<HTMLElement>(null);
  const info = componentLessons[component.id];
  const [how, when] = info?.[language] ?? [t(component.description), ""];
  const ownTags = component.tags ?? [];
  const designTags = new Set(components.filter(c => selectedIds.includes(c.id) && c.category !== component.category).flatMap(c => c.tags ?? []));
  const otherTags = new Set(components.filter(c => c.category !== component.category).flatMap(c => c.tags ?? []));
  const related = synergies.filter(synergy =>
    synergy.requiresTags.some(tag => ownTags.includes(tag)) &&
    synergy.requiresTags.every(tag => ownTags.includes(tag) || otherTags.has(tag)),
  );
  const equipped = selectedIds.includes(component.id);
  const componentEffects = effectChips(component);
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    const cockpit = document.querySelector<HTMLElement>(".cockpit");
    const wasInert = cockpit?.inert ?? false;
    if (cockpit) cockpit.inert = true;
    panel.current?.querySelector("button")?.focus();
    return () => {
      if (cockpit) cockpit.inert = wasInert;
      origin?.focus();
    };
  }, []);

  return createPortal(<div className="part-guide-overlay" onClick={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="part-guide" ref={panel} data-category={component.category} role="dialog" aria-modal="true" aria-labelledby={title} onKeyDown={event => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = panel.current?.querySelectorAll<HTMLElement>("button, summary, a[href]");
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <header className="part-guide-header">
        <div><span className="eyebrow">{t(CATEGORY_LABELS[component.category])}</span><h2 id={title}>{t(component.name)}</h2></div>
        <button type="button" className="icon-button" aria-label={t("Close component guide")} onClick={onClose}>×</button>
      </header>
      <div className="part-guide-overview">
        <figure>
          <PartSketch componentId={component.id} label={`${t("Synthetic schematic drawing")} · ${t(component.name)}`}/>
          <figcaption>{t("Synthetic schematic drawing")}</figcaption>
        </figure>
        <div>
          <h3>{t("How it works")}</h3><p>{how}</p>
          {info && <ol className="part-guide-flow" role="list" aria-label={t("Process diagram")}>
            {flows[info.flow].map(([icon, en, es], index) => <li key={index}><span aria-hidden="true">{icon}</span>{language === "es" ? es : en}</li>)}
          </ol>}
        </div>
      </div>
      {when && <div className="part-guide-decision"><h3>{t("When to choose it")}</h3><p>{when}</p></div>}
      <h3>{t("Numbers in the game")}</h3>
      <dl className="part-guide-stats">
        <div><dt>{t("Mass added")}</dt><dd>{component.massKg} kg</dd></div>
        <div><dt>{t("Cost in credits")}</dt><dd>{component.costCredits} cr</dd></div>
        <div><dt>{t("Electric power used")}</dt><dd>{component.nominalPowerW} W</dd></div>
        {component.scienceMBperMinute !== undefined && <div><dt>{t("Data collected per minute")}</dt><dd>{component.scienceMBperMinute} MB/min</dd></div>}
        {component.solarGenerationW !== undefined && <div><dt>{t("Power generated in sunlight")}</dt><dd>{component.solarGenerationW} W</dd></div>}
        {component.batteryCapacityWh !== undefined && <div><dt>{t("Stored energy")}</dt><dd>{component.batteryCapacityWh} Wh</dd></div>}
        {component.downlinkMBperMinute !== undefined && <div><dt>{t("Data sent per contact minute")}</dt><dd>{component.downlinkMBperMinute} MB/min</dd></div>}
        {componentEffects.length > 0 && <div><dt>{t("Modeled effect")}</dt><dd>{componentEffects.map(t).join(" · ")}</dd></div>}
      </dl>
      {component.context && <details><summary>{t("In real satellites")}</summary><p>{t(component.context)}</p></details>}
      {related.length > 0 && <details><summary>{t("Compatible combinations")}</summary><ul className="dossier-combos">{related.map(synergy => {
      const active = equipped && effects.activeSynergyIds.includes(synergy.id);
      const missing = synergy.requiresTags.filter(tag => !ownTags.includes(tag) && !designTags.has(tag));
      return <li key={synergy.id} data-active={active}>
        <b>{active ? "✓ " : "＋ "}{t(synergy.name)}</b> <i>{t(effectChips(synergy).join(", "))}</i>
        <p>{t(synergy.description)}</p>
        <small>{active ? t("ACTIVE") : missing.length ? `${t("Needs")}: ${missing.map(tag => components.filter(c => c.tags?.includes(tag)).slice(0, 2).map(c => t(c.name)).join(` ${t("or")} `)).join(" + ")}` : t("Equip this part to activate")}</small>
      </li>;
      })}</ul></details>}
    </section>
  </div>, document.body);
}
