// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => { cleanup(); localStorage.clear(); });

it("explains the radar with a schematic and diagram without replacing the equipped camera", () => {
  localStorage.setItem("mission-architect-language", "en");
  render(<App/>);
  fireEvent.click(screen.getByRole("button", { name: /Begin engineering/ }));
  const radar = within(screen.getByRole("group", { name: "Synthetic Aperture Radar" }));
  const guide = radar.getByRole("button", { name: "How it works" });
  guide.focus();
  fireEvent.click(guide);

  const dialog = within(screen.getByRole("dialog", { name: "Synthetic Aperture Radar" }));
  expect(dialog.getByRole("img", { name: /Synthetic schematic drawing/ })).toBeTruthy();
  const diagram = within(dialog.getByRole("list", { name: "Process diagram" }));
  expect(diagram.getAllByRole("listitem")).toHaveLength(3);
  expect(diagram.getByText(/Echo back/)).toBeTruthy();
  expect(dialog.getByText(/at night and through many clouds/)).toBeTruthy();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });

  expect(screen.queryByRole("dialog", { name: "Synthetic Aperture Radar" })).toBeNull();
  expect(document.activeElement).toBe(guide);
  expect(radar.getByRole("button", { pressed: false }).getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByRole("button", { name: /Survey Camera/, pressed: true })).toBeTruthy();
});
