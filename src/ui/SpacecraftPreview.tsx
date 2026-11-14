import { Component, Suspense, lazy, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { components } from "../data/catalog";

/** App-side bridge contract. The bridge converts IDs to Fable's visual model. */
export interface SpacecraftInspectionProps {
  readonly selectedComponentIds: readonly string[];
  readonly onInspectComponent?: (componentId: string) => void;
}
export type SpacecraftInspectionLoader = () => Promise<{
  default: ComponentType<SpacecraftInspectionProps>;
}>;

class PreviewBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Application-owned host. No scene, WebGL context, visual catalog or physics. */
export function SpacecraftPreview({ selectedComponentIds, loadViewer }: {
  readonly selectedComponentIds: readonly string[];
  readonly loadViewer?: SpacecraftInspectionLoader;
}) {
  const [enabled, setEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const selection = useMemo(() => Object.freeze([...selectedComponentIds]), [selectedComponentIds]);
  // A fresh lazy wrapper on explicit reopen lets the loader retry after failure.
  const Viewer = useMemo(() => {
    void attempt;
    return loadViewer ? lazy(loadViewer) : null;
  }, [loadViewer, attempt]);
  const inspected = selection.includes(inspectedId ?? "")
    ? components.find((component) => component.id === inspectedId) : undefined;

  return (
    <section className="review-box" aria-label="Spacecraft preview">
      <h3>Spacecraft inspection</h3>
      <ul aria-label="Selected spacecraft components">
        {selection.map((id, index) => <li key={`${id}:${index}`}>
          {components.find((component) => component.id === id)?.name ?? `Unknown component: ${id}`}
        </li>)}
      </ul>
      {loadViewer ? <button type="button" className="ghost" aria-expanded={enabled} onClick={() => {
        if (!enabled) setAttempt((current) => current + 1);
        setEnabled((current) => !current);
      }}>{enabled ? "Hide 3D preview" : "Show 3D preview"}</button>
        : <p>3D preview is not available. You can continue designing with the component cards.</p>}
      {enabled && Viewer && <PreviewBoundary key={attempt} fallback={
        <p role="status">The 3D preview could not load. Your design is still available. Hide and reopen the preview to retry.</p>
      }>
        <Suspense fallback={<p role="status">Loading spacecraft preview…</p>}>
          <Viewer selectedComponentIds={selection} onInspectComponent={(id) => {
            if (selection.includes(id)) setInspectedId(id);
          }} />
        </Suspense>
      </PreviewBoundary>}
      {inspected && <p role="status">Inspecting: {inspected.name}</p>}
    </section>
  );
}
