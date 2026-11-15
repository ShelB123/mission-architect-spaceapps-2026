/**
 * SYNTHETIC visual catalog for the spacecraft inspection viewer.
 *
 * Every dimension, position and colour below is an illustrative schematic
 * choice made for readability on screen. None of it is CAD data, a NASA or
 * vendor specification, or an input to the engines. Do not derive mass, power,
 * capacity or data rate from these shapes (docs/ARCHITECTURE.md §6).
 *
 * This file deliberately does not import src/data/catalog.ts: the physical and
 * visual catalogs are joined only by component ID inside the pure adapter, and
 * tests/visualization.test.ts checks that IDs, categories and labels agree.
 *
 * Frame: metres, +Y up, +X solar-panel side, +Z model front. The bus is a
 * 0.10 × 0.30 × 0.10 schematic CubeSat-style body centred on the origin.
 */
import type { ComponentVisualDefinition, Vec3, VisualCatalog, VisualFinish, VisualKind, VisualPart } from "./types";

const NO_ROTATION: Vec3 = [0, 0, 0];
const ALONG_Z: Vec3 = [Math.PI / 2, 0, 0]; // Local +Y axis turned to +Z (model front)
const FLIPPED: Vec3 = [Math.PI, 0, 0]; // Local +Y axis turned to -Y

interface PartOptions {
  readonly rotationRad?: Vec3;
  readonly finish?: VisualFinish;
  readonly internal?: boolean;
}

function part(kind: VisualKind, partId: string, positionM: Vec3, dimensionsM: Vec3, colorHex: string, options: PartOptions = {}): VisualPart {
  return {
    partId,
    kind,
    positionM,
    rotationRad: options.rotationRad ?? NO_ROTATION,
    dimensionsM,
    colorHex,
    ...(options.finish ? { finish: options.finish } : {}),
    ...(options.internal ? { internal: true } : {}),
  };
}

/** Cylinder or cone with a circular section: diameter on X/Z, length on Y. */
function round(kind: "cylinder" | "cone", partId: string, positionM: Vec3, diameterM: number, lengthM: number, colorHex: string, options: PartOptions = {}): VisualPart {
  return part(kind, partId, positionM, [diameterM, lengthM, diameterM], colorHex, options);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/**
 * Fixed bus. It corresponds to the bus already counted once by resources.ts;
 * it has no entry in selectedComponentIds and adds no mass, cost or power here.
 */
export const BUS_VISUAL_PARTS: readonly VisualPart[] = deepFreeze([
  part("box", "body", [0, 0, 0], [0.096, 0.296, 0.096], "#2a3442", { finish: "structure" }),
  part("box", "thermal-wrap", [0, 0.06, 0], [0.0975, 0.05, 0.0975], "#c9a227", { finish: "foil" }),
  part("box", "rail-front-left", [-0.0475, 0, 0.0475], [0.008, 0.3, 0.008], "#b9c2cc", { finish: "metal" }),
  part("box", "rail-front-right", [0.0475, 0, 0.0475], [0.008, 0.3, 0.008], "#b9c2cc", { finish: "metal" }),
  part("box", "rail-back-left", [-0.0475, 0, -0.0475], [0.008, 0.3, 0.008], "#b9c2cc", { finish: "metal" }),
  part("box", "rail-back-right", [0.0475, 0, -0.0475], [0.008, 0.3, 0.008], "#b9c2cc", { finish: "metal" }),
  part("box", "deck-top", [0, 0.151, 0], [0.102, 0.004, 0.102], "#8a94a0", { finish: "metal" }),
  part("box", "deck-bottom", [0, -0.151, 0], [0.102, 0.004, 0.102], "#8a94a0", { finish: "metal" }),
  part("box", "avionics-board-upper", [0, -0.06, 0], [0.086, 0.004, 0.086], "#1f6f4a", { finish: "pcb", internal: true }),
  part("box", "avionics-board-lower", [0, -0.09, 0], [0.086, 0.004, 0.086], "#1f6f4a", { finish: "pcb", internal: true }),
]);

const cameraBasic: ComponentVisualDefinition = {
  componentId: "camera-basic",
  category: "payload",
  label: "Survey Camera",
  geometryProvenance: "synthetic",
  parts: [
    part("box", "housing", [0, -0.08, 0.066], [0.05, 0.05, 0.03], "#3a4656", { finish: "dark" }),
    round("cylinder", "lens-barrel", [0, -0.08, 0.091], 0.03, 0.02, "#1c2128", { rotationRad: ALONG_Z, finish: "dark" }),
    round("cylinder", "lens-glass", [0, -0.08, 0.1015], 0.024, 0.002, "#4aa8d8", { rotationRad: ALONG_Z, finish: "glass" }),
  ],
};

const cameraHd: ComponentVisualDefinition = {
  componentId: "camera-hd",
  category: "payload",
  label: "High-Resolution Imager",
  geometryProvenance: "synthetic",
  parts: [
    part("box", "electronics", [0, -0.07, 0.071], [0.08, 0.11, 0.04], "#2f3a48", { finish: "dark" }),
    round("cylinder", "telescope-tube", [0, -0.06, 0.151], 0.064, 0.12, "#e6e8ec", { rotationRad: ALONG_Z, finish: "painted" }),
    round("cylinder", "baffle", [0, -0.06, 0.221], 0.076, 0.02, "#15181d", { rotationRad: ALONG_Z, finish: "dark" }),
    round("cylinder", "aperture-glass", [0, -0.06, 0.2315], 0.066, 0.002, "#6d7dff", { rotationRad: ALONG_Z, finish: "glass" }),
    part("panel", "radiator", [0, -0.094, 0.13], [0.06, 0.004, 0.05], "#f2f4f7", { finish: "painted" }),
  ],
};

const solarBasic: ComponentVisualDefinition = {
  componentId: "solar-basic",
  category: "solar",
  label: "Standard Solar Array",
  geometryProvenance: "synthetic",
  parts: [
    round("cylinder", "hinge-left", [-0.056, 0, 0], 0.008, 0.26, "#9aa4af", { finish: "metal" }),
    part("panel", "wing-left", [-0.16, 0, 0], [0.2, 0.28, 0.006], "#17357a", { finish: "solar-cell" }),
    round("cylinder", "hinge-right", [0.056, 0, 0], 0.008, 0.26, "#9aa4af", { finish: "metal" }),
    part("panel", "wing-right", [0.16, 0, 0], [0.2, 0.28, 0.006], "#17357a", { finish: "solar-cell" }),
  ],
};

const solarAdvanced: ComponentVisualDefinition = {
  componentId: "solar-advanced",
  category: "solar",
  label: "Expanded Solar Array",
  geometryProvenance: "synthetic",
  parts: [
    part("box", "yoke-left", [-0.0715, 0, 0], [0.04, 0.014, 0.006], "#9aa4af", { finish: "metal" }),
    part("panel", "wing-left-inner", [-0.2015, 0, 0], [0.22, 0.3, 0.006], "#10266b", { finish: "solar-cell" }),
    round("cylinder", "hinge-left-mid", [-0.3155, 0, 0], 0.008, 0.28, "#9aa4af", { finish: "metal" }),
    part("panel", "wing-left-outer", [-0.4295, 0, 0], [0.22, 0.3, 0.006], "#10266b", { finish: "solar-cell" }),
    part("box", "yoke-right", [0.0715, 0, 0], [0.04, 0.014, 0.006], "#9aa4af", { finish: "metal" }),
    part("panel", "wing-right-inner", [0.2015, 0, 0], [0.22, 0.3, 0.006], "#10266b", { finish: "solar-cell" }),
    round("cylinder", "hinge-right-mid", [0.3155, 0, 0], 0.008, 0.28, "#9aa4af", { finish: "metal" }),
    part("panel", "wing-right-outer", [0.4295, 0, 0], [0.22, 0.3, 0.006], "#10266b", { finish: "solar-cell" }),
  ],
};

const batteryBasic: ComponentVisualDefinition = {
  componentId: "battery-basic",
  category: "battery",
  label: "Compact Battery",
  geometryProvenance: "synthetic",
  parts: [
    part("box", "holder", [0, -0.016, 0], [0.07, 0.006, 0.04], "#20262e", { finish: "dark", internal: true }),
    round("cylinder", "cell-a", [-0.02, 0.02, 0], 0.018, 0.065, "#3ddc97", { finish: "cell", internal: true }),
    round("cylinder", "cell-b", [0.02, 0.02, 0], 0.018, 0.065, "#3ddc97", { finish: "cell", internal: true }),
  ],
};

const advancedCellColumnsM = [-0.026, 0, 0.026] as const;
const advancedCellRowsM = [-0.016, 0.016] as const;

const batteryAdvanced: ComponentVisualDefinition = {
  componentId: "battery-advanced",
  category: "battery",
  label: "Extended Battery",
  geometryProvenance: "synthetic",
  parts: [
    part("box", "holder-lower", [0, -0.013, 0], [0.084, 0.006, 0.07], "#20262e", { finish: "dark", internal: true }),
    part("box", "holder-upper", [0, 0.063, 0], [0.084, 0.006, 0.07], "#20262e", { finish: "dark", internal: true }),
    ...advancedCellRowsM.flatMap((z, row) =>
      advancedCellColumnsM.map((x, column) =>
        round("cylinder", `cell-${row + 1}-${column + 1}`, [x, 0.025, z], 0.018, 0.07, "#ff9f43", { finish: "cell", internal: true }),
      ),
    ),
    part("box", "management-board", [0, 0.025, -0.04], [0.08, 0.06, 0.004], "#1f6f4a", { finish: "pcb", internal: true }),
  ],
};

const WHIP_TILT_RAD = 0.9;
const WHIP_LENGTH_M = 0.16;
const WHIP_ROOT_Y_M = 0.163;
const whipReachM = (Math.sin(WHIP_TILT_RAD) * WHIP_LENGTH_M) / 2;
const whipCentreYM = WHIP_ROOT_Y_M + (Math.cos(WHIP_TILT_RAD) * WHIP_LENGTH_M) / 2;

const radioBasic: ComponentVisualDefinition = {
  componentId: "radio-basic",
  category: "communications",
  label: "Basic Downlink",
  geometryProvenance: "synthetic",
  parts: [
    part("box", "transceiver", [0, 0.115, 0], [0.08, 0.03, 0.08], "#6b4f9e", { finish: "pcb", internal: true }),
    round("cylinder", "antenna-base", [0, 0.158, 0], 0.03, 0.01, "#8a94a0", { finish: "metal" }),
    round("cylinder", "whip-right", [whipReachM, whipCentreYM, 0], 0.003, WHIP_LENGTH_M, "#d9dee4", { rotationRad: [0, 0, -WHIP_TILT_RAD], finish: "metal" }),
    round("cylinder", "whip-left", [-whipReachM, whipCentreYM, 0], 0.003, WHIP_LENGTH_M, "#d9dee4", { rotationRad: [0, 0, WHIP_TILT_RAD], finish: "metal" }),
    round("cylinder", "whip-front", [0, whipCentreYM, whipReachM], 0.003, WHIP_LENGTH_M, "#d9dee4", { rotationRad: [WHIP_TILT_RAD, 0, 0], finish: "metal" }),
    round("cylinder", "whip-back", [0, whipCentreYM, -whipReachM], 0.003, WHIP_LENGTH_M, "#d9dee4", { rotationRad: [-WHIP_TILT_RAD, 0, 0], finish: "metal" }),
  ],
};

const radioAdvanced: ComponentVisualDefinition = {
  componentId: "radio-advanced",
  category: "communications",
  label: "High-Rate Downlink",
  geometryProvenance: "synthetic",
  parts: [
    part("box", "transceiver", [0, 0.115, 0], [0.086, 0.04, 0.086], "#8e44ad", { finish: "pcb", internal: true }),
    part("box", "patch-array", [0, 0.157, 0], [0.08, 0.008, 0.08], "#c8a04a", { finish: "foil" }),
    round("cylinder", "boom", [0, 0.186, 0], 0.01, 0.05, "#8a94a0", { finish: "metal" }),
    round("cone", "dish", [0, 0.236, 0], 0.16, 0.05, "#eef1f4", { rotationRad: FLIPPED, finish: "painted" }),
    round("cylinder", "feed-mast", [0, 0.251, 0], 0.006, 0.08, "#8a94a0", { finish: "metal" }),
    round("cylinder", "feed-horn", [0, 0.296, 0], 0.02, 0.012, "#c8a04a", { finish: "metal" }),
  ],
};

// Composite kits keep one category slot while depicting two separate basic units.
const solarDouble: ComponentVisualDefinition = { ...solarBasic, componentId: "solar-double", label: "Two Standard Arrays", parts: [-1,1].flatMap((side, index) => solarBasic.parts.map(p => ({ ...p, partId: `unit-${index+1}-${p.partId}`, positionM: [p.positionM[0], p.positionM[1]+side*.155, p.positionM[2]] as Vec3 }))) };
const batteryDouble: ComponentVisualDefinition = { ...batteryBasic, componentId: "battery-double", label: "Two Compact Batteries", parts: [-1,1].flatMap((side, index) => batteryBasic.parts.map(p => ({ ...p, partId: `unit-${index+1}-${p.partId}`, positionM: [p.positionM[0], p.positionM[1], p.positionM[2]+side*.023] as Vec3 }))) };

export const visualCatalog: VisualCatalog = deepFreeze({
  "camera-basic": cameraBasic,
  "camera-hd": cameraHd,
  "solar-basic": solarBasic,
  "solar-advanced": solarAdvanced,
  "battery-basic": batteryBasic,
  "battery-advanced": batteryAdvanced,
  "solar-double": solarDouble,
  "battery-double": batteryDouble,
  "radio-basic": radioBasic,
  "radio-advanced": radioAdvanced,
});
