import { defaultMission } from "../data/catalog";
import type { MissionConfig } from "../types/contracts";
import type { MissionScenarioId } from "../engine/game";
export const challenges: Record<MissionScenarioId, { number: string; title: string; hook: string; task: string; difficulty: string; hint: string }> = {
  survey: { number: "01", title: "First light", hook: "Bring your first observations home.", task: "Build a working satellite. Collect and return 250 MB without losing power.", difficulty: "START HERE", hint: "A bigger camera uses more power. Start with a balanced design." },
  "budget-survey": { number: "02", title: "Small budget. Big mission.", hook: "Every upgrade has a price.", task: "Return 250 MB in 6 orbits, with just 700 credits. Choose what you really need.", difficulty: "RESOURCE PUZZLE", hint: "The launch also costs credits. Can the smaller launcher carry your design?" },
  "rapid-science": { number: "03", title: "Beat the deadline", hook: "The ground team is waiting.", task: "Return 1,000 MB before 6 orbits end. A better camera is only half the solution.", difficulty: "COMMUNICATIONS", hint: "Data aboard the satellite do not count. Match the camera, radio and power supply." },
  endurance: { number: "04", title: "Into the long night", hook: "Reserves will not last forever.", task: "Return 600 MB within 12 orbits. Keep enough energy for every eclipse.", difficulty: "ENERGY CHALLENGE", hint: "A large battery can delay a deficit. Solar generation must replenish it." },
};
/** Optional challenge starts are real catalog designs, never hidden difficulty modifiers. */
export function challengeStart(id: MissionScenarioId): MissionConfig {
  const base = { ...defaultMission, selectedComponentIds: [...defaultMission.selectedComponentIds] };
  if (id === "survey") return { ...base, launcherId: "dedicated", selectedComponentIds: ["camera-hd","solar-basic","battery-basic","radio-basic"] };
  if (id === "budget-survey") return { ...base, selectedComponentIds: ["camera-basic","solar-basic","battery-basic","radio-advanced"] };
  if (id === "endurance") return { ...base, durationOrbits: 12, launcherId: "dedicated", selectedComponentIds: ["camera-hd","solar-basic","battery-advanced","radio-basic"] };
  return base;
}
