import type { Point } from './point';

export interface TrajectoryResult {
  reachable: boolean;
  totalTime: number;
  busTime?: number;
  fallTime?: number;
  glideTime?: number;
  fallDistanceMeters?: number;
  glideDistanceMeters?: number;
  jumpPoint?: Point;
  glidePoint?: Point;
}

const CONFIG = {
  busSpeed: 1100 / 15,
  pixelsToMeters: 490 / 335,
};

/**
 * A shared storage object for math results.
 * We reuse this single object so the browser does not freeze while cleaning up memory
 * during heavy map dragging.
 */
interface DropPhaseResult {
  valid: boolean;
  fallTime: number;
  glideTime: number;
  dx: number;
  dy: number;
  fallDistance: number;
  glideDistance: number;
}

const sharedDropResult: DropPhaseResult = {
  valid: false,
  fallTime: 0,
  glideTime: 0,
  dx: 0,
  dy: 0,
  fallDistance: 0,
  glideDistance: 0,
};

/**
 * Calculates straight line distance quickly.
 */
function getSquaredDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Predicts the required drop timeline to reach the target.
 * The game has fixed flight speeds and strict heights.
 *
 * If the target is close, we stay in rapid skydiving freefall for as long as possible.
 * If the target is extremely far, we find the best point to deploy the glider early so we can stretch the drop.
 */
function calculateDropPhase(
  jumpX: number,
  jumpY: number,
  targetX: number,
  targetY: number,
): void {
  const pixelsToMeters = CONFIG.pixelsToMeters;
  const distSq = getSquaredDistance(jumpX, jumpY, targetX, targetY);
  const D = Math.sqrt(distSq) * pixelsToMeters; // Horizontal target distance

  const BUS_HEIGHT = 832.0;
  const DEPLOY_HEIGHT = 30.0;

  const V_FALL_H = 14.5;
  const V_FALL_V = 32.0;
  const V_GLIDE_H = 17.0;
  const V_GLIDE_V = 7.0;

  // Ratios of horizontal distance per vertical meter dropped
  const K1 = V_FALL_H / V_FALL_V;
  const K2 = V_GLIDE_H / V_GLIDE_V;

  // Maximum distance we can cover if we deploy at absolute minimum height
  const maxConventionalDist = K1 * (BUS_HEIGHT - DEPLOY_HEIGHT) + K2 * DEPLOY_HEIGHT;

  let h: number; // Deployment height

  if (D <= maxConventionalDist) {
    // Target is close enough, we deploy as late as possible (minimum height)
    h = DEPLOY_HEIGHT;
  } else {
    // Target is somewhat far, we must deploy early to stretch the glide
    h = (D - K1 * BUS_HEIGHT) / (K2 - K1);
  }

  if (h > BUS_HEIGHT) {
    // Even if we deploy the glider exactly from the bus (h = BUS_HEIGHT),
    // we still can't reach the target.
    sharedDropResult.valid = false;
    return;
  }

  // Calculate actual times spent in each phase based on the deployment height
  const fallTime = (BUS_HEIGHT - h) / V_FALL_V;
  const glideTime = h / V_GLIDE_V;

  // Calculate maximum horizontal travel during these phases
  // [NOTE]: if D < maxConventionalDist, we will spiral to waste the extra distance.
  // The line of flight will go directly to the target.
  const dx = targetX - jumpX;
  const dy = targetY - jumpY;
  const dLen = Math.sqrt(dx * dx + dy * dy);
  const dirX = dLen > 1e-9 ? dx / dLen : 0;
  const dirY = dLen > 1e-9 ? dy / dLen : 0;

  let actualFallDistMeters: number;
  let actualGlideDistMeters: number;

  if (D <= maxConventionalDist) {
    // We have excess potential distance. We typically just fall towards the target
    // and then glide towards it, wasting the rest by circling.
    // For visual representation, we can just assume we use the full fall vector
    // towards the target, and then the rest is gliding.
    const possibleFallDist = V_FALL_H * fallTime;
    actualFallDistMeters = Math.min(D, possibleFallDist);
    actualGlideDistMeters = D - actualFallDistMeters;
  } else {
    actualFallDistMeters = V_FALL_H * fallTime;
    actualGlideDistMeters = V_GLIDE_H * glideTime;
  }

  const glidePointX = jumpX + dirX * (actualFallDistMeters / pixelsToMeters);
  const glidePointY = jumpY + dirY * (actualFallDistMeters / pixelsToMeters);

  sharedDropResult.valid = true;
  sharedDropResult.fallTime = fallTime;
  sharedDropResult.glideTime = glideTime;
  sharedDropResult.dx = glidePointX;
  sharedDropResult.dy = glidePointY;
  sharedDropResult.fallDistance = actualFallDistMeters;
  sharedDropResult.glideDistance = actualGlideDistMeters;
}

/**
 * Finds the absolute fastest route from the battle bus to the ground.
 *
 * It tests many different jump points along the flight line. Once it finds the best general area,
 * it runs the test again focused tightly around that spot to give the exact best time to jump.
 */
export function calculateTrajectory(
  startPos: Point,
  endPos: Point,
  targetPos: Point,
): TrajectoryResult {
  const pixelsToMeters = CONFIG.pixelsToMeters;
  const vBus = CONFIG.busSpeed;

  let minTotalTime = Infinity;
  let bestBusTime = 0;
  let bestFallTime = 0;
  let bestGlideTime = 0;
  let bestFallDistance = 0;
  let bestGlideDistance = 0;
  let bestJumpX = 0;
  let bestJumpY = 0;
  let bestGlideX = 0;
  let bestGlideY = 0;

  const deltaX = endPos.x - startPos.x;
  const deltaY = endPos.y - startPos.y;
  const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  const samplesPerPass = 100;
  let searchCenter = 0.5;
  let searchRadius = 0.5;

  for (let pass = 0; pass < 3; pass++) {
    const startFraction = searchCenter - searchRadius;
    const stepFraction = (searchRadius * 2) / samplesPerPass;

    for (let i = 0; i <= samplesPerPass; i++) {
      let fraction = startFraction + i * stepFraction;
      if (fraction < 0) fraction = 0;
      else if (fraction > 1) fraction = 1;

      const jumpX = startPos.x + deltaX * fraction;
      const jumpY = startPos.y + deltaY * fraction;

      calculateDropPhase(jumpX, jumpY, targetPos.x, targetPos.y);

      if (sharedDropResult.valid) {
        const busDist = Math.sqrt(getSquaredDistance(startPos.x, startPos.y, jumpX, jumpY));
        const busTravelTime = (busDist * pixelsToMeters) / vBus;
        const totalTime = busTravelTime + sharedDropResult.fallTime + sharedDropResult.glideTime;

        if (totalTime < minTotalTime) {
          minTotalTime = totalTime;
          bestBusTime = busTravelTime;
          bestFallTime = sharedDropResult.fallTime;
          bestGlideTime = sharedDropResult.glideTime;
          bestFallDistance = sharedDropResult.fallDistance;
          bestGlideDistance = sharedDropResult.glideDistance;
          bestJumpX = jumpX;
          bestJumpY = jumpY;
          bestGlideX = sharedDropResult.dx;
          bestGlideY = sharedDropResult.dy;
        }
      }
    }

    if (minTotalTime < Infinity) {
      searchCenter =
        Math.sqrt(getSquaredDistance(startPos.x, startPos.y, bestJumpX, bestJumpY)) / totalDistance;
      searchRadius *= 0.1;
    }
  }

  if (minTotalTime < Infinity) {
    return {
      reachable: true,
      totalTime: minTotalTime,
      busTime: bestBusTime,
      fallTime: bestFallTime,
      glideTime: bestGlideTime,
      fallDistanceMeters: bestFallDistance,
      glideDistanceMeters: bestGlideDistance,
      jumpPoint: { x: bestJumpX, y: bestJumpY },
      glidePoint: { x: bestGlideX, y: bestGlideY },
    };
  }

  return { reachable: false, totalTime: Infinity };
}
