/**
 * Pure adapter: selected component IDs + visual catalog → SpacecraftVisualModel.
 *
 * Follows docs/ARCHITECTURE.md §5. It performs no engineering calculation,
 * imports no engine and never mutates its inputs. O(N + K + P) for N known
 * components, K selected IDs and P copied parts.
 *
 * A problem with one component becomes a VisualIssue; it never throws and
 * never "repairs" the engineering configuration (that belongs to resources.ts).
 */
import { BUS_VISUAL_PARTS } from "./catalog";
import type {
  ComponentVisualDefinition,
  KnownComponentRef,
  SpacecraftVisualModel,
  Vec3,
  VisualCatalog,
  VisualIssue,
  VisualPart,
} from "./types";

/** Namespace reserved for bus scene nodes; cannot collide with "componentId:partId". */
export const BUS_NODE_NAMESPACE = "@bus";

export function visualNodeKey(componentId: string, partId: string): string {
  return `${componentId}:${partId}`;
}

export function busNodeKey(partId: string): string {
  return `${BUS_NODE_NAMESPACE}:${partId}`;
}

const KINDS: ReadonlySet<string> = new Set(["box", "cylinder", "panel", "cone"]);
const FINISHES: ReadonlySet<string> = new Set(["structure", "metal", "painted", "dark", "foil", "glass", "solar-cell", "cell", "pcb"]);
const CATEGORIES: ReadonlySet<string> = new Set(["payload", "solar", "battery", "communications"]);
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const ROUND_SECTION_TOLERANCE_M = 1e-9;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Returns a human-readable problem, or null when the part is renderable. */
function describePartProblem(part: unknown, seenPartIds: Set<string>): string | null {
  if (!isRecord(part)) return "a part is not an object";
  const { partId, kind, positionM, rotationRad, dimensionsM, colorHex, finish, internal } = part;
  if (typeof partId !== "string" || partId.length === 0) return "a part has no partId";
  if (seenPartIds.has(partId)) return `partId "${partId}" is repeated`;
  seenPartIds.add(partId);
  if (typeof kind !== "string" || !KINDS.has(kind)) return `part "${partId}" has an unsupported kind`;
  if (!isFiniteVec3(positionM)) return `part "${partId}" has a non-finite position`;
  if (!isFiniteVec3(rotationRad)) return `part "${partId}" has a non-finite rotation`;
  if (!isFiniteVec3(dimensionsM) || dimensionsM.some((n) => n <= 0)) return `part "${partId}" needs positive finite dimensions`;
  if ((kind === "cylinder" || kind === "cone") && Math.abs(dimensionsM[0] - dimensionsM[2]) > ROUND_SECTION_TOLERANCE_M) {
    return `part "${partId}" is a ${kind} whose X and Z diameters differ`;
  }
  if (typeof colorHex !== "string" || !COLOR_PATTERN.test(colorHex)) return `part "${partId}" has an invalid colour`;
  if (finish !== undefined && (typeof finish !== "string" || !FINISHES.has(finish))) return `part "${partId}" has an unknown finish`;
  if (internal !== undefined && typeof internal !== "boolean") return `part "${partId}" has a non-boolean internal flag`;
  return null;
}

function describeDefinitionProblem(definition: unknown, known: KnownComponentRef): string | null {
  if (!isRecord(definition)) return "the descriptor is not an object";
  if (definition.componentId !== known.id) return "the descriptor componentId does not match its catalog key";
  if (typeof definition.category !== "string" || !CATEGORIES.has(definition.category)) return "the descriptor category is not recognised";
  if (definition.category !== known.category) return "the descriptor category differs from the component catalog";
  if (definition.label !== known.name) return "the descriptor label differs from the component name";
  if (definition.geometryProvenance !== "synthetic") return "the geometry is not marked as synthetic";
  if (!Array.isArray(definition.parts) || definition.parts.length === 0) return "the descriptor has no parts";
  const seenPartIds = new Set<string>();
  for (const part of definition.parts) {
    const problem = describePartProblem(part, seenPartIds);
    if (problem) return problem;
  }
  return null;
}

function copyVec3(value: Vec3): Vec3 {
  return Object.freeze([value[0], value[1], value[2]] as const);
}

function copyPart(part: VisualPart): VisualPart {
  return Object.freeze({
    partId: part.partId,
    kind: part.kind,
    positionM: copyVec3(part.positionM),
    rotationRad: copyVec3(part.rotationRad),
    dimensionsM: copyVec3(part.dimensionsM),
    colorHex: part.colorHex,
    ...(part.finish !== undefined ? { finish: part.finish } : {}),
    ...(part.internal !== undefined ? { internal: part.internal } : {}),
  });
}

function copyDefinition(definition: ComponentVisualDefinition): ComponentVisualDefinition {
  return Object.freeze({
    componentId: definition.componentId,
    category: definition.category,
    label: definition.label,
    geometryProvenance: "synthetic" as const,
    parts: Object.freeze(definition.parts.map(copyPart)),
  });
}

function issue(componentId: string, code: VisualIssue["code"], message: string): VisualIssue {
  return Object.freeze({ componentId, code, message });
}

function copyValidBusParts(busParts: readonly VisualPart[]): readonly VisualPart[] {
  if (!Array.isArray(busParts)) return Object.freeze([]);
  const seenPartIds = new Set<string>();
  const valid: VisualPart[] = [];
  for (const part of busParts) {
    if (describePartProblem(part, seenPartIds) === null) valid.push(copyPart(part));
  }
  return Object.freeze(valid);
}

const NO_OFFSET: Vec3 = Object.freeze([0, 0, 0] as const);
const SCHEMATIC_SEPARATION_M = 0.06;

/**
 * Presentation-only separation used by the schematic ("exploded") view.
 * It moves drawings apart on screen; it does not model a deployment and has
 * no engineering meaning. Internal parts stay inside the translucent bus.
 */
export function schematicOffsetM(category: ComponentVisualDefinition["category"], part: VisualPart): Vec3 {
  if (part.internal) return NO_OFFSET;
  switch (category) {
    case "solar":
      return [Math.sign(part.positionM[0]) * SCHEMATIC_SEPARATION_M, 0, 0];
    case "payload":
      return [0, 0, SCHEMATIC_SEPARATION_M];
    case "communications":
      return [0, SCHEMATIC_SEPARATION_M, 0];
    default:
      return NO_OFFSET;
  }
}

/** Radius (m) of a sphere around the origin that contains every drawn part, for camera framing only. */
export function computeBoundingRadiusM(model: SpacecraftVisualModel): number {
  let radius = 0.2;
  const include = (part: VisualPart) => {
    const reach = Math.hypot(...part.positionM) + Math.hypot(...part.dimensionsM) / 2;
    if (reach > radius) radius = reach;
  };
  model.busParts.forEach(include);
  for (const component of model.components) component.parts.forEach(include);
  return radius + SCHEMATIC_SEPARATION_M;
}

export function buildSpacecraftVisualModel(
  selectedIds: readonly string[],
  catalog: VisualCatalog,
  knownComponents: readonly KnownComponentRef[],
  busParts: readonly VisualPart[] = BUS_VISUAL_PARTS,
): SpacecraftVisualModel {
  const knownById = new Map<string, KnownComponentRef>();
  for (const known of knownComponents) {
    if (!knownById.has(known.id)) knownById.set(known.id, known);
  }

  const components: ComponentVisualDefinition[] = [];
  const issues: VisualIssue[] = [];
  const seenIds = new Set<string>();

  for (const rawId of selectedIds) {
    const componentId = String(rawId);
    if (seenIds.has(componentId)) {
      issues.push(issue(componentId, "duplicate-id", `"${componentId}" is selected more than once; it is drawn only once.`));
      continue;
    }
    seenIds.add(componentId);

    const known = knownById.get(componentId);
    if (!known) {
      issues.push(issue(componentId, "unknown-component", `"${componentId}" is not in the component catalog and cannot be drawn.`));
      continue;
    }

    const definition: unknown = Object.prototype.hasOwnProperty.call(catalog, componentId) ? catalog[componentId] : undefined;
    if (definition === undefined || definition === null) {
      issues.push(issue(componentId, "missing-visual", `${known.name} has no visual representation yet.`));
      continue;
    }

    const problem = describeDefinitionProblem(definition, known);
    if (problem) {
      issues.push(issue(componentId, "invalid-visual", `${known.name} cannot be drawn: ${problem}.`));
      continue;
    }

    components.push(copyDefinition(definition as ComponentVisualDefinition));
  }

  return Object.freeze({
    schemaVersion: 1 as const,
    geometryProvenance: "synthetic" as const,
    busParts: copyValidBusParts(busParts),
    components: Object.freeze(components),
    issues: Object.freeze(issues),
  });
}
