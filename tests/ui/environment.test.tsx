// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as game from "../../src/engine/game";
const click=(name:RegExp)=>fireEvent.click(screen.getByRole("button",{name}));
beforeEach(()=>{localStorage.clear();vi.useFakeTimers();vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(null);});
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
function launch(){click(/Begin engineering/);click(/Review engineering/);click(/Launch simulation/);act(()=>vi.advanceTimersByTime(450));}
describe("space environment exploration",()=>{
  it("pauses without rerunning the simulation, keeps every fact available without WebGL, then resumes",()=>{
    const run=vi.spyOn(game,"replayMission");
    render(<App initialAssisted={false}/>);launch();
    const calls=run.mock.calls.length;
    const opener=screen.getByRole("button",{name:"Explore space"});opener.focus();fireEvent.click(opener);
    const dialog=screen.getByRole("dialog",{name:"Explore space"});
    expect(document.querySelector<HTMLElement>(".cockpit")!.inert).toBe(true);
    expect(within(dialog).getByText(/3D unavailable/)).toBeTruthy();
    const time=screen.getByRole("progressbar").getAttribute("aria-valuenow");
    act(()=>vi.advanceTimersByTime(20000));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(time);
    click(/^ISS$/);expect(within(dialog).getByText(/about 400 km/)).toBeTruthy();
    click(/^Your mission$/);expect(within(dialog).getByText(/not the station’s live position/)).toBeTruthy();
    click(/^Moon$/);expect(within(dialog).getByText(/384,400/)).toBeTruthy();
    click(/^Orbital debris$/);expect(within(dialog).getByText(/Discarded rocket parts/)).toBeTruthy();
    click(/^Observation satellite$/);expect(within(dialog).getByText(/synthetic example/)).toBeTruthy();
    const source=within(dialog).getByRole("link",{name:/NASA source/});source.focus();fireEvent.keyDown(dialog,{key:"Tab"});expect(document.activeElement).toBe(within(dialog).getByRole("button",{name:"Return to mission"}));
    fireEvent.keyDown(dialog,{key:"Escape"});expect(screen.queryByRole("dialog")).toBeNull();expect(document.activeElement).toBe(opener);
    expect(document.querySelector<HTMLElement>(".cockpit")!.inert).toBe(false);
    expect(run.mock.calls.length).toBe(calls);
    click(/Resume playback/);act(()=>vi.advanceTimersByTime(1000));expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).not.toBe(time);
    click(/Finish remaining simulation/);expect(screen.getByText("MISSION SCORE")).toBeTruthy();
  });
  it("offers the complete Spanish explorer and honestly indicates the 2D fallback",()=>{
    localStorage.setItem("mission-architect-language","es");render(<App initialAssisted={false}/>);
    click(/Diseña tu satélite/);click(/Revisar diseño/);click(/Iniciar misión/);act(()=>vi.advanceTimersByTime(450));
    click(/^Cámara a bordo$/);click(/^Explorar espacio$/);
    click(/^ISS$/);expect(screen.getByText(/unos 400 km/)).toBeTruthy();
    click(/^Tu misión$/);expect(screen.getByText(/no indica su posición real/)).toBeTruthy();
    click(/^Luna$/);expect(screen.getByText(/384 400/)).toBeTruthy();
    click(/^Volver a la misión$/);expect(screen.getByRole("button",{name:"Cámara a bordo"}).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button",{name:"Órbita 2D"}).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button",{name:"Reanudar"})).toBeTruthy();
  });
});
