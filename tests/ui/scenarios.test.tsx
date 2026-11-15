// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { defaultMission } from "../../src/data/catalog";
import * as game from "../../src/engine/game";
import { assessScenarioDesign } from "../../src/ui/assessScenarioDesign";
import type { MissionConfig } from "../../src/types/contracts";

const scenarioIds = Object.keys(game.missionScenarios) as game.MissionScenarioId[];
const click = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const scenarioSelect = (id: game.MissionScenarioId) =>
  fireEvent.change(screen.getByLabelText("Training scenario"), { target: { value: id } });
const launchButton = () => screen.getByRole("button", { name: /Launch simulation/ }) as HTMLButtonElement;
const debriefButton = () => screen.getByRole("button", { name: /05.*Debrief/ }) as HTMLButtonElement;

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("scenario controls", () => {
  it.each(scenarioIds)("launches %s with the actual engine scenario and displays its limits", (id) => {
    const run = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />);
    expect(screen.getByLabelText("Training scenario").querySelectorAll("option")).toHaveLength(4);
    scenarioSelect(id);
    const scenario = game.missionScenarios[id];
    expect(screen.getByRole("heading", { name: scenario.name })).toBeTruthy();
    expect(screen.getByText(new RegExp(`Budget ${scenario.budgetCredits} credits`))).toBeTruthy();
    click(/Begin engineering/);
    click(/Review engineering/);
    expect(screen.getByText(`Maximum ${scenario.maxOrbits} orbits`)).toBeTruthy();
    expect(screen.getByText(`Limit ${scenario.budgetCredits} credits`)).toBeTruthy();
    expect(screen.getByText(`${scenario.targetMB} MB`)).toBeTruthy();
    expect(run).not.toHaveBeenCalled(); // Review must never simulate implicitly.
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(450));
    expect(run).toHaveBeenCalledExactlyOnceWith(defaultMission, 2026, id);
    click(/Finish remaining simulation/);
    expect(screen.getByText(`Target ${scenario.targetMB} MB`)).toBeTruthy();
  });

  it("blocks an otherwise valid design over the Lean Survey budget and permits correction", () => {
    render(<App initialAssisted={false} />);
    scenarioSelect("budget-survey");
    click(/Begin engineering/);
    click(/Expanded Solar Array/); // 735 credits; still within rideshare mass.
    click(/Review engineering/);
    expect(screen.getByText(/Scenario budget exceeded by 35 credits/)).toBeTruthy();
    expect(launchButton().disabled).toBe(true);
    click(/Modify spacecraft/);
    click(/Standard Solar Array/);
    click(/Review engineering/);
    expect(launchButton().disabled).toBe(false);
  });

  it("keeps the chosen duration visible and blocks a stricter scenario deadline", () => {
    render(<App initialAssisted={false} />);
    click(/Begin engineering/);
    fireEvent.change(screen.getByLabelText(/Mission duration/), { target: { value: "8" } });
    scenarioSelect("rapid-science");
    expect((screen.getByLabelText(/Mission duration/) as HTMLInputElement).value).toBe("8");
    click(/Review engineering/);
    expect(screen.getByText(/Scenario deadline exceeded: at most 6 orbits/)).toBeTruthy();
    expect(launchButton().disabled).toBe(true);
    scenarioSelect("endurance");
    expect(launchButton().disabled).toBe(false);
  });

  it("invalidates debrief on scenario change and cancels a pending launch", () => {
    const run = vi.spyOn(game, "replayMission");
    render(<App initialAssisted={false} />);
    click(/Begin engineering/);
    click(/Review engineering/);
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(450));
    click(/Finish remaining simulation/);
    expect(debriefButton().disabled).toBe(false);
    scenarioSelect("endurance");
    expect(debriefButton().disabled).toBe(true);
    expect(screen.getByText("Choose your spacecraft systems")).toBeTruthy();
    click(/Review engineering/);
    click(/Launch simulation/);
    scenarioSelect("budget-survey");
    act(() => vi.advanceTimersByTime(1000));
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Choose your spacecraft systems")).toBeTruthy();
  });

  it("labels battery history as energy, preserves an accessible range, and resets the scenario", () => {
    render(<App initialAssisted={false} />);
    scenarioSelect("endurance");
    click(/Begin engineering/);
    expect(screen.getByText("Battery capacity")).toBeTruthy();
    expect((screen.getByLabelText(/Mission duration/) as HTMLInputElement).max).toBe("30");
    click(/Review engineering/);
    click(/Launch simulation/);
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByText("Battery energy remaining")).toBeTruthy();
    click(/Finish remaining simulation/);
    expect(screen.getByText("Steps with power deficit")).toBeTruthy();
    expect(screen.getByText(/Reporting intervals up to 60 seconds/)).toBeTruthy();
    click(/Start new mission/);
    expect((screen.getByLabelText("Training scenario") as HTMLSelectElement).value).toBe("survey");
  });
});

describe("preflight policy matches authoritative engine review", () => {
  const configs: MissionConfig[] = [
    defaultMission,
    { ...defaultMission, selectedComponentIds: ["camera-basic", "solar-advanced", "battery-basic", "radio-basic"] },
    { ...defaultMission, selectedComponentIds: ["camera-hd", "solar-advanced", "battery-advanced", "radio-advanced"], launcherId: "dedicated" },
    { ...defaultMission, selectedComponentIds: [] },
  ];
  it.each(scenarioIds)("matches budget/deadline boundaries for %s without changing engine quantities", (id) => {
    const max = game.missionScenarios[id].maxOrbits;
    for (const config of configs) {
      for (const durationOrbits of [1, max, max + 1]) {
        const input = { ...config, durationOrbits };
        expect(assessScenarioDesign(input, id)).toEqual(game.runMission(input, 2026, id).design);
      }
    }
  });
});
