# Trabajo e integración del equipo de seis

Estado: instrucciones para la siguiente iteración; no evidencia de que el visor ya exista.
Consultar primero AGENTS.md, PROJECT_SPEC.md, ARCHITECTURE.md y contracts.ts.

## Base de trabajo y ramas

A la fecha de revisión, main solo tiene README.md. El código está en feature/initial-game-scaffold, commit 1092772980cb2ff526432e97037da5e23ba42bbc, PR #1 en borrador.

Este cambio de documentación vive en feature/module-1-3d-architecture y se propone contra feature/initial-game-scaffold para que el diff muestre solo arquitectura. No fusionar el PR #1 automáticamente por un build verde: falta registrar una partida completa.

Secuencia: revisión de documentos → incorporar esta propuesta a la rama MVP con CI verde → validar #1 y partida → incorporar #1 a main mediante PR → crear las ramas de implementación desde ese main actualizado. Si #1 entra primero, retargetear el PR documental a main y revisar de nuevo el diff/CI. No crear ramas de implementación desde el main vacío ni modificar ramas ajenas.

Ramas sugeridas después de fijar la base: feature/m2-orbit-validation, feature/m3-resource-validation, feature/m4-spacecraft-viewer, feature/m5-mission-regression y feature/m6-acceptance. El integrador usará ramas separadas para reparar estado UI, dependencias y cableado.

## Propiedad de archivos

| Integrante | Propiedad exclusiva en esta iteración | Entrega | Fuera de su alcance |
|---|---|---|---|
| 1: integrador | AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md, docs/TEAM_INTEGRATION.md, docs/MODULE_1_PROMPT.md, docs/ARCHITECTURE_REVIEW.md; src/App.tsx, src/styles.css, src/types/contracts.ts, src/data/catalog.ts, package.json, package-lock.json, configuraciones y CI | Arquitectura, revisión de PRs, dependencias y conexión posterior | No implementar renderer ni reescribir motores |
| 2: órbita | src/engine/orbit.ts, tests/orbit.test.ts | Validación de unidades, límites y supuestos existentes | Sin mallas, cámara, App ni contratos |
| 3: recursos | src/engine/resources.ts, tests/resources.test.ts | Validación de selección, balances y restricciones | No editar catálogo físico, geometría o contratos |
| 4: UI/3D | src/visualization/**, tests/visualization.test.ts | Adaptador puro, catálogo visual y visor aislado | Sin cambios de App, CSS global, package.json, lockfile o motores |
| 5: misión | src/engine/game.ts, tests/game.test.ts | Regresión determinista y explicación de limitaciones temporales | Sin simulación en requestAnimationFrame ni nuevos contratos |
| 6: QA/investigación | docs/SOURCES.md, docs/PHYSICS_ASSUMPTIONS.md, README.md, docs/QA_3D.md, tests/acceptance/** | Casos independientes, recorrido de demo y procedencia | No reescribir docs de arquitectura ni corregir código de otros |

Un propietario no debe añadir modificaciones oportunistas a otro subsistema. Una propuesta cruzada se describe en el PR con motivo, archivo y firma; el propietario la aplica o acuerda una cesión puntual registrada. No hay autorización general para modificar archivos compartidos.

La tabla conserva las seis especialidades existentes. Integrante 4 asume el visor como extensión de UI. Los archivos de arquitectura pasan al integrador para este encargo; QA conserva sus documentos científicos y de aceptación.

## Instrucciones listas para los otros cinco integrantes

### Integrante 2 — órbita

Lee orbit.ts, sus tests y PHYSICS_ASSUMPTIONS.md en la base acordada. Revisa período, velocidad, km/s, dominio de altitud, eclipse beta cero y ventanas ficticias. Propón pruebas de valores no finitos y fronteras de fase, incluyendo el intervalo final exclusivo. No cambies fórmulas para adaptar un dibujo. El visor inicial no necesita posiciones, inclinación, efemérides ni una nueva API. Si identificas un error físico, presenta evidencia y corrección en un PR propio separado del trabajo visual. Entrega comandos/resultados y condiciones de validez.

### Integrante 3 — recursos

Lee resources.ts, catalog.ts y contracts.ts. Conserva getSelectedComponents/evaluateDesign. Verifica cuatro categorías, ID desconocido, duplicados, límites de masa y presupuesto, duración entera y valores de la misión por defecto. El bus fijo se suma una sola vez aunque haya varias mallas. La geometría no determina masa, potencia o capacidad. Propón cambios del catálogo al integrador, no los apliques. Entrega pruebas que distingan resultados correctos de casos inválidos sin ocultar errores mediante valores por defecto.

### Integrante 4 — UI y visor

Implementa el contrato de presentación descrito en ARCHITECTURE.md bajo src/visualization. Primero adaptador y pruebas, luego escena procedural y fallback. Respeta los ocho IDs actuales y conserva la separación física/visual. Exporta SpacecraftViewer como default para la carga diferida futura; exporta el adaptador por nombre. El evento onInspectComponent solo resalta información.

No edites App.tsx ni instales dependencias por tu cuenta en la rama compartida. Espera el commit de dependencias del integrador antes de ejecutar el renderer. Envía en tu PR las líneas de importación/props sugeridas para que el integrador haga el cableado. Usa CSS con prefijo ma-viewer y sin selectores globales. No importes engine/** ni generes hardware ficticio atribuido a NASA. Prueba falla de WebGL y pérdida de contexto; fallback textual y tarjetas accesibles. No informes integración funcional hasta que el panel esté conectado y validado.

### Integrante 5 — misión y gameplay

Conserva runMission(config, seed). Verifica reproducibilidad, conservación de datos (producidos = almacenados + transmitidos antes del redondeo de historiales), límites de batería, rechazo de diseños inválidos y último paso temporal parcial. Distingue pérdida de potencia por pasos de tiempo de un conteo de eventos continuos. La seed actual no introduce aleatoriedad.

Los historiales carecen de tiempos y se guardan cada cinco pasos, más el último; no venderlos como telemetría de un segundo ni interpolarlos para inferir nuevas condiciones físicas. No agregar un loop dependiente del FPS. Identifica cualquier mejora de scoring/física en un PR separado con regresiones; no es requisito del visor.

### Integrante 6 — QA, ciencia y demo

Crea docs/QA_3D.md con casos, resultados reales y pendientes. Recorre briefing → design → review → operations → debrief, configuración inválida, cambio de componentes, lanzamiento y reset. Reproduce los defectos de App registrados en ARCHITECTURE_REVIEW.md y verifica su corrección cuando exista.

Antes del visor, registra un baseline de configuraciones y resultados. Después, prueba esos mismos casos con 3D activo/desactivado y tras rotar/zoom/resaltar; deben coincidir. Prueba sin WebGL, importación fallida, context loss, teclado, resize, StrictMode y desmontajes repetidos. Verifica rótulos de geometría/hardware sintéticos. Registra fuente/licencia de cualquier asset futuro; el primer visor no necesita assets. No marques un caso aprobado que solo se leyó en código. Herramientas de pruebas nuevas se proponen al integrador.

## Dependencias y orden de PRs

1. Documentación del integrante 1, sin src ni paquetes.
2. Corrección separada por el integrador de resultados obsoletos y temporizador; QA comprueba el recorrido.
3. Un único PR del integrador incorpora las versiones compatibles y genera lockfile auténtico. No inventar package-lock.json. Tras ello CI debe usar npm ci.
4. Integrante 4 implementa adaptador y visor sin tocar archivos compartidos; integra la base de dependencias por merge/rebase normal, nunca force-push a ramas de otros.
5. Integrador conecta el componente con carga diferida/fallback y conserva controles actuales; QA ejecuta aceptación.
6. Mejoras de 2/3/5 se integran individualmente, con resultados de referencia revisados; no son dependencia técnica de la primera vista 3D.

Mientras no exista lockfile, el comando de instalación vigente es npm install. El workflow actual ejecuta pushes en feature/**, pero eventos pull_request solo con destino main. Por ello el PR documental apilado depende de la ejecución por push de su SHA; confirmar que el workflow realmente corre.

## Criterios de integración y rollback

- PR pequeño, objetivo concreto, archivos de su propietario, base/head SHA y dependencias explícitos.
- No cambios silenciosos de contratos, fórmulas, catálogo, datos ni valores de pruebas para forzar éxito.
- Ejecutar npm run build y npm test. Distinguir pruebas locales de CI, inspección estática y recorrido manual.
- Verificar el resultado de CI del último head y de la combinación con la base vigente. Un verde de un SHA anterior no valida cambios nuevos.
- Validar diffs de lockfile, consola del navegador y comportamiento sin visor; QA aporta evidencia manual.
- Contratos compartidos: propuesta, revisión del integrador y migración de consumidores en un PR pequeño; no needed for this increment.
- Merge mediante PR cuando se cumplan las condiciones. Sin push directo a main ni merge automático por existencia del cargo de integrador.
- Si la integración falla, desactivar/mantener optativo el visor o revertir su PR. No tocar motores para ocultar un fallo visual.
- main figuraba sin protección en la consulta de ramas. Solicitar al administrador protección y checks obligatorios es una recomendación pendiente, no una configuración aplicada.

## Plantilla de entrega de cada PR

Objetivo y comportamiento; archivos modificados; contratos afectados o "ninguno"; datos sintéticos/reales y fuentes; dependencias de PRs; comandos de build/test y resultado; casos manuales y entorno; limitaciones conocidas; cómo revertir. Adjuntar evidencia verificable. No atribuir una funcionalidad al producto si solo existe una propuesta, maqueta o componente desconectado.
