# Demo and submission

## High-level project summary

Mission Architect is a browser game for students learning how spacecraft decisions interact. Design a small Earth-observation satellite around a data-return objective. Then choose the payload, solar power, battery, radio, launch strategy, and altitude. Engineering review checks mass and budget. The simulation shows how changing one design choice alters battery energy and science data returned to the ground.

## Detailed description for the project page

The game takes the player from briefing to debrief in five phases. The model approximates a circular Earth orbit and estimates the longest eclipse for the modeled geometry. It computes battery energy, synthetic science acquisition, and data delivery during fictional ground contact. A reproducible schedule pauses acquisition for a calibration and suspends ground contact for one orbit. The debrief explains the events and reports returned data, underpowered steps, and a score for the modeled objective.

In the demonstration, the high-resolution imager and 60 W solar array pass engineering review but return 117.7 MB, below the 250 MB target. Replacing the array with the 150 W option raises the modeled return to 294.3 MB and clears the power deficit. Both runs use seed 2026 with the same synthetic events. All component specifications and credits are fictional. The circular-orbit equations and their assumptions are documented with independent reference checks.

In Review, **NASA mission segments** applies the launch, space, ground and user framework from NASA's *Design and Develop Science Missions* to the player's mass limit, battery, radio and data target. In the flight plan, **Use TROPICS altitude** applies NASA's published target altitude of approximately 550 km. The circular-orbit model calculates a period of 95.5 minutes at that altitude. The game also uses NASA's Blue Marble Earth and LRO-derived Moon textures. The Riverwatch flood-response briefing cites NASA and USGS Landsat examples. The game's satellite, hardware and science data are simulated.

The prototype uses React, TypeScript, Vite, and Vitest. The browser presents four single-player training scenarios with prelaunch choices, operations with player commands, and 3D views with a 2D fallback.

## Live walkthrough

1. Start from a fresh Briefing. Note the 250 MB downlink objective and the requirement to stay powered. In Design, choose **High-Resolution Imager** and **Dedicated Launch**. Keep the standard array, compact battery, basic downlink, 450 km, and six orbits. The browser uses `survey` and seed 2026.
2. Review 29 kg, 1,075 credits and the 36.98 W orbit-average generation warning against a 63 W load. Launch and show 117.7 MB returned, 320 underpowered reporting steps, and score 43. The 250 MB goal was missed.
3. Use **Improve design** from Debrief. Select only **Expanded Solar Array** and review 32 kg and 1,215 credits. Launch again. Show 294.3 MB returned, zero underpowered steps, and score 91. Point to seed 2026 and the two event lines in Debrief. At 450 km the 63 W load uses about 37.65 Wh through the modeled full eclipse. The 150 W array can refill the reserve during sunlight.
4. To demonstrate NASA data in the flight plan, use **Design → Flight plan → Orbit → Use TROPICS altitude**. Show the source link and the updated 95.5 min period. In Review, open **NASA mission segments** to see how the guide applies to the configured satellite.

The solar comparison above was measured in Chromium on the integrated game at `1476eb9`. Select **Eyes on Earth** before recording. The updated browser invalidates earlier results on mission edits and cancels pending launches. Use **Improve design** for the solar comparison and check the final deployment against the documented configuration and seed. [Browser evidence and comparison with the MVP](QA_ACCEPTANCE.md)

## 30-second narration

> Design a satellite and return 250 megabytes of science. NASA’s mission design guide connects the objective to the spacecraft, launch, and ground operations. Our first design passes review, loses power, and returns about 118 megabytes. With the same event schedule, the larger solar array returns about 294 megabytes with no power loss. These are simulated results.

Use the existing debrief outputs for the reveal. If the team records audio, time the spoken take and check captions. The prepared six-slide file covers the objective, mission segments, the controlled experiment, its energy explanation, and the 550 km reference.

## NASA Data

The first five entries identify NASA resources used directly in the game. The local organizer's [challenge resources](https://hackathlone.com/challenges/space-mission-design-game#resources) include **Design and Develop Science Missions**. The links below lead to the original NASA sources.

| Link Text | Link URL | Use in Mission Architect |
| --- | --- | --- |
| NASA — Design and Develop Science Missions | <https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf> | Slide 8 supplies the four segments shown with live design values in Review. |
| NASA — Mission Facts About NASA’s TROPICS | <https://www.nasa.gov/blogs/smallsatellites/2023/05/25/mission-facts-about-nasas-tropics/> | Approximate 550 km target altitude applied to the active flight plan. |
| NASA — The Blue Marble (2002) | <https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/> | Historical Earth composite used in the briefing and as a 3D texture. |
| NASA SVS — CGI Moon Kit (LRO/LROC) | <https://svs.gsfc.nasa.gov/4720/> | LRO-derived lunar color map used as a 3D texture. |
| NASA and USGS — Landsat Disaster Management | <https://science.nasa.gov/mission/landsat/benefits/disaster-management/> | Earth-observation examples linked in the fictional Riverwatch briefing. |
| NASA — International Space Station | <https://www.nasa.gov/reference/international-space-station/> | ISS context in the space explorer. |
| NASA — Moon Facts | <https://science.nasa.gov/moon/facts/> | Mean Earth–Moon distance in the space explorer. |
| NASA — What are SmallSats and CubeSats? | <https://www.nasa.gov/smallsat-institute/what-are-smallsats-and-cubesats/> | Satellite reference in the space explorer. |
| NASA — Orbital Debris FAQ | <https://orbitaldebris.jsc.nasa.gov/faq/> | Debris reference in the space explorer. |
| NASA/NSSDC — Earth Fact Sheet | <https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html> | Reference for the 6,371 km volumetric mean radius used by the circular-orbit model. |
| NASA/JPL — Astrodynamic Parameters (DE440) | <https://ssd.jpl.nasa.gov/astro_par.html> | Independent circular-orbit calculation in acceptance tests. |
| NASA — CubeSat 101 | <https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf> | Design research on mission development and launch integration. |
| NASA S3VI — State-of-the-Art Small Spacecraft Technology | <https://www.nasa.gov/smallsat-institute/sst-soa/> | Design research on power, communications, launch and ground systems. |

If the submitted demo uses the prepared slide cover, include [NASA/JSC — ISS040-E-092688](https://images.nasa.gov/details/iss040e092688), the credited Reid Wiseman photograph.

## Space Agency Partner & Other Data

| Link Text | Link URL | Use in Mission Architect |
| --- | --- | --- |
| NGA — WGS 84 Defining Parameters | <https://earth-info.nga.mil/?action=wgs84&dir=wgs84> | Reference for the Earth's GM used by the game. |
| Cal Poly — CubeSat Design Specification Rev. 14.1 | <https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf> | Cal Poly-authored dispenser and form factor design reference hosted by NASA. |
| React | <https://react.dev/> | Game interface. |
| Three.js | <https://threejs.org/> | 3D rendering. |
| React Three Fiber | <https://r3f.docs.pmnd.rs/> | React bindings for 3D scenes. |
| TypeScript | <https://www.typescriptlang.org/> | Application and engine source code. |
| Vite | <https://vite.dev/> | Development and production build. |
| Tailwind CSS | <https://tailwindcss.com/> | CSS build tooling. |
| Vitest | <https://vitest.dev/> | Automated verification of the game. |
| Inter | <https://github.com/rsms/inter> | Bundled briefing typeface under SIL OFL 1.1. |
| Bricolage Grotesque | <https://github.com/ateliertriay/bricolage> | Bundled briefing display typeface under SIL OFL 1.1. |
| Cloudflare Pages | <https://pages.cloudflare.com/> | Hosting for the live game. |

See the [source ledger](SOURCES.md#rights-and-redistribution) for supporting design references and media credits.

## AI use declaration

The team used OpenAI ChatGPT and Anthropic Claude to assist development of the prototype. OpenAI Codex assisted with source research, the TROPICS altitude control and NASA mission-segment review, acceptance tests, and English documentation and slides. The game runs its local deterministic simulation without a live language model. Synthetic inputs and modeled outputs are labeled in the documentation.

Before posting, review the declaration against each member’s actual usage. Record tool/version where known, affected files or assets, and what the contributor verified. If generated media enters the final demo, declare it in the project and follow the event's media wording and marking requirements. The supplied deck uses a credited historical photo and rendered text.

## Team contributions

The repository establishes six work areas. Use the official team roster for the public names. The reviewed credits below identify public GitHub evidence where available. Git activity provides evidence of repository work, with human authorship and help outside commits to be confirmed by the team.

| Work area | Contribution | Evidence in the reviewed repo |
| --- | --- | --- |
| Architecture and integration | Scaffold, shared interface, project wiring, CI, and PR coordination | Initial scaffold by `ShelB123`'s project history. The architecture branch describes the integration sequence. |
| Orbit | Circular radius, speed, period, and eclipse assumptions | `src/engine/orbit.ts` and `tests/orbit.test.ts`. |
| Resources | Component selection, mass and budget, power and energy capacity | `src/engine/resources.ts` and `tests/resources.test.ts`. |
| Interface | Builder controls, review, status and debrief charts | `src/App.tsx` and `src/styles.css`. PR #10 adds the preview host. PR #8 adds the renderer. The production loader is pending. |
| Gameplay | Energy/data operations, objectives, scoring and feedback | `src/engine/game.ts`. Public commits by `nicomanuQP` in merged [PR #3](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/3) add seeded scenarios. |
| Research, scientific QA and delivery | Source and rights ledger, physics assumptions, independent checks, and English demo | Files under `tests/acceptance` and the linked QA documents. |

## Project links and release review

Use a public demo link and a public link to the runnable build that matches it. The Team Owner fills in the official names and verifies access to both links in a private window. The official challenge page returned a gateway error and the submission guide timed out during this check. Organizer Q&A confirms the project page fields and resource-use requirement. Community guidance describes up to seven slides or a video up to 30 seconds. Confirm the official Resources tab and submission format during filing. [Official submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) · [Organizer resource guidance](https://github.com/nasa/spaceapps/discussions/1827) · [Organizer submission guidance](https://github.com/nasa/spaceapps/discussions/1858) · [Community format guidance](https://github.com/nasa/spaceapps/discussions/1973)

The [2026 event page](https://www.spaceappschallenge.org/2026/) gives 11:59 p.m. local time on Sunday, 15 November, as the general submission deadline. The project's own event registration determines the applicable local event and presentation arrangements. Ask the Team Owner to verify project license, exact links, roster, rights and disclosure information on the submission page.
