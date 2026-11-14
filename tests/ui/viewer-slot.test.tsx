// @vitest-environment jsdom
import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { defaultMission } from "../../src/data/catalog";
import * as game from "../../src/engine/game";
import { SpacecraftPreview } from "../../src/ui/SpacecraftPreview";
import type { SpacecraftInspectionLoader, SpacecraftInspectionProps } from "../../src/ui/SpacecraftPreview";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const click = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));

// Deliberately a test-only bridge; this is not the production 3D renderer.
function InspectionHarness({ selectedComponentIds, onInspectComponent }: SpacecraftInspectionProps) {
  return <button onClick={() => onInspectComponent?.(selectedComponentIds[0])}>Inspect test component</button>;
}
const openPreview = async () => { await act(async () => click(/Show 3D preview/)); };

describe("optional viewer integration host", () => {
  it("keeps the component list and complete game available without a renderer", () => {
    vi.useFakeTimers();
    render(<App />);
    click(/Begin engineering/);
    expect(screen.getByRole("list", { name: "Selected spacecraft components" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Show 3D preview/ })).toBeNull();
    click(/Review engineering/);
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByText("MISSION SCORE")).toBeTruthy();
  });

  it("loads only on demand and passes a frozen ID copy", async () => {
    let received: readonly string[] | undefined;
    const loader = vi.fn(async () => ({ default: (props: SpacecraftInspectionProps) => {
      received = props.selectedComponentIds;
      return <InspectionHarness {...props} />;
    } }));
    render(<SpacecraftPreview selectedComponentIds={defaultMission.selectedComponentIds} loadViewer={loader} />);
    expect(loader).not.toHaveBeenCalled();
    await openPreview();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(received).toEqual(defaultMission.selectedComponentIds);
    expect(received).not.toBe(defaultMission.selectedComponentIds);
    expect(Object.isFrozen(received)).toBe(true);
  });

  it("contains lazy-import rejection and retries on explicit reopen", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const loader = vi.fn<SpacecraftInspectionLoader>()
      .mockRejectedValueOnce(new Error("Missing chunk"))
      .mockResolvedValue({ default: InspectionHarness });
    render(<App loadSpacecraftViewer={loader} />);
    click(/Begin engineering/);
    await openPreview();
    expect(screen.getByText(/The 3D preview could not load/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Review engineering/ })).toBeTruthy();
    click(/Hide 3D preview/);
    await openPreview();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Inspect test component" })).toBeTruthy();
  });

  it("contains render/adapter failures without breaking component selection", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const loader = async () => ({ default: () => { throw new Error("Adapter failed"); } });
    render(<App loadSpacecraftViewer={loader} />);
    click(/Begin engineering/);
    await openPreview();
    expect(screen.getByText(/The 3D preview could not load/)).toBeTruthy();
    click(/Expanded Solar Array/);
    expect(screen.getByRole("button", { name: /Expanded Solar Array/ }).getAttribute("aria-pressed")).toBe("true");
    click(/Review engineering/);
    expect(screen.getByText("Ready for mission operations")).toBeTruthy();
  });

  it("shows a loading fallback while the module is pending", async () => {
    let resolve!: (module: Awaited<ReturnType<SpacecraftInspectionLoader>>) => void;
    const loader: SpacecraftInspectionLoader = () => new Promise((done) => { resolve = done; });
    render(<SpacecraftPreview selectedComponentIds={defaultMission.selectedComponentIds} loadViewer={loader} />);
    await openPreview();
    expect(screen.getByText("Loading spacecraft preview…")).toBeTruthy();
    await act(async () => resolve({ default: InspectionHarness }));
    expect(screen.queryByText("Loading spacecraft preview…")).toBeNull();
  });

  it("updates the bridge selection and hides inspection of a removed component", async () => {
    const loader = async () => ({ default: InspectionHarness });
    const view = render(<SpacecraftPreview selectedComponentIds={["camera-basic"]} loadViewer={loader} />);
    await openPreview();
    click(/Inspect test component/);
    expect(screen.getByText("Inspecting: Survey Camera")).toBeTruthy();
    view.rerender(<SpacecraftPreview selectedComponentIds={["camera-hd"]} loadViewer={loader} />);
    expect(screen.queryByText("Inspecting: Survey Camera")).toBeNull();
    click(/Inspect test component/);
    expect(screen.getByText("Inspecting: High-Resolution Imager")).toBeTruthy();
  });

  it("unmounts the bridge when hidden", async () => {
    const dispose = vi.fn();
    const loader = async () => ({ default: () => {
      useEffect(() => dispose, []);
      return <p>Mounted test bridge</p>;
    } });
    render(<SpacecraftPreview selectedComponentIds={defaultMission.selectedComponentIds} loadViewer={loader} />);
    await openPreview();
    click(/Hide 3D preview/);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("inspection never runs the engine or changes the subsequent mission result", async () => {
    vi.useFakeTimers();
    const baseline = game.runMission(defaultMission, 2026, "survey");
    const run = vi.spyOn(game, "runMission");
    render(<App loadSpacecraftViewer={async () => ({ default: InspectionHarness })} />);
    click(/Begin engineering/);
    await openPreview();
    click(/Inspect test component/);
    click(/Hide 3D preview/);
    expect(run).not.toHaveBeenCalled();
    click(/Review engineering/);
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(450));
    expect(run).toHaveBeenCalledExactlyOnceWith(defaultMission, 2026, "survey");
    expect(run.mock.results[0].value).toEqual(baseline);
  });
});
