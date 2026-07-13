import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { DEFAULT_PENDULUM, type PendulumConfig } from './pendulum.config';

export interface PendulumPhysicsArgs {
  rigRef: RefObject<HTMLDivElement | null>;
  active: boolean;
  reducedMotion: boolean;
  draggedRef: RefObject<boolean>;
  config?: Partial<PendulumConfig>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function usePendulumPhysics({
  rigRef,
  active,
  reducedMotion,
  draggedRef,
  config,
}: PendulumPhysicsArgs): void {
  const introPlayedRef = useRef(false);

  useEffect(() => {
    if (!active || reducedMotion) return;
    const rig = rigRef.current;
    if (!rig) return;

    const arm = rig.querySelector<HTMLElement>('.nld-pendulum__arm');
    const handle = rig.querySelector<HTMLElement>('.nld-glass-window');
    if (!arm || !handle) return;

    const c: PendulumConfig = { ...DEFAULT_PENDULUM, ...config };
    let angle = introPlayedRef.current ? 0 : c.initialAngle;
    introPlayedRef.current = true;
    let velocity = 0;
    let dragging = false;
    let pointerId = -1;
    let downX = 0;
    let downAngle = 0;
    let previousTarget = 0;
    let previousMoveTime = 0;
    let raf = 0;
    let running = false;
    let previousFrame = 0;
    let accumulator = 0;

    const render = () => {
      arm.style.transform = `rotate(${(angle * 180 / Math.PI).toFixed(3)}deg)`;
    };

    const integrate = (step: number) => {
      if (dragging) return;
      const acceleration = -(c.gravity / c.length) * Math.sin(angle)
        - c.angularDamping * velocity;
      velocity = clamp(
        velocity + acceleration * step,
        -c.maxAngularVelocity,
        c.maxAngularVelocity,
      );
      angle = clamp(
        angle + velocity * step,
        -c.maxGrabAngle,
        c.maxGrabAngle,
      );
    };

    const settled = () => !dragging
      && Math.abs(angle) < c.restAngle
      && Math.abs(velocity) < c.restOmega;

    const frame = (now: number) => {
      if (!running) return;
      const delta = Math.min(c.maxFrame, Math.max(0, (now - previousFrame) / 1000));
      previousFrame = now;
      accumulator += delta;
      let steps = 0;
      while (accumulator >= c.fixedStep && steps < c.maxSubSteps) {
        integrate(c.fixedStep);
        accumulator -= c.fixedStep;
        steps += 1;
      }
      if (steps === c.maxSubSteps) accumulator = 0;
      render();
      if (settled()) {
        angle = 0;
        velocity = 0;
        render();
        running = false;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (running) return;
      running = true;
      previousFrame = performance.now();
      accumulator = 0;
      raf = requestAnimationFrame(frame);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      dragging = true;
      pointerId = event.pointerId;
      draggedRef.current = false;
      downX = event.clientX;
      downAngle = angle;
      previousTarget = angle;
      previousMoveTime = performance.now();
      velocity = 0;
      try { handle.setPointerCapture(pointerId); } catch { /* unsupported */ }
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || !event.isPrimary || event.pointerId !== pointerId) return;
      const deltaX = event.clientX - downX;
      if (!draggedRef.current && Math.abs(deltaX) < c.dragThreshold) return;
      draggedRef.current = true;
      if (event.cancelable) event.preventDefault();

      // Screen-space invariant: rightward movement is a positive visual angle.
      const target = clamp(
        downAngle + deltaX / c.length,
        -c.maxGrabAngle,
        c.maxGrabAngle,
      );
      const now = performance.now();
      const seconds = clamp((now - previousMoveTime) / 1000, 0.008, 0.08);
      const measuredVelocity = (target - previousTarget) / seconds;
      velocity += (measuredVelocity - velocity) * c.releaseSmoothing;
      velocity = clamp(velocity, -c.maxAngularVelocity, c.maxAngularVelocity);
      angle = target;
      previousTarget = target;
      previousMoveTime = now;
      render();
    };

    const finishPointer = (event: PointerEvent, cancelled: boolean) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      if (cancelled) velocity = 0;
      try { handle.releasePointerCapture(pointerId); } catch { /* nothing held */ }
      pointerId = -1;
      wake();
    };

    const onPointerUp = (event: PointerEvent) => finishPointer(event, false);
    const onPointerCancel = (event: PointerEvent) => finishPointer(event, true);

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerCancel);
    render();
    wake();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerCancel);
      arm.style.transform = '';
    };
  }, [active, reducedMotion, rigRef, draggedRef, config]);
}
