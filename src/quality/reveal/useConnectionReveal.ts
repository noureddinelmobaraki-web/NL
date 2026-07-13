import { useEffect, useState, type RefObject } from 'react';
import { useMotionProfile } from '../motion/useMotionProfile';

interface VisibilitySubscriber {
  callback: (visible: boolean) => void;
}

const visibilitySubscribers = new WeakMap<Element, VisibilitySubscriber>();
const sharedIntersectionObserver = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visibilitySubscribers.get(entry.target)?.callback(entry.isIntersecting);
      });
    }, { rootMargin: '12% 0px', threshold: 0.01 })
  : null;

export function useConnectionReveal<T extends Element>(
  ref: RefObject<T | null>,
  geometryStable: boolean,
): boolean {
  const profile = useMotionProfile();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!sharedIntersectionObserver) {
      setVisible(true);
      return;
    }
    visibilitySubscribers.set(element, { callback: setVisible });
    sharedIntersectionObserver.observe(element);
    return () => {
      sharedIntersectionObserver.unobserve(element);
      visibilitySubscribers.delete(element);
    };
  }, [ref]);

  useEffect(() => {
    if (!visible || !geometryStable) {
      setReady(false);
      return;
    }
    if (profile.connectionDelayMs === 0) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), profile.connectionDelayMs);
    return () => window.clearTimeout(timer);
  }, [geometryStable, profile.connectionDelayMs, visible]);

  return ready;
}
