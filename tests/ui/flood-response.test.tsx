// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import App from "../../src/App";
import * as game from "../../src/engine/game";
const click=(name:RegExp)=>fireEvent.click(screen.getByRole("button",{name}));
beforeEach(()=>{localStorage.clear();vi.useFakeTimers();vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(null);});
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();localStorage.clear();});
describe("purposeful mission flow",()=>{
 it("offers a sourced bilingual request with focus recovery and a real repair design",()=>{
   render(<App/>);const opener=screen.getByRole("button",{name:"Flood response briefing"});opener.focus();fireEvent.click(opener);
   click(/^Next$/);click(/^Next$/);expect(screen.getByRole("link",{name:/Read the NASA/}).getAttribute("href")).toContain("landsat/benefits/disaster-management");
   fireEvent.keyDown(screen.getByRole("dialog"),{key:"Escape"});expect(document.activeElement).toBe(opener);
   fireEvent.change(screen.getByLabelText("Idioma / Language"),{target:{value:"es"}});
   click(/^Misión: observar inundaciones$/);expect(screen.getByText("Operación Río Seguro")).toBeTruthy();
   click(/^Aceptar misión de reparación$/);expect(screen.queryByRole("dialog")).toBeNull();
   expect(screen.getByText("60 / 63 W")).toBeTruthy();
 });
 it("compares without issuing orders or advancing time and diagnoses a failed design",()=>{
   const replay=vi.spyOn(game,"replayMission");render(<App/>);
   click(/Flood response briefing/);click(/Accept the repair mission/);click(/Review engineering/);click(/Launch simulation/);act(()=>vi.advanceTimersByTime(450));click(/Next event/);
   const clock=screen.getByRole("progressbar").getAttribute("aria-valuenow");
   const comparisonsBefore=replay.mock.calls.length;
   click(/Compare before deciding/);const preview=screen.getByRole("region",{name:"Calculated comparison"});expect(within(preview).getByText("Camera on")).toBeTruthy();expect(within(preview).getByText("Camera off")).toBeTruthy();
   expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(clock);
   // Hypothetical branches never enter the live command log.
   click(/Hide comparison/);expect(replay.mock.calls.length).toBe(comparisonsBefore+2);expect(screen.getByRole("button",{name:/Command log \(0\)/})).toBeTruthy();
   for(let n=0;n<6&&screen.queryByRole("region",{name:"Your decision"});n++){
     fireEvent.click(screen.getByRole("region",{name:"Your decision"}).querySelector("button")!);
     click(/Next event/);
   }
   expect(screen.getByText("Power interrupted the mission.")).toBeTruthy();
   click(/What to try next/);expect(screen.getByText(/Try a lower-power camera/)).toBeTruthy();
 });
});
