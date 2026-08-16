import { useCallback, useEffect, useRef } from 'react';
import type { OrbitConfig } from '../constants';

type Params = {
  config: OrbitConfig;
  /** Square stage edge in CSS px. */
  size: number;
  /** Rest offset from the subject centre, in CSS px. */
  restOffset: { x: number; y: number };
  reducedMotion: boolean;
};

/**
 * Every pose uses the SAME four transform functions in the SAME order.
 * Browsers interpolate matching transform lists component-wise; mismatched
 * lists fall back to matrix decomposition and travel a different path.
 */
function pose(
  angleDeg: number,
  z: number,
  faceDeg: number,
  dx: number,
  dy: number,
): string {
  return (
    `rotateY(${angleDeg}deg) translateZ(${z}px) ` +
    `rotateY(${faceDeg}deg) translate3d(${dx}px, ${dy}px, 0)`
  );
}

function restPose(dx: number, dy: number): string {
  return pose(0, 0, 0, dx, dy);
}

function orbitPose(a: number, radius: number, maxFaceTurnDeg: number): string {
  const face = maxFaceTurnDeg * Math.sin((a * Math.PI) / 180);
  return pose(a, radius, face - a, 0, 0);
}

function buildTurn(cfg: OrbitConfig, radius: number): Keyframe[] {
  const steps = 72; // one sample every 5 degrees
  const frames: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    frames.push({
      offset: p,
      transform: orbitPose(
        cfg.startAngleDeg + 360 * p,
        radius,
        cfg.maxFaceTurnDeg,
      ),
      easing: 'linear',
    });
  }
  return frames;
}

export function useOrbitAnimation({ config, size, restOffset, reducedMotion }: Params) {
  const armRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<Animation | null>(null);
  const depthRafRef = useRef<number | null>(null);
  /** Bumped by stop() so a stale phase cannot resume the chain. */
  const genRef = useRef(0);

  /** Latest rest offset, readable from a callback ref that runs before effects. */
  const restOffsetRef = useRef(restOffset);

  const clearDepth = useCallback(() => {
    if (depthRafRef.current !== null) cancelAnimationFrame(depthRafRef.current);
    depthRafRef.current = null;
    if (anchorRef.current) anchorRef.current.style.zIndex = '2';
  }, []);

  const stop = useCallback(() => {
    genRef.current += 1;
    animRef.current?.cancel();
    animRef.current = null;
    clearDepth();
    const arm = armRef.current;
    if (arm) arm.style.transform = restPose(restOffset.x, restOffset.y);
  }, [clearDepth, restOffset.x, restOffset.y]);

  /**
   * enter -> N turns -> exit. Resolves when the video is back at rest.
   * Rejects nothing; a cancelled phase simply resolves early.
   */
  const start = useCallback(async () => {
    const arm = armRef.current;
    const anchor = anchorRef.current;
    if (!arm || !anchor || size <= 0) return;

    genRef.current += 1;
    const gen = genRef.current;
    const alive = () => genRef.current === gen;

    const radius = size * config.orbitRadiusPct;
    const rest = restPose(restOffset.x, restOffset.y);
    const entry = orbitPose(config.startAngleDeg, radius, config.maxFaceTurnDeg);

    if (reducedMotion) {
      // No rotation at all. Drift out, hold, drift back.
      const a = arm.animate(
        [{ transform: rest }, { transform: pose(0, radius * 0.4, 0, 0, 0) }],
        { duration: config.enterMs, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
      );
      animRef.current = a;
      await a.finished.catch(() => {});
      if (!alive()) return;
      await new Promise((r) => setTimeout(r, config.orbitMsPerTurn));
      if (!alive()) return;
      const b = arm.animate(
        [{ transform: pose(0, radius * 0.4, 0, 0, 0) }, { transform: rest }],
        { duration: config.exitMs, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
      );
      animRef.current = b;
      await b.finished.catch(() => {});
      if (alive()) stop();
      return;
    }

    // — phase 1: fly from rest onto the ring —
    const enter = arm.animate(
      [{ transform: rest }, { transform: entry }],
      { duration: config.enterMs, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
    );
    animRef.current = enter;
    await enter.finished.catch(() => {});
    if (!alive()) return;

    // — phase 2: the orbit —
    const turn = arm.animate(buildTurn(config, radius), {
      duration: config.orbitMsPerTurn,
      iterations: config.orbitTurns,
      easing: 'linear',
      fill: 'both',
    });
    animRef.current = turn;

    // Depth ordering. Transforms alone cannot put the video behind the
    // subject canvas; only stacking order can.
    const track = () => {
      if (!alive()) return;
      const t = Number(turn.currentTime ?? 0);
      const a = config.startAngleDeg + 360 * ((t % config.orbitMsPerTurn) / config.orbitMsPerTurn);
      const inFront = Math.cos((a * Math.PI) / 180) >= 0;
      anchor.style.zIndex = inFront ? '4' : '2';
      depthRafRef.current = requestAnimationFrame(track);
    };
    depthRafRef.current = requestAnimationFrame(track);

    await turn.finished.catch(() => {});
    clearDepth();
    if (!alive()) return;

    // — phase 3: back to rest —
    const exit = arm.animate(
      [{ transform: entry }, { transform: rest }],
      { duration: config.exitMs, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
    );
    animRef.current = exit;
    await exit.finished.catch(() => {});
    if (alive()) stop();
  }, [
    config,
    size,
    restOffset.x,
    restOffset.y,
    reducedMotion,
    stop,
    clearDepth,
  ]);

  /**
   * Callback ref, not an effect. OrbitVideo mounts only when phase leaves
   * 'idle', which is long after any mount effect here has run — a plain
   * effect keyed on restOffset can never see the node, so the arm used to
   * stay untransformed and the video rendered on the anchor instead of at
   * restCenter.
   */
  const setArm = useCallback((node: HTMLDivElement | null) => {
    armRef.current = node;
    if (node && !animRef.current) {
      const { x, y } = restOffsetRef.current;
      node.style.transform = restPose(x, y);
    }
  }, []);

  // Keep the ref fresh and re-park on resize while the video is at rest.
  useEffect(() => {
    restOffsetRef.current = restOffset;
    const arm = armRef.current;
    if (arm && !animRef.current) {
      arm.style.transform = restPose(restOffset.x, restOffset.y);
    }
  }, [restOffset.x, restOffset.y]);

  useEffect(
    () => () => {
      genRef.current += 1;
      animRef.current?.cancel();
      if (depthRafRef.current !== null) cancelAnimationFrame(depthRafRef.current);
    },
    [],
  );

  return { armRef, anchorRef, start, stop, setArm };
}
