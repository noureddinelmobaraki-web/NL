import { memo } from 'react';

interface Props { path: string }

export const TetherRope = memo(({ path }: Props) => {
  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };
  return (
    <svg style={svgStyle} aria-hidden="true">
      <path d={path} className="nl-lyr-rope nl-lyr-rope--halo" />
      <path d={path} className="nl-lyr-rope" />
    </svg>
  );
});
TetherRope.displayName = 'TetherRope';
