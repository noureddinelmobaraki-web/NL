const colorCache = new Map<string, string>();

export function extractDominantColor(
  imgElement: HTMLImageElement,
  callback: (color: string) => void
): void {
  const w = 40, h = 40;
  let ctx: any;
  try {
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    if (!(canvas instanceof OffscreenCanvas)) { canvas.width = w; canvas.height = h; }
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error();
    ctx.drawImage(imgElement, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const points: number[][] = [];
    for (let i = 0; i < data.length; i += 16) { // Sample step for speed
      if (data[i+3] > 128) points.push([data[i], data[i+1], data[i+2]]);
    }
    if (!points.length) return callback('20, 20, 30');

    // k-means (k=3)
    let centroids = points.slice(0, 3);
    for (let iter = 0; iter < 5; iter++) {
      const clusters: number[][][] = [[], [], []];
      for (const p of points) {
        let bestIdx = 0, minDist = Infinity;
        for (let i = 0; i < 3; i++) {
          const d = Math.hypot(p[0]-centroids[i][0], p[1]-centroids[i][1], p[2]-centroids[i][2]);
          if (d < minDist) { minDist = d; bestIdx = i; }
        }
        clusters[bestIdx].push(p);
      }
      centroids = clusters.map((c, i) => c.length ? [
        c.reduce((s, x) => s + x[0], 0) / c.length,
        c.reduce((s, x) => s + x[1], 0) / c.length,
        c.reduce((s, x) => s + x[2], 0) / c.length
      ] : centroids[i]);
    }
    const res = centroids.reduce((a, b) => (a[0]+a[1]+a[2] > b[0]+b[1]+b[2] ? a : b));
    callback(`${Math.floor(res[0])}, ${Math.floor(res[1])}, ${Math.floor(res[2])}`);
  } catch (e) {
    callback('20, 20, 30');
  }
}

export function extractDominantColorCached(
  src: string,
  callback: (color: string) => void
): void {
  if (colorCache.has(src)) {
    callback(colorCache.get(src)!);
    return;
  }

  // Prevents leaking memory
  if (colorCache.size > 50) {
    const firstKey = colorCache.keys().next().value;
    if (firstKey !== undefined) {
      colorCache.delete(firstKey);
    }
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    extractDominantColor(img, (color) => {
      colorCache.set(src, color);
      callback(color);
    });
  };
  img.onerror = () => callback('20, 20, 30'); // fallback
  img.src = src;
}
