import * as L from 'leaflet';
import { markRaw } from 'vue';
import { getThemeColor } from '../utils/theme';
import { createMarkerIcon } from '../utils/icons';
import type { Point } from '../utils/point';
import type { TrajectoryResult } from '../utils/physics';

/**
 * Handles the display of the calculated drop path.
 * This draws the freefall and gliding lines when their drop spot is reachable.
 */
export class PathRenderer {
  public deployMarker: L.Marker | null = null;
  public jumpMarker: L.Marker | null = null;

  private freefallLineOutline: L.Polyline | null = null;
  private freefallLine: L.Polyline | null = null;
  private glideLineOutline: L.Polyline | null = null;
  private glideLine: L.Polyline | null = null;

  constructor(public map: L.Map) {}

  /**
   * Draws the suggested freefall route based on the physics engine's result.
   */
  public update(res: TrajectoryResult, targetPos: Point) {
    if (!res.glidePoint || !res.jumpPoint) return;

    const updateMarker = (
      key: 'deployMarker' | 'jumpMarker',
      colorClass: string,
      label: string,
      position: Point,
    ) => {
      const coordinates: [number, number] = [position.y, position.x];
      if (key === 'deployMarker') {
        if (this.deployMarker) {
          this.deployMarker.setLatLng(coordinates);
        } else {
          this.deployMarker = markRaw(
            L.marker(coordinates, {
              icon: createMarkerIcon(colorClass, label),
              interactive: false,
              zIndexOffset: 1000,
            }).addTo(this.map),
          );
        }
      } else {
        if (this.jumpMarker) {
          this.jumpMarker.setLatLng(coordinates);
        } else {
          this.jumpMarker = markRaw(
            L.marker(coordinates, {
              icon: createMarkerIcon(colorClass, label),
              interactive: false,
              zIndexOffset: 1000,
            }).addTo(this.map),
          );
        }
      }
    };

    updateMarker('deployMarker', 'bg-accent text-accent-content', 'D', res.glidePoint);
    updateMarker('jumpMarker', 'bg-error text-error-content', 'J', res.jumpPoint);

    const errorColor = getThemeColor('--er', '#ef4444');
    const accentColor = getThemeColor('--a', '#0ea5e9');

    const freefallPoints: [number, number][] = [
      [res.jumpPoint.y, res.jumpPoint.x],
      [res.glidePoint.y, res.glidePoint.x],
    ];

    if (this.freefallLineOutline) this.freefallLineOutline.setLatLngs(freefallPoints);
    else
      this.freefallLineOutline = markRaw(
        L.polyline(freefallPoints, { color: 'rgba(0, 0, 0, 0.8)', weight: 8, lineCap: 'round' }).addTo(
          this.map,
        ),
      );

    if (this.freefallLine) this.freefallLine.setLatLngs(freefallPoints);
    else
      this.freefallLine = markRaw(
        L.polyline(freefallPoints, { color: errorColor, weight: 4, opacity: 1, lineCap: 'round' }).addTo(
          this.map,
        ),
      );

    const glidePoints: [number, number][] = [
      [res.glidePoint.y, res.glidePoint.x],
      [targetPos.y, targetPos.x],
    ];
    if (this.glideLineOutline) this.glideLineOutline.setLatLngs(glidePoints);
    else
      this.glideLineOutline = markRaw(
        L.polyline(glidePoints, { color: 'rgba(0, 0, 0, 0.8)', weight: 8, lineCap: 'round' }).addTo(
          this.map,
        ),
      );

    if (this.glideLine) this.glideLine.setLatLngs(glidePoints);
    else
      this.glideLine = markRaw(
        L.polyline(glidePoints, {
          color: accentColor,
          weight: 4,
          opacity: 1,
          dashArray: '10, 10',
          lineCap: 'round',
        }).addTo(this.map),
      );
  }

  /**
   * Cleans up the lines and markers if the target is no longer reachable.
   */
  public hide() {
    if (this.deployMarker) {
      this.map.removeLayer(this.deployMarker);
      this.deployMarker = null;
    }
    if (this.jumpMarker) {
      this.map.removeLayer(this.jumpMarker);
      this.jumpMarker = null;
    }
    if (this.freefallLineOutline) {
      this.map.removeLayer(this.freefallLineOutline);
      this.freefallLineOutline = null;
    }
    if (this.freefallLine) {
      this.map.removeLayer(this.freefallLine);
      this.freefallLine = null;
    }
    if (this.glideLineOutline) {
      this.map.removeLayer(this.glideLineOutline);
      this.glideLineOutline = null;
    }
    if (this.glideLine) {
      this.map.removeLayer(this.glideLine);
      this.glideLine = null;
    }
  }
}
