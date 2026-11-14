# Conexión del visor de Fable

Estado: el contenedor de aplicación está preparado. El renderer sigue siendo responsabilidad del PR #8; este cambio no modifica src/visualization/** ni afirma que el visor ya esté conectado.

## PRs y orden de integración

1. #6: resultados y temporizador; base main.
2. #7: escenarios; depende de #6.
3. #9: versiones y auditoría; depende de #6, independiente de #7.
4. PR del contenedor (feature/ui-viewer-slot): depende de #7. Validar también con las dependencias de #9.
5. #8 (Fable): actualizar su base con las dependencias de #9 y verificar su propio build/pruebas antes de fusionar.
6. Después de aceptar #8, crear un PR pequeño de cableado con los dos cambios siguientes.

Retargetear cada PR apilado a main cuando su dependencia ya esté integrada y verificar nuevamente el diff y CI. No fusionar ni hacer force-push automáticamente. Si se usa squash, revisar la base para no reintroducir commits ya integrados.

La interfaz consultada de #8 corresponde a ca15779db684485e3e12cf48c89760a6f10d54cc. Antes del cableado verificar su SHA actual, exportaciones y posibles cambios. Los nombres siguientes se comprobaron en ese commit; no son nombres inventados.

## Versiones para Fable

React/React DOM 19.3.1; three 0.187.0; @react-three/fiber 9.8.2; @types/three 0.187.0. Node 22.23.4 y npm 12.2.2 según #9. Utilizar el lockfile del integrador y npm ci. Ver docs/DEPENDENCY_AUDIT.md una vez integrado #9.

El conjunto se comunicó en la conversación de #8. La recepción/aceptación del responsable no se presume. No añadir Drei ni copiar otro lockfile sin revisar su necesidad.

## 1. Crear el puente en un archivo del integrador

Archivo futuro: src/ui/FableViewerBridge.tsx. No crear un renderer nuevo. Este puente solo convierte los IDs en el modelo de presentación usando el adaptador existente de Fable.

```tsx
import { useMemo } from "react";
import { components } from "../data/catalog";
import SpacecraftViewer from "../visualization/SpacecraftViewer";
import { buildSpacecraftVisualModel } from "../visualization/buildSpacecraftVisualModel";
import { visualCatalog } from "../visualization/catalog";
import type { SpacecraftInspectionProps } from "./SpacecraftPreview";

export default function FableViewerBridge({
  selectedComponentIds,
  onInspectComponent,
}: SpacecraftInspectionProps) {
  const model = useMemo(
    () => buildSpacecraftVisualModel(selectedComponentIds, visualCatalog, components),
    [selectedComponentIds],
  );
  return <SpacecraftViewer model={model} onInspectComponent={onInspectComponent} />;
}
```

## 2. Conectar una carga diferida estable en main.tsx

Mantener StrictMode y createRoot existentes. Añadir a nivel de módulo:

```tsx
const loadSpacecraftViewer = () => import("./ui/FableViewerBridge");
```

Sustituir únicamente `<App />` por:

```tsx
<App loadSpacecraftViewer={loadSpacecraftViewer} />
```

No importar SpacecraftViewer estáticamente en App. El contenedor inicia la descarga solo al pulsar "Show 3D preview"; el propio visor separa su escena en otro chunk. Sin loader, el juego y la lista textual continúan funcionando y la interfaz indica que el 3D no está disponible.

## Responsabilidades de la frontera

- SpacecraftPreview recibe una copia congelada de los IDs, no MissionConfig, MissionResult ni motores.
- El puente crea el modelo; errores del import, adaptador o render se contienen en el panel. Ocultar/reabrir permite reintentar el loader.
- Los eventos de inspección solo actualizan texto local; no seleccionan hardware ni ejecutan runMission.
- Fable conserva WebGL, escena, materiales, cámara, detección de soporte, pérdida/restauración de contexto y limpieza de sus recursos. El contenedor no crea un segundo contexto ni duplica su detector.
- Al ocultar o abandonar Design se desmonta el puente. Su limpieza debe liberar listeners/recursos.
- La lista accesible de componentes permanece aunque la carga falle. Los controles de diseño/revisión/operación son independientes.

## Verificación requerida al conectar el renderer real

```sh
npm ci
npm run build
npm test
npm run audit
git diff --check
```

Además: confirmar un chunk separado; completar las cinco fases con 3D activo e inactivo; comparar MissionResult completo para idéntica configuración/escenario/seed antes y después de girar, zoom e inspeccionar; intercambiar los ocho IDs; probar batería interna, importación fallida, WebGL no disponible, context loss, desmontajes repetidos, teclado y viewport móvil.

Los ocho tests del contenedor usan un puente explícitamente de prueba para aislar carga/error/inspección; no equivalen a la aceptación del renderer real. Los tests P0/P1 cubren invalidación y carreras del temporizador. Toda limitación del visor real debe quedar registrada antes del merge.

Observación comunicada a Fable: detectWebGLSupport del SHA revisado admite WebGL1 y no libera el contexto de prueba. Revisar su adecuación a Three fijado y limpieza antes de aprobar la aceptación de soporte/montajes repetidos. El integrador no modificó esa función.
