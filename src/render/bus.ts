import * as L from 'leaflet';
import { markRaw } from 'vue';
import { getArrowIcon, createMarkerIcon } from '../utils/icons';
import type { Point } from '../utils/point';

/**
 * Manages the drawing of the bus path and direction markers.
 * We draw the arrows along the path and make sure its spaced out evenly
 * regardless of how long the route is.
 */
export class BusRenderer {
  public startMarker: L.Marker | null = null;
  public endMarker: L.Marker | null = null;
  private lineOutline: L.Polyline | null = null;
  private line: L.Polyline | null = null;
  private arrows: L.LayerGroup | null = null;
  private arrowMarkers: L.Marker[] = [];

  constructor(public map: L.Map) {}

  /**
   * Refreshes the visual line and arrows between the start and end points.
   */
  public update(startPoint: Point, endPoint: Point) {
    const startCoordinates: [number, number] = [startPoint.y, startPoint.x];
    const endCoordinates: [number, number] = [endPoint.y, endPoint.x];

    if (this.lineOutline) this.lineOutline.setLatLngs([startCoordinates, endCoordinates]);
    if (this.line) this.line.setLatLngs([startCoordinates, endCoordinates]);

    if (this.arrows) {
      const deltaX = endPoint.x - startPoint.x;
      const deltaY = endPoint.y - startPoint.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angleDegrees = -Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      const spacing = 55;
      const numberNeeded = Math.max(0, Math.floor(distance / spacing));
      const icon = getArrowIcon(angleDegrees);

      while (this.arrowMarkers.length < numberNeeded) {
        const marker = L.marker([0, 0], {
          icon: icon,
          interactive: false,
          zIndexOffset: -500,
        }).addTo(this.arrows);
        this.arrowMarkers.push(marker);
      }

      for (let i = 0; i < this.arrowMarkers.length; i++) {
        const marker = this.arrowMarkers[i];
        if (i < numberNeeded) {
          const fraction = (i + 0.5) / (numberNeeded + 0.0001);
          const positionX = startPoint.x + deltaX * fraction;
          const positionY = startPoint.y + deltaY * fraction;

          const currentPosition = marker.getLatLng();
          if (currentPosition.lat !== positionY || currentPosition.lng !== positionX) {
            marker.setLatLng([positionY, positionX]);
          }

          if (marker.getIcon() !== icon) {
            marker.setIcon(icon);
          }
          if (!this.arrows.hasLayer(marker)) marker.addTo(this.arrows);
        } else {
          if (this.arrows.hasLayer(marker)) this.arrows.removeLayer(marker);
        }
      }
    }
  }

  /**
   * Builds the initial markers and bus path line when the map first loads.
   */
  public create(
    startPoint: Point,
    endPoint: Point,
    onDrag: (e: L.LeafletEvent) => void,
    onDragEnd: (e: L.LeafletEvent) => void,
  ) {
    if (this.startMarker) this.map.removeLayer(this.startMarker);
    if (this.endMarker) this.map.removeLayer(this.endMarker);
    if (this.lineOutline) this.map.removeLayer(this.lineOutline);
    if (this.line) this.map.removeLayer(this.line);
    if (this.arrows) {
      this.map.removeLayer(this.arrows);
      this.arrowMarkers = [];
    }

    this.startMarker = markRaw(
      L.marker([startPoint.y, startPoint.x], {
        icon: createMarkerIcon('bg-success text-success-content', 'S'),
        draggable: true,
      }).addTo(this.map),
    );
    this.endMarker = markRaw(
      L.marker([endPoint.y, endPoint.x], {
        icon: createMarkerIcon('bg-info text-info-content', 'E'),
        draggable: true,
      }).addTo(this.map),
    );

    this.lineOutline = markRaw(
      L.polyline(
        [
          [startPoint.y, startPoint.x],
          [endPoint.y, endPoint.x],
        ],
        {
          color: '#ffffff',
          weight: 4,
          lineCap: 'round',
          opacity: 0.6,
        },
      ).addTo(this.map),
    );
    this.line = markRaw(
      L.polyline(
        [
          [startPoint.y, startPoint.x],
          [endPoint.y, endPoint.x],
        ],
        {
          color: '#24a0ff',
          weight: 1.5,
          opacity: 0.5,
          lineCap: 'butt',
        },
      ).addTo(this.map),
    );
    this.arrows = markRaw(L.layerGroup().addTo(this.map));
    this.arrowMarkers = [];

    this.update(startPoint, endPoint);

    [this.startMarker, this.endMarker].forEach((m) => {
      m.on('drag', onDrag);
      m.on('dragend', onDragEnd);
    });
  }
}
