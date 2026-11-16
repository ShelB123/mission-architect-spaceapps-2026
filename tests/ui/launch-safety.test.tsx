// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as game from "../../src/engine/game";

function click(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}
function review() {
  click(/Begin engineering/);
  click(/Review engineering/);
}
function finishLaunch() {
  click(/Launch simulation/);
  act(() => vi.advanceTimersByTime(450));
  click(/Finish remaining simulation/);
  expect(screen.getByText("MISSION SCORE")).toBeTruthy();
}
function debriefEnabled() {
  return !(screen.getByRole("button", { name: /05.*Debrief/ }) as HTMLButtonElement).disabled;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("mission result freshness", () => {
  it.each([
    ["altitude", () => fireEvent.change(screen.getByLabelText(/Orbit altitude/), { target: { value: "600" } })],
    ["duration", () => fireEvent.change(screen.getByLabelText(/Mission duration/), { target: { value: "8" } })],
    ["launcher", () => click(/Dedicated Launch/)],
    ["payload", () => click(/High-Resolution Imager/)],
    ["solar", () => click(/Expanded Solar Array/)],
    ["battery", () => click(/Extended Battery/)],
    ["communications", () => click(/High-Rate Downlink/)],
  ] as const)("invalidates completed results when changing %s", (_name, edit) => {
    render(<App initialAssisted={false} />);
    review();
    finishLaunch();
    expect(debriefEnabled()).toBe(true);
    click(/02.*Design/);
    edit();
    expect(debriefEnabled()).toBe(false);
    click(/05.*Debrief/);
    expect(screen.queryByText("MISSION SCORE")).toBeNull();
    expect(screen.getByText("Choose your spacecraft systems")).toBeTruthy();
  });
});

describe("launch lifetime", () => {
  it("cancels pending work when navigating and relaunches only the edited snapshot", () => {
    const run = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />);
    review();
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(200));
    click(/02.*Design/);
    fireEvent.change(screen.getByLabelText(/Orbit altitude/), { target: { value: "600" } });
    act(() => vi.advanceTimersByTime(1000));
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByText("Choose your spacecraft systems")).toBeTruthy();
    click(/Review engineering/);
    finishLaunch();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].altitudeKm).toBe(600);
  });

  it("ignores duplicate launch clicks before a render", () => {
    const run = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />);
    review();
    const button = screen.getByRole("button", { name: /Launch simulation/ });
    act(() => { button.click(); button.click(); });
    act(() => vi.advanceTimersByTime(450));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("supports cancellation and retry without executing the canceled timer", () => {
    const run = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />);
    review();
    click(/Launch simulation/);
    click(/Cancel launch/);
    act(() => vi.advanceTimersByTime(1000));
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByText("Ready for mission operations")).toBeTruthy();
    finishLaunch();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("clears pending work on unmount under StrictMode", () => {
    const run = vi.spyOn(game, "replayMission");
    const view = render(<StrictMode><App initialAssisted={false} /></StrictMode>);
    review();
    click(/Launch simulation/);
    view.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(run).not.toHaveBeenCalled();
    render(<StrictMode><App initialAssisted={false} /></StrictMode>);
    review();
    finishLaunch();
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("simulation errors", () => {
  it.each([new Error("Injected engine failure"), "non-Error rejection"])("returns to Review and allows retry after %s", (failure) => {
    const run = vi.spyOn(game, "replayMission").mockImplementationOnce(() => { throw failure; });
    render(<App initialAssisted={false} />);
    review();
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByRole("alert").textContent).toContain(
      failure instanceof Error ? failure.message : "Simulation failed"
    );
    expect(screen.queryByText("Simulating orbital operations")).toBeNull();
    expect(screen.getByText("Ready for mission operations")).toBeTruthy();
    expect(debriefEnabled()).toBe(false);
    finishLaunch();
    expect(run).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("clears a previous error when editing a configuration", () => {
    vi.spyOn(game, "replayMission").mockImplementationOnce(() => { throw new Error("Try again"); });
    render(<App initialAssisted={false} />);
    review();
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(450));
    click(/Modify spacecraft/);
    fireEvent.change(screen.getByLabelText(/Orbit altitude/), { target: { value: "600" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
