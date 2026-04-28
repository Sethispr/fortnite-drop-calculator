import { ref, onUnmounted, shallowRef, markRaw } from 'vue';
import * as L from 'leaflet';
import localforage from 'localforage';
import { calculateTrajectory, type TrajectoryResult } from '../utils/physics';

const CONFIG = {
  fortniteApiBase: 'https://fortnite-api.com',
  fallbackBlank: 'https://fortnite-api.com/images/map.png',
  fallbackPOIs: 'https://fortnite-api.com/images/map_en.png',
};

interface Point {
  x: number;
  y: number;
}

function toPoint(latlng: L.LatLng): Point {
  return { x: latlng.lng, y: latlng.lat };
}

export function useMap() {
  const map = shallowRef<L.Map | null>(null);
  let imageOverlay: L.ImageOverlay | null = null;
  const apiLabels = ref(true);
  const isMapLoading = ref(true);

  let mapWidth = 0;
  let mapHeight = 0;

  let busStartMarker: L.Marker | null = null;
  let busEndMarker: L.Marker | null = null;
  let targetMarker: L.Marker | null = null;
  let deployMarker: L.Marker | null = null;
  let jumpMarker: L.Marker | null = null;
  let busLineOutline: L.Polyline | null = null;
  let busLine: L.Polyline | null = null;
  let busArrows: L.LayerGroup | null = null;
  let arrowMarkers: L.Marker[] = [];
  let freefallLineOutline: L.Polyline | null = null;
  let freefallLine: L.Polyline | null = null;
  let glideLineOutline: L.Polyline | null = null;
  let glideLine: L.Polyline | null = null;

  let rafPending = false;

  function getThemeColor(varName: string, fallback: string): string {
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

  async function getMapImageUrl() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${CONFIG.fortniteApiBase}/v1/map?language=en`, {
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = (await response.json()) as {
          data?: { images?: { pois?: string; blank?: string } };
        };
        if (data?.data?.images) {
          const url = apiLabels.value
            ? (data.data.images.pois ?? CONFIG.fallbackPOIs)
            : (data.data.images.blank ?? CONFIG.fallbackBlank);
          if (url) return url;
        }
      }
    } catch {
      // Ignored
    } finally {
      clearTimeout(timeoutId);
    }
    return apiLabels.value ? CONFIG.fallbackPOIs : CONFIG.fallbackBlank;
  }

  function createTargetIcon(cls: string) {
    return markRaw(
      L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div class="rounded-full w-7 h-7 flex items-center justify-center ring-2 ring-base-100 shadow-xl ${cls}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"></path></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    );
  }

  function createMarkerIcon(cls: string, label = '') {
    return markRaw(
      L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div class="rounded-full w-7 h-7 flex items-center justify-center font-black text-xs ring-2 ring-base-100 shadow-xl ${cls}">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    );
  }

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

  function getArrowIcon(angle: number) {
    const rounded = Math.round(angle * 4) / 4;
    if (rounded === lastArrowAngle && cachedArrowIcon) return cachedArrowIcon;
    lastArrowAngle = rounded;
    cachedArrowIcon = createArrowIcon(rounded);
    return cachedArrowIcon;
  }

  function updateBusLine(startPoint: Point, endPoint: Point) {
    if (map.value) {
      const latLngStart: [number, number] = [startPoint.y, startPoint.x];
      const latLngEnd: [number, number] = [endPoint.y, endPoint.x];
      if (busLineOutline) busLineOutline.setLatLngs([latLngStart, latLngEnd]);
      if (busLine) busLine.setLatLngs([latLngStart, latLngEnd]);

      if (busArrows) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const angleDeg = -Math.atan2(dy, dx) * (180 / Math.PI);

        const spacing = 55;
        const numNeeded = Math.max(0, Math.floor(d / spacing));
        const icon = getArrowIcon(angleDeg);

        while (arrowMarkers.length < numNeeded) {
          const m = L.marker([0, 0], {
            icon: icon,
            interactive: false,
            zIndexOffset: -500,
          }).addTo(busArrows);
          arrowMarkers.push(m);
        }

        for (let i = 0; i < arrowMarkers.length; i++) {
          const m = arrowMarkers[i];
          if (i < numNeeded) {
            const fraction = (i + 0.5) / (numNeeded + 0.0001);
            const px = startPoint.x + dx * fraction;
            const py = startPoint.y + dy * fraction;

            const currentPos = m.getLatLng();
            if (currentPos.lat !== py || currentPos.lng !== px) {
              m.setLatLng([py, px]);
            }

            if (m.getIcon() !== icon) {
              m.setIcon(icon);
            }
            if (!busArrows.hasLayer(m)) m.addTo(busArrows);
          } else {
            if (busArrows.hasLayer(m)) busArrows.removeLayer(m);
          }
        }
      }
    }
  }

  function constrainMarker(m: L.Marker) {
    if (!m) return;
    const pos = m.getLatLng();
    let { lat, lng } = pos;
    let changed = false;

    if (lng < 0) {
      lng = 0;
      changed = true;
    }
    if (lng > mapWidth) {
      lng = mapWidth;
      changed = true;
    }
    if (lat < 0) {
      lat = 0;
      changed = true;
    }
    if (lat > mapHeight) {
      lat = mapHeight;
      changed = true;
    }

    if (changed) {
      m.setLatLng([lat, lng]);
    }
  }

  function handleMarkerDrag(e: L.LeafletEvent) {
    const m = e.target as L.Marker;
    constrainMarker(m);
    throttledRecompute();
  }

  function handleMarkerDragEnd(e: L.LeafletEvent) {
    const m = e.target as L.Marker;
    constrainMarker(m);
    recompute();
  }

  function createBusMarkers(startPoint: Point, endPoint: Point) {
    if (!map.value) return;
    if (busStartMarker) {
      map.value.removeLayer(busStartMarker);
    }
    if (busEndMarker) {
      map.value.removeLayer(busEndMarker);
    }
    if (busLineOutline) {
      map.value.removeLayer(busLineOutline);
    }
    if (busLine) {
      map.value.removeLayer(busLine);
    }
    if (busArrows) {
      map.value.removeLayer(busArrows);
      arrowMarkers = [];
    }

    busStartMarker = markRaw(
      L.marker([startPoint.y, startPoint.x], {
        icon: createMarkerIcon('bg-success text-success-content', 'S'),
        draggable: true,
      }).addTo(map.value),
    );
    busEndMarker = markRaw(
      L.marker([endPoint.y, endPoint.x], {
        icon: createMarkerIcon('bg-info text-info-content', 'E'),
        draggable: true,
      }).addTo(map.value),
    );

    busLineOutline = markRaw(
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
      ).addTo(map.value),
    );
    busLine = markRaw(
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
      ).addTo(map.value),
    );
    busArrows = markRaw(L.layerGroup().addTo(map.value));
    arrowMarkers = [];

    updateBusLine(startPoint, endPoint);

    [busStartMarker, busEndMarker].forEach((m) => {
      m.on('drag', handleMarkerDrag);
      m.on('dragend', handleMarkerDragEnd);
    });
  }

  function createOrUpdateTarget(pos: Point) {
    const constrainedPos = { ...pos };
    if (constrainedPos.x < 0) constrainedPos.x = 0;
    if (constrainedPos.x > mapWidth) constrainedPos.x = mapWidth;
    if (constrainedPos.y < 0) constrainedPos.y = 0;
    if (constrainedPos.y > mapHeight) constrainedPos.y = mapHeight;

    if (targetMarker) {
      targetMarker.setLatLng([constrainedPos.y, constrainedPos.x]);
    } else if (map.value) {
      targetMarker = markRaw(
        L.marker([constrainedPos.y, constrainedPos.x], {
          icon: createTargetIcon('bg-warning text-warning-content'),
          draggable: true,
        }).addTo(map.value),
      );
      targetMarker.on('drag', handleMarkerDrag).on('dragend', handleMarkerDragEnd);
    }
  }

  async function saveCurrentTarget() {
    if (targetMarker) {
      const pos = toPoint(targetMarker.getLatLng());
      const relativeX = pos.x / mapWidth;
      const relativeY = pos.y / mapHeight;
      await localforage.setItem('savedTarget', { x: relativeX, y: relativeY });
    }
  }

  async function loadSavedTarget() {
    try {
      const saved = await localforage.getItem<{ x: number; y: number }>('savedTarget');
      if (saved && mapWidth > 0 && mapHeight > 0) {
        createOrUpdateTarget({ x: saved.x * mapWidth, y: saved.y * mapHeight });
        recompute();
      }
    } catch {}
  }

  function updateVisualElements(res: TrajectoryResult, targetPos: Point) {
    if (!map.value || !res.glidePoint || !res.jumpPoint) return;

    const updateMarker = (
      key: 'deployMarker' | 'jumpMarker',
      cls: string,
      lbl: string,
      pos: Point,
    ) => {
      const ll: [number, number] = [pos.y, pos.x];
      if (key === 'deployMarker') {
        if (deployMarker) {
          deployMarker.setLatLng(ll);
        } else {
          deployMarker = markRaw(
            L.marker(ll, {
              icon: createMarkerIcon(cls, lbl),
              interactive: false,
              zIndexOffset: 1000,
            }).addTo(map.value!),
          );
        }
      } else {
        if (jumpMarker) {
          jumpMarker.setLatLng(ll);
        } else {
          jumpMarker = markRaw(
            L.marker(ll, {
              icon: createMarkerIcon(cls, lbl),
              interactive: false,
              zIndexOffset: 1000,
            }).addTo(map.value!),
          );
        }
      }
    };

    updateMarker('deployMarker', 'bg-accent text-accent-content', 'D', res.glidePoint);
    updateMarker('jumpMarker', 'bg-error text-error-content', 'J', res.jumpPoint);

    const errorColor = getThemeColor('--er', '#ef4444');
    const accentColor = getThemeColor('--a', '#0ea5e9');

    const ff: [number, number][] = [
      [res.jumpPoint.y, res.jumpPoint.x],
      [res.glidePoint.y, res.glidePoint.x],
    ];
    if (freefallLineOutline) freefallLineOutline.setLatLngs(ff);
    else
      freefallLineOutline = markRaw(
        L.polyline(ff, { color: 'rgba(0, 0, 0, 0.8)', weight: 8, lineCap: 'round' }).addTo(
          map.value,
        ),
      );

    if (freefallLine) freefallLine.setLatLngs(ff);
    else
      freefallLine = markRaw(
        L.polyline(ff, { color: errorColor, weight: 4, opacity: 1, lineCap: 'round' }).addTo(
          map.value,
        ),
      );

    const gl: [number, number][] = [
      [res.glidePoint.y, res.glidePoint.x],
      [targetPos.y, targetPos.x],
    ];
    if (glideLineOutline) glideLineOutline.setLatLngs(gl);
    else
      glideLineOutline = markRaw(
        L.polyline(gl, { color: 'rgba(0, 0, 0, 0.8)', weight: 8, lineCap: 'round' }).addTo(
          map.value,
        ),
      );

    if (glideLine) glideLine.setLatLngs(gl);
    else
      glideLine = markRaw(
        L.polyline(gl, {
          color: accentColor,
          weight: 4,
          opacity: 1,
          dashArray: '10, 10',
          lineCap: 'round',
        }).addTo(map.value),
      );
  }

  function hideComputedMarkers() {
    if (deployMarker && map.value) {
      map.value.removeLayer(deployMarker);
      deployMarker = null;
    }
    if (jumpMarker && map.value) {
      map.value.removeLayer(jumpMarker);
      jumpMarker = null;
    }
    if (freefallLineOutline && map.value) {
      map.value.removeLayer(freefallLineOutline);
      freefallLineOutline = null;
    }
    if (freefallLine && map.value) {
      map.value.removeLayer(freefallLine);
      freefallLine = null;
    }
    if (glideLineOutline && map.value) {
      map.value.removeLayer(glideLineOutline);
      glideLineOutline = null;
    }
    if (glideLine && map.value) {
      map.value.removeLayer(glideLine);
      glideLine = null;
    }
  }

  function onMapClick(e: L.LeafletMouseEvent) {
    const p = toPoint(e.latlng);
    if (p.x < 0 || p.x > mapWidth || p.y < 0 || p.y > mapHeight) return;
    createOrUpdateTarget(p);
    recompute();
  }

  function throttledRecompute() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      recompute();
      rafPending = false;
    });
  }

  const results = shallowRef<null | TrajectoryResult>(null);

  function recompute() {
    if (busStartMarker && busEndMarker) {
      const busStart = toPoint(busStartMarker.getLatLng()),
        busEnd = toPoint(busEndMarker.getLatLng());
      updateBusLine(busStart, busEnd);
      if (!targetMarker) return hideComputedMarkers();
      const targetPos = toPoint(targetMarker.getLatLng());

      const dx = busEnd.x - busStart.x;
      const dy = busEnd.y - busStart.y;
      if (dx * dx + dy * dy < 1) {
        results.value = null;
        return hideComputedMarkers();
      }

      const res = calculateTrajectory(busStart, busEnd, targetPos);
      results.value = res;
      if (!res.reachable) return hideComputedMarkers();
      updateVisualElements(res, targetPos);
    }
  }

  function rescaleMarkers(oldW: number, oldH: number, newW: number, newH: number) {
    const scaleX = newW / oldW,
      scaleY = newH / oldH;
    const rescale = (m: L.Marker | null) => {
      if (!m) return null;
      const p = toPoint(m.getLatLng());
      const np = { x: p.x * scaleX, y: p.y * scaleY };
      m.setLatLng([np.y, np.x]);
      return np;
    };
    if (busStartMarker) {
      const ns = rescale(busStartMarker);
      const ne = rescale(busEndMarker);
      if (ns && ne) updateBusLine(ns, ne);
    }
    rescale(targetMarker);
    rescale(deployMarker);
    rescale(jumpMarker);
  }

  const loadMapImage = async () => {
    if (!map.value) return;
    isMapLoading.value = true;

    const safetyTimeout = setTimeout(() => {
      if (isMapLoading.value) {
        isMapLoading.value = false;
        map.value?.invalidateSize();
      }
    }, 6000);

    const url = await getMapImageUrl();

    const img = new Image();

    img.onload = () => {
      clearTimeout(safetyTimeout);

      const newW = img.naturalWidth || 2048;
      const newH = img.naturalHeight || 2048;

      const oldW = mapWidth,
        oldH = mapHeight;
      mapWidth = newW;
      mapHeight = newH;
      const bounds = L.latLngBounds([0, 0], [newH, newW]);

      if (imageOverlay && map.value) {
        map.value.removeLayer(imageOverlay);
      }

      if (map.value) {
        imageOverlay = markRaw(
          L.imageOverlay(url, bounds, {
            opacity: 1,
            zIndex: 1,
            interactive: false,
          }).addTo(map.value),
        );

        imageOverlay.bringToBack();

        map.value.setMaxBounds(bounds.pad(0.5));

        if (oldW && oldH) {
          rescaleMarkers(oldW, oldH, newW, newH);
        } else {
          createBusMarkers({ x: newW * 0.2, y: newH * 0.2 }, { x: newW * 0.8, y: newH * 0.8 });
          void loadSavedTarget();
        }

        map.value.invalidateSize();

        if (!oldW) {
          map.value.fitBounds(bounds);
        }

        requestAnimationFrame(() => {
          recompute();
          isMapLoading.value = false;
        });
      }
    };

    img.onerror = () => {
      clearTimeout(safetyTimeout);
      isMapLoading.value = false;
      map.value?.invalidateSize();
    };

    img.src = url;
  };

  function initMap(containerId: string | HTMLElement) {
    map.value = markRaw(
      L.map(containerId, {
        crs: L.CRS.Simple,
        minZoom: -5,
        maxZoom: 2,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      }),
    );

    map.value.on('click', onMapClick);
    setTimeout(() => map.value?.invalidateSize(), 0);

    const resizeObserver = new ResizeObserver(() => {
      if (map.value) {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
          map.value?.invalidateSize();
          rafPending = false;
        });
      }
    });

    const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (el) resizeObserver.observe(el);

    void loadMapImage();
  }

  function toggleLabels() {
    apiLabels.value = !apiLabels.value;
    void loadMapImage();
  }

  onUnmounted(() => {
    if (map.value) {
      map.value.off();
      map.value.remove();
    }
  });

  const zoomIn = () => map.value?.zoomIn();
  const zoomOut = () => map.value?.zoomOut();
  const resetView = () => {
    if (map.value && mapWidth && mapHeight) {
      const bounds = L.latLngBounds([0, 0], [mapHeight, mapWidth]);
      map.value.fitBounds(bounds);
    }
  };

  function flipBusDirection() {
    if (!busStartMarker || !busEndMarker) return;
    const s = busStartMarker.getLatLng();
    const e = busEndMarker.getLatLng();
    busStartMarker.setLatLng(e);
    busEndMarker.setLatLng(s);
    recompute();
  }

  return {
    initMap,
    toggleLabels,
    apiLabels,
    results,
    isMapLoading,
    saveCurrentTarget,
    zoomIn,
    zoomOut,
    resetView,
    flipBusDirection,
  };
}
