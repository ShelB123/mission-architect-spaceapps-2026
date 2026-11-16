# Comparación e integración de versiones

Snapshot inspeccionado el 15 de noviembre de 2026 (UTC−5). Se actualizó origin sin podar ramas ni etiquetas. Se revisaron 15 ramas remotas (más el alias origin/HEAD) y las tres ramas locales originales. GitHub no tenía Releases publicadas.

## Decisión
La rama de trabajo era feature/playable-mission-cockpit, 627e4ca. origin/main, 9232027, acababa de integrar su PR 13 y tiene exactamente el mismo árbol (git diff sin cambios). Es la base funcional más completa por sus capacidades, no por su fecha: conserva 3D, dos cámaras de vuelo, Tierra/Luna, explorador, ES/EN, cuatro escenarios, decisiones operativas reales, comparador y recuperación gráfica.

Se creó integration/windows-rc-20261115 desde 9232027 y backup/pre-windows-rc-20261115 en 627e4ca. Se integró con merge --no-ff la rama orbital 1dde820; commit de integración 10583ce. Solo cuatro archivos orbitales/documentales, sin conflictos. Sus 22 pruebas añadidas comprueban beta opcional, vectores de velocidad, cuentas regresivas y notas de validez. No hay nuevos controles de beta en la interfaz: el juego sigue usando beta cero y la ventana ficticia anterior. Los contratos compartidos no cambiaron.

| Rama remota | Commit inspeccionado | Comparación con la base |
|---|---|---|
| `claude/mission-architect-orbital-physics-kl81qt` | `1dde820` | Extensión orbital opcional pendiente; incorporada en la candidata |
| `feature/build-3d-dependencies` | `e9e43c5` | Ya integrada en la base |
| `feature/gameplay-seeded-scenarios` | `106df79` | Ya integrada en la base |
| `feature/initial-game-scaffold` | `1092772` | Ya integrada en la base |
| `feature/m4-spacecraft-viewer` | `924b198` | Ya integrada en la base |
| `feature/m6-acceptance` | `58e938a` | Ya integrada en la base |
| `feature/m6-release-qa` | `b16f045` | Ya integrada en la base |
| `feature/module-1-3d-architecture` | `65b162d` | Ya integrada en la base |
| `feature/playable-mission-cockpit` | `627e4ca` | Ya integrada en la base |
| `feature/resources-power-eclipse-integrity` | `41a1249` | Ya integrada en la base |
| `feature/ui-launch-safety` | `a237250` | Ya integrada en la base |
| `feature/ui-mission-scenarios` | `cc0132f` | Ya integrada en la base |
| `feature/ui-viewer-slot` | `819e5b8` | Ya integrada en la base |
| `feature/ui-viewer-wiring` | `9eb4181` | Ya integrada en la base |
| `main` | `9232027` | Ya integrada en la base |

## Qué aportaba cada etapa

- initial-game-scaffold: React/TS/Vite, catálogo sintético, motores y flujo completo inicial.
- module-1-3d-architecture: separación de cálculos y presentación, interfaces de visor y coordinación.
- gameplay-seeded-scenarios: cuatro escenarios verificables y eventos deterministas.
- resources-power-eclipse-integrity: diagnósticos de márgenes eléctricos y de comunicación y pruebas.
- m6-acceptance / m6-release-qa: referencias independientes, fuentes, pruebas y hallazgos de demo.
- ui-launch-safety / ui-mission-scenarios: cancelación segura, invalidación de resultados y escenarios visibles.
- build-3d-dependencies / m4-spacecraft-viewer: dependencias bloqueadas, modelos procedurales, inspección y fallback WebGL2.
- ui-viewer-slot / ui-viewer-wiring: carga aislada y conexión del visor; el wiring 9eb4181 era necesario para visualizarlo.
- playable-mission-cockpit: experiencia más completa, viewport, idiomas, reproducción/órdenes de cámara, cámaras 3D, explorador NASA, Riverwatch y reintento gráfico. 244 tests antes de esta integración.
- orbital 1dde820: APIs opcionales, no reemplazo del modelo predeterminado ni animaciones que inventen física.

## Rendimiento y estabilidad
No se inventaron rankings de FPS o benchmarks entre ramas. El bundle gráfico pesado sigue en carga diferida; Vite avisa de un chunk de aproximadamente 951 kB sin gzip. Electron aumenta el tamaño de descarga por incluir Chromium; evita depender de Node o de un servidor instalado. Se verifica el paquete exacto y el funcionamiento nativo antes de publicar. Todas las ramas de origen y commits siguen accesibles.

## Pendiente
Sin multiusuario, propulsión, maniobras, seguimiento real de ISS/basura, análisis de inundaciones o calidad científica medida. El incremento orbital es opt-in para futuros PRs. El integrador podrá revisar la candidata mediante PR; no se sustituye ni se fuerza main. El estado final de pruebas y escritorio se registra en WINDOWS_QA.md.
