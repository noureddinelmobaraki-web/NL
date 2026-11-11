import type { SpacetoonPlanetConfig } from './spacetoonPlanetTextures';

const proceduralTextureCache = new Map<string, string>();

/**
 * Generates an equirectangular procedural planet texture on an HTML5 canvas
 * as an instant offline fallback if CDN textures fail or while loading.
 */
export function getProceduralPlanetDataUrl(planet: SpacetoonPlanetConfig): string {
  const cached = proceduralTextureCache.get(planet.id);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    return planet.textureUrl;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return planet.textureUrl;

    const grad = ctx.createLinearGradient(0, 0, 256, 128);
    grad.addColorStop(0, planet.coronaColor);
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, planet.coronaColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Draw atmospheric bands and craters
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)';
      const y = (i / 14) * 128;
      ctx.fillRect(0, y, 256, 5 + (i % 4));
    }

    const dataUrl = canvas.toDataURL('image/png');
    proceduralTextureCache.set(planet.id, dataUrl);
    return dataUrl;
  } catch {
    return planet.textureUrl;
  }
}
