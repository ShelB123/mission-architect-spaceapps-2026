# Physics assumptions and limitations

Mission Architect models a single circular Earth orbit for educational trade studies. The UI allows 250–1,000 km and 2–12 revolutions. The engine's mathematical altitude guard accepts 160–40,000 km, and engineering review accepts 1–30 integer revolutions. Orbit shapes, launch and spacecraft operations are simplified.

## Circular orbit and eclipse

With altitude `h` above a spherical reference Earth, `r = R + h`. Equating centripetal acceleration and gravity gives `v = √(μ/r)` and `T = 2πr/v = 2π√(r³/μ)`. With radius and altitude in km and μ in km³/s², speed is in km/s and period is in seconds. The implementation uses `R = 6,371 km` and `μ = 398,600.4418 km³/s²`. The latter matches NGA's WGS 84 geocentric GM, in m³/s², divided by 10⁹. The Earth's mean radius and the WGS 84 equatorial radius are different conventions. The game uses the mean radius for the sphere.

The Sun is in the orbital plane (solar beta 0°). A point Sun at effectively infinite distance gives parallel rays and a cylindrical shadow. The half-angle from the antisolar direction is `α = asin(R/r)`. The eclipse fraction is `α/π` and the eclipse interval is centered at phase 0.5 with an exclusive end. This is the maximum eclipse for the assumed circular geometry. Tilt of the orbital plane to the Sun, penumbra, seasonal variation, drag, oblateness/J2 and attitude dynamics are outside this model.

An independent calculation uses NASA/JPL DE440 `μ = 398,600.435507 km³/s²` and the same mean radius. Fixtures compare with tolerances of 0.01 s in period, 0.00001 km/s in speed, and 0.00001 in eclipse fraction. These thresholds test the equations and units within the model. They describe no prediction error for an actual spacecraft.

| Altitude input | Radius (km) | Period (s) | Speed (km/s) | Eclipse fraction | Eclipse duration (min) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 450 km, game default | 6,821 | 5,606.3868 | 7.644426 | 0.383731 | 35.8557 |
| 550 km, TROPICS target-altitude example | 6,921 | 5,730.1271 | 7.588998 | 0.372244 | 35.5501 |

An altitude increase raises the circular period and decreases circular speed and the beta-zero eclipse fraction over this range. The TROPICS value is an input for comparison. Its inclination, constellation coverage, observations, and measured performance are outside this exercise. See [Sources](SOURCES.md) for the original mission and reference constants.

## Power and data

Solar output is constant while illuminated and zero in eclipse. Nominal load is the sum of the bus and selected components, applied continuously. The battery starts full and has an idealized usable capacity. For each step of at most 60 seconds, the update is `E_next = clamp(E + (P_solar − P_load) × Δt/3600, 0, capacity)`. Power is in W, duration in s, and energy in Wh. The model gives no production or downlink to an interval judged underpowered. The outage count reports affected model steps. It is neither a duration in minutes nor a count of independent hardware failures.

At 450 km an uninterrupted 63 W load uses about 37.65 Wh across the idealized maximum eclipse. The basic 60 W array averages about 37.0 W over that same orbit, with continuous 63 W load and ideal conversion. Upgrading to 150 W raises the ideal cycle-average generation to about 92.4 W. Cycle balance checks sustainable energy, and the battery must separately cover the eclipse deficit. The game omits charge/discharge efficiency, current limits, power conversion losses, thermal limits, aging, and reserve margins.

A payload produces at its selected MB/min rate during powered steps, including eclipse. This can represent generic acquisition. Optical illumination and pointing restrictions would require another model. Ground contact is the synthetic phase interval `[0.78, 0.96)` on each revolution. Within powered contact steps, new data is added to the backlog before the radio sends up to `min(backlog, rate × Δt/60)`. A real link needs a ground station, orbital state, elevation mask, antenna pointing, an RF link budget and net throughput. There is no storage cap, scene model, weather effect, latency or protocol overhead. An exact end-of-run identity is `produced = transmitted + stored`, with the displayed stored history rounded to 0.01 MB.

The base engine samples contact and eclipse at step starts, so a step may straddle a boundary. Its last step uses the remaining time. Histories are sampled every five step indices and at the final step without timestamps. Charts show progression by sample index and may omit samples for long missions. The battery chart plots stored energy in Wh. Its baseline heading uses the word capacity.

## Success and applicability

The base objective requires 250 MB returned and no underpowered steps after passing engineering review. The score is the rounded sum of a science completion term (70%) and the fraction of powered steps (30%). It summarizes the model and can round to 100 without meeting the binary mission criteria. Useful scientific return in flight depends on data quality, coverage and the science objective in addition to volume. Launch and costs are game constraints. Use [the acceptance record](QA_ACCEPTANCE.md) for verified outcomes and the defects passed to their owners.
