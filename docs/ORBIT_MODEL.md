# Módulo 2 — física orbital: validación, diseño e interfaz temporal

Estado: implementado en `src/engine/orbit.ts` y `tests/orbit.test.ts`. La interfaz temporal existe y está probada, pero **ninguna vista la consume todavía**: el juego no muestra aún una órbita animada. `contracts.ts`, `game.ts`, `resources.ts`, `App.tsx` y el visor 3D no cambian.

Complementa a [PHYSICS_ASSUMPTIONS.md](PHYSICS_ASSUMPTIONS.md) (propiedad de QA), que sigue siendo la referencia general.

## 1. Inspección (realizada sobre main en 36952d2)

| Elemento | Resultado |
|---|---|
| Período `T = 2π√(r³/μ)` | Correcto. km y km³/s² → s. |
| Velocidad circular `v = √(μ/r)` | Correcta. km/s. Cumple `v·T = 2πr` y `v²r = μ` a 1e-12. |
| Fracción de eclipse `f = asin(R/r)/π` | Correcta para sombra cilíndrica con el Sol en el plano orbital (β = 0). Es el eclipse **máximo** de una órbita circular a esa altitud. |
| Ventana de eclipse | Centrada en fase 0,5, intervalo `[0,5 − f/2, 0,5 + f/2)`. La fase 0 es por tanto el punto subsolar. |
| Contacto con tierra | Ventana ficticia `[0,78, 0,96)`. No es visibilidad. |

Defectos y carencias encontrados:

1. `isInEclipse` y `hasGroundContact` devolvían `false` ("iluminado", "sin contacto") ante `NaN`/`Infinity`, ocultando errores aguas arriba. **Corregido**: lanzan `RangeError`; también si la fracción de eclipse está fuera de `[0, 0,5]`.
2. Las pruebas solo comprobaban rangos plausibles; no había valores de referencia propios, fronteras de fase, periodicidad ni entradas no finitas. **Añadido.**
3. No existía salida con tiempo, posición e iluminación (lo confirma PROJECT_SPEC: "MissionResult has no time-tagged state trajectory"). **Añadido** en la sección 4.
4. Los límites 0,78/0,96 están duplicados como literales en `game.ts`. Ahora `orbit.ts` exporta `GROUND_CONTACT_START_FRACTION` y `GROUND_CONTACT_END_FRACTION`; que `game.ts` los importe queda **propuesto** al integrante 5, no aplicado.
5. El dominio aceptado (160–40 000 km) excede LEO y excede lo que el modelo representa bien (ver sección 3). No se modifica porque pruebas y documentos de otros integrantes lo citan; la UI ya limita a 250–1 000 km.

Las fórmulas no se han cambiado. Los resultados de `computeOrbitProfile` y de `runMission` son idénticos a los de main.

## 2. Valores de referencia

Calculados fuera del motor (Python, doble precisión) con las mismas expresiones cerradas, `R = 6 371 km` y `μ = 398 600,4418 km³/s²`. Comprueban ecuaciones y unidades; no son mediciones de ninguna nave.

| Altitud (km) | Período (s) | Velocidad (km/s) | Fracción de eclipse | Eclipse (min) |
|---:|---:|---:|---:|---:|
| 160 | 5 252,6747 | 7,812302 | 0,429397 | 37,5913 |
| 400 | 5 544,8551 | 7,672599 | 0,390041 | 36,0454 |
| 1 000 | 6 297,9701 | 7,353696 | 0,332259 | 34,8760 |
| 40 000 | 99 375,808 | 2,931876 | 0,043872 | 72,6635 |

Comprobación adicional de unidades: con `r = 42 164,17 km` el período resulta 86 164,09 s, un día sidéreo (valor de libro de texto para la órbita geoestacionaria). Las referencias a 450 y 550 km con el GM de DE440 siguen en las pruebas de aceptación de QA.

## 3. Supuestos y condiciones de validez

| Supuesto | Consecuencia | Cuándo deja de ser razonable |
|---|---|---|
| Dos cuerpos, Tierra esférica de radio medio | Período y velocidad constantes | J2 y arrastre desplazan el período real; el arrastre domina por debajo de ~300 km. No se modela decaimiento. |
| Órbita circular | Radio y velocidad constantes | Cualquier excentricidad. |
| β = 0 (Sol en el plano orbital) | Eclipse máximo en cada revolución; conservador para energía | En general `f(β) = acos(√(r² − R²)/(r·cos β))/π`; el eclipse desaparece si `|β| > asin(R/r)` (≈ 69° a 450 km). El modelo no puede representar órbitas sin eclipse ni la variación estacional. |
| Sombra cilíndrica, Sol puntual en el infinito | Transición instantánea luz/sombra | Se ignora la penumbra (segundos en LEO) y la refracción atmosférica. |
| Dirección solar fija durante la misión | Marco "Sol-fijo" inmóvil | La Tierra avanza ~1°/día alrededor del Sol: despreciable para 2–12 revoluciones LEO (< 1 día); no para decenas de revoluciones a gran altitud. |
| Misión comienza en el punto subsolar | `t = 0` ↔ fase 0 | Convención del juego, no una condición de lanzamiento. |
| Sin inclinación, nodo ni rotación terrestre | Posición solo en el plano orbital | No se puede derivar traza terrestre, latitud/longitud ni visibilidad de estaciones. |
| Contacto `[0,78, 0,96)` | Parámetro de juego | Siempre: no procede de geometría alguna. |

Conclusión: es una idealización educativa de forma cerrada. No hay integración numérica, efemérides ni perturbaciones; no debe presentarse como simulación de alta fidelidad ni usarse para planificación.

## 4. Interfaz temporal

Tipos locales a `src/engine/orbit.ts` (no se añaden a `contracts.ts`):

```ts
orbitStateAt(profile: OrbitProfile, timeSeconds: number): OrbitStateSample
buildOrbitTimeline(profile: OrbitProfile, durationOrbits: number, samplesPerOrbit = 120): OrbitTimeline
```

`OrbitStateSample`

| Campo | Unidad | Significado |
|---|---|---|
| `timeSeconds` | s | Tiempo de misión transcurrido, ≥ 0. |
| `orbitIndex` | — | Revoluciones completadas (base cero). |
| `orbitFraction` | — | Fracción de la revolución en `[0, 1)`; 0 = subsolar, 0,5 = centro del eclipse. |
| `sunAngleRad` | rad | `2π·orbitFraction`, ángulo Sol–Tierra–nave en el sentido del movimiento. |
| `positionKm` | km | `{x, y}` en el plano orbital, origen en el centro de la Tierra; +x hacia el Sol, +y sentido del movimiento en el punto subsolar. `x = r cos θ`, `y = r sin θ`. |
| `illumination` | — | `"sunlight"` \| `"eclipse"`, mediante `isInEclipse`. |
| `inGroundContact` | — | Ventana ficticia, mediante `hasGroundContact`. |

`OrbitTimeline` contiene `model` (tipo, fidelidad `"educational-idealization"`, marco y el aviso `ORBIT_MODEL_NOTICE`), una copia del `profile`, `earthRadiusKm` (radio de la esfera y del cilindro de sombra, eje −x), `durationSeconds`, `stepSeconds`, `samples` uniformes de 0 a la duración inclusive, y `eclipseIntervals` / `groundContactIntervals` como intervalos semiabiertos `[startSeconds, endSeconds)` por revolución.

Reglas de uso para la vista:

- Un único reloj: la vista elige un `timeSeconds` (deslizador o reproducción) y lee posición, iluminación y contacto del mismo estado, ya sea de `samples` o llamando a `orbitStateAt`. Así los tres indicadores no pueden desincronizarse.
- La velocidad de reproducción es estado de presentación. No ejecutar `runMission` ni integrar energía dentro de `requestAnimationFrame`.
- Para dibujar las fronteras luz/sombra usar los intervalos, que son exactos; una muestra que cae justo en una transición puede resolverse a cualquier lado por redondeo.
- Mostrar `ORBIT_MODEL_NOTICE` (o su traducción) junto a la vista. Dibujar la órbita como esquema en el plano; no inclinarla ni superponer continentes en rotación, porque sugeriría una traza terrestre que el modelo no tiene.
- La capa 3D sigue sin importar motores (AGENTS.md). El integrador calcula la línea de tiempo en `App` y la entrega como props, o un adaptador puro la convierte a tipos de presentación.

Coherencia con el motor de misión: `game.ts` usa `fase = (t mod T)/T`; `orbitStateAt` usa `t/T − ⌊t/T⌋` con un ajuste de 1e-12 revoluciones para que `t = k·T` devuelva `(k, 0)`. Las pruebas verifican que ambas convenciones dan la misma iluminación y contacto. La línea de tiempo no incluye batería, datos ni eventos de entrenamiento: `MissionResult` no tiene marcas de tiempo y no deben interpolarse sus historiales para alinearlos.

## 5. Alternativa más sencilla considerada

Bastaría con que la vista calculase `θ = 2π·t/T` por su cuenta. Se descarta porque duplicaría la convención de fase y la ventana de eclipse fuera del motor, lo que AGENTS.md prohíbe. La solución adoptada es la mínima que lo evita: dos funciones puras sin dependencias nuevas.

## 6. Riesgos y dependencias

- ARCHITECTURE.md exige un ADR antes de una animación temporal. Este módulo solo aporta datos; la decisión de mostrarlos corresponde al integrador (1) y a UI (4).
- El endurecimiento de `isInEclipse`/`hasGroundContact` lanza donde antes devolvía `false`. `game.ts` siempre pasa valores finitos; todas las pruebas del repositorio pasan sin cambios en otros archivos.
- Si el integrante 5 cambia la convención de fase o el inicio de misión, hay que actualizar ambos módulos a la vez.
- Pendiente de QA (6): enlazar este documento desde PHYSICS_ASSUMPTIONS.md si lo considera oportuno.

## 7. Pruebas de aceptación

`npm run build` y `npm test` (50 pruebas en `tests/orbit.test.ts`): valores de referencia, identidades de dos cuerpos, dominio y no finitos, fronteras inclusiva/exclusiva, periodicidad, coincidencia de `illumination` con la prueba geométrica `x < 0 ∧ |y| < R`, coherencia muestras–intervalos, determinismo y no mutación de la entrada.
