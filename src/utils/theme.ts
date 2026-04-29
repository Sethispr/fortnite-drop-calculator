/**
 * Reads colors from the active CSS theme so we can draw lines on the map
 * that automatically adjust to the current light or dark mode.
 */
export function getThemeColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!val) return fallback;
    if (/^[\d\s./]+$/.test(val)) {
      return `oklch(${val})`;
    }
    return val;
  } catch {
    return fallback;
  }
}
