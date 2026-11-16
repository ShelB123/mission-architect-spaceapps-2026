// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../src/i18n/Language";
import { FlightView } from "../../src/ui/FlightView";
import { EnvironmentExplorer } from "../../src/ui/EnvironmentExplorer";
import SpacecraftViewer from "../../src/visualization/SpacecraftViewer";
import { buildSpacecraftVisualModel } from "../../src/visualization/buildSpacecraftVisualModel";
import { visualCatalog } from "../../src/visualization/catalog";
import { components, defaultMission } from "../../src/data/catalog";
import { replayMission } from "../../src/engine/game";
const failure=vi.hoisted(()=>({flight:false,inspection:false}));
vi.mock("../../src/visualization/FlightScene",()=>({default:(props:{view:string;orbitFraction:number;onContextLost:()=>void})=>{
  if(failure.flight)throw new Error("Render failed");
  return <button onClick={props.onContextLost}>Flight {props.view} {props.orbitFraction}</button>;
}}));
vi.mock("../../src/visualization/SpacecraftScene",()=>({default:({onContextLost}:{onContextLost:()=>void})=>{
  if(failure.inspection)throw new Error("Render failed");
  return <button onClick={onContextLost}>Inspect model</button>;
}}));
vi.mock("../../src/visualization/EnvironmentScene",()=>({default:({id,onContextLost}:{id:string;onContextLost:()=>void})=><button onClick={onContextLost}>Explore {id}</button>}));
const webgl={isContextLost:()=>false,getExtension:()=>null} as unknown as WebGL2RenderingContext;
beforeEach(()=>{localStorage.setItem("mission-architect-language","en");vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(webgl);vi.spyOn(console,"error").mockImplementation(()=>{});});
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();failure.flight=false;failure.inspection=false;});
const frame=replayMission(defaultMission,2026,"survey").frames[2];
function flight(){return render(<LanguageProvider><FlightView frame={frame} selectedComponentIds={defaultMission.selectedComponentIds} onExplore={()=>{}}/></LanguageProvider>);}
describe("3D recovery without restarting a mission",()=>{
  it("recovers the selected onboard camera after context loss with the same frame",async()=>{
    const initial=JSON.stringify(frame);flight();await screen.findByRole("button",{name:/Flight chase/});
    fireEvent.click(screen.getByRole("button",{name:"Onboard camera"}));
    fireEvent.click(screen.getByRole("button",{name:/Flight onboard/}));
    expect(screen.getByRole("button",{name:"2D orbit"}).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button",{name:"Onboard camera"}).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button",{name:"Retry 3D"}));
    expect((await screen.findByRole("button",{name:/Flight onboard/})).textContent).toContain(String(frame.orbitFraction));
    expect(screen.getByRole("button",{name:"Onboard camera"}).getAttribute("aria-pressed")).toBe("true");
    expect(JSON.stringify(frame)).toBe(initial);
  });
  it("resets a failed flight boundary, permits repeated retries and camera switching",async()=>{
    failure.flight=true;flight();await screen.findByRole("button",{name:"Retry 3D"});
    fireEvent.click(screen.getByRole("button",{name:"Retry 3D"}));
    await screen.findByRole("button",{name:"Retry 3D"});failure.flight=false;
    fireEvent.click(screen.getByRole("button",{name:"Retry 3D"}));await screen.findByRole("button",{name:/Flight chase/});
    fireEvent.click(screen.getByRole("button",{name:"2D orbit"}));expect(screen.queryByRole("button",{name:/Flight chase/})).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Onboard camera"}));await screen.findByRole("button",{name:/Flight onboard/});
  });
  it("rechecks WebGL support and retains honest fallback while unavailable",async()=>{
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);flight();
    fireEvent.click(screen.getByRole("button",{name:"Retry 3D"}));expect(screen.getByText(/WebGL 2 is unavailable/)).toBeTruthy();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(webgl);
    fireEvent.click(screen.getByRole("button",{name:"Retry 3D"}));await screen.findByRole("button",{name:/Flight chase/});
  });
  it("recovers the same explorer object after graphics loss",async()=>{
    render(<LanguageProvider><EnvironmentExplorer initialId="moon" supported onClose={()=>{}}/></LanguageProvider>);
    fireEvent.click(await screen.findByRole("button",{name:"Explore moon"}));
    expect(screen.queryByRole("button",{name:"Rotate left"})).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Retry 3D"}));await screen.findByRole("button",{name:"Explore moon"});
    expect(screen.getByRole("button",{name:"Rotate left"})).toBeTruthy();
  });
  it("resets the inspection boundary and restores the same component model",async()=>{
    failure.inspection=true;
    const model=buildSpacecraftVisualModel(defaultMission.selectedComponentIds,visualCatalog,components);
    render(<SpacecraftViewer model={model}/>);
    await waitFor(()=>expect(screen.getByText(/3D view could not be displayed/)).toBeTruthy());
    failure.inspection=false;fireEvent.click(screen.getByRole("button",{name:"Try 3D again"}));
    fireEvent.click(await screen.findByRole("button",{name:"Inspect model"}));
    await screen.findByText(/graphics context was lost/);
    fireEvent.click(screen.getByRole("button",{name:"Try 3D again"}));await screen.findByRole("button",{name:"Inspect model"});
    expect(screen.getByText("Survey Camera")).toBeTruthy();
  });
});
