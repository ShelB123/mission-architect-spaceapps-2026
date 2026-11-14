/**
 * Spacecraft inspection viewer (read-only presentation layer).
 *
 * - Receives a SpacecraftVisualModel through props; computes no engineering value.
 * - Imports no engine and never touches MissionConfig. Inspecting a component
 *   only highlights it; equipping hardware stays with the existing cards.
 * - The WebGL scene is a separate lazy chunk, so Three.js is fetched only when
 *   the 3D view is actually shown. Every failure path (no WebGL, context loss,
 *   chunk or render error, 3D turned off) lands on SpacecraftFallback.
 */
import { Component, Suspense, lazy, useCallback, useEffect, useReducer, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import SpacecraftFallback, { SpacecraftIssues, SpacecraftPartsList } from "./SpacecraftFallback";
import type { FallbackReason } from "./SpacecraftFallback";
import { SYNTHETIC_GEOMETRY_NOTICE } from "./types";
import type { SpacecraftViewerProps } from "./types";
import "./spacecraft-viewer.css";

const SpacecraftScene = lazy(() => import("./SpacecraftScene"));

/* ---------- View state (pure, exported for tests) ---------- */

export type ViewerStatus = "checking" | "ready" | "unsupported" | "context-lost" | "error";

export interface ViewerState {
  readonly status: ViewerStatus;
  readonly enabled3d: boolean;
  readonly schematic: boolean;
  readonly localHighlightId: string | null;
  /** Incremented to remount the canvas after a failure. */
  readonly mountKey: number;
}

export type ViewerAction =
  | { readonly type: "webgl-detected"; readonly supported: boolean }
  | { readonly type: "context-lost" }
  | { readonly type: "context-restored" }
  | { readonly type: "render-error" }
  | { readonly type: "retry"; readonly supported: boolean }
  | { readonly type: "toggle-3d" }
  | { readonly type: "toggle-schematic" }
  | { readonly type: "inspect"; readonly componentId: string };

export const initialViewerState: ViewerState = Object.freeze({
  status: "checking",
  enabled3d: true,
  schematic: false,
  localHighlightId: null,
  mountKey: 0,
});

export function reduceViewerState(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case "webgl-detected":
      return state.status === "checking" ? { ...state, status: action.supported ? "ready" : "unsupported" } : state;
    case "context-lost":
      return state.status === "ready" ? { ...state, status: "context-lost" } : state;
    case "context-restored":
      return state.status === "context-lost" ? { ...state, status: "ready", mountKey: state.mountKey + 1 } : state;
    case "render-error":
      return { ...state, status: "error" };
    case "retry":
      return { ...state, status: action.supported ? "ready" : "unsupported", mountKey: state.mountKey + 1 };
    case "toggle-3d":
      return { ...state, enabled3d: !state.enabled3d };
    case "toggle-schematic":
      return { ...state, schematic: !state.schematic };
    case "inspect":
      return { ...state, localHighlightId: state.localHighlightId === action.componentId ? null : action.componentId };
    default:
      return state;
  }
}

/** Which fallback (if any) replaces the canvas for a given state. Null means "render WebGL". */
export function fallbackReasonFor(state: ViewerState): FallbackReason | null {
  if (!state.enabled3d) return "disabled";
  switch (state.status) {
    case "ready":
      return null;
    case "checking":
      return "loading";
    case "unsupported":
      return "unsupported";
    case "context-lost":
      return "context-lost";
    default:
      return "error";
  }
}

/** True only when a WebGL context can really be created. Safe without a DOM. */
export function detectWebGLSupport(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ---------- Camera commands shared with the scene ---------- */

export type CameraCommandKind = "rotate-left" | "rotate-right" | "rotate-up" | "rotate-down" | "zoom-in" | "zoom-out" | "reset";

export interface CameraCommand {
  readonly sequence: number;
  readonly kind: CameraCommandKind;
}

const KEY_COMMANDS: Readonly<Record<string, CameraCommandKind>> = {
  ArrowLeft: "rotate-left",
  ArrowRight: "rotate-right",
  ArrowUp: "rotate-up",
  ArrowDown: "rotate-down",
  "+": "zoom-in",
  "=": "zoom-in",
  "-": "zoom-out",
  _: "zoom-out",
  Home: "reset",
  "0": "reset",
};

const CAMERA_BUTTONS: readonly { readonly kind: CameraCommandKind; readonly label: string; readonly glyph: string }[] = [
  { kind: "rotate-left", label: "Rotate left", glyph: "←" },
  { kind: "rotate-right", label: "Rotate right", glyph: "→" },
  { kind: "rotate-up", label: "Rotate up", glyph: "↑" },
  { kind: "rotate-down", label: "Rotate down", glyph: "↓" },
  { kind: "zoom-in", label: "Zoom in", glyph: "+" },
  { kind: "zoom-out", label: "Zoom out", glyph: "−" },
  { kind: "reset", label: "Reset view", glyph: "⟲" },
];

/* ---------- Error boundary limited to the 3D panel ---------- */

interface BoundaryProps {
  readonly onError: () => void;
  readonly children: ReactNode;
}

class SceneErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ---------- Viewer ---------- */

export default function SpacecraftViewer({ model, highlightedComponentId, onInspectComponent, className }: SpacecraftViewerProps) {
  const [state, dispatch] = useReducer(reduceViewerState, initialViewerState);
  const [command, setCommand] = useState<CameraCommand>({ sequence: 0, kind: "reset" });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    dispatch({ type: "webgl-detected", supported: detectWebGLSupport() });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const highlightedId = highlightedComponentId ?? state.localHighlightId ?? undefined;
  // A highlight that no longer matches a drawn component (e.g. after a swap) is ignored.
  const activeHighlightId = model.components.some((component) => component.componentId === highlightedId) ? highlightedId : undefined;

  const inspect = useCallback((componentId: string) => {
    dispatch({ type: "inspect", componentId });
    onInspectComponent?.(componentId);
  }, [onInspectComponent]);

  const sendCommand = useCallback((kind: CameraCommandKind) => {
    setCommand((previous) => ({ sequence: previous.sequence + 1, kind }));
  }, []);

  const handleRenderError = useCallback(() => dispatch({ type: "render-error" }), []);
  const handleContextLost = useCallback(() => dispatch({ type: "context-lost" }), []);
  const handleContextRestored = useCallback(() => dispatch({ type: "context-restored" }), []);
  const retry = useCallback(() => dispatch({ type: "retry", supported: detectWebGLSupport() }), []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    const kind = KEY_COMMANDS[event.key];
    if (!kind) return;
    event.preventDefault();
    sendCommand(kind);
  };

  const fallbackReason = fallbackReasonFor(state);
  const showing3d = fallbackReason === null;
  const fallback = (reason: FallbackReason) => (
    <SpacecraftFallback
      model={model}
      reason={reason}
      highlightedComponentId={activeHighlightId}
      onInspectComponent={inspect}
      onRetry={reason === "context-lost" || reason === "error" ? retry : undefined}
      showLists={false}
    />
  );

  return (
    <section className={`ma-viewer${className ? ` ${className}` : ""}`} aria-label="Spacecraft inspection viewer" data-viewer-mode={showing3d ? "3d" : fallbackReason}>
      <header className="ma-viewer__header">
        <div>
          <span className="ma-viewer__eyebrow">SPACECRAFT INSPECTION</span>
          <h3 className="ma-viewer__title">Your satellite</h3>
        </div>
        <div className="ma-viewer__toolbar" role="group" aria-label="Viewer options">
          <button type="button" className="ma-viewer__button" aria-pressed={state.schematic} disabled={!showing3d} onClick={() => dispatch({ type: "toggle-schematic" })}>
            Schematic view
          </button>
          <button type="button" className="ma-viewer__button" aria-pressed={state.enabled3d} onClick={() => dispatch({ type: "toggle-3d" })}>
            3D {state.enabled3d ? "on" : "off"}
          </button>
        </div>
      </header>

      <div className="ma-viewer__body">
        <div className="ma-viewer__stage-wrap">
          {showing3d ? (
            <>
              <div
                className="ma-viewer__stage"
                tabIndex={0}
                role="group"
                aria-label="Interactive 3D view of the spacecraft. Drag to rotate and scroll to zoom, or use the arrow keys to rotate, plus and minus to zoom, and Home to reset. The component list next to it describes the same content."
                onKeyDown={handleKeyDown}
              >
                <SceneErrorBoundary key={state.mountKey} onError={handleRenderError}>
                  <Suspense fallback={fallback("loading")}>
                    <SpacecraftScene
                      model={model}
                      highlightedComponentId={activeHighlightId}
                      schematic={state.schematic}
                      command={command}
                      reducedMotion={reducedMotion}
                      onInspectComponent={inspect}
                      onContextLost={handleContextLost}
                      onContextRestored={handleContextRestored}
                    />
                  </Suspense>
                </SceneErrorBoundary>
              </div>
              <div className="ma-viewer__camera" role="group" aria-label="Camera controls">
                {CAMERA_BUTTONS.map((button) => (
                  <button key={button.kind} type="button" className="ma-viewer__camera-button" aria-label={button.label} title={button.label} onClick={() => sendCommand(button.kind)}>
                    <span aria-hidden="true">{button.glyph}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="ma-viewer__stage ma-viewer__stage--fallback">{fallback(fallbackReason)}</div>
          )}
          <p className="ma-viewer__notice">{SYNTHETIC_GEOMETRY_NOTICE}</p>
        </div>

        <div className="ma-viewer__panel">
          <SpacecraftPartsList model={model} highlightedComponentId={activeHighlightId} onInspectComponent={inspect} />
          <SpacecraftIssues issues={model.issues} />
          <p className="ma-viewer__hint">Selecting an item here only highlights it in the drawing. Use the component cards to change your design.</p>
        </div>
      </div>
    </section>
  );
}
