import { useEffect, useRef } from 'react';

export function useFadeInOnView<T extends HTMLElement>(
  _rootMargin = '-100px'
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    // مرحلة 0: ظهور فوري مضمون لكل الأقسام (إزالة البوّابة المربوطة بالتمرير).
    ref.current?.classList.add('is-visible');
  }, []);

  return ref;
}
