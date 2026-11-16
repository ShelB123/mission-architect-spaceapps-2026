# Candidata web — prioridad actual

Objetivo: continuar el juego de navegador anterior al empaquetado Windows, conservando la última unificación y mejoras. No hay rediseño de interfaz, cambios a modelos ni nuevos cálculos físicos en este incremento.

## Integración

- Base origin/main 9232027, idéntica al cockpit 627e4ca.
- Merge con historia de claude/mission-architect-orbital-physics-kl81qt (1dde820): cuatro archivos, extensión opt-in y pruebas. Mantiene las opciones predeterminadas.
- Merge con historia de feature/cloudflare-auto-deploy (08d2631): workflow web del compañero. Solo despliega main tras build/tests/audit; los pushes/PRs de integración no publican producción. Se habilitan checks para integration/**.
- Se recuperan las plantillas de Issues y la captura de documentación de la distribución anterior. No se incluyen Electron, host desktop, empaquetadores ni tests/CI de escritorio.
- Backup pre-web-priority-20261115 conserva 8fcdbcb. Windows, sus commits, etiqueta y descarga siguen disponibles como historial.

## Arquitectura y entrega

React/TypeScript/Vite y Three.js/R3F. npm run build genera dist para un hosting estático; los recursos usan BASE_URL. No hay dependencia de APIs de escritorio. La web y los modelos permanecen como antes. Se sube el contenido de dist y se valida la configuración base si se usa subruta. Cloudflare requiere los secretos ya descritos por su workflow, sin modificar permisos ni valores desde esta tarea. No se afirma que el sitio remoto ya esté ejecutando esta candidata: depende de integrar el PR y publicar main.

## Traspaso de modelos

El responsable de 3D puede cambiar geometría/materiales en src/visualization y sus recursos públicos desde una rama propia. Conservar IDs, contratos y callbacks; comprobar selección, inspección, ambas cámaras, context loss y fallback. No usar geometría para calcular masa/energía ni modificar motores para ajustar una animación.

## Validación

Se ejecutan las pruebas de la candidata, build web y auditoría antes de publicar su etiqueta. El CI verifica además una instalación limpia. La comprobación visual local se intenta en Brave; si el control del navegador no está disponible se deja explícito y no se presenta como prueba realizada.

### Resultado verificado
- npm test -- --maxWorkers=1: 266 pruebas aprobadas en 19 archivos. Son las 277 de Windows menos 11 pruebas exclusivas del host de escritorio; no se eliminaron pruebas de juego.
- npm run build: aprobado; aviso conocido de chunk gráfico grande. npm audit: 0 vulnerabilidades reportadas. git diff --check: aprobado.
- Comparación con integration/windows-rc-20261115 en src/App.tsx, src/ui, src/visualization, src/engine, src/types/contracts.ts y public: sin diferencias. Se conservan las funciones y mejoras del juego.
- Se sirvió el build estático localmente para probarlo en Brave. El control integrado no estuvo disponible y el control nativo rechazó usar Brave por falta de autorización. La comprobación visual en esta sesión queda pendiente; no se atribuye una captura anterior a este recorrido.
- El sitio remoto no se desplegó desde esta tarea; se entrega la candidata y su dist para revisión del integrador.
