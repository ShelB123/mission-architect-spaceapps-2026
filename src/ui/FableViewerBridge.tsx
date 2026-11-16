import { useLanguage } from "../i18n/Language";
import { useMemo } from "react";
import { components } from "../data/catalog";
import SpacecraftViewer from "../visualization/SpacecraftViewer";
import { buildSpacecraftVisualModel } from "../visualization/buildSpacecraftVisualModel";
import { visualCatalog } from "../visualization/catalog";
import type { SpacecraftInspectionProps } from "./SpacecraftPreview";

/**
 * Wiring from docs/HANDOFF_3D.md: converts the selected component IDs into the
 * presentation model and hands it to the viewer. No renderer, physics or
 * mission state lives here.
 */
export default function FableViewerBridge({
  selectedComponentIds,
  onInspectComponent,
}: SpacecraftInspectionProps) {
  const { t } = useLanguage();
  const model = useMemo(
    () => buildSpacecraftVisualModel(selectedComponentIds, visualCatalog, components),
    [selectedComponentIds],
  );
  return <SpacecraftViewer translate={t} model={model} onInspectComponent={onInspectComponent} />;
}
