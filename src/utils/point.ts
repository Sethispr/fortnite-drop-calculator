import type * as L from 'leaflet';

/**
 * Represents a set of coordinates on our 2D map.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Converts Leaflet's coordinate format into our simpler data format.
 */
export function toPoint(latlng: L.LatLng): Point {
  return { x: latlng.lng, y: latlng.lat };
}
