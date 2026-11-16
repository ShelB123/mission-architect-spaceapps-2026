/**
 * Presentation contracts for the spacecraft inspection viewer.
 *
 * Source of truth: docs/ARCHITECTURE.md §4. Only domain *types* are imported;
 * no Three.js object crosses this boundary and nothing here feeds the engines.
 *
 * Units (docs/ARCHITECTURE.md §6): 1 scene unit = 1 metre of SYNTHETIC
 * geometry, right-handed, +Y up, +X solar-panel side, +Z model front.
 * Dimensions are illustrative. They are never converted to mass, power,
 * capacity or data rate.
 *
 * Additive extensions over the architecture proposal (all optional or
 * widening, so descriptors written against the original proposal stay valid):
 *   - VisualKind gains "cone" (dish reflectors).
 *   - VisualPart gains optional `finish` and `internal` rendering hints.
 *   - buildSpacecraftVisualModel accepts an optional fourth `busParts` argument.
 */
import type { ComponentCategory, MissionConfig } from "../types/contracts";

export type Vec3 = readonly [number, number, number];

/**
 * box / panel: dimensionsM = local width (X), height (Y), depth (Z).
 * cylinder:    axis is local Y; X and Z must be equal (diameter); Y is length.
 * cone:        axis is local Y, apex towards +Y; X and Z must be equal (base
 *              diameter); Y is height. Rendered as an open shell.
 */
export type VisualKind = "box" | "cylinder" | "panel" | "cone";

/** Purely cosmetic surface hint. Carries no engineering meaning. */
export type VisualFinish =
  | "structure"
  | "metal"
  | "painted"
  | "dark"
  | "foil"
  | "glass"
  | "solar-cell"
  | "cell"
  | "pcb";

export interface VisualPart {
  readonly partId: string; // Unique within its component descriptor
  readonly kind: VisualKind;
  readonly positionM: Vec3;
  readonly rotationRad: Vec3; // Euler XYZ, radians
  readonly dimensionsM: Vec3; // Positive local XYZ extent
  readonly colorHex: string; // "#rrggbb"
  readonly finish?: VisualFinish;
  /** True when the part sits inside the bus and needs the schematic view. */
  readonly internal?: boolean;
}

export interface ComponentVisualDefinition {
  readonly componentId: string; // Matches SpaceComponent.id exactly
  readonly category: ComponentCategory;
  readonly label: string; // Must match the physical catalog name
  readonly geometryProvenance: "synthetic";
  readonly parts: readonly VisualPart[];
}

export type VisualCatalog = Readonly<Record<string, ComponentVisualDefinition>>;

export interface VisualIssue {
  readonly componentId: string;
  readonly code: "unknown-component" | "missing-visual" | "invalid-visual" | "duplicate-id";
  readonly message: string;
}

export interface SpacecraftVisualModel {
  readonly schemaVersion: 1;
  readonly geometryProvenance: "synthetic";
  readonly busParts: readonly VisualPart[];
  readonly components: readonly ComponentVisualDefinition[];
  readonly issues: readonly VisualIssue[];
}

export interface SpacecraftViewerProps {
  readonly model: SpacecraftVisualModel;
  /** Controlled highlight. When omitted the viewer keeps its own highlight. */
  readonly highlightedComponentId?: string;
  /** Inspection only: never equips hardware or changes MissionConfig. */
  readonly onInspectComponent?: (componentId: string) => void;
  readonly className?: string;
  /** Optional presentation-only translation; defaults to the canonical English copy. */
  readonly translate?: (text: string) => string;
}

export interface KnownComponentRef {
  readonly id: string;
  readonly category: ComponentCategory;
  readonly name: string;
}

export type BuildSpacecraftVisualModel = (
  selectedIds: readonly string[],
  catalog: VisualCatalog,
  knownComponents: readonly KnownComponentRef[],
  busParts?: readonly VisualPart[],
) => SpacecraftVisualModel;

/** The configuration boundary uses only this existing field. */
export type VisualSelection = Readonly<Pick<MissionConfig, "selectedComponentIds">>;

/** Visible provenance label required by docs/ARCHITECTURE.md §6 (canonical English source text). */
export const SYNTHETIC_GEOMETRY_NOTICE = "Synthetic schematic geometry; not a CAD model";

export const CATEGORY_LABELS: Readonly<Record<ComponentCategory, string>> = {
  payload: "Scientific payload",
  solar: "Solar power",
  battery: "Energy storage",
  communications: "Communications",
  attitude: "Attitude control",
  computer: "Onboard computer",
  thermal: "Thermal control",
  propulsion: "Propulsion",
};
