import React from 'react';

const GAMES_GEOMETRIC_LOADER_CSS = `
.nl-games-geo-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nl-games-geo-loader {
  --path: #e2e8f0;
  --dot: #5628ee;
  --duration: 3s;
  width: 44px;
  height: 44px;
  position: relative;
  display: inline-block;
  margin: 0 16px;
}

.nl-games-geo-loader::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  display: block;
  background: var(--dot);
  top: 37px;
  left: 19px;
  transform: translate(-18px, -18px);
  animation: nl-dotRect var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
}

.nl-games-geo-loader svg {
  display: block;
  width: 100%;
  height: 100%;
}

.nl-games-geo-loader svg rect,
.nl-games-geo-loader svg polygon,
.nl-games-geo-loader svg circle {
  fill: none;
  stroke: var(--path);
  stroke-width: 10px;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.nl-games-geo-loader svg polygon {
  stroke-dasharray: 145 76 145 76;
  stroke-dashoffset: 0;
  animation: nl-pathTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
}

.nl-games-geo-loader svg rect {
  stroke-dasharray: 192 64 192 64;
  stroke-dashoffset: 0;
  animation: nl-pathRect 3s cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
}

.nl-games-geo-loader svg circle {
  stroke-dasharray: 150 50 150 50;
  stroke-dashoffset: 75;
  animation: nl-pathCircle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
}

.nl-games-geo-loader.triangle {
  width: 48px;
}

.nl-games-geo-loader.triangle::before {
  left: 21px;
  transform: translate(-10px, -18px);
  animation: nl-dotTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
}

@keyframes nl-pathTriangle {
  33% { stroke-dashoffset: 74; }
  66% { stroke-dashoffset: 147; }
  100% { stroke-dashoffset: 221; }
}

@keyframes nl-dotTriangle {
  33% { transform: translate(0, 0); }
  66% { transform: translate(10px, -18px); }
  100% { transform: translate(-10px, -18px); }
}

@keyframes nl-pathRect {
  25% { stroke-dashoffset: 64; }
  50% { stroke-dashoffset: 128; }
  75% { stroke-dashoffset: 192; }
  100% { stroke-dashoffset: 256; }
}

@keyframes nl-dotRect {
  25% { transform: translate(0, 0); }
  50% { transform: translate(18px, -18px); }
  75% { transform: translate(0, -36px); }
  100% { transform: translate(-18px, -18px); }
}

@keyframes nl-pathCircle {
  25% { stroke-dashoffset: 125; }
  50% { stroke-dashoffset: 175; }
  75% { stroke-dashoffset: 225; }
  100% { stroke-dashoffset: 275; }
}
`;

export const GamesGeometricLoader: React.FC = () => {
  return (
    <div className="nl-games-geo-wrap" aria-hidden="true">
      <style>{GAMES_GEOMETRIC_LOADER_CSS}</style>
      <div className="nl-games-geo-loader">
        <svg viewBox="0 0 80 80">
          <circle r="32" cy="40" cx="40" />
        </svg>
      </div>
      <div className="nl-games-geo-loader triangle">
        <svg viewBox="0 0 86 80">
          <polygon points="43 8 79 72 7 72" />
        </svg>
      </div>
      <div className="nl-games-geo-loader">
        <svg viewBox="0 0 80 80">
          <rect height="64" width="64" y="8" x="8" />
        </svg>
      </div>
    </div>
  );
};

export default GamesGeometricLoader;
