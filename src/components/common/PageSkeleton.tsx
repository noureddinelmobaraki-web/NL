export function PageSkeleton() {
  return (
    <div className="nl-skel-wrap" aria-busy="true" aria-live="polite">
      <div className="nl-skel-bar" />
      <div className="nl-skel-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="nl-skel-card" />
        ))}
      </div>
    </div>
  );
}
