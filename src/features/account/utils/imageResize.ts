// أدوات معالجة الصور في المتصفح (بلا مكتبات — Canvas فقط).
// الناتج دائماً 512×512 WebP. sharp ممنوع هنا (Node فقط).

export const AVATAR_SIZE = 512;
export const AVATAR_WEBP_QUALITY = 0.85;

export interface CropRect {
  sx: number;
  sy: number;
  size: number;
}

/** يحمّل ملفاً إلى عنصر صورة قابل للرسم (ويُعيد objectURL لتحريره لاحقاً). */
export function loadImageElement(file: File): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve({ img, objectUrl });
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to read image'));
    };
    img.src = objectUrl;
  });
}

/** يرسم قصّاً مربّعاً من مصدر إلى canvas مقاس 512 ويُعيد Blob WebP. */
export async function cropToSquareWebp(
  source: CanvasImageSource,
  crop: CropRect,
  outSize: number = AVATAR_SIZE,
  quality: number = AVATAR_WEBP_QUALITY,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas غير مدعوم');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, crop.sx, crop.sy, crop.size, crop.size, 0, 0, outSize, outSize);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', quality),
  );
  if (!blob) throw new Error('فشل ترميز الصورة');
  return blob;
}

/** قصّ مركزي تلقائي (احتياطي). */
export async function centerCropToWebp(file: File): Promise<Blob> {
  const { img, objectUrl } = await loadImageElement(file);
  try {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    return await cropToSquareWebp(img, { sx, sy, size: side });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
