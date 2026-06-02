export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isLowEndDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  // FIXED: Issue #7 — Enhanced check with memory and connection
  const cores  = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as any).deviceMemory ?? 4; // GB
  const conn   = (navigator as any).connection?.effectiveType ?? '4g';
  
  return cores <= 2 || memory <= 1 || conn === '2g' || conn === 'slow-2g';
};
