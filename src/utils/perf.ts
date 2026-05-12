export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isLowEndDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  // navigator.deviceMemory gives RAM in GB (approximate)
  // @ts-ignore - deviceMemory is not in all browsers' TS types
  const ram = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 4;
  
  return ram < 4 || cores <= 2;
};
