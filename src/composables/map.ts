import { ref, onUnmounted, shallowRef, markRaw } from 'vue';
import * as L from 'leaflet';
import { calculateTrajectory, type TrajectoryResult } from '../utils/physics';
import { getMapImageUrl } from '../utils/api';
import { saveTargetPoint, loadTargetPoint } from '../utils/storage';
import { toPoint } from '../utils/point';
import { Engine } from '../render/engine';

/**
 * Provides the main map interaction capabilities for the app.
 * This system joins Leaflet's zoom and pan controls with our custom drop calculator
 * and handles resizing dynamically.
 */
export function useMap() {
  const map = shallowRef<L.Map | null>(null);
  const engine = shallowRef<Engine | null>(null);
  let imageOverlay: L.ImageOverlay | null = null;
  const showLabels = ref(true);
  const isLoadingMap = ref(true);

  let mapWidth = 0;
  let mapHeight = 0;
  let rafPending = false;

  /**
   * Prevents map markers from being dragged off the visible map area.
   */
  function keepMarkerOnMap(marker: L.Marker) {
    if (!marker) return;
    const pos = marker.getLatLng();
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
      marker.setLatLng([lat, lng]);
    }
  }

  function handleMarkerDrag(e: L.LeafletEvent) {
    const marker = e.target as L.Marker;
    keepMarkerOnMap(marker);
    scheduleMapUpdate();
  }

  function handleMarkerDragEnd(e: L.LeafletEvent) {
    const marker = e.target as L.Marker;
    keepMarkerOnMap(marker);
    calculateMapData();
  }

  async function saveCurrentTarget() {
    if (engine.value?.target.marker) {
      const pos = toPoint(engine.value.target.marker.getLatLng());
      const relativeX = pos.x / mapWidth;
      const relativeY = pos.y / mapHeight;
      await saveTargetPoint(relativeX, relativeY);
    }
  }

  async function loadSavedTarget() {
    const saved = await loadTargetPoint();
    if (saved && mapWidth > 0 && mapHeight > 0 && engine.value) {
      engine.value.target.createOrUpdate(
        { x: saved.x * mapWidth, y: saved.y * mapHeight },
        mapWidth,
        mapHeight,
        handleMarkerDrag,
        handleMarkerDragEnd,
      );
      calculateMapData();
    }
  }

  function onMapClick(e: L.LeafletMouseEvent) {
    const p = toPoint(e.latlng);
    if (p.x < 0 || p.x > mapWidth || p.y < 0 || p.y > mapHeight || !engine.value) return;
    engine.value.target.createOrUpdate(
      p,
      mapWidth,
      mapHeight,
      handleMarkerDrag,
      handleMarkerDragEnd,
    );
    calculateMapData();
  }

  /**
   * Schedules a visual update synced with the browser's drawing cycle.
   * This is needed to guarantee dragging a marker remains smooth.
   */
  function scheduleMapUpdate() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      calculateMapData();
      rafPending = false;
    });
  }

  const results = shallowRef<null | TrajectoryResult>(null);

  /**
   * Recheck the complete drop path using the current marker positions.
   * If the target is impsossible, it simply hides the path lines.
   */
  function calculateMapData() {
    if (engine.value?.bus.startMarker && engine.value.bus.endMarker) {
      const busStart = toPoint(engine.value.bus.startMarker.getLatLng());
      const busEnd = toPoint(engine.value.bus.endMarker.getLatLng());
      engine.value.bus.update(busStart, busEnd);

      if (!engine.value.target.marker) return engine.value.path.hide();

      const targetPos = toPoint(engine.value.target.marker.getLatLng());
      const dx = busEnd.x - busStart.x;
      const dy = busEnd.y - busStart.y;

      if (dx * dx + dy * dy < 1) {
        results.value = null;
        return engine.value.path.hide();
      }

      const res = calculateTrajectory(busStart, busEnd, targetPos);
      results.value = res;
      if (!res.reachable) return engine.value.path.hide();
      engine.value.path.update(res, targetPos);
    }
  }

  const loadMapImage = async () => {
    if (!map.value) return;
    isLoadingMap.value = true;

    const safetyTimeout = setTimeout(() => {
      if (isLoadingMap.value) {
        isLoadingMap.value = false;
        map.value?.invalidateSize();
      }
    }, 6000);

    const url = await getMapImageUrl(showLabels.value);
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

        engine.value ??= new Engine(map.value);

        if (oldW && oldH) {
          engine.value.rescale(newW / oldW, newH / oldH);
        } else {
          engine.value.bus.create(
            { x: newW * 0.2, y: newH * 0.2 },
            { x: newW * 0.8, y: newH * 0.8 },
            handleMarkerDrag,
            handleMarkerDragEnd,
          );
          void loadSavedTarget();
        }

        map.value.invalidateSize();
        if (!oldW) map.value.fitBounds(bounds);

        requestAnimationFrame(() => {
          calculateMapData();
          isLoadingMap.value = false;
        });
      }
    };

    img.onerror = () => {
      clearTimeout(safetyTimeout);
      isLoadingMap.value = false;
      map.value?.invalidateSize();
    };

    img.src = url;
  };

  let resizeObserver: ResizeObserver | null = null;

  /**
   * Creates the interactive Leaflet map instance and links it to an HTML container.
   */
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

    resizeObserver = new ResizeObserver(() => {
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

  /**
   * Swaps out the map background between the one with labeled poi's and the blank one.
   */
  function toggleLabels() {
    showLabels.value = !showLabels.value;
    void loadMapImage();
  }

  onUnmounted(() => {
    resizeObserver?.disconnect();
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

  /**
   * Reverts bus path, this is intended to at least make setting paths easier.
   */
  function flipBusDirection() {
    if (!engine.value?.bus.startMarker || !engine.value?.bus.endMarker) return;
    const startPoint = engine.value.bus.startMarker.getLatLng();
    const endPoint = engine.value.bus.endMarker.getLatLng();
    engine.value.bus.startMarker.setLatLng(endPoint);
    engine.value.bus.endMarker.setLatLng(startPoint);
    calculateMapData();
  }

  return {
    initMap,
    toggleLabels,
    showLabels,
    results,
    isLoadingMap,
    saveCurrentTarget,
    zoomIn,
    zoomOut,
    resetView,
    flipBusDirection,
  };
}
