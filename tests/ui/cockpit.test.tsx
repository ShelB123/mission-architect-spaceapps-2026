// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as game from "../../src/engine/game";

const click = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
function launch() { click(/Review engineering/); click(/Launch simulation/); tick(450); }
function finish() { click(/Finish remaining simulation/); }
const elapsed = () => screen.getByRole("progressbar", { name: "Mission elapsed time" }).getAttribute("aria-valuenow");
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("playable cockpit", () => {
  it("shows component gains and costs before and after equipping", () => {
    render(<App initialAssisted={false} />); click(/Begin engineering/);
    const camera = screen.getByRole("button", { name: /High-Resolution Imager/ });
    fireEvent.focus(camera);
    expect(screen.getByText("+3.5 MB/min acquisition")).toBeTruthy();
    expect(screen.getByText("+35 W load")).toBeTruthy();
    click(/High-Resolution Imager/);
    expect(screen.getByText(/CHANGE APPLIED/)).toBeTruthy();
    expect(screen.getByText("+35 W load")).toBeTruthy();
    expect(screen.getByText("+9 kg")).toBeTruthy();
  });
  it("plays only elapsed telemetry, pauses, resumes and completes normally", () => {
    render(<App initialAssisted={false} />); click(/Begin engineering/); launch();
    expect(screen.queryByText("MISSION SCORE")).toBeNull();
    expect(elapsed()).toBe("0");
    tick(3000); const before = elapsed(); expect(Number(before)).toBeGreaterThan(0);
    click(/Pause playback/); tick(5000); expect(elapsed()).toBe(before);
    click(/Resume playback/);
    fireEvent.change(screen.getByLabelText("Speed"), { target: { value: "1800" } });
    tick(30000);
    expect(screen.getByText("MISSION SCORE")).toBeTruthy();
    expect(screen.getByText("Mission accomplished")).toBeTruthy();
  });
  it("records real commands and can lose by choosing never to acquire data", () => {
    const replay = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />); click(/Begin engineering/); launch();
    click(/Pause playback/); click(/Save power/);
    expect(replay).toHaveBeenLastCalledWith(expect.anything(), 2026, "survey", [{ timeSeconds: 0, cameraOn: false }]);
    expect(screen.getByText(/60 W generation · 21 W load/)).toBeTruthy();
    click(/Command log/);
    expect(screen.getByText("0.0 min · camera off")).toBeTruthy();
    click(/Close details/);
    expect(screen.queryByText("MISSION SCORE")).toBeNull();
    finish();
    expect(screen.getByText("One more iteration.")).toBeTruthy();
    expect(screen.getByText(/returned less data/)).toBeTruthy();
    expect(replay.mock.results.at(-1)!.value.result.producedMB).toBe(0);
  });
  it("compares consecutive attempts under the same seed and removes mismatched comparisons", () => {
    render(<App initialAssisted={false} />); click(/Begin engineering/); launch(); finish();
    click(/Improve design/); click(/Expanded Solar Array/); launch(); finish();
    expect(screen.getByText("Compared with your last attempt")).toBeTruthy();
    expect(screen.getByText("+140 cr")).toBeTruthy();
    click(/Improve design/);
    fireEvent.change(screen.getByLabelText("Replay seed"), { target: { value: "7" } });
    launch(); finish();
    expect(screen.queryByText("Compared with your last attempt")).toBeNull();
  });
  it("cancels active playback and discards its commands", () => {
    const replay = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />); click(/Begin engineering/); launch(); click(/Save power/);
    click(/Cancel launch/); tick(120000);
    expect(screen.queryByText("MISSION SCORE")).toBeNull();
    click(/Launch simulation/); tick(450);
    expect(replay).toHaveBeenLastCalledWith(expect.anything(), 2026, "survey");
    finish(); expect(screen.getByText("Mission accomplished")).toBeTruthy();
  });
  it("allows keyboard users to dismiss help and returns focus", () => {
    render(<App initialAssisted={false} />);
    const help = screen.getByRole("button", { name: "Help and model assumptions" });
    help.focus(); fireEvent.click(help);
    const close = screen.getByRole("button", { name: "Close help" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Back to the mission" }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(help);
  });
});
