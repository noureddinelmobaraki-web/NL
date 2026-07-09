import { useEffect } from 'react';
import type { RefObject } from 'react';
import { DEFAULT_PENDULUM, type PendulumConfig } from './pendulum.config';

export interface PendulumPhysicsArgs {
  /** container holding .nld-pendulum__arm/__rope/__bob/__pivot + .nld-glass-window */
  rigRef: RefObject<HTMLDivElement | null>;
  /** run the simulation only while this is true (viewport gate) */
  active: boolean;
  /** when true the simulation is disabled entirely (accessibility) */
  reducedMotion: boolean;
  /** set to true once a press turns into a swing-drag; read by the click guard */
  draggedRef: RefObject<boolean>;
  /** optional overrides for the physical constants */
  config?: Partial<PendulumConfig>;
}

/**
 * A self-contained, frame-rate-independent damped elastic pendulum.
 *
 * Performance contract (why this is safe at the bottom of a long page):
 * - ZERO cost when off-screen: the effect only runs while `active` is true, so
 *   there is no rAF loop, no timers and no pointer listeners until the rig is
 *   in view. Scrolling away tears everything down and resets the transforms.
 * - ZERO cost at rest: when the swing decays below the rest thresholds the loop
 *   stops itself (0% CPU) and a pointer press wakes it again.
 * - Cheap per frame: no layout reads inside the loop (the pivot rect is cached
 *   on pointer-down), transforms only, and a FIXED integration timestep so the
 *   motion is identical on a 120Hz iPhone and a throttled 30fps device.
 *
 * Interaction: grab-and-fling with mouse or finger; release carries momentum
 * and the swing decays naturally. A plain tap is preserved for opening.
 */
export function usePendulumPhysics({
  rigRef,
  active,
  reducedMotion,
  draggedRef,
  config,
}: PendulumPhysicsArgs): void {
  useEffect(() => {
    if (!active || reducedMotion) return;
    const rig = rigRef.current;
    if (!rig) return;

    const arm = rig.querySelector<HTMLElement>('.nld-pendulum__arm');
    const rope = rig.querySelector<HTMLElement>('.nld-pendulum__rope');
    const bob = rig.querySelector<HTMLElement>('.nld-pendulum__bob');
    const pivot = rig.querySelector<HTMLElement>('.nld-pendulum__pivot');
    const handle = rig.querySelector<HTMLElement>('.nld-glass-window');
    if (!arm || !rope || !bob || !pivot || !handle) return;

    const c: PendulumConfig = { ...DEFAULT_PENDULUM, ...config };
    const L = c.length;

    // --- simulation state (plain locals; never triggers a React re-render) ---
    let theta = c.initialAngle;
    let omega = 0;
    let stretch = 0;
    let stretchV = 0;
    let dragging = false;
    let pivotX = 0;
    let pivotY = 0;
    let downX = 0;
    let lastTheta = 0;
    let lastMoveT = 0;

    let raf = 0;
    let running = false;
    let last = 0;
    let acc = 0;

    const render = () => {
      const deg = (theta * 180) / Math.PI;
      arm.style.transform = `rotate(${deg.toFixed(3)}deg)`;
      rope.style.transform = `scaleY(${((L + stretch) / L).toFixed(4)})`;
      bob.style.transform = `translateY(${stretch.toFixed(2)}px)`;
    };

    const integrate = (h: number) => {
      if (!dragging) {
        // free damped pendulum: theta'' = -(g / L) sin(theta) - damp * omega
        const a = -(c.gravity / (L + stretch)) * Math.sin(theta) - c.damping * omega;
        omega += a * h;
        theta += omega * h;
      }
      // elastic rope: a spring-damper driven by real tension
      // (centripetal omega^2 * L plus the gravity component)
      const load = (omega * omega * (L + stretch)) / c.gravity + (Math.cos(theta) - 1);
      const targetS = c.stretchGain * load + (dragging ? 7 : 0);
      const aS = c.springK * (targetS - stretch) - c.springDamp * stretchV;
      stretchV += aS * h;
      stretch += stretchV * h;
      if (stretch > c.maxStretch) {
        stretch = c.maxStretch;
        stretchV = 0;
      } else if (stretch < c.minStretch) {
        stretch = c.minStretch;
        stretchV = 0;
      }
    };

    const settled = () =>
      !dragging &&
      Math.abs(theta) < c.restAngle &&
      Math.abs(omega) < c.restOmega &&
      Math.abs(stretch) < 0.4 &&
      Math.abs(stretchV) < 0.4;

    const frame = (now: number) => {
      if (!running) return;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > c.maxFrame) dt = c.maxFrame; // was backgrounded / long stall
      acc += dt;
      let steps = 0;
      while (acc >= c.fixedStep && steps < c.maxSubSteps) {
        integrate(c.fixedStep);
        acc -= c.fixedStep;
        steps += 1;
      }
      if (steps === c.maxSubSteps) acc = 0; // drop backlog on a very slow frame
      render();
      if (settled()) {
        theta = 0;
        omega = 0;
        stretch = 0;
        stretchV = 0;
        render();
        running = false;
        raf = 0;
        return; // stop the loop -> 0% CPU until the next interaction
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    };

    const cachePivot = () => {
      const r = pivot.getBoundingClientRect();
      pivotX = r.left + r.width / 2;
      pivotY = r.top + r.height / 2;
    };
    const angleAt = (x: number, y: number) => {
      const dx = x - pivotX;
      const dy = Math.max(1, y - pivotY);
      return Math.atan2(dx, dy);
    };

    const onDown = (e: PointerEvent) => {
      cachePivot();
      dragging = true;
      draggedRef.current = false;
      downX = e.clientX;
      lastTheta = theta;
      lastMoveT = performance.now();
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      if (!draggedRef.current) {
        // stay a tap until the finger clearly moves sideways
        if (Math.abs(e.clientX - downX) < c.dragThreshold) return;
        draggedRef.current = true;
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
          /* capture unsupported */
        }
        lastTheta = theta;
        lastMoveT = performance.now();
      }
      const target = Math.max(
        -c.maxGrabAngle,
        Math.min(c.maxGrabAngle, angleAt(e.clientX, e.clientY)),
      );
      const now = performance.now();
      const h = Math.max(0.008, (now - lastMoveT) / 1000);
      omega = (target - lastTheta) / h; // fling velocity carried on release
      theta = target;
      lastTheta = target;
      lastMoveT = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {
        /* nothing captured */
      }
    };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);

    // a gentle intro swing whenever the rig (re)enters the viewport
    theta = c.initialAngle;
    omega = 0;
    stretch = 0;
    stretchV = 0;
    wake();

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      // leave nothing behind: reset the transforms of an off-screen rig
      arm.style.transform = '';
      rope.style.transform = '';
      bob.style.transform = '';
    };
  }, [active, reducedMotion, rigRef, draggedRef, config]);
}
