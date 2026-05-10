export function extractDominantColor(
  imgElement: HTMLImageElement,
  callback: (color: string) => void
): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  canvas.width = 10;
  canvas.height = 10;
  ctx.drawImage(imgElement, 0, 0, 10, 10);
  
  const data = ctx.getImageData(0, 0, 10, 10).data;
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // Skip near-black and near-white pixels
    const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
    if (brightness > 20 && brightness < 230) {
      r += data[i];
      g += data[i+1];
      b += data[i+2];
      count++;
    }
  }
  
  if (count === 0) { callback('40, 40, 60'); return; }
  
  r = Math.floor(r / count);
  g = Math.floor(g / count);
  b = Math.floor(b / count);
  
  callback(`${r}, ${g}, ${b}`);
}
