import * as L from 'leaflet';
import { markRaw } from 'vue';
import { createTargetIcon } from '../utils/icons';
import type { Point } from '../utils/point';

/**
 * Manages the player's chosen drop spot on the map.
 */
export class TargetRenderer {
  public marker: L.Marker | null = null;

  constructor(public map: L.Map) {}

  /**
   * Places the target marker on the map or updates its position if it already exists.
   * We make sure the coordinates of it is inside the map image.
   */
  public createOrUpdate(
    pos: Point,
    mapWidth: number,
    mapHeight: number,
    onDrag: (e: L.LeafletEvent) => void,
    onDragEnd: (e: L.LeafletEvent) => void,
  ) {
    const constrainedPos = { ...pos };
    if (constrainedPos.x < 0) constrainedPos.x = 0;
    if (constrainedPos.x > mapWidth) constrainedPos.x = mapWidth;
    if (constrainedPos.y < 0) constrainedPos.y = 0;
    if (constrainedPos.y > mapHeight) constrainedPos.y = mapHeight;

    if (this.marker) {
      this.marker.setLatLng([constrainedPos.y, constrainedPos.x]);
    } else {
      this.marker = markRaw(
        L.marker([constrainedPos.y, constrainedPos.x], {
          icon: createTargetIcon('bg-warning text-warning-content'),
          draggable: true,
        }).addTo(this.map),
      );
      this.marker.on('drag', onDrag).on('dragend', onDragEnd);
    }
  }
}
