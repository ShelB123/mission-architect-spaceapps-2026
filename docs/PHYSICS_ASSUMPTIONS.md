# Physics assumptions and limitations

This is an **educational approximation**, not a flight-dynamics or mission-operations tool.

- Two-body Keplerian circular Earth orbit: T = 2π sqrt(r³/μ), with r = R_E + h.
- Earth parameters: mean spherical radius 6,371 km; μ = 398,600.4418 km³/s².
- Eclipse estimate assumes Sun lies in the orbital plane (beta angle 0°), spherical Earth and point-source sunlight. Max-eclipse fraction ≈ asin(R_E/r)/π. Ignores seasonal geometry, penumbra and perturbations.
- Eclipse is placed at the middle of each idealized orbital cycle. This is for phase visualization and is not a propagated Sun-spacecraft ephemeris.
- A notional communications window is placed at 78–96% of each orbit. This does **not** predict real ground-station visibility; no antenna link budget or horizon geometry.
- Energy is updated every minute: E_new = clamp(E + (P_solar - P_load) Δt / 3600, 0, E_capacity). Energy shortages count as outages rather than pretending loads can operate without power.
- Science data production and downlink use constant synthetic rates for the selected devices.
- No thermal model, radiation, pointing, storage-volume cap, launch dynamics, drag, J2, momentum control or fault protection.
- All component masses, prices, power values, data rates and launch capacities are fictional balanced game values, **not data from NASA**.
- Avoid interpreting the success score as a probability of real mission success.
