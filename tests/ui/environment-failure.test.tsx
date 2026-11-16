// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../src/i18n/Language";
import { EnvironmentExplorer } from "../../src/ui/EnvironmentExplorer";
const state=vi.hoisted(()=>({fail:false}));
vi.mock("../../src/visualization/EnvironmentScene",()=>({default:({onContextLost}:{onContextLost:()=>void})=>{
  if(state.fail)throw new Error("Renderer unavailable");
  return <button onClick={onContextLost}>Lose graphics context</button>;
}}));
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();state.fail=false;});
describe("explorer graphics failures",()=>{
  it("removes unusable rotation controls after context loss but retains facts and exit",async()=>{
    localStorage.setItem("mission-architect-language","en");const close=vi.fn();
    render(<LanguageProvider><EnvironmentExplorer initialId="moon" supported onClose={close}/></LanguageProvider>);
    fireEvent.click(await screen.findByRole("button",{name:"Lose graphics context"}));
    expect(screen.getByText(/3D unavailable/)).toBeTruthy();
    expect(screen.queryByRole("button",{name:"Rotate left"})).toBeNull();
    expect(screen.getByText(/384,400/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Return to mission"}));expect(close).toHaveBeenCalledOnce();
  });
  it("contains a renderer exception and leaves the reference cards usable",async()=>{
    state.fail=true;vi.spyOn(console,"error").mockImplementation(()=>{});
    localStorage.setItem("mission-architect-language","es");
    render(<LanguageProvider><EnvironmentExplorer initialId="earth" supported onClose={()=>{}}/></LanguageProvider>);
    await waitFor(()=>expect(screen.getByText(/Vista 3D no disponible/)).toBeTruthy());
    expect(screen.queryByRole("button",{name:"Girar a la derecha"})).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"ISS"}));expect(screen.getByText(/unos 400 km/)).toBeTruthy();
  });
});
