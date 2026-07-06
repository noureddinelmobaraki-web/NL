// src/home/HomeFallbackList.tsx
// مسار الوصولية/الأداء: قائمة عمودية عادية بلا سكرول-لينك ولا مسارح لاصقة.
import { memo, type ReactNode } from 'react';

interface FallbackItem {
  id: string;
  title: string;
  node: ReactNode;
}

interface HomeFallbackListProps {
  items: FallbackItem[];
}

export const HomeFallbackList = memo(function HomeFallbackList({
  items,
}: HomeFallbackListProps) {
  return (
    <div className="nl-home-fallback flex flex-col gap-14">
      {items.map((it) => (
        <section
          key={it.id}
          id={`station-${it.id}`}
          aria-label={it.title}
          className="fade-in-section"
        >
          {it.node}
        </section>
      ))}
    </div>
  );
});
