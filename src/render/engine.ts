import type * as L from 'leaflet';
import { BusRenderer } from './bus';
import { TargetRenderer } from './target';
import { PathRenderer } from './path';
import { toPoint } from '../utils/point';

/**
 * Coordinates all the drawing layers on the map.
 * Grouping these individual rendering specific parts together limits the amount
 * of times we directly touch the map, and keeps the drawing logic organized.
 */
export class Engine {
  public bus: BusRenderer;
  public target: TargetRenderer;
  public path: PathRenderer;

  constructor(public map: L.Map) {
    this.bus = new BusRenderer(map);
    this.target = new TargetRenderer(map);
    this.path = new PathRenderer(map);
  }

  /**
   * Adjusts the position of all markers when the map image changes size.
   * This makes it so pins stay to their correct spot during zoom or reload.
   */
  public rescale(scaleX: number, scaleY: number) {
    const scaleMarker = (marker: L.Marker | null) => {
      if (!marker) return null;
      const point = toPoint(marker.getLatLng());
      const newPoint = { x: point.x * scaleX, y: point.y * scaleY };
      marker.setLatLng([newPoint.y, newPoint.x]);
      return newPoint;
    };

    if (this.bus.startMarker && this.bus.endMarker) {
      const newStart = scaleMarker(this.bus.startMarker);
      const newEnd = scaleMarker(this.bus.endMarker);
      if (newStart && newEnd) this.bus.update(newStart, newEnd);
    }
    scaleMarker(this.target.marker);
    scaleMarker(this.path.deployMarker);
    scaleMarker(this.path.jumpMarker);
  }
}
