import { useLayoutEffect, useRef } from "react";

export const FLIGHT_UPDATE_MS = 100;

export interface OrbitTween {
  from: number;
  to: number;
  startedAt: number;
  endsAt: number;
}

export function displayTurns(tween: OrbitTween, now: number): number {
  if (now >= tween.endsAt) return tween.to;
  const fraction = Math.max(0, (now - tween.startedAt) / (tween.endsAt - tween.startedAt));
  return tween.from + (tween.to - tween.from) * fraction;
}

/** Interpolate the position only. The game still reports engine samples for energy and data. */
export function useOrbitTween(turns: number, moving: boolean) {
  const tween = useRef<OrbitTween>({ from: turns, to: turns, startedAt: 0, endsAt: 0 });
  useLayoutEffect(() => {
    const now = performance.now();
    const previous = tween.current;
    const step = turns - previous.to;
    // Snap when paused or seeking. Even at 1800× a normal LEO tick moves under 5% of a turn.
    tween.current = moving && step > 0 && step < 0.05
      ? { from: displayTurns(previous, now), to: turns, startedAt: now, endsAt: now + FLIGHT_UPDATE_MS }
      : { from: turns, to: turns, startedAt: now, endsAt: now };
  }, [turns, moving]);
  return tween;
}
