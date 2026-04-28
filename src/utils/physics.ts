interface Point {
  x: number;
  y: number;
}

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

interface InternalDropResult {
  valid: boolean;
  fallTime: number;
  glideTime: number;
  dx: number;
  dy: number;
  fDist: number;
  gDist: number;
}

const _sharedResult: InternalDropResult = {
  valid: false,
  fallTime: 0,
  glideTime: 0,
  dx: 0,
  dy: 0,
  fDist: 0,
  gDist: 0,
};

function getDistanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function solveDropPhaseFastOptimized(
  jumpX: number,
  jumpY: number,
  targetX: number,
  targetY: number,
): void {
  const pixelsToMeters = CONFIG.pixelsToMeters;
  const distSq = getDistanceSq(jumpX, jumpY, targetX, targetY);
  const targetDistanceMeters = Math.sqrt(distSq) * pixelsToMeters;

  const BUS_HEIGHT = 832.0;
  const DEPLOY_HEIGHT = 30.0;
  const MAX_DROP_HEIGHT = BUS_HEIGHT - DEPLOY_HEIGHT;

  const V_FALL_H = 14.5;
  const V_FALL_V = 32.0;
  const V_GLIDE_H = 17.0;
  const V_GLIDE_V = 7.0;

  const maxFallTime = MAX_DROP_HEIGHT / V_FALL_V;
  const maxFallHorizontalDist = V_FALL_H * maxFallTime;

  const minGlideTime = DEPLOY_HEIGHT / V_GLIDE_V;
  const minGlideHorizontalDist = V_GLIDE_H * minGlideTime;

  const maxConventionalDist = maxFallHorizontalDist + minGlideHorizontalDist;

  const dx = targetX - jumpX;
  const dy = targetY - jumpY;
  const dLen = Math.sqrt(dx * dx + dy * dy);
  const dirX = dLen > 1e-9 ? dx / dLen : 0;
  const dirY = dLen > 1e-9 ? dy / dLen : 0;

  if (targetDistanceMeters <= maxConventionalDist) {
    const actualFallHorizontal = Math.min(targetDistanceMeters, maxFallHorizontalDist);
    const remainingDistance = targetDistanceMeters - actualFallHorizontal;
    const actualGlideHorizontal = Math.max(remainingDistance, minGlideHorizontalDist);

    const qx = targetX - dirX * (actualGlideHorizontal / pixelsToMeters);
    const qy = targetY - dirY * (actualGlideHorizontal / pixelsToMeters);

    const fDist = Math.sqrt(getDistanceSq(jumpX, jumpY, qx, qy)) * pixelsToMeters;

    if (fDist <= maxFallHorizontalDist + 1) {
      _sharedResult.valid = true;
      _sharedResult.fallTime = maxFallTime;
      _sharedResult.glideTime = actualGlideHorizontal / V_GLIDE_H;
      _sharedResult.dx = qx;
      _sharedResult.dy = qy;
      _sharedResult.fDist = fDist;
      _sharedResult.gDist = actualGlideHorizontal;
      return;
    }
  } else {
    const glideVsFallVerticalRatio = V_GLIDE_H / V_GLIDE_V;
    const c1 = V_FALL_H - V_FALL_V * glideVsFallVerticalRatio;
    const c2 = glideVsFallVerticalRatio * BUS_HEIGHT;

    const requiredFallTime = (targetDistanceMeters - c2) / c1;
    const requiredGlideTime = (BUS_HEIGHT - V_FALL_V * requiredFallTime) / V_GLIDE_V;

    if (requiredFallTime >= 0 && requiredGlideTime >= 0) {
      const actualFallHorizontal = V_FALL_H * requiredFallTime;
      _sharedResult.valid = true;
      _sharedResult.fallTime = requiredFallTime;
      _sharedResult.glideTime = requiredGlideTime;
      _sharedResult.dx = jumpX + dirX * (actualFallHorizontal / pixelsToMeters);
      _sharedResult.dy = jumpY + dirY * (actualFallHorizontal / pixelsToMeters);
      _sharedResult.fDist = actualFallHorizontal;
      _sharedResult.gDist = V_GLIDE_H * requiredGlideTime;
      return;
    }
  }

  _sharedResult.valid = false;
}

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
  let bestFDist = 0;
  let bestGDist = 0;
  let bestJx = 0;
  let bestJy = 0;
  let bestGx = 0;
  let bestGy = 0;

  const dxEndStart = endPos.x - startPos.x;
  const dyEndStart = endPos.y - startPos.y;
  const distStartEnd = Math.sqrt(dxEndStart * dxEndStart + dyEndStart * dyEndStart);

  const samplesPerPass = 100;
  let searchCenter = 0.5;
  let searchRadius = 0.5;

  for (let pass = 0; pass < 3; pass++) {
    const startFrac = searchCenter - searchRadius;
    const stepFrac = (searchRadius * 2) / samplesPerPass;

    for (let i = 0; i <= samplesPerPass; i++) {
      let fraction = startFrac + i * stepFrac;
      if (fraction < 0) fraction = 0;
      else if (fraction > 1) fraction = 1;

      const jx = startPos.x + dxEndStart * fraction;
      const jy = startPos.y + dyEndStart * fraction;

      solveDropPhaseFastOptimized(jx, jy, targetPos.x, targetPos.y);

      if (_sharedResult.valid) {
        const busDist = Math.sqrt(getDistanceSq(startPos.x, startPos.y, jx, jy));
        const busTravelTime = (busDist * pixelsToMeters) / vBus;
        const totalTime = busTravelTime + _sharedResult.fallTime + _sharedResult.glideTime;

        if (totalTime < minTotalTime) {
          minTotalTime = totalTime;
          bestBusTime = busTravelTime;
          bestFallTime = _sharedResult.fallTime;
          bestGlideTime = _sharedResult.glideTime;
          bestFDist = _sharedResult.fDist;
          bestGDist = _sharedResult.gDist;
          bestJx = jx;
          bestJy = jy;
          bestGx = _sharedResult.dx;
          bestGy = _sharedResult.dy;
        }
      }
    }

    if (minTotalTime < Infinity) {
      searchCenter =
        Math.sqrt(getDistanceSq(startPos.x, startPos.y, bestJx, bestJy)) / distStartEnd;
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
      fallDistanceMeters: bestFDist,
      glideDistanceMeters: bestGDist,
      jumpPoint: { x: bestJx, y: bestJy },
      glidePoint: { x: bestGx, y: bestGy },
    };
  }

  return { reachable: false, totalTime: Infinity };
}
