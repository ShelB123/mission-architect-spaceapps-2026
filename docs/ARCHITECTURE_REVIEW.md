# Auditoría inicial y diseño técnico del módulo 1

Revisión de código al 14-11-2026. Base: 1092772980cb2ff526432e97037da5e23ba42bbc.
No se ha realizado una partida manual en esta revisión. Los defectos siguientes se identificaron por inspección de código; su reproducción UI queda indicada.

## Acceso y estado comprobados

- Repositorio accesible mediante GitHub con permiso push; rama predeterminada main.
- main en 23fbb8f43da7f620141da747fae1bab1dcc6a1af contiene solo README.md.
- El MVP está en feature/initial-game-scaffold y el PR #1 permanece abierto en borrador.
- Se leyeron AGENTS.md, PROJECT_SPEC.md, contracts.ts y todos los archivos del árbol MVP, incluidos motores, App, estilos, catálogo, pruebas y CI.
- Se intentó git clone local: falló la resolución DNS de github.com. Los archivos se obtuvieron por la API a un SHA fijo, no por un checkout Git local.
- No existía docs/ARCHITECTURE.md. Se crea uno sin reescribir la aplicación.
- CI existente para el SHA base: ejecución [43615646737](https://github.com/ShelB123/mission-architect-spaceapps-2026/actions/runs/43615646737), conclusión success. Es evidencia del MVP base, no del futuro visor.
- Los resultados de CI del PR documental se entregan en GitHub y en la respuesta de entrega para evitar modificar el SHA solo para registrar su propia ejecución.

## Implementado frente a faltante

| Área | Evidencia en código | Límite |
|---|---|---|
| Flujo de juego | Cinco fases en App.tsx | Operations es espera breve seguida de cálculo síncrono |
| Configuración | Ocho componentes/cuatro categorías, dos lanzadores, altitud y duración | Sin ensamblaje geométrico ni persistencia |
| Revisión | Masa, costo, cargas, generación, batería, categorías y duración | No modelo estructural/térmico ni validación CAD |
| Órbita | Perfil circular, eclipse idealizado | Sin propagación de posición o actitud |
| Misión | Energía/datos por pasos, puntuación, explicaciones e historiales | Sin tiempos por muestra; seed reservada, no aleatoriedad |
| Visualización | Ilustración CSS y gráficos SVG | No renderer 3D ni trayectorias |
| Pruebas | Tres archivos con cuatro casos cada uno | Sin pruebas de interacción UI/WebGL ni recorrido registrado aquí |
| Integración | Workflow build/test en Node 22 | Sin lockfile; main aún no contiene MVP |

## Hallazgos y acciones separadas

| ID / prioridad | Evidencia y consecuencia | Reproducción / corrección propuesta | Responsable |
|---|---|---|---|
| INT-01 / P0 | main no contiene código; ramificar desde allí impide desarrollar sobre el MVP | Mantener PR documental apilado y verificar #1 antes de promover la base | 1 |
| UI-01 / P0 antes de integrar 3D | selectComponent limpia result, pero setters de launcherId, altitudeKm y durationOrbits no; el stepper permite debrief si result existe | Simular, volver a Design por stepper, cambiar altitud/duración/lanzador y abrir Debrief: resultado previo. Unificar actualización e invalidación en PR propio | 1, verifica 6 |
| UI-02 / P0 antes de integrar 3D | setTimeout(simulate, 450) conserva el cierre previo y no se cancela; el stepper permite volver a Design durante Operations | Lanzar y navegar/modificar antes de 450 ms; puede aparecer resultado de configuración anterior. Bloquear cambios durante ejecución o cancelar/invalidar por token y snapshot | 1, verifica 6 |
| UI-03 / P1 | catch de simulate muestra error sin salir de operations | Inyectar fallo de runMission mediante prueba; retornar a Review con mensaje y opción de reintentar | 1, verifica 6 |
| CI-01 / P1 | No package-lock.json, rangos de versiones y npm install en CI | Resolver lockfile en PR de dependencias y pasar a npm ci; no editar a mano | 1 |
| API-01 / P1 | getSelectedComponents/launcher desconocido y altitud inválida lanzan; App evalúa en render sin recuperación | UI actual limita entradas, por lo que no es fallo demostrado por controles normales; incluir pruebas antes de importar/persistir configs | 1/2/3 |
| DATA-01 / P1 | Historial cada cinco pasos más final, sin tiempo; gráficos usan espaciado uniforme | No presentar como timeline precisa ni usar para replay 3D. Cambiar contrato solo en propuesta futura | 5/6 |
| TEST-01 / P1 | La prueba de batería usa <=, por lo que igualdad satisface "improves" | Elegir escenario donde la mejora ocurra y comprobar diseño válido; no debilitar aserciones para pasar | 5 |
| SCI-01 / P1 | No geometría/densidades/áreas/actitud en catálogo | No inferir física desde tamaño/rotación de mallas; rótulo sintético y metadatos separados | 4/6 |

El criterio de batería baja compara numéricamente Wh con W como heurística de una hora; la frase del código lo indica. No convertirlo en un margen universal de eclipse sin calcular duración y consumo. La discretización temporal y la puntuación educativa son aproximaciones declaradas, no probabilidades de misión real.

## Diseño técnico conciso

Objetivo: frontera visual de solo lectura. Arquitectura: MissionConfig/IDs → adaptador puro → modelo visual → renderer, en paralelo a los motores existentes. Interfaces y unidades en ARCHITECTURE.md.

Archivos de esta entrega: seis documentos (dos existentes, cuatro nuevos). Cambios en contratos, motores, catálogo físico, App y paquetes: ninguno. Dependencias nuevas: ninguna. Bibliotecas futuras propuestas: Three/Fiber 9 con React 19, verificadas por el integrador al instalarlas.

Algoritmo futuro: resolución determinista de IDs y validación de descriptores sintéticos, sin cálculo físico. Riesgos principales: propiedad compartida de App/documentos, versiones de paquetes, resultados antiguos, pérdida de WebGL y confusión entre geometría ilustrativa y datos reales. Solución sencilla: primitivas y un panel opcional.

Aceptación de esta entrega: diff limitado a los seis documentos, contratos/motores idénticos a la base, rutas y ocho IDs coincidentes, interfaces coherentes, build/tests del SHA propuesto verificados o bloqueo informado. Aceptación del visor: PROJECT_SPEC.md y ARCHITECTURE.md; aún pendiente.

Complejidad: baja-media para arquitectura; media para visor y resiliencia. Prioridad P0 para base/propiedad de archivos, P1 para visualización. Estimaciones por incremento en ARCHITECTURE.md.
