import type { CSSProperties } from 'react';
import type { TetherGeometry } from './useTetherGeometry';

const svgStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: 10070,
};

export function TetherRope({ geo }: { geo: TetherGeometry }) {
  return (
    <svg style={svgStyle} aria-hidden="true">
      <path d={geo.ropePath} className="nl-tether-rope" fill="none" />
      <circle cx={geo.anchorPoint.x} cy={geo.anchorPoint.y} r={5} className="nl-tether-knot" />
      <circle cx={geo.boxPoint.x} cy={geo.boxPoint.y} r={5} className="nl-tether-knot" />
    </svg>
  );
}
