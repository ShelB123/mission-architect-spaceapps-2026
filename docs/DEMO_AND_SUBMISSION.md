# Demo and submission

## High-level project summary

Mission Architect is a browser game for students learning how spacecraft decisions interact. Design a small Earth-observation satellite around a data-return objective. Then choose the payload, solar power, battery, radio, launch strategy, and altitude. Engineering review checks mass and budget. The simulation shows how changing one design choice alters battery energy and science data returned to the ground.

## Detailed description for the project page

The game takes the player from briefing to debrief in five phases. The model approximates a circular Earth orbit and estimates the longest eclipse for the modeled geometry. It computes battery energy, synthetic science acquisition, and data delivery during fictional ground contact. A reproducible schedule pauses acquisition for a calibration and suspends ground contact for one orbit. The debrief explains the events and reports returned data, underpowered steps, and a score for the modeled objective.

In the demonstration, the high-resolution imager and 60 W solar array pass engineering review but return 117.7 MB, below the 250 MB target. Replacing the array with the 150 W option raises the modeled return to 294.3 MB and clears the power deficit. Both runs use seed 2026 with the same synthetic events. All component specifications and credits are fictional. The circular-orbit equations and their assumptions are documented with independent reference checks.

We used NASA's *Design and Develop Science Missions* to explain the relationships between the player’s launch, spacecraft, ground and user decisions. As a separate reference exercise, we enter the published TROPICS target altitude of 550 km into the existing orbit slider. The game estimates a 95.5-minute period and 37.2% eclipse at solar beta zero. The example uses altitude only. The app models one satellite with fictional hardware and contact timing.

The prototype uses React, TypeScript, Vite, and Vitest. The browser presents the single-player Eyes on Earth mission with prelaunch choices and an automated operations phase. The TypeScript engine supports three additional scenarios. The 3D viewer is described in the design documentation for future integration.

## Live walkthrough

1. Start from a fresh Briefing. Note the 250 MB downlink objective and the requirement to stay powered. In Design, choose **High-Resolution Imager** and **Dedicated Launch**. Keep the standard array, compact battery, basic downlink, 450 km, and six orbits. The browser uses `survey` and seed 2026.
2. Review 29 kg, 1,075 credits and the 36.98 W orbit-average generation warning against a 63 W load. Launch and show 117.7 MB returned, 320 underpowered reporting steps, and score 43. The 250 MB goal was missed.
3. Use **Improve design** from Debrief. Select only **Expanded Solar Array** and review 32 kg and 1,215 credits. Launch again. Show 294.3 MB returned, zero underpowered steps, and score 91. Point to seed 2026 and the two event lines in Debrief. At 450 km the 63 W load uses about 37.65 Wh through the modeled full eclipse. The 150 W array can refill the reserve during sunlight.
4. Optional when the presentation format allows. Restart at Briefing and choose 550 km. In Review point to 95.5 min and 37.2%. Explain the TROPICS target altitude and the idealized circular model. Use the 450 km solar comparison for the main demonstration.

The numbers above were measured in Chromium on the integrated game at `1476eb9`. Pin the demo link to that build when using these figures. Use **Improve design** or **Start new mission** after Debrief because changes through the stepper can expose an older result. [Browser evidence and comparison with the MVP](QA_ACCEPTANCE.md)

## 30-second narration

> Design a satellite and return 250 megabytes of science. NASA’s mission design guide connects the objective to the spacecraft, launch, and ground operations. Our first design passes review, loses power, and returns about 118 megabytes. With the same event schedule, the larger solar array returns about 294 megabytes with no power loss. These are simulated results.

Use the existing debrief outputs for the reveal. If the team records audio, time the spoken take and check captions. The prepared six-slide file covers the objective, mission segments, the controlled experiment, its energy explanation, and the 550 km reference.

## NASA data and references fields

| Entry | How it was used |
| --- | --- |
| [NASA, Design and Develop Science Missions](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf) | The challenge mirror lists this resource. Slides 8, 13, and 18 inform the walkthrough's mapping from science objective and mission segments to design, operations and review. |
| [NASA, CubeSat 101](https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_CubeSat_101_508.pdf) | Listed on the challenge mirror; mission development and launch integration context. |
| [NASA S3VI, 2026 Small Spacecraft Technology survey](https://www.nasa.gov/smallsat-institute/sst-soa/) | Technical review of real spacecraft power, communications, launch and ground systems. The catalog uses synthetic values. |
| [NASA, Mission Facts About TROPICS](https://www.nasa.gov/blogs/smallsatellites/2023/05/25/mission-facts-about-nasas-tropics/) | Approximate 550 km target used as an explicit input for an educational orbit comparison. |
| [NASA/NSSDC Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html), [NASA/JPL DE440 GM](https://ssd.jpl.nasa.gov/astro_par.html) | Mean radius and independent circular-orbit calculation. |
| [NASA/JSC, Reid Wiseman, ISS040-E-092688](https://images.nasa.gov/details/iss040e092688) | Credited Earth-limb photograph on the presentation cover. |
| Other sources and tools | NGA WGS 84 reference, Cal Poly CubeSat specification, vendor rating references, software tools and rights. [Source ledger](SOURCES.md). |

## AI use declaration

The team used OpenAI ChatGPT and Anthropic Claude to assist development of the prototype. OpenAI Codex assisted this contribution with source research, acceptance-test code, and drafting the English documentation and slides. Public sources were checked against the cited records, and the build, tests, and browser checks were executed. The game runs its local deterministic simulation without a live language model. Synthetic inputs and modeled outputs are labeled in the documentation.

Before posting, review the declaration against each member’s actual usage. Record tool/version where known, affected files or assets, and what the contributor verified. If generated media enters the final demo, declare it in the project and follow the event's media wording and marking requirements. The supplied deck uses a credited historical photo and rendered text.

## Team contributions

The repository establishes six work areas. Use the official team roster for the public names. The reviewed credits below identify public GitHub evidence where available. Git activity provides evidence of repository work, with human authorship and help outside commits to be confirmed by the team.

| Work area | Contribution | Evidence in the reviewed repo |
| --- | --- | --- |
| Architecture and integration | Scaffold, shared interface, project wiring, CI, and PR coordination | Initial scaffold by `ShelB123`'s project history. The architecture branch describes the integration sequence. |
| Orbit | Circular radius, speed, period, and eclipse assumptions | `src/engine/orbit.ts` and `tests/orbit.test.ts`. |
| Resources | Component selection, mass and budget, power and energy capacity | `src/engine/resources.ts` and `tests/resources.test.ts`. |
| Interface | Builder controls, review, status and debrief charts | `src/App.tsx` and `src/styles.css`. PR #2 documents the proposed 3D surface. |
| Gameplay | Energy/data operations, objectives, scoring and feedback | `src/engine/game.ts`. Public commits by `nicomanuQP` in merged [PR #3](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/3) add seeded scenarios. |
| Research, scientific QA and delivery | Source and rights ledger, physics assumptions, independent checks, and English demo | Files under `tests/acceptance` and the linked QA documents. |

## Project links and release review

Use a public demo link and a public link to the runnable build that matches it. The Team Owner fills in the official names and verifies access to both links in a private window. The official challenge page returned a gateway error and the submission guide timed out during this check. Organizer Q&A confirms the project page fields and resource-use requirement. Community guidance describes up to seven slides or a video up to 30 seconds. Confirm the official Resources tab and submission format during filing. [Official submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) · [Organizer resource guidance](https://github.com/nasa/spaceapps/discussions/1827) · [Organizer submission guidance](https://github.com/nasa/spaceapps/discussions/1858) · [Community format guidance](https://github.com/nasa/spaceapps/discussions/1973)

The [2026 event page](https://www.spaceappschallenge.org/2026/) gives 11:59 p.m. local time on Sunday, 15 November, as the general submission deadline. The project's own event registration determines the applicable local event and presentation arrangements. Ask the Team Owner to verify project license, exact links, roster, rights and disclosure information on the submission page.
