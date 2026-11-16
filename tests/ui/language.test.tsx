// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { LanguageProvider, LANGUAGE_KEY, preferredLanguage } from "../../src/i18n/Language";
import { translateText } from "../../src/i18n/translate";
import { es } from "../../src/i18n/es";
import { components, defaultMission } from "../../src/data/catalog";
import * as game from "../../src/engine/game";
import { challengeStart } from "../../src/ui/challenges";
import FableViewerBridge from "../../src/ui/FableViewerBridge";

const click = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const language = (value: string) => fireEvent.change(screen.getByLabelText("Idioma / Language"), { target: { value } });
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("language preference", () => {
  it("honors supported saved preferences, browser order and Spanish fallback", () => {
    expect(preferredLanguage("es", ["en-US"])).toBe("es");
    expect(preferredLanguage("en", ["es-PE"])).toBe("en");
    expect(preferredLanguage(null, ["es-PE", "en"])).toBe("es");
    expect(preferredLanguage(null, ["en-GB", "es"])).toBe("en");
    expect(preferredLanguage("invalid", ["fr", "es_MX"])).toBe("es");
    expect(preferredLanguage(null, [])).toBe("es");
  });
  it("starts in the browser's language and remembers an explicit change", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-PE"]);
    const first = render(<App initialAssisted={false} />);
    expect(screen.getByRole("button", { name: /Diseñar satélite/ })).toBeTruthy();
    expect(document.documentElement.lang).toBe("es");
    language("en");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    first.unmount(); render(<App initialAssisted={false} />);
    expect(screen.getByRole("button", { name: /Begin engineering/ })).toBeTruthy();
  });
  it("still switches language when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<App initialAssisted={false} />); language("es");
    expect(screen.getByRole("button", { name: /Diseñar satélite/ })).toBeTruthy();
  });
});

describe("localized gameplay", () => {
  it("translates configuration and launch constraints without resetting choices", () => {
    render(<App initialAssisted={false} />); language("es");
    fireEvent.change(screen.getByLabelText("Escenario de misión"), { target: { value: "budget-survey" } });
    click(/Diseñar satélite/); click(/Paneles solares ampliados/);
    expect(screen.getByText("+90 W de generación")).toBeTruthy();
    click(/Revisar diseño/);
    expect(screen.getByText(/Superas el presupuesto del escenario en 35 créditos/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Iniciar misión/ }) as HTMLButtonElement).disabled).toBe(true);
    language("en");
    expect(screen.getByText(/Scenario budget exceeded by 35 credits/)).toBeTruthy();
    expect((screen.getByLabelText("Training scenario") as HTMLSelectElement).value).toBe("budget-survey");
  });
  it("switches during a paused flight without rerunning the engine or losing commands", () => {
    const replay = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />); language("es");
    click(/Diseñar satélite/); click(/Revisar diseño/); click(/Iniciar misión/);
    act(() => vi.advanceTimersByTime(450));
    click(/^Pausar$/); click(/Ahorrar energía/);
    click(/Registro de órdenes/);
    expect(screen.getByText("0.0 min · cámara apagada")).toBeTruthy();
    const result = replay.mock.results.at(-1)!.value.result;
    expect(replay).toHaveBeenCalledTimes(2);
    language("en");
    expect(screen.getByRole("button", { name: "Resume playback" })).toBeTruthy();
    expect(screen.getByText("0.0 min · camera off")).toBeTruthy();
    expect(replay).toHaveBeenCalledTimes(2);
    language("es"); click(/Cerrar detalles/); click(/Simular hasta el final/);
    expect(screen.getByText("Prueba otra estrategia.")).toBeTruthy();
    click(/Informe técnico completo/); click(/^Siguiente$/); click(/^Siguiente$/);
    expect(screen.getByText(/Semilla de simulación: 2026/)).toBeTruthy();
    expect(screen.queryByText(/Replay seed: 2026/)).toBeNull();
    expect(replay.mock.results.at(-1)!.value.result).toBe(result);
    click(/Cerrar detalles/); click(/Dame una pista/);
    expect(screen.getByText(/Una cámara más potente consume más electricidad/)).toBeTruthy();
  });
  it("localizes help and scenario-specific science goals", () => {
    render(<App initialAssisted={false} />); language("es");
    fireEvent.change(screen.getByLabelText("Escenario de misión"), { target: { value: "rapid-science" } });
    expect(screen.getByText(/Envía 1000 MB antes de terminar 6 órbitas/)).toBeTruthy();
    click(/Ayuda y supuestos del modelo/);
    expect(screen.getByRole("dialog", { name: "Cómo jugar" })).toBeTruthy();
    expect(screen.getByText(/Los componentes, presupuestos y eventos son ficticios/)).toBeTruthy();
  });
  it("translates viewer controls and the WebGL-free representation", async () => {
    localStorage.setItem(LANGUAGE_KEY, "es");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<LanguageProvider><FableViewerBridge selectedComponentIds={defaultMission.selectedComponentIds}/></LanguageProvider>);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Vista esquemática" })).toBeTruthy();
    expect(screen.getByText(/WebGL no está disponible/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /Esquema frontal 2D/ })).toBeTruthy();
    click(/Cámara de observación/);
    expect(screen.getByText(/3 piezas esquemáticas: carcasa, tubo óptico, lente/)).toBeTruthy();
    expect(screen.getByText(/Geometría esquemática ficticia/)).toBeTruthy();
  });
});

describe("translation coverage and scientific invariance", () => {
  it("covers literal interface labels and component names/descriptions", () => {
    const sources = import.meta.glob<string>(["../../src/App.tsx", "../../src/ui/MissionOrbit.tsx", "../../src/ui/SpacecraftPreview.tsx", "../../src/visualization/SpacecraftViewer.tsx", "../../src/visualization/SpacecraftFallback.tsx"], { query: "?raw", import: "default", eager: true });
    expect(Object.keys(sources)).toHaveLength(5);
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/\bt\(("(?:[^"\\]|\\.)*")\)/g)) {
        const label = (JSON.parse(match[1]) as string).trim();
        expect(es[label], `${path}: ${label}`).toBeDefined();
      }
    }
    for (const component of components) {
      expect(translateText(component.name, "es")).not.toBe(component.name);
      expect(translateText(component.description, "es")).not.toBe(component.description);
    }
  });
  it.each(Object.keys(game.missionScenarios) as game.MissionScenarioId[])("translates the complete %s report while retaining numeric evidence", scenario => {
    for (const config of [defaultMission, challengeStart(scenario)]) {
      const result = game.runMission(config, 2026, scenario);
      const snapshot = JSON.stringify(result);
      for (const line of [...result.explanations, ...result.events, ...result.design.warnings]) {
        const translated = translateText(line, "es");
        expect(translated, line).not.toBe(line);
        expect(translated.match(/\d+(?:\.\d+)?/g)).toEqual(line.match(/\d+(?:\.\d+)?/g));
        expect(translateText(line, "en")).toBe(line);
      }
      expect(JSON.stringify(result)).toBe(snapshot);
    }
  });
});
