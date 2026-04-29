import * as L from 'leaflet';
import { markRaw } from 'vue';

/**
 * Creates a visual marker for the player's chosen drop spot.
 * We use simple HTML to make sure it scales clearly.
 */
export function createTargetIcon(colorClass: string) {
  return markRaw(
    L.divIcon({
      className: 'bg-transparent border-none',
      html: `<div class="rounded-full w-7 h-7 flex items-center justify-center ring-2 ring-base-100 shadow-xl ${colorClass}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"></path></svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  );
}

/**
 * Draws the start and end labels for the bus path.
 */
export function createMarkerIcon(colorClass: string, label = '') {
  return markRaw(
    L.divIcon({
      className: 'bg-transparent border-none',
      html: `<div class="rounded-full w-7 h-7 flex items-center justify-center font-black text-xs ring-2 ring-base-100 shadow-xl ${colorClass}">${label}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  );
}

/**
 * Generates an SVG arrow that points along the flight path.
 */
function createArrowIcon(angle: number) {
  const arrowColor = '#24a0ff';
  const outlineColor = '#ffffff';
  return markRaw(
    L.divIcon({
      className: 'bg-transparent border-none',
      html: `<div style="transform: rotate(${angle}deg); display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; pointer-events: none;">
      <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; overflow: visible; display: block;">
        <path d="M8 4l8 8-8 8" fill="none" stroke="${outlineColor}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M8 4l8 8-8 8" fill="none" stroke="${arrowColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  );
}

let lastArrowAngle: number | null = null;
let cachedArrowIcon: L.DivIcon | null = null;

/**
 * Fetches a cached arrow icon to prevent drawing the exact same graphic many times.
 */
export function getArrowIcon(angle: number) {
  const rounded = Math.round(angle * 4) / 4;
  if (rounded === lastArrowAngle && cachedArrowIcon) return cachedArrowIcon;
  lastArrowAngle = rounded;
  cachedArrowIcon = createArrowIcon(rounded);
  return cachedArrowIcon;
}
