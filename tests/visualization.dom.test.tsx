// @vitest-environment jsdom
/**
 * DOM-level tests of the viewer shell: real mounts, clicks and unmounts.
 *
 * jsdom has no WebGL, so the WebGL scene chunk is replaced by a controllable
 * stand-in. These tests cover everything around the canvas (support probe,
 * fallback, recovery, cleanup, isolation from the engines); the real renderer
 * is verified manually in a browser and recorded in the PR.
 */
import { StrictMode, useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { components as physicalComponents, defaultMission } from "../src/data/catalog";
import * as game from "../src/engine/game";
import * as resources from "../src/engine/resources";
import { buildSpacecraftVisualModel } from "../src/visualization/buildSpacecraftVisualModel";
import { visualCatalog } from "../src/visualization/catalog";
import type { SpacecraftSceneProps } from "../src/visualization/SpacecraftScene";
import SpacecraftViewer, { detectWebGLSupport } from "../src/visualization/SpacecraftViewer";

const scene = vi.hoisted(() => ({ shouldThrow: false, mounts: 0, unmounts: 0, lastProps: null as unknown }));

vi.mock("../src/visualization/SpacecraftScene", () => ({
  default: function SceneStandIn(props: SpacecraftSceneProps) {
    if (scene.shouldThrow) throw new Error("simulated renderer failure");
    scene.lastProps = props;
    useEffect(() => {
      scene.mounts += 1;
      return () => {
        scene.unmounts += 1;
      };
    }, []);
    return (
      <div data-testid="scene" data-schematic={String(props.schematic)} data-highlight={props.highlightedComponentId ?? ""} data-command={`${props.command.kind}:${props.command.sequence}`}>
        {props.model.components.map((component) => (
          <button key={component.componentId} type="button" onClick={() => props.onInspectComponent?.(component.componentId)}>
            pick {component.componentId}
          </button>
        ))}
        <button type="button" onClick={() => props.onContextLost?.()}>lose context</button>
      </div>
    );
  },
}));

interface ProbeLog {
  requested: string[];
  released: number;
}

/** Replaces canvas.getContext for the support probe. `supported` lists the context names the fake browser offers. */
function stubWebGL(supported: readonly string[]): ProbeLog {
  const log: ProbeLog = { requested: [], released: 0 };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((name: string) => {
    log.requested.push(name);
    if (!supported.includes(name)) return null;
    return {
      isContextLost: () => false,
      getExtension: (extension: string) => (extension === "WEBGL_lose_context" ? { loseContext: () => { log.released += 1; } } : null),
    };
  }) as unknown as HTMLCanvasElement["getContext"]);
  return log;
}

const DEFAULT_IDS = [...defaultMission.selectedComponentIds];
const modelFor = (ids: readonly string[]) => buildSpacecraftVisualModel(ids, visualCatalog, physicalComponents);
const viewerMode = () => screen.getByRole("region", { name: "Spacecraft inspection viewer" }).getAttribute("data-viewer-mode");
const flush = async () => { await act(async () => { await Promise.resolve(); }); };

async function mountViewer(ids: readonly string[] = DEFAULT_IDS, onInspectComponent?: (id: string) => void) {
  const view = render(<StrictMode><SpacecraftViewer model={modelFor(ids)} onInspectComponent={onInspectComponent} /></StrictMode>);
  await flush();
  return view;
}

beforeEach(() => {
  scene.shouldThrow = false;
  scene.mounts = 0;
  scene.unmounts = 0;
  scene.lastProps = null;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WebGL support probe", () => {
  it("requires WebGL 2 for the pinned Three.js renderer and never asks for WebGL 1", () => {
    const webgl1Only = stubWebGL(["webgl", "experimental-webgl"]);
    expect(detectWebGLSupport()).toBe(false);
    expect(webgl1Only.requested).toEqual(["webgl2"]);
    vi.restoreAllMocks();

    const webgl2 = stubWebGL(["webgl2"]);
    expect(detectWebGLSupport()).toBe(true);
    expect(webgl2.requested).toEqual(["webgl2"]);
  });

  it("releases the probe context on every call and survives a throwing getContext", () => {
    const probe = stubWebGL(["webgl2"]);
    for (let call = 0; call < 20; call += 1) expect(detectWebGLSupport()).toBe(true);
    expect(probe.released).toBe(20);
    vi.restoreAllMocks();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("blocked by policy");
    });
    expect(detectWebGLSupport()).toBe(false);
  });
});

describe("viewer without WebGL", () => {
  it("shows the accessible 2D fallback and still reports inspections", async () => {
    stubWebGL([]);
    const inspected = vi.fn();
    await mountViewer(DEFAULT_IDS, inspected);

    expect(viewerMode()).toBe("unsupported");
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(scene.mounts).toBe(0);
    expect(screen.getByText(/WebGL is not available/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /2D front-view schematic/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try 3D again" })).toBeNull();

    const list = screen.getByRole("list", { name: "Selected components shown in the viewer" });
    const battery = within(list).getByRole("button", { name: /Compact Battery/ });
    fireEvent.click(battery);
    expect(inspected).toHaveBeenCalledWith("battery-basic");
    expect(battery.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/3 schematic parts: holder, cell a, cell b\./)).toBeTruthy();
    fireEvent.click(battery);
    expect(battery.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("viewer with WebGL available", () => {
  it("mounts the scene chunk, forwards view state and inspection, and never equips hardware", async () => {
    stubWebGL(["webgl2"]);
    const inspected = vi.fn();
    await mountViewer(DEFAULT_IDS, inspected);

    expect(viewerMode()).toBe("3d");
    const stage = screen.getByTestId("scene");
    expect(stage.getAttribute("data-schematic")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "pick solar-basic" }));
    expect(inspected).toHaveBeenLastCalledWith("solar-basic");
    expect(screen.getByTestId("scene").getAttribute("data-highlight")).toBe("solar-basic");

    fireEvent.click(screen.getByRole("button", { name: "Schematic view" }));
    expect(screen.getByTestId("scene").getAttribute("data-schematic")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByTestId("scene").getAttribute("data-command")).toBe("zoom-in:1");
    const group = screen.getByRole("group", { name: /Interactive 3D view/ });
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    fireEvent.keyDown(group, { key: "Home" });
    expect(screen.getByTestId("scene").getAttribute("data-command")).toBe("reset:3");

    const model = (scene.lastProps as SpacecraftSceneProps).model;
    expect(model.components.map((component) => component.componentId)).toEqual(DEFAULT_IDS);
  });

  it("updates the scene model for each of the eight components", async () => {
    stubWebGL(["webgl2"]);
    const view = await mountViewer();
    for (const component of physicalComponents) {
      view.rerender(<StrictMode><SpacecraftViewer model={modelFor([component.id])} /></StrictMode>);
      const model = (scene.lastProps as SpacecraftSceneProps).model;
      expect(model.components.map((item) => item.componentId)).toEqual([component.id]);
      expect(model.components[0].parts.length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: new RegExp(component.name) })).toBeTruthy();
    }
  });

  it("recovers from context loss and from a renderer error with the fallback and a retry", async () => {
    stubWebGL(["webgl2"]);
    await mountViewer();

    fireEvent.click(screen.getByRole("button", { name: "lose context" }));
    expect(viewerMode()).toBe("context-lost");
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(screen.getByText(/graphics context was lost/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Compact Battery/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Try 3D again" }));
    await flush();
    expect(viewerMode()).toBe("3d");
    expect(screen.getByTestId("scene")).toBeTruthy();

    // A failing renderer is contained by the viewer's own boundary.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    scene.shouldThrow = true;
    fireEvent.click(screen.getByRole("button", { name: "Schematic view" }));
    await flush();
    expect(viewerMode()).toBe("error");
    expect(screen.getByText(/3D view could not be displayed/)).toBeTruthy();
    expect(screen.getByRole("list", { name: "Selected components shown in the viewer" })).toBeTruthy();
    consoleError.mockRestore();

    scene.shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try 3D again" }));
    await flush();
    expect(viewerMode()).toBe("3d");
  });

  it("falls back when WebGL disappears before a retry", async () => {
    stubWebGL(["webgl2"]);
    await mountViewer();
    fireEvent.click(screen.getByRole("button", { name: "lose context" }));
    vi.restoreAllMocks();
    stubWebGL([]);
    fireEvent.click(screen.getByRole("button", { name: "Try 3D again" }));
    await flush();
    expect(viewerMode()).toBe("unsupported");
  });

  it("unmounts the scene when 3D is turned off and on repeated mounts, leaving nothing behind", async () => {
    const probe = stubWebGL(["webgl2"]);
    const addListener = vi.spyOn(window, "addEventListener");
    const removeListener = vi.spyOn(window, "removeEventListener");
    const view = await mountViewer();

    fireEvent.click(screen.getByRole("button", { name: "3D on" }));
    expect(viewerMode()).toBe("disabled");
    expect(screen.queryByTestId("scene")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "3D off" }));
    await flush();
    expect(screen.getByTestId("scene")).toBeTruthy();
    view.unmount();

    for (let cycle = 0; cycle < 10; cycle += 1) {
      const next = await mountViewer();
      expect(screen.getAllByTestId("scene")).toHaveLength(1);
      next.unmount();
    }
    expect(scene.unmounts).toBe(scene.mounts);
    expect(scene.mounts).toBeGreaterThanOrEqual(11);
    expect(probe.released).toBe(probe.requested.length);
    expect(removeListener.mock.calls.length).toBe(addListener.mock.calls.length);
    expect(document.body.querySelector(".ma-viewer")).toBeNull();
  });
});

describe("isolation from the simulation while mounted", () => {
  it("never calls the engines and leaves design and mission results identical", async () => {
    stubWebGL(["webgl2"]);
    const mission = { ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] };
    const snapshot = structuredClone(mission);
    const designBefore = structuredClone(resources.evaluateDesign(mission));
    const resultBefore = structuredClone(game.runMission(mission, 2026));
    const catalogBefore = structuredClone(physicalComponents);

    const runMission = vi.spyOn(game, "runMission");
    const evaluateDesign = vi.spyOn(resources, "evaluateDesign");
    const view = await mountViewer(mission.selectedComponentIds);

    for (const id of mission.selectedComponentIds) fireEvent.click(screen.getByRole("button", { name: `pick ${id}` }));
    for (const name of ["Schematic view", "Rotate left", "Rotate up", "Zoom in", "Zoom out", "Reset view", "3D on", "3D off"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      await flush();
    }
    fireEvent.click(screen.getByRole("button", { name: "lose context" }));
    fireEvent.click(screen.getByRole("button", { name: "Try 3D again" }));
    await flush();
    view.unmount();

    expect(runMission).not.toHaveBeenCalled();
    expect(evaluateDesign).not.toHaveBeenCalled();
    runMission.mockRestore();
    evaluateDesign.mockRestore();

    expect(mission).toEqual(snapshot);
    expect(physicalComponents).toEqual(catalogBefore);
    expect(resources.evaluateDesign(mission)).toEqual(designBefore);
    expect(game.runMission(mission, 2026)).toEqual(resultBefore);
  });
});
