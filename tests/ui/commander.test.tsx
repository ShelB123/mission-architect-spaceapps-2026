// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import * as game from "../../src/engine/game";

const click = (name: RegExp) => fireEvent.click(screen.getByRole("button",{name}));
const tick = (ms:number) => act(()=>vi.advanceTimersByTime(ms));
beforeEach(()=>{localStorage.clear();vi.useFakeTimers();vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(null);});
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
function launch(){click(/Begin engineering/);click(/Review engineering/);click(/Launch simulation/);tick(450);}

describe("commander mode",()=>{
  it("stops at events, applies real orders, survives a language switch, and reaches a report",()=>{
    const run=vi.spyOn(game,"replayMission");
    render(<App/>);launch();click(/Next event/);
    const event=screen.getByRole("region",{name:"Your decision"});
    expect(event).toBeTruthy();
    const clock=screen.getByRole("progressbar").getAttribute("aria-valuenow");
    tick(20000);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(clock);
    fireEvent.change(screen.getByLabelText("Idioma / Language"),{target:{value:"es"}});
    expect(screen.getByRole("region",{name:"Tu decisión"})).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Idioma / Language"),{target:{value:"en"}});
    fireEvent.click(event.querySelectorAll("button")[1]);
    expect(run.mock.calls.at(-1)![3]!.at(-1)!.cameraOn).toBe(false);
    for(let n=0;n<6 && screen.queryByRole("button",{name:/Next event/});n++){
      click(/Next event/);
      const next=screen.queryByRole("region",{name:"Your decision"});
      if(next)fireEvent.click(next.querySelectorAll("button")[0]);
    }
    expect(screen.getByText("MISSION SCORE")).toBeTruthy();
    const last=run.mock.results.at(-1)!.value;
    expect(game.runMission(gameDefault(),2026,"survey",{commands:last.commands})).toEqual(last.result);
  });
  it("shows explanation by focus, supports Escape, and allows two-unit kits",()=>{
    render(<App/>);
    const info=screen.getByRole("button",{name:"Explain: POWER"});
    fireEvent.focus(info);
    expect(screen.getByRole("tooltip").textContent).toContain("60 Wh in one hour");
    fireEvent.keyDown(info,{key:"Escape"});expect(screen.queryByRole("tooltip")).toBeNull();
    click(/Begin engineering/);
    fireEvent.click(screen.getByRole("tab",{name:/Solar array/}));
    click(/Two Standard Arrays/);
    expect(screen.getByText("120 / 28 W")).toBeTruthy();
  });
  it("can opt into continuous playback and paginate the complete report without scrolling",()=>{
    render(<App/>);click(/Begin engineering/);click(/Review engineering/);
    fireEvent.click(screen.getByRole("checkbox",{name:/Commander mode/}));
    click(/Launch simulation/);tick(450);click(/Finish remaining simulation/);
    click(/Full technical report/);
    expect(screen.getByRole("dialog",{name:"Full technical report"})).toBeTruthy();
    click(/^Next$/);expect(screen.getByText(/Budget: 595/)).toBeTruthy();
    click(/Close details/);expect(screen.queryByRole("dialog")).toBeNull();
  });
});
function gameDefault(){return {altitudeKm:450,durationOrbits:6,launcherId:"rideshare",selectedComponentIds:["camera-basic","solar-basic","battery-basic","radio-basic"]};}
