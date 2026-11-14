# Physics assumptions and limitations

Mission Architect models a single circular Earth orbit for educational trade studies. The UI allows 250–1,000 km and 1–30 revolutions subject to the selected scenario’s deadline. The orbit engine accepts 160–40,000 km. General engineering review accepts 1–30 integer revolutions, and a scenario can impose a lower limit. The equations below describe the engines in [main at 8db3341](https://github.com/ShelB123/mission-architect-spaceapps-2026/commit/8db3341484c656265ec909a1c3aadfbabbfd42ed).

## Circular orbit and eclipse

With altitude `h` above a spherical reference Earth, `r = R + h`. Equating centripetal acceleration and gravity gives `v = √(μ/r)` and `T = 2πr/v = 2π√(r³/μ)`. With radius and altitude in km and μ in km³/s², speed is in km/s and period is in seconds. The implementation uses `R = 6,371 km` and `μ = 398,600.4418 km³/s²`. The latter agrees with NGA's WGS 84 geocentric GM in m³/s² divided by 10⁹. The game uses the volumetric mean radius for its sphere.

The Sun is in the orbital plane (solar beta 0°). A point Sun at effectively infinite distance gives parallel rays and a cylindrical shadow. The half-angle from the antisolar direction is `α = asin(R/r)`. The eclipse fraction is `α/π` and the eclipse interval is centered at phase 0.5, with an exclusive end. This describes the maximum eclipse under the circular geometry. Solar beta variation, penumbra, drag, oblateness/J2 and attitude dynamics are outside the model.

Independent fixtures use NASA/JPL DE440 `μ = 398,600.435507 km³/s²` and the same mean radius. Acceptance tolerances are 0.01 s in period, 0.00001 km/s in speed, and 0.00001 in eclipse fraction. These thresholds check model equations and units.

| Altitude input | Radius (km) | Period (s) | Speed (km/s) | Eclipse fraction | Eclipse duration (min) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 450 km, game default | 6,821 | 5,606.3868 | 7.644426 | 0.383731 | 35.8557 |
| 550 km, TROPICS target-altitude example | 6,921 | 5,730.1271 | 7.588998 | 0.372244 | 35.5501 |

TROPICS supplies the rounded altitude target. The game computes period and eclipse using a single circular orbit at beta zero. Inclination, phasing, constellation coverage and observed performance are outside this exercise. [TROPICS and reference constants](SOURCES.md#documented-reference-values-and-adoption-decisions)

## Power and data

Solar output is constant while illuminated and zero in eclipse. Nominal load is the continuous sum of bus and component loads. The battery starts full and its model capacity is fully usable. Engineering review compares illuminated and orbit-average generation (`P_solar × sunlightFraction`, W) with nominal load. It compares the full-eclipse demand (`P_load × T × eclipseFraction / 3600`, Wh) with battery capacity. It also warns when peak downlink fails to exceed payload rate. Even with higher peak downlink, short contacts can constrain net return. These diagnostics are advisory. Category, mass, credits and duration restrictions can reject a design.

At 450 km a 63 W load uses about 37.65 Wh across the idealized eclipse. The standard and expanded arrays average about 37.0 W and 92.4 W over the orbit respectively. Sustainable operation requires enough average generation and enough battery to bridge eclipse independently. The model omits charge/discharge efficiency, current limits, conversion losses, thermal limits, aging and reserve margins.

Reporting steps last up to 60 s, with a partial last step. The engine splits steps at orbital, eclipse, contact and training-event boundaries and uses the midpoint of each sub-interval to identify its state. Energy follows `E_next = clamp(E + (P_solar − P_load) × Δt/3600, 0, capacity)`, with W, s and Wh. A segment whose required net energy exceeds the reserve is treated as unavailable for science and downlink across the whole segment. The battery clamps at zero. This conservative method can count the entire affected sub-interval instead of modeling the instant of depletion. Several unavailable sub-intervals in one reporting step count as one affected step. Unavailable sub-interval durations are also summed separately.

During powered segments, the payload rate in MB/min is multiplied by `Δt/60`. The model allows this generic acquisition during eclipse. Optical target illumination and pointing would require additional rules. Ground contact occurs in the synthetic phase interval `[0.78, 0.96)` each orbit. The radio sends at most its rate in MB/min times `Δt/60`, capped by available data including acquisition for that segment. An actual link needs a ground station, orbital state, elevation mask, pointing and an RF link budget. The game models neither storage saturation nor protocol overhead. At mission end `produced = transmitted + stored` within floating-point error.

A 32-bit seed schedules one 10-minute payload calibration and one full orbit of ground-station unavailability. Both events keep nominal load on. Calibration pauses acquisition, and station unavailability pauses downlink. With the same seed, altitude and duration, different hardware choices receive the same schedule. All event timings and scenarios are game parameters.

Histories retain full precision and sample at the end of reporting steps whose zero-based indices are multiples of five, plus the final step. They contain no timestamps. The UI charts use equal spacing by sample index and may downsample. The battery chart plots stored energy in Wh. The separate orbit timeline adds time-tagged positions in a Sun-fixed orbital plane and analytic eclipse and contact intervals. The current browser has no orbital timeline view. [Orbit model](ORBIT_MODEL.md)

## Success and scoring

The default scenario requires 250 MB returned, zero underpowered steps and valid engineering review. The other engine scenarios apply their own targets, budgets and deadlines. The score floors the sum of 70 × capped fraction of the data target, 20 × fraction of powered time, and 10 × fraction of unused budget. An invalid design returns zero, and a failed run has a score at most 99. The score evaluates this modeled game objective. Data volume alone gives no measure of scientific quality or real mission reliability. [Measured runs and known UI defects](QA_ACCEPTANCE.md)
