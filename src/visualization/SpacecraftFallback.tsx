/**
 * Accessible, WebGL-free representation of the spacecraft visual model:
 * a 2D front-view blueprint (SVG) plus HTML lists of components and issues.
 *
 * It is used when WebGL is missing, the context is lost, the 3D chunk fails
 * to load, or the player turns 3D off. It depends only on React and on the
 * visual model, so it also renders on the server and in tests.
 */
import { busNodeKey, visualNodeKey } from "./buildSpacecraftVisualModel";
import { CATEGORY_LABELS, SYNTHETIC_GEOMETRY_NOTICE } from "./types";
import type { ComponentVisualDefinition, SpacecraftVisualModel, VisualIssue, VisualPart } from "./types";

export type FallbackReason = "loading" | "unsupported" | "context-lost" | "error" | "disabled";

const REASON_TEXT: Readonly<Record<FallbackReason, string>> = {
  loading: "Loading the 3D view…",
  unsupported: "WebGL is not available in this browser. Showing the 2D schematic instead.",
  "context-lost": "The 3D graphics context was lost. Showing the 2D schematic instead.",
  error: "The 3D view could not be displayed. Showing the 2D schematic instead.",
  disabled: "The 3D view is turned off. Showing the 2D schematic.",
};

const ISSUE_TITLES: Readonly<Record<VisualIssue["code"], string>> = {
  "unknown-component": "Unknown component",
  "missing-visual": "No visual available",
  "invalid-visual": "Visual could not be drawn",
  "duplicate-id": "Duplicate selection",
};

export function formatPartName(partId: string): string {
  return partId.replace(/-/g, " ");
}

/** Legend colour: the first part that is not neutral structure, so the swatch matches what stands out in the drawing. */
function swatchColor(component: ComponentVisualDefinition): string | undefined {
  const distinctive = component.parts.find((part) => part.finish !== "dark" && part.finish !== "metal" && part.finish !== "structure");
  return (distinctive ?? component.parts[0])?.colorHex;
}

/* ---------- Front-view projection (pure) ---------- */

export type ProjectedShape =
  | { readonly type: "polygon"; readonly points: readonly (readonly [number, number])[]; readonly depthM: number }
  | { readonly type: "circle"; readonly centre: readonly [number, number]; readonly radius: number; readonly depthM: number };

const PX_PER_M = 1000;

/** Orthographic front view: screen x = +X, screen y = -Y, in SVG pixels (1000 px per metre). */
export function projectPartFront(part: VisualPart): ProjectedShape {
  const [rx, ry, rz] = part.rotationRad;
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  // Rows 1–2 and the Z row of the Euler XYZ rotation matrix; enough for an XY projection.
  const m11 = c * e, m12 = -c * f;
  const m21 = a * f + b * e * d, m22 = a * e - b * f * d;
  const m32 = b * e + a * f * d;
  const [px, py, pz] = part.positionM;
  const hx = part.dimensionsM[0] / 2, hy = part.dimensionsM[1] / 2;
  const toScreen = (lx: number, ly: number): readonly [number, number] => [
    (px + m11 * lx + m12 * ly) * PX_PER_M,
    -(py + m21 * lx + m22 * ly) * PX_PER_M,
  ];
  const isRound = part.kind === "cylinder" || part.kind === "cone";
  if (isRound && Math.abs(m32) > 0.9) {
    return { type: "circle", centre: [px * PX_PER_M, -py * PX_PER_M], radius: hx * PX_PER_M, depthM: pz };
  }
  const points = part.kind === "cone"
    ? [toScreen(0, hy), toScreen(hx, -hy), toScreen(-hx, -hy)]
    : [toScreen(-hx, -hy), toScreen(hx, -hy), toScreen(hx, hy), toScreen(-hx, hy)];
  return { type: "polygon", points, depthM: pz };
}

interface DrawnPart {
  readonly key: string;
  readonly componentId: string | null;
  readonly part: VisualPart;
  readonly shape: ProjectedShape;
}

function collectDrawnParts(model: SpacecraftVisualModel): DrawnPart[] {
  const drawn: DrawnPart[] = model.busParts.map((part) => ({ key: busNodeKey(part.partId), componentId: null, part, shape: projectPartFront(part) }));
  for (const component of model.components) {
    for (const part of component.parts) {
      drawn.push({ key: visualNodeKey(component.componentId, part.partId), componentId: component.componentId, part, shape: projectPartFront(part) });
    }
  }
  // Painter's order, back to front. Array.prototype.sort is stable, so equal depths keep model order.
  return drawn.sort((first, second) => first.shape.depthM - second.shape.depthM);
}

function boundsOf(drawn: readonly DrawnPart[]): readonly [number, number, number, number] {
  let minX = -120, maxX = 120, minY = -180, maxY = 180;
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const { shape } of drawn) {
    if (shape.type === "circle") {
      grow(shape.centre[0] - shape.radius, shape.centre[1] - shape.radius);
      grow(shape.centre[0] + shape.radius, shape.centre[1] + shape.radius);
    } else {
      for (const [x, y] of shape.points) grow(x, y);
    }
  }
  const pad = 28;
  return [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

interface BlueprintProps {
  readonly model: SpacecraftVisualModel;
  readonly highlightedComponentId?: string;
  readonly onInspectComponent?: (componentId: string) => void;
}

export function SpacecraftBlueprint({ model, highlightedComponentId, onInspectComponent }: BlueprintProps) {
  const drawn = collectDrawnParts(model);
  const viewBox = boundsOf(drawn).map(round1).join(" ");
  const names = model.components.map((component) => component.label);
  const summary = names.length
    ? `2D front-view schematic of the spacecraft bus with ${names.join(", ")}.`
    : "2D front-view schematic of the spacecraft bus with no drawable components.";
  return (
    <svg className="ma-viewer__blueprint" viewBox={viewBox} role="img" aria-label={summary} preserveAspectRatio="xMidYMid meet">
      {drawn.map(({ key, componentId, part, shape }) => {
        const isHighlighted = componentId !== null && componentId === highlightedComponentId;
        const className = [
          "ma-viewer__blueprint-part",
          componentId === null ? "ma-viewer__blueprint-part--bus" : "",
          part.internal ? "ma-viewer__blueprint-part--internal" : "",
          isHighlighted ? "ma-viewer__blueprint-part--highlighted" : "",
        ].filter(Boolean).join(" ");
        const common = {
          className,
          fill: part.colorHex,
          "data-node": key,
          onClick: componentId !== null && onInspectComponent ? () => onInspectComponent(componentId) : undefined,
        };
        return shape.type === "circle"
          ? <circle key={key} {...common} cx={round1(shape.centre[0])} cy={round1(shape.centre[1])} r={round1(shape.radius)} />
          : <polygon key={key} {...common} points={shape.points.map(([x, y]) => `${round1(x)},${round1(y)}`).join(" ")} />;
      })}
    </svg>
  );
}

/* ---------- HTML lists ---------- */

interface PartsListProps {
  readonly model: SpacecraftVisualModel;
  readonly highlightedComponentId?: string;
  readonly onInspectComponent?: (componentId: string) => void;
}

export function SpacecraftPartsList({ model, highlightedComponentId, onInspectComponent }: PartsListProps) {
  if (model.components.length === 0) {
    return <p className="ma-viewer__empty">No selected component can be drawn. The fixed spacecraft bus is shown on its own.</p>;
  }
  return (
    <ul className="ma-viewer__list" aria-label="Selected components shown in the viewer">
      {model.components.map((component) => {
        const isHighlighted = component.componentId === highlightedComponentId;
        const internalCount = component.parts.filter((part) => part.internal).length;
        const placement = internalCount === component.parts.length
          ? "Inside the bus — use Schematic view to see it"
          : internalCount > 0 ? "Partly inside the bus" : "Mounted outside the bus";
        return (
          <li key={component.componentId} className="ma-viewer__list-item">
            <button
              type="button"
              className={`ma-viewer__item-button${isHighlighted ? " ma-viewer__item-button--active" : ""}`}
              aria-pressed={isHighlighted}
              data-component-id={component.componentId}
              onClick={() => onInspectComponent?.(component.componentId)}
            >
              <span className="ma-viewer__swatch" style={{ background: swatchColor(component) }} aria-hidden="true" />
              <span className="ma-viewer__item-text">
                <span className="ma-viewer__item-category">{CATEGORY_LABELS[component.category]}</span>
                <span className="ma-viewer__item-name">{component.label}</span>
                <span className="ma-viewer__item-meta">{placement}</span>
              </span>
            </button>
            {isHighlighted && (
              <p className="ma-viewer__item-parts">
                {component.parts.length} schematic {component.parts.length === 1 ? "part" : "parts"}: {component.parts.map((part) => formatPartName(part.partId)).join(", ")}.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SpacecraftIssues({ issues }: { readonly issues: readonly VisualIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="ma-viewer__issues" role="status">
      <strong>Viewer notes</strong>
      <ul>
        {issues.map((item, index) => (
          <li key={`${item.code}:${item.componentId}:${index}`} data-issue-code={item.code}>
            <span className="ma-viewer__issue-title">{ISSUE_TITLES[item.code]}:</span> {item.message}
          </li>
        ))}
      </ul>
      <p className="ma-viewer__issues-note">These notes concern the drawing only. Engineering review is unaffected.</p>
    </div>
  );
}

/* ---------- Complete fallback ---------- */

export interface SpacecraftFallbackProps {
  readonly model: SpacecraftVisualModel;
  readonly reason: FallbackReason;
  readonly highlightedComponentId?: string;
  readonly onInspectComponent?: (componentId: string) => void;
  readonly onRetry?: () => void;
  /** Set to false when the surrounding viewer already renders the lists. */
  readonly showLists?: boolean;
}

export default function SpacecraftFallback({ model, reason, highlightedComponentId, onInspectComponent, onRetry, showLists = true }: SpacecraftFallbackProps) {
  return (
    <div className="ma-viewer__fallback" data-fallback-reason={reason}>
      <p className="ma-viewer__fallback-message" role="status">
        {REASON_TEXT[reason]}
        {onRetry && reason !== "loading" && reason !== "disabled" && (
          <button type="button" className="ma-viewer__button ma-viewer__button--inline" onClick={onRetry}>Try 3D again</button>
        )}
      </p>
      <SpacecraftBlueprint model={model} highlightedComponentId={highlightedComponentId} onInspectComponent={onInspectComponent} />
      {showLists && (
        <>
          <SpacecraftPartsList model={model} highlightedComponentId={highlightedComponentId} onInspectComponent={onInspectComponent} />
          <SpacecraftIssues issues={model.issues} />
          <p className="ma-viewer__notice">{SYNTHETIC_GEOMETRY_NOTICE}</p>
        </>
      )}
    </div>
  );
}
