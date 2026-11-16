# Mission Architect 0.2.0-rc.1 — Windows x64 portable

Candidata de entrega para que el equipo pruebe el juego completo, basada en main 9232027 (idéntico a nuestra rama 627e4ca), con la ampliación orbital opcional 1dde820 integrada. Ramas e historial preservados; main no se reemplaza.

## Descargar y ejecutar
Descarga Mission-Architect-0.2.0-rc.1-Windows-x64.zip, extrae TODO el contenido y abre Mission Architect.exe. No requiere Node, npm ni servidor. Mantén las DLL y carpetas junto al exe. El archivo .sha256 permite comprobar la descarga. Sin firma digital ni instalación.

## Conservado
Cuatro escenarios, diseño y modelo procedural de satélite, español/inglés, presupuestos y energía, eventos deterministas, cámara de seguimiento y a bordo, órbita 2D, Tierra/Luna con texturas NASA, explorador espacial, Riverwatch, decisiones operativas y evaluación. Los modelos visuales no cambian el motor.

## Cambios de distribución
Host Electron aislado, protocolo local restringido, runtime y recursos incluidos, ZIP con inventario y hash, scripts reproducibles, CI Windows, README y plantillas de Issues. La versión web sigue compilando sin Electron en el frontend.

## Pruebas y límite importante
277 tests aprobados; build aprobado; npm audit sin vulnerabilidades al preparar RC. El ZIP se verifica como Windows x64, incluye el entrypoint y 12 recursos de producción con hashes. Se observó el inicio de la ventana nativa en Windows 10 x64. **La revisión visual completa de cámaras, modelos y una misión en el exe sigue pendiente: el control del PC no autorizó esta aplicación.** La validación previa en Brave no reemplaza esa prueba. Publicada como prerelease para pruebas del equipo, no como versión final certificada.

No se han probado VM limpia, Windows 11, otras GPU ni rendimiento mínimo. Sin guardado de partidas, autoactualización, multijugador, maniobras o colisiones reales. Valores de componentes/eventos sintéticos; física idealizada. Ver docs/WINDOWS_QA.md y docs/VERSION_COMPARISON.md.

## Desarrollo
Código consolidado y README: https://github.com/ShelB123/mission-architect-spaceapps-2026/tree/integration/windows-rc-20261115

Clonar, cambiar a integration/windows-rc-20261115 (o etiqueta v0.2.0-rc.1), instalar Node compatible y npm 12.2.2, ejecutar npm ci. Para web: npm run dev. Para escritorio: npm run build y npm run desktop:dev. Para distribuir: npm run package:win y npm run verify:package -- release/Mission-Architect-0.2.0-rc.1-Windows-x64.zip.

Reportar fallos con versión, Windows/GPU, escenario, semilla, componentes y pasos en https://github.com/ShelB123/mission-architect-spaceapps-2026/issues/new/choose .
