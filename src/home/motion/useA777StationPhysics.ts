import { type RefObject, useEffect } from 'react';

interface Oscillator {
  angle: number;
  velocity: number;
  drive: number;
  phase: number;
}

interface ChildBody extends Oscillator {
  element: HTMLElement;
  lastAngle: number;
}

interface RopeBody extends Oscillator {
  element: SVGGraphicsElement;
  childIndex: number;
  lastAngle: number;
}

interface StationBody extends Oscillator {
  id: string;
  section: HTMLElement;
  stage: HTMLElement;
  children: ChildBody[];
  ropes: RopeBody[];
  visible: boolean;
  introDone: boolean;
  lastAngle: number;
}

const CHILD_SELECTOR = [
  '[data-cord-id="hero-profile"]',
  '[data-cord-id="hero-window"]',
  '.nl-lattice-node-unit',
  '#vault-playlist',
  '.nl-hl-player',
  '.me-bit-cta',
  '.nl-lens-cta',
  '.nl-song-cell[data-song-revealed="true"]',
  '.nl-contact-chip',
  '.nl-contact-msgform',
  '.nld-pendulum',
].join(',');

const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.05;
const MAX_STEPS = 6;
const STATION_GRAVITY = 10.5;
const STATION_DAMPING = 1.72;
const CHILD_GRAVITY = 13.6;
const CHILD_DAMPING = 1.48;
const ROPE_GRAVITY = 12.4;
const ROPE_DAMPING = 1.62;
const REST_ANGLE = 0.0003;
const REST_VELOCITY = 0.0014;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const makeOscillator = (phase: number): Oscillator => ({
  angle: 0,
  velocity: 0,
  drive: 0,
  phase,
});

const integrate = (
  body: Oscillator,
  step: number,
  gravity: number,
  damping: number,
  maxAngle: number,
  maxVelocity: number,
) => {
  const acceleration = -gravity * Math.sin(body.angle)
    - damping * body.velocity
    + body.drive;
  body.velocity = clamp(body.velocity + acceleration * step, -maxVelocity, maxVelocity);
  body.angle = clamp(body.angle + body.velocity * step, -maxAngle, maxAngle);
  body.drive *= Math.exp(-4.6 * step);
};

const moving = (body: Oscillator) =>
  Math.abs(body.angle) > REST_ANGLE
  || Math.abs(body.velocity) > REST_VELOCITY
  || Math.abs(body.drive) > 0.00035;

export function useA777StationPhysics(
  rootRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;

    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const stationMaxAngle = mobile ? 0.060 : 0.092;
    const childMaxAngle = mobile ? 0.032 : 0.052;
    const ropeMaxAngle = mobile ? 0.041 : 0.064;
    const stationMaxVelocity = mobile ? 0.58 : 0.76;
    const childMaxVelocity = mobile ? 0.72 : 0.94;

    const stations: StationBody[] = Array.from(
      root.querySelectorAll<HTMLElement>('.nl-home-station[data-station]'),
    ).flatMap((section, stationIndex) => {
      const id = section.dataset.station;
      const stage = section.querySelector<HTMLElement>('.nl-home-stage');
      if (!id || !stage) return [];

      const childElements = Array.from(
        section.querySelectorAll<HTMLElement>(CHILD_SELECTOR),
      ).filter((element, index, all) =>
        all.indexOf(element) === index
        && !all.some((candidate) => candidate !== element && candidate.contains(element)),
      );

      const children: ChildBody[] = childElements.map((element, index) => ({
        element,
        ...makeOscillator((stationIndex + 1) * 0.73 + index * 0.91),
        lastAngle: Number.NaN,
      }));

      const ropeElements = Array.from(
        root.querySelectorAll<SVGGraphicsElement>(`.nl-cord[data-station="${id}"]`),
      );
      const ropes: RopeBody[] = ropeElements.map((element, index) => ({
        element,
        childIndex: children.length > 0 ? index % children.length : -1,
        ...makeOscillator((stationIndex + 1) * 0.61 + index * 0.47),
        lastAngle: Number.NaN,
      }));

      return [{
        id,
        section,
        stage,
        children,
        ropes,
        visible: false,
        introDone: false,
        lastAngle: Number.NaN,
        ...makeOscillator(stationIndex * 0.83),
      }];
    });

    if (stations.length === 0) return;

    let raf = 0;
    let running = false;
    let previousTime = performance.now();
    let accumulator = 0;
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();

    const writeStation = (station: StationBody) => {
      const stationDegrees = station.angle * 180 / Math.PI;
      if (!Number.isFinite(station.lastAngle) || Math.abs(stationDegrees - station.lastAngle) >= 0.006) {
        station.lastAngle = stationDegrees;
        station.stage.style.setProperty('--nl-hang-angle', `${stationDegrees.toFixed(3)}deg`);
        station.stage.style.setProperty(
          '--nl-hang-shift',
          `${(Math.sin(station.angle) * (mobile ? 9 : 13)).toFixed(3)}px`,
        );
      }

      station.children.forEach((child) => {
        const degrees = child.angle * 180 / Math.PI;
        if (Number.isFinite(child.lastAngle) && Math.abs(degrees - child.lastAngle) < 0.008) return;
        child.lastAngle = degrees;
        child.element.classList.add('nl-a777-body');
        child.element.style.setProperty('--nl-local-angle', `${degrees.toFixed(3)}deg`);
        child.element.style.setProperty(
          '--nl-local-shift',
          `${(Math.sin(child.angle) * (mobile ? 4 : 7)).toFixed(3)}px`,
        );
      });

      station.ropes.forEach((rope) => {
        const child = rope.childIndex >= 0 ? station.children[rope.childIndex] : null;
        const totalAngle = station.angle + (child?.angle ?? rope.angle) * 0.62;
        const degrees = totalAngle * 180 / Math.PI;
        if (Number.isFinite(rope.lastAngle) && Math.abs(degrees - rope.lastAngle) < 0.008) return;
        rope.lastAngle = degrees;
        rope.element.style.setProperty('--nl-hang-angle', `${degrees.toFixed(3)}deg`);
      });
    };

    const integrateStation = (station: StationBody, step: number) => {
      if (!station.visible) return;
      integrate(
        station,
        step,
        STATION_GRAVITY,
        STATION_DAMPING,
        stationMaxAngle,
        stationMaxVelocity,
      );

      station.children.forEach((child, index) => {
        const delayedParentForce = station.angle * (0.75 + (index % 3) * 0.12);
        child.drive += delayedParentForce * step * 2.2;
        integrate(
          child,
          step,
          CHILD_GRAVITY,
          CHILD_DAMPING,
          childMaxAngle,
          childMaxVelocity,
        );
      });

      station.ropes.forEach((rope, index) => {
        const child = rope.childIndex >= 0 ? station.children[rope.childIndex] : null;
        rope.drive += ((child?.angle ?? station.angle) - rope.angle)
          * (2.3 + (index % 3) * 0.25) * step;
        integrate(
          rope,
          step,
          ROPE_GRAVITY,
          ROPE_DAMPING,
          ropeMaxAngle,
          childMaxVelocity,
        );
      });
    };

    const stationAwake = (station: StationBody) => station.visible && (
      moving(station)
      || station.children.some(moving)
      || station.ropes.some(moving)
    );

    const frame = (now: number) => {
      if (!running) return;
      accumulator += Math.min(MAX_FRAME, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;

      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < MAX_STEPS) {
        stations.forEach((station) => integrateStation(station, FIXED_STEP));
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      if (steps === MAX_STEPS) accumulator = 0;

      let workLeft = false;
      stations.forEach((station) => {
        if (!station.visible) return;
        if (stationAwake(station)) workLeft = true;
        writeStation(station);
      });

      if (workLeft) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
        raf = 0;
      }
    };

    const wake = () => {
      if (running) return;
      running = true;
      previousTime = performance.now();
      accumulator = 0;
      raf = requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const station = stations.find((candidate) => candidate.section === entry.target);
        if (!station) return;
        station.visible = entry.isIntersecting;
        if (station.visible && !station.introDone) {
          station.introDone = true;
          const direction = stations.indexOf(station) % 2 === 0 ? 1 : -1;
          station.drive += 0.085 * direction;
          station.children.forEach((child, index) => {
            child.drive += direction * (0.045 + (index % 4) * 0.009);
          });
        }
        if (station.visible) wake();
      });
    }, { rootMargin: '24% 0px', threshold: 0.01 });

    stations.forEach((station) => observer.observe(station.section));

    const onScroll = () => {
      const now = performance.now();
      const delta = clamp(window.scrollY - lastScrollY, -90, 90);
      const dt = clamp(now - lastScrollTime, 8, 80);
      lastScrollY = window.scrollY;
      lastScrollTime = now;
      if (Math.abs(delta) < 0.5) return;

      const scrollVelocity = delta / dt;
      stations.forEach((station, stationIndex) => {
        if (!station.visible) return;
        const stationDirection = stationIndex % 2 === 0 ? 1 : -1;
        station.drive += clamp(
          scrollVelocity * 0.050 * stationDirection,
          -0.095,
          0.095,
        );
        station.children.forEach((child, index) => {
          const lagDirection = index % 2 === 0 ? 1 : -1;
          child.drive += clamp(
            scrollVelocity * (0.027 + (index % 3) * 0.006) * lagDirection,
            -0.065,
            0.065,
          );
        });
      });
      wake();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    wake();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      stations.forEach((station) => {
        station.stage.style.removeProperty('--nl-hang-angle');
        station.stage.style.removeProperty('--nl-hang-shift');
        station.children.forEach((child) => {
          child.element.classList.remove('nl-a777-body');
          child.element.style.removeProperty('--nl-local-angle');
          child.element.style.removeProperty('--nl-local-shift');
        });
        station.ropes.forEach((rope) =>
          rope.element.style.removeProperty('--nl-hang-angle'),
        );
      });
    };
  }, [enabled, rootRef]);
}
