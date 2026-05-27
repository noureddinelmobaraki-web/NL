interface SkeletonSectionProps {
  type: 'songs' | 'drawings' | 'contact';
}

export const SkeletonSection = ({ type }: SkeletonSectionProps) => {
  const rows = type === 'songs' ? 3 : type === 'drawings' ? 2 : 1;
  
  return (
    <div style={{ padding: '20px 0' }}>
      {/* Section title skeleton */}
      <div style={{
        width: '200px', height: '32px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '4px',
        marginBottom: '24px',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }} />
      
      {/* Card skeletons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <div key={i} style={{
            height: '80px',
            background: 'rgba(255,255,255,0.04)',
            border: '2px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            animation: `skeleton-pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
          }} />
        ))}
      </div>
      
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
