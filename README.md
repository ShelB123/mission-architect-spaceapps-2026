# Mission Architect

**Versión actual: 0.2.1-web.1 — juego de navegador.** Proyecto para NASA Space Apps Challenge 2026, reto 13: Space Mission Design Game. Diseña un satélite de observación terrestre, gestiona recursos y opera una misión reproducible.

## Estado actual y publicación

La línea de trabajo actual es **integration/web-rc-20261115**. Mantiene la interfaz, jugabilidad, modelos, texturas y cámaras anteriores al empaquetado Windows, junto con la unificación y las mejoras compatibles. No requiere Electron ni un ejecutable.

- [Candidata web y archivo estático para publicar](https://github.com/ShelB123/mission-architect-spaceapps-2026/releases/tag/v0.2.1-web.1).
- El workflow de la rama de tu compañero está integrado: publica el build probado de main en Cloudflare Pages, proyecto mission-architect; destino configurado: https://juego.lycanpro.com . La versión desplegada depende de main y de los secretos de Cloudflare. Esta candidata no actualiza producción hasta ser integrada.
- La rama integration/windows-rc-20261115 y [v0.2.0-rc.1](https://github.com/ShelB123/mission-architect-spaceapps-2026/releases/tag/v0.2.0-rc.1) se conservan como **historial de una distribución opcional**. Windows ya no es la candidata actual. No se borró ningún trabajo.

## Jugar o desarrollar localmente

Usa Node.js 22.23.4 (.nvmrc), npm 12.2.2 y Git. Visual Studio Code es opcional.

~~~bash
git clone https://github.com/ShelB123/mission-architect-spaceapps-2026.git
cd mission-architect-spaceapps-2026
git switch integration/web-rc-20261115
npm ci
npm run dev
~~~

Abre la dirección indicada por Vite en **Brave**. No abras index.html directamente desde el disco. Para comprobar el resultado de producción:

~~~bash
npm test -- --maxWorkers=1
npm run build
npm run preview
~~~

La compilación genera dist/ con HTML, JS, CSS y texturas locales. Publica **el contenido de dist/** en tu hosting estático; index.html debe estar en la raíz del sitio. Para una subcarpeta usa npm run build -- --base=/nombre/ y prueba las rutas. No requiere backend ni WebAssembly. La versión web funciona en navegadores compatibles; WebGL 2 permite las vistas 3D y hay alternativa 2D cuando no está disponible. No hay una medición de requisitos mínimos o FPS para todos los dispositivos.

## Funciones conservadas

- Cuatro escenarios con objetivos, presupuestos y plazos; flujo misión → diseño → revisión → operaciones → resultados.
- Construcción con cámara, radio, batería y paneles; masa, coste y potencia calculados por los motores.
- Inspección de satélite procedural 3D y esquema, cámaras Seguir satélite y Cámara a bordo, órbita 2D. Tierra Blue Marble, Luna LROC y explorador de ISS y otros objetos.
- Semilla reproducible, eventos de calibración y estación no disponible, órdenes de cámara, pausas del modo comandante y comparación calculada de decisiones.
- Riverwatch, diagnóstico al terminar, comparación entre intentos, español/inglés, ayuda opcional y recuperación de 3D.
- Extensiones orbitales opcionales de la rama 1dde820: beta, velocidad, cuentas regresivas y notas de validez. El jugador sigue usando los valores predeterminados anteriores; no se añadieron controles ni se cambió la física para ajustar gráficos.

![Operaciones y comparación de decisiones en Brave](docs/images/gameplay-brave.jpg)

Captura real de una sesión anterior en Brave con la misma interfaz de operaciones.

## Estructura y trabajo en equipo

| Ruta | Responsabilidad |
|---|---|
| src/engine | Física, recursos y simulación puras |
| src/types/contracts.ts | Contratos compartidos; coordinar cambios con integración |
| src/data/catalog.ts | Componentes sintéticos y lanzadores |
| src/App.tsx y src/ui | Flujo, telemetría, decisiones e interfaz |
| src/visualization | Geometría, escenas, texturas y cámaras |
| src/i18n | Español/inglés |
| public/textures | Recursos NASA y créditos locales |
| tests | Motores, aceptación, interfaz y visualización |
| .github/workflows/ci.yml | Pruebas, build y publicación exclusiva de main |

Para mejorar los modelos 3D, parte de esta candidata web y trabaja en una rama propia. Mantén IDs, interfaces de presentación, callbacks de inspección y fallback 2D. La geometría no calcula recursos ni cambia el estado de la misión. Coordina App, contratos y dependencias con integración según [AGENTS.md](AGENTS.md).

~~~bash
git fetch origin
git switch integration/web-rc-20261115
git switch -c feature/mi-mejora
# modificar y comprobar
npm test -- --maxWorkers=1
npm run build
git add ruta/de/los/archivos
git commit -m "fix: describir problema y mejora"
git push -u origin feature/mi-mejora
~~~

Abre un Pull Request hacia la candidata web mientras se unifica; main se actualiza mediante revisión del integrador. Cada commit conserva los anteriores. Evita force push, reset destructivo o borrar ramas. No subas node_modules, dist ni ZIP al historial. [Reportar fallos o ideas](https://github.com/ShelB123/mission-architect-spaceapps-2026/issues/new/choose): indica versión, navegador, escenario, semilla, piezas, órdenes y pasos.

## Registro de versiones y límites

Consulta [CHANGELOG](CHANGELOG.md) y [decisión de prioridad web y validación](docs/WEB_CANDIDATE.md). La candidata actual reúne main 9232027 / cockpit 627e4ca, la extensión orbital 1dde820 y el workflow web 08d2631. La experiencia de juego no se rediseñó en este cambio de orientación.

Los valores de hardware, créditos, contactos y eventos son sintéticos. Órbita circular y recursos idealizados; sin colisiones, maniobras, seguimiento real de ISS/basura, análisis real de inundaciones ni calidad científica medida. La cámara a bordo es una perspectiva visual y no un sensor óptico validado. No hay guardado persistente de partidas, multijugador ni backend. Las preferencias de idioma sí se conservan en localStorage. No se ha certificado diversión/aprendizaje con jugadores.

[Reto oficial](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/) · [Fuentes](docs/SOURCES.md) · [Supuestos físicos](docs/PHYSICS_ASSUMPTIONS.md) · [Modelo orbital](docs/ORBIT_MODEL.md) · [Créditos NASA](public/textures/CREDITS.md)

El equipo usa ChatGPT, Claude y Codex como apoyo de desarrollo; las decisiones, revisión científica y pruebas corresponden al equipo.
