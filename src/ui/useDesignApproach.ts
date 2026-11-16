import { useLayoutEffect, useRef } from "react";
import type { MissionPhase } from "../types/contracts";
import "./design-approach.css";

interface Approach {
  readonly ship: SVGSVGElement;
  readonly scene: SVGSVGElement | null;
  readonly startX: number;
  readonly startY: number;
  readonly width: number;
  readonly height: number;
}

function placeArt(svg: SVGSVGElement, left: number, top: number, width: number, height: number) {
  svg.setAttribute("class", "design-approach-art");
  svg.setAttribute("aria-hidden", "true");
  Object.assign(svg.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
}

/** Capture the actual orbital position before the briefing artwork unmounts. */
function captureApproach(): Approach | null {
  if (typeof Element.prototype.animate !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  const source = document.querySelector<SVGSVGElement>(".briefing-orbit > svg");
  const satellite = source?.querySelector<SVGGElement>(".briefing-orbit-satellite > g");
  const bounds = satellite?.getBoundingClientRect();
  const matrix = satellite?.getScreenCTM?.();
  const area = source?.closest("main")?.getBoundingClientRect();
  if (!source || !satellite || !bounds?.width || !bounds.height || !matrix || !area) return null;

  const ship = source.cloneNode(false) as SVGSVGElement;
  const definitions = source.querySelector("defs")!.cloneNode(true) as SVGDefsElement;
  const drawing = satellite.cloneNode(true) as SVGGElement;
  for (const element of definitions.querySelectorAll("[id]")) {
    const previous = element.id;
    element.id = `approach-${previous}`;
    for (const part of drawing.querySelectorAll("[fill]")) {
      if (part.getAttribute("fill") === `url(#${previous})`) part.setAttribute("fill", `url(#${element.id})`);
    }
  }
  drawing.setAttribute("transform", `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`);
  ship.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  ship.append(definitions, drawing);
  const left = Math.max(area.left - bounds.width / 2, Math.min(bounds.left, area.right - bounds.width / 2));
  const top = Math.max(area.top - bounds.height / 2, Math.min(bounds.top, area.bottom - bounds.height / 2));
  placeArt(ship, left, top, bounds.width, bounds.height);

  const inside = bounds.top >= area.top && bounds.bottom <= area.bottom;
  const scene = inside ? source.cloneNode(true) as SVGSVGElement : null;
  if (scene) {
    scene.querySelector(".briefing-orbit-satellite")?.remove();
    const rect = source.getBoundingClientRect();
    placeArt(scene, rect.left, rect.top, rect.width, rect.height);
    scene.style.transformOrigin = `${bounds.left + bounds.width / 2 - rect.left}px ${bounds.top + bounds.height / 2 - rect.top}px`;
  }

  return { ship, scene, startX: left + bounds.width / 2, startY: top + bounds.height / 2, width: bounds.width, height: bounds.height };
}

function playApproach(approach: Approach) {
  const { ship, scene, startX, startY, width, height } = approach;
  const workspace = document.querySelector<HTMLElement>(".phase-design .design-grid");
  const preview = workspace?.querySelector<HTMLElement>(".preview-host");
  const readDestination = () => (preview?.querySelector(".ma-viewer__stage") ?? preview)?.getBoundingClientRect();
  const destination = readDestination();
  if (!workspace || !preview || !destination?.width || !destination.height) return;

  function toward(rect: DOMRect) {
    const x = rect.left + rect.width / 2 - startX;
    const y = rect.top + rect.height / 2 - startY;
    const scale = Math.max(1.05, Math.min(340 / width, rect.width * .7 / width, rect.height * .52 / height));
    return { x, y, transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(26deg)` };
  }
  const arrival = toward(destination);
  const layer = document.createElement("div");
  layer.className = "design-approach-layer";
  layer.setAttribute("aria-hidden", "true");
  if (scene) layer.append(scene);
  layer.append(ship);
  document.body.append(layer);

  const options: KeyframeAnimationOptions = { duration: 720, easing: "cubic-bezier(.25,.72,.26,1)", fill: "both" };
  const approachAnimation = ship.animate([{ transform: "none" }, { transform: arrival.transform }], options);
  const animations = [
    approachAnimation,
    workspace.animate([{ opacity: 0 }, { opacity: .2, offset: .35 }, { opacity: 1 }], options),
    preview.animate([{ opacity: 0 }], { duration: 1, fill: "both" }),
  ];
  if (scene) animations.push(scene.animate([
    { opacity: 1, transform: "none" },
    { opacity: 0, transform: `translate(${arrival.x * .56}px, ${arrival.y * .56}px) scale(1.55)` },
  ], { ...options, duration: 390 }));

  let frame = 0;
  const cleanup = () => {
    cancelAnimationFrame(frame);
    layer.remove();
    animations.forEach(animation => animation.cancel());
  };
  // Keep the same silhouette in place during lazy loading, then uncover the
  // existing interactive viewer (or its 2D fallback) at that position.
  void approachAnimation.finished.then(() => {
    const deadline = performance.now() + 1600;
    function reveal(now: number) {
      if (!layer.isConnected || !preview) return;
      const rect = readDestination();
      if (!rect?.width || !rect.height) { cleanup(); return; }
      const viewerReady = preview.querySelector(".ma-viewer__stage canvas, .ma-viewer__fallback:not([data-fallback-reason='loading']), .ghost[aria-expanded='false']");
      if (!viewerReady && now < deadline) { frame = requestAnimationFrame(reveal); return; }
      const dissolve = { ...options, duration: 210 };
      const fade = ship.animate([
        { opacity: 1, transform: arrival.transform },
        { opacity: 0, transform: toward(rect).transform },
      ], dissolve);
      animations.push(fade, preview.animate([{ opacity: 0 }, { opacity: 1 }], dissolve));
      void fade.finished.then(cleanup, cleanup);
    }
    frame = requestAnimationFrame(reveal);
  }, cleanup);
  return cleanup;
}

/** The approach is decorative. Navigation and the inspection viewer work without it. */
export function useDesignApproach(phase: MissionPhase) {
  const captured = useRef<Approach | null>(null);
  useLayoutEffect(() => {
    const approach = captured.current;
    captured.current = null;
    if (phase === "design" && approach) return playApproach(approach);
  }, [phase]);
  return () => { captured.current = captureApproach(); };
}
