import { createElement, isValidElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { components as physicalComponents, defaultMission } from "../src/data/catalog";
import { runMission } from "../src/engine/game";
import { evaluateDesign } from "../src/engine/resources";
import type { MissionConfig } from "../src/types/contracts";
import {
  BUS_NODE_NAMESPACE,
  buildSpacecraftVisualModel,
  busNodeKey,
  computeBoundingRadiusM,
  schematicOffsetM,
  visualNodeKey,
} from "../src/visualization/buildSpacecraftVisualModel";
import { BUS_VISUAL_PARTS, visualCatalog } from "../src/visualization/catalog";
import SpacecraftFallback, { SpacecraftBlueprint, SpacecraftPartsList, projectPartFront } from "../src/visualization/SpacecraftFallback";
import type { FallbackReason } from "../src/visualization/SpacecraftFallback";
import SpacecraftViewer, {
  detectWebGLSupport,
  fallbackReasonFor,
  initialViewerState,
  reduceViewerState,
} from "../src/visualization/SpacecraftViewer";
import type { ViewerAction, ViewerState } from "../src/visualization/SpacecraftViewer";
import { SYNTHETIC_GEOMETRY_NOTICE } from "../src/visualization/types";
import type { ComponentVisualDefinition, SpacecraftVisualModel, VisualCatalog, VisualPart } from "../src/visualization/types";

const COMPONENT_IDS = [
  "camera-basic", "camera-hd", "solar-basic", "solar-advanced",
  "battery-basic", "battery-advanced", "radio-basic", "radio-advanced", "solar-double", "battery-double",
] as const;
const DEFAULT_IDS = ["camera-basic", "solar-basic", "battery-basic", "radio-basic"];

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

const build = (ids: readonly string[], catalog: VisualCatalog = visualCatalog) =>
  buildSpacecraftVisualModel(ids, catalog, physicalComponents);

/** Shape-only signature: ignores colour so two alternatives cannot differ by paint alone. */
const geometrySignature = (definition: ComponentVisualDefinition) =>
  JSON.stringify(definition.parts.map((part) => [part.kind, part.positionM, part.rotationRad, part.dimensionsM]));

/** Replaces one catalog entry with a modified copy, leaving the frozen original untouched. */
function withDefinition(id: string, change: (definition: ComponentVisualDefinition) => unknown): VisualCatalog {
  return { ...visualCatalog, [id]: change(structuredClone(visualCatalog[id])) } as VisualCatalog;
}

function withFirstPart(id: string, change: Partial<Record<keyof VisualPart, unknown>>): VisualCatalog {
  return withDefinition(id, (definition) => ({
    ...definition,
    parts: [{ ...definition.parts[0], ...change }, ...definition.parts.slice(1)],
  }));
}

/** Collects every onClick handler in a rendered (hook-free) React element tree. */
function collectClickHandlers(node: ReactNode, found: (() => void)[] = []): (() => void)[] {
  if (Array.isArray(node)) {
    node.forEach((child) => collectClickHandlers(child, found));
  } else if (isValidElement(node)) {
    const props = node.props as { onClick?: () => void; children?: ReactNode };
    if (typeof props.onClick === "function") found.push(props.onClick);
    collectClickHandlers(props.children, found);
  }
  return found;
}

describe("visual catalog", () => {
  it("represents all ten components with matching IDs, categories and names", () => {
    expect(Object.keys(visualCatalog).sort()).toEqual(physicalComponents.map((component) => component.id).sort());
    expect(physicalComponents).toHaveLength(64);
    expect(build(physicalComponents.map((component) => component.id)).issues).toEqual([]);

    const model = build(COMPONENT_IDS);
    expect(model.issues).toEqual([]);
    expect(model.components.map((component) => component.componentId)).toEqual([...COMPONENT_IDS]);
    for (const physical of physicalComponents) {
      const visual = visualCatalog[physical.id];
      expect(visual.componentId).toBe(physical.id);
      expect(visual.category).toBe(physical.category);
      expect(visual.label).toBe(physical.name);
      expect(visual.geometryProvenance).toBe("synthetic");
      expect(visual.parts.length).toBeGreaterThan(0);
    }
  });

  it("gives every alternative a different geometry, not just a different colour", () => {
    const signatures = COMPONENT_IDS.map((id) => geometrySignature(visualCatalog[id]));
    expect(new Set(signatures).size).toBe(COMPONENT_IDS.length);
    const partCount = (id: string) => visualCatalog[id].parts.length;
    expect(partCount("camera-hd")).not.toBe(partCount("camera-basic"));
    expect(partCount("solar-advanced")).not.toBe(partCount("solar-basic"));
    expect(partCount("battery-advanced")).not.toBe(partCount("battery-basic"));
    expect(new Set(visualCatalog["radio-advanced"].parts.map((part) => part.kind)))
      .not.toEqual(new Set(visualCatalog["radio-basic"].parts.map((part) => part.kind)));
  });

  it("draws a single solar component as several parts on both sides and keeps batteries inside the bus", () => {
    for (const id of ["solar-basic", "solar-advanced"]) {
      const wings = visualCatalog[id].parts.filter((part) => part.kind === "panel");
      expect(wings.some((part) => part.positionM[0] < 0)).toBe(true);
      expect(wings.some((part) => part.positionM[0] > 0)).toBe(true);
    }
    const body = BUS_VISUAL_PARTS.find((part) => part.partId === "body")!;
    for (const id of ["battery-basic", "battery-advanced"]) {
      for (const part of visualCatalog[id].parts) {
        expect(part.internal).toBe(true);
        part.positionM.forEach((coordinate, axis) => {
          expect(Math.abs(coordinate) + part.dimensionsM[axis] / 2).toBeLessThanOrEqual(body.dimensionsM[axis] / 2);
        });
      }
    }
  });
});

describe("buildSpacecraftVisualModel", () => {
  it("updates only the swapped component when the configuration changes", () => {
    const before = build(DEFAULT_IDS);
    const after = build(["camera-hd", "solar-basic", "battery-basic", "radio-basic"]);
    expect(before.components.map((component) => component.componentId)).toEqual(DEFAULT_IDS);
    expect(after.components.map((component) => component.componentId)).toEqual(["camera-hd", "solar-basic", "battery-basic", "radio-basic"]);
    expect(after.components[0]).not.toEqual(before.components[0]);
    expect(after.components.slice(1)).toEqual(before.components.slice(1));
    expect(after.busParts).toEqual(before.busParts);

    for (const category of ["payload", "solar", "battery", "communications"] as const) {
      const [basic, advanced] = physicalComponents.filter((component) => component.category === category);
      const basicModel = build([basic.id]);
      const advancedModel = build([advanced.id]);
      expect(geometrySignature(basicModel.components[0])).not.toBe(geometrySignature(advancedModel.components[0]));
    }
  });

  it("does not mutate frozen inputs and returns independent frozen copies", () => {
    const selected = deepFreeze([...DEFAULT_IDS]);
    const known = deepFreeze(structuredClone(physicalComponents));
    const catalogSnapshot = structuredClone(visualCatalog);
    const busSnapshot = structuredClone(BUS_VISUAL_PARTS);
    expect(Object.isFrozen(visualCatalog["camera-basic"].parts[0].positionM)).toBe(true);

    const model = buildSpacecraftVisualModel(selected, visualCatalog, known);

    expect(selected).toEqual(DEFAULT_IDS);
    expect(known).toEqual(physicalComponents);
    expect(visualCatalog).toEqual(catalogSnapshot);
    expect(BUS_VISUAL_PARTS).toEqual(busSnapshot);
    expect(model.components[0]).toEqual(visualCatalog["camera-basic"]);
    expect(model.components[0]).not.toBe(visualCatalog["camera-basic"]);
    expect(model.components[0].parts[0]).not.toBe(visualCatalog["camera-basic"].parts[0]);
    expect(model.busParts[0]).not.toBe(BUS_VISUAL_PARTS[0]);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.components)).toBe(true);
    expect(Object.isFrozen(model.components[0].parts[0].dimensionsM)).toBe(true);
  });

  it("is deterministic and keeps the selection order", () => {
    const first = build(DEFAULT_IDS);
    const second = build(DEFAULT_IDS);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    const reversed = build([...DEFAULT_IDS].reverse());
    expect(reversed.components.map((component) => component.componentId)).toEqual([...DEFAULT_IDS].reverse());
    expect(first.schemaVersion).toBe(1);
    expect(first.geometryProvenance).toBe("synthetic");
  });

  it("reports unknown, missing and duplicated components without drawing them twice or throwing", () => {
    const unknown = build(["camera-basic", "laser-cannon", "constructor", "__proto__"]);
    expect(unknown.components.map((component) => component.componentId)).toEqual(["camera-basic"]);
    expect(unknown.issues.map((item) => [item.componentId, item.code])).toEqual([
      ["laser-cannon", "unknown-component"],
      ["constructor", "unknown-component"],
      ["__proto__", "unknown-component"],
    ]);

    const withoutSolar: VisualCatalog = Object.fromEntries(Object.entries(visualCatalog).filter(([id]) => id !== "solar-basic"));
    const missing = build(DEFAULT_IDS, withoutSolar);
    expect(missing.components.map((component) => component.componentId)).toEqual(["camera-basic", "battery-basic", "radio-basic"]);
    expect(missing.issues).toEqual([expect.objectContaining({ componentId: "solar-basic", code: "missing-visual" })]);
    expect(missing.issues[0].message).toContain("Standard Solar Array");

    const duplicated = build(["radio-basic", "radio-basic"]);
    expect(duplicated.components).toHaveLength(1);
    expect(duplicated.issues).toEqual([expect.objectContaining({ componentId: "radio-basic", code: "duplicate-id" })]);

    expect(build([]).components).toEqual([]);
    expect(build([]).busParts.length).toBe(BUS_VISUAL_PARTS.length);
  });

  it("refuses malformed descriptors instead of mounting their geometry", () => {
    const malformed: Record<string, VisualCatalog> = {
      "non-finite position": withFirstPart("camera-basic", { positionM: [0, Number.NaN, 0] }),
      "non-finite rotation": withFirstPart("camera-basic", { rotationRad: [0, Number.POSITIVE_INFINITY, 0] }),
      "negative dimension": withFirstPart("camera-basic", { dimensionsM: [0.05, -0.05, 0.03] }),
      "zero dimension": withFirstPart("camera-basic", { dimensionsM: [0.05, 0, 0.03] }),
      "short vector": withFirstPart("camera-basic", { dimensionsM: [0.05, 0.05] }),
      "invalid colour": withFirstPart("camera-basic", { colorHex: "red" }),
      "unsupported kind": withFirstPart("camera-basic", { kind: "sphere" }),
      "unknown finish": withFirstPart("camera-basic", { finish: "chrome" }),
      "elliptical cylinder": withFirstPart("camera-basic", { kind: "cylinder", dimensionsM: [0.05, 0.05, 0.03] }),
      "empty partId": withFirstPart("camera-basic", { partId: "" }),
      "repeated partId": withDefinition("camera-basic", (definition) => ({ ...definition, parts: [definition.parts[0], definition.parts[0]] })),
      "no parts": withDefinition("camera-basic", (definition) => ({ ...definition, parts: [] })),
      "label mismatch": withDefinition("camera-basic", (definition) => ({ ...definition, label: "Hubble" })),
      "category mismatch": withDefinition("camera-basic", (definition) => ({ ...definition, category: "solar" })),
      "id mismatch": withDefinition("camera-basic", (definition) => ({ ...definition, componentId: "camera-hd" })),
      "non-synthetic provenance": withDefinition("camera-basic", (definition) => ({ ...definition, geometryProvenance: "cad" })),
      "not an object": withDefinition("camera-basic", () => "camera"),
    };
    for (const [label, catalog] of Object.entries(malformed)) {
      const model = build(DEFAULT_IDS, catalog);
      expect(model.components.map((component) => component.componentId), label).toEqual(["solar-basic", "battery-basic", "radio-basic"]);
      expect(model.issues.map((item) => [item.componentId, item.code]), label).toEqual([["camera-basic", "invalid-visual"]]);
    }
  });

  it("uses collision-free node keys with a reserved bus namespace", () => {
    const model = build(COMPONENT_IDS);
    const keys = [
      ...model.busParts.map((part) => busNodeKey(part.partId)),
      ...model.components.flatMap((component) => component.parts.map((part) => visualNodeKey(component.componentId, part.partId))),
    ];
    expect(new Set(keys).size).toBe(keys.length);
    expect(visualNodeKey("camera-basic", "housing")).toBe("camera-basic:housing");
    expect(busNodeKey("body")).toBe(`${BUS_NODE_NAMESPACE}:body`);
    expect(physicalComponents.some((component) => component.id.startsWith(BUS_NODE_NAMESPACE))).toBe(false);
  });
});

describe("fallback and viewer shell", () => {
  it("renders an accessible HTML/SVG fallback with names, issues and the synthetic notice", () => {
    const model = build([...DEFAULT_IDS, "laser-cannon"]);
    const reasons: FallbackReason[] = ["loading", "unsupported", "context-lost", "error", "disabled"];
    for (const reason of reasons) {
      const html = renderToStaticMarkup(createElement(SpacecraftFallback, { model, reason, onRetry: () => undefined }));
      expect(html).toContain(`data-fallback-reason="${reason}"`);
      for (const name of ["Survey Camera", "Standard Solar Array", "Compact Battery", "Basic Downlink"]) expect(html).toContain(name);
      expect(html).toContain("laser-cannon");
      expect(html).toContain('data-issue-code="unknown-component"');
      expect(html).toContain(SYNTHETIC_GEOMETRY_NOTICE);
      expect(html).toContain('role="img"');
      expect(html).not.toContain("<canvas");
      expect(html.includes("Try 3D again")).toBe(reason === "context-lost" || reason === "error" || reason === "unsupported");
    }
    const unsupported = renderToStaticMarkup(createElement(SpacecraftFallback, { model, reason: "unsupported" }));
    expect(unsupported).toContain("WebGL is not available");
    expect(unsupported).not.toContain("Try 3D again");
  });

  it("draws every part of the model in the 2D blueprint and reflects configuration changes", () => {
    const model = build(DEFAULT_IDS);
    const html = renderToStaticMarkup(createElement(SpacecraftBlueprint, { model, highlightedComponentId: "battery-basic" }));
    for (const part of model.busParts) expect(html).toContain(`data-node="${busNodeKey(part.partId)}"`);
    for (const component of model.components) {
      for (const part of component.parts) expect(html).toContain(`data-node="${visualNodeKey(component.componentId, part.partId)}"`);
    }
    expect(html).toContain("ma-viewer__blueprint-part--highlighted");
    expect(html).toContain("ma-viewer__blueprint-part--internal");
    const upgraded = renderToStaticMarkup(createElement(SpacecraftBlueprint, { model: build(["camera-hd", "solar-advanced", "battery-advanced", "radio-advanced"]) }));
    expect(upgraded).not.toBe(html);
    expect(upgraded).toContain('data-node="solar-advanced:wing-left-outer"');
    expect(upgraded).not.toContain('data-node="solar-basic:');
  });

  it("projects parts to the front view using their rotation", () => {
    const lens = visualCatalog["camera-basic"].parts.find((part) => part.partId === "lens-glass")!;
    const lensShape = projectPartFront(lens);
    expect(lensShape.type).toBe("circle");
    if (lensShape.type === "circle") {
      expect(lensShape.centre[0]).toBeCloseTo(0);
      expect(lensShape.centre[1]).toBeCloseTo(80);
      expect(lensShape.radius).toBeCloseTo(12);
    }

    const wing = projectPartFront(visualCatalog["solar-basic"].parts.find((part) => part.partId === "wing-right")!);
    expect(wing.type).toBe("polygon");
    if (wing.type === "polygon") {
      const xs = wing.points.map(([x]) => x);
      const ys = wing.points.map(([, y]) => y);
      expect(Math.min(...xs)).toBeCloseTo(60);
      expect(Math.max(...xs)).toBeCloseTo(260);
      expect(Math.min(...ys)).toBeCloseTo(-140);
      expect(Math.max(...ys)).toBeCloseTo(140);
    }

    const whip = projectPartFront(visualCatalog["radio-basic"].parts.find((part) => part.partId === "whip-right")!);
    if (whip.type === "polygon") expect(Math.max(...whip.points.map(([x]) => x))).toBeGreaterThan(100);
    expect(whip.type).toBe("polygon");
  });

  it("falls back when WebGL is missing, lost or failing, and recovers on retry", () => {
    expect(detectWebGLSupport()).toBe(false); // The test environment has no DOM and no WebGL.
    const run = (actions: ViewerAction[], from: ViewerState = initialViewerState) => actions.reduce(reduceViewerState, from);

    expect(fallbackReasonFor(initialViewerState)).toBe("loading");
    expect(fallbackReasonFor(run([{ type: "webgl-detected", supported: false }]))).toBe("unsupported");
    const ready = run([{ type: "webgl-detected", supported: true }]);
    expect(fallbackReasonFor(ready)).toBeNull();

    const lost = run([{ type: "context-lost" }], ready);
    expect(fallbackReasonFor(lost)).toBe("context-lost");
    const restored = run([{ type: "context-restored" }], lost);
    expect(fallbackReasonFor(restored)).toBeNull();
    expect(restored.mountKey).toBe(ready.mountKey + 1);

    const failed = run([{ type: "render-error" }], ready);
    expect(fallbackReasonFor(failed)).toBe("error");
    expect(fallbackReasonFor(run([{ type: "retry", supported: false }], failed))).toBe("unsupported");
    const retried = run([{ type: "retry", supported: true }], failed);
    expect(fallbackReasonFor(retried)).toBeNull();
    expect(retried.mountKey).toBe(failed.mountKey + 1);

    const off = run([{ type: "toggle-3d" }], ready);
    expect(fallbackReasonFor(off)).toBe("disabled");
    expect(fallbackReasonFor(run([{ type: "toggle-3d" }], off))).toBeNull();
    expect(run([{ type: "context-lost" }], initialViewerState)).toBe(initialViewerState);

    const inspected = run([{ type: "inspect", componentId: "radio-basic" }], ready);
    expect(inspected.localHighlightId).toBe("radio-basic");
    expect(run([{ type: "inspect", componentId: "radio-basic" }], inspected).localHighlightId).toBeNull();
    expect(run([{ type: "toggle-schematic" }], ready).schematic).toBe(true);
    expect(Object.isFrozen(initialViewerState)).toBe(true);
  });

  it("mounts the viewer shell repeatedly without WebGL and renders the same accessible content", () => {
    const model = build([...DEFAULT_IDS, "radio-basic"]);
    const render = () => renderToStaticMarkup(createElement(SpacecraftViewer, { model, highlightedComponentId: "solar-basic", className: "demo" }));
    const first = render();
    expect(render()).toBe(first);
    expect(first).toContain('class="ma-viewer demo"');
    expect(first).toContain('data-viewer-mode="loading"');
    expect(first).not.toContain("<canvas");
    expect(first).toContain(SYNTHETIC_GEOMETRY_NOTICE);
    expect(first).toContain('data-issue-code="duplicate-id"');
    expect(first).toMatch(/aria-pressed="true"[^>]*data-component-id="solar-basic"/);
    expect(first).toContain("hinge left, wing left, hinge right, wing right");
    expect(renderToStaticMarkup(createElement(SpacecraftViewer, { model: build([]) }))).toContain("No selected component can be drawn");
  });
});

describe("separation between presentation and simulation", () => {
  const sources = import.meta.glob<string>("../src/visualization/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });
  const importsOf = (source: string) =>
    [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)].map((match) => match[1]);
  const file = (name: string) => {
    const entry = Object.entries(sources).find(([path]) => path.endsWith(`/${name}`));
    if (!entry) throw new Error(`Missing source ${name}`);
    return entry[1];
  };

  it("never imports engines, the physical catalog or the app from the visualization layer", () => {
    expect(Object.keys(sources)).toHaveLength(11);
    for (const [path, source] of Object.entries(sources)) {
      for (const specifier of importsOf(source)) {
        expect(specifier, path).not.toMatch(/engine|data\/catalog|App|styles\.css/);
        if (specifier.startsWith("..")) expect(specifier, path).toBe("../types/contracts");
      }
    }
  });

  it("keeps Three.js out of the contracts, catalog, adapter, fallback and viewer shell", () => {
    for (const name of ["types.ts", "catalog.ts", "buildSpacecraftVisualModel.ts", "SpacecraftFallback.tsx", "SpacecraftViewer.tsx"]) {
      const specifiers = importsOf(file(name));
      expect(specifiers.some((specifier) => /^three|^@react-three/.test(specifier)), name).toBe(false);
    }
    for (const name of ["types.ts", "catalog.ts", "buildSpacecraftVisualModel.ts"]) {
      expect(importsOf(file(name)).some((specifier) => specifier.startsWith("react")), name).toBe(false);
    }
    expect(importsOf(file("SpacecraftViewer.tsx"))).toContain("./SpacecraftScene"); // Lazy chunk only.
    expect(file("SpacecraftViewer.tsx")).toMatch(/lazy\(\(\) => import\("\.\/SpacecraftScene"\)\)/);
  });

  it("exposes no engineering quantity in the visual model", () => {
    const serialized = JSON.stringify(build(COMPONENT_IDS));
    for (const field of ["massKg", "costCredits", "nominalPowerW", "solarGenerationW", "batteryCapacityWh", "scienceMBperMinute", "downlinkMBperMinute", "score"]) {
      expect(serialized).not.toContain(field);
    }
    // Camera framing and schematic separation are presentation values only.
    expect(computeBoundingRadiusM(build(["solar-advanced"]))).toBeGreaterThan(computeBoundingRadiusM(build(["solar-basic"])));
    const battery = visualCatalog["battery-basic"];
    expect(battery.parts.every((part) => schematicOffsetM(battery.category, part).every((value) => value === 0))).toBe(true);
    const wing = visualCatalog["solar-basic"].parts.find((part) => part.partId === "wing-left")!;
    expect(schematicOffsetM("solar", wing)[0]).toBeLessThan(0);
  });

  it("leaves mass, power, energy and score untouched after mounting and interacting with the viewer", () => {
    const missions: MissionConfig[] = [
      { ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] },
      { ...defaultMission, selectedComponentIds: ["camera-basic", "solar-advanced", "battery-basic", "radio-basic"] },
    ];
    for (const mission of missions) {
      const config = deepFreeze(structuredClone(mission));
      const designBefore = structuredClone(evaluateDesign(config));
      const resultBefore = structuredClone(runMission(config, 2026));
      const physicalBefore = structuredClone(physicalComponents);

      // Mount the viewer for this configuration and drive every interaction it offers without WebGL.
      const model: SpacecraftVisualModel = buildSpacecraftVisualModel(config.selectedComponentIds, visualCatalog, physicalComponents);
      const inspected = vi.fn();
      renderToStaticMarkup(createElement(SpacecraftViewer, { model, onInspectComponent: inspected }));

      const listHandlers = collectClickHandlers(SpacecraftPartsList({ model, onInspectComponent: inspected }));
      const blueprintHandlers = collectClickHandlers(SpacecraftBlueprint({ model, onInspectComponent: inspected }));
      expect(listHandlers).toHaveLength(model.components.length);
      expect(blueprintHandlers.length).toBeGreaterThan(model.components.length);
      [...listHandlers, ...blueprintHandlers].forEach((click) => click());
      expect(inspected).toHaveBeenCalledWith("battery-basic");
      expect(new Set(inspected.mock.calls.map(([id]) => id))).toEqual(new Set(config.selectedComponentIds));

      let state = initialViewerState;
      const actions: ViewerAction[] = [
        { type: "webgl-detected", supported: true },
        { type: "toggle-schematic" },
        ...config.selectedComponentIds.map((componentId) => ({ type: "inspect", componentId }) as const),
        { type: "context-lost" },
        { type: "retry", supported: true },
        { type: "render-error" },
        { type: "toggle-3d" },
        { type: "toggle-3d" },
      ];
      for (const action of actions) {
        state = reduceViewerState(state, action);
        const reason = fallbackReasonFor(state);
        if (reason) renderToStaticMarkup(createElement(SpacecraftFallback, { model, reason, highlightedComponentId: state.localHighlightId ?? undefined }));
      }

      expect(config).toEqual(mission);
      expect(physicalComponents).toEqual(physicalBefore);
      expect(evaluateDesign(config)).toEqual(designBefore);
      const resultAfter = runMission(config, 2026);
      expect(resultAfter).toEqual(resultBefore);
      expect(resultAfter.score).toBe(resultBefore.score);
      expect(resultAfter.design.totalMassKg).toBe(designBefore.totalMassKg);
      expect(resultAfter.design.nominalPowerW).toBe(designBefore.nominalPowerW);
      expect(resultAfter.batteryHistoryWh).toEqual(resultBefore.batteryHistoryWh);
    }
  });
});
