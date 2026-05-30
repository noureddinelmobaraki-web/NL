import { useState, useEffect } from 'react';
import { prefersReducedMotion } from '../utils/perf';

export type LoadingPhase = 'visible' | 'zooming' | 'hidden';

export function useLoadingPhase() {
  const [phase, setPhase] = useState<LoadingPhase>('visible');
  const [dots, setDots] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const [forceStatic, setForceStatic] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nl_force_static') === 'true';
    }
    return false;
  });

  // 1. Detect first-visit vs returning-visit using localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const visited = localStorage.getItem('nl_has_visited') !== null;
      setIsReturning(visited);
      if (!visited) {
        localStorage.setItem('nl_has_visited', 'true');
      }
    }
  }, []);

  // 2. Detect connection status
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const conn = (navigator as any).connection;
      if (conn) {
        if (conn.saveData === true) {
          setSaveData(true);
        }
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          setSlowConnection(true);
        }
      }
    }
  }, []);

  // Compute useStatic
  const prefersReduced = prefersReducedMotion();
  const useStatic = prefersReduced || saveData || slowConnection || forceStatic;

  /* Animated dots on "NL" */
  useEffect(() => {
    if (useStatic || prefersReducedMotion()) return;
    let n = 0;
    const iv = setInterval(() => {
      n = (n + 1) % 4;
      setDots('.'.repeat(n));
    }, 400);
    return () => clearInterval(iv);
  }, [useStatic]);

  const triggerVideoFailed = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nl_force_static', 'true');
    }
    setForceStatic(true);
  };

  return {
    phase,
    setPhase,
    dots,
    isReturning,
    useStatic,
    showDisclaimer,
    setShowDisclaimer,
    triggerVideoFailed,
  };
}
