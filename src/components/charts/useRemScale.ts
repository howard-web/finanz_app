"use client";

import { useSyncExternalStore } from "react";

/**
 * Faktor der Basis-Schriftgröße relativ zu 16px (z.B. 1.5 bei 24px).
 * Recharts arbeitet mit Pixelwerten; damit wachsen Schrift, Achsen und Ränder
 * der Charts mit der App-Schriftgröße mit.
 */
export function useRemScale(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 1);
}

function getSnapshot() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
}

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
