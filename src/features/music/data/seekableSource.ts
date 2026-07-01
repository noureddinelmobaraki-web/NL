// يوفّر مصدر صوت قابلًا للتمرير الدقيق (seeking) لمحدّد المقطع، بأخفّ حِمل ممكن.
// الاستراتيجية: إعادة استخدام مكتبة الأوفلاين الدائمة إن وُجدت (بلا شبكة)،
// وإلا blob كحل موثوق أخير. يُعاد دائمًا cleanup() لتحرير objectURL فورًا.
// ملاحظة: لا يمسّ offline.ts؛ يقرأ فقط من نفس مخزن الكاش للقراءة.

export interface SeekableSource {
  url: string;
  cleanup: () => void;
}

const OFFLINE_CACHE = 'nl-saved-audio'; // نفس اسم SAVED_CACHE في offline.ts

function makeBlobSource(blob: Blob): SeekableSource {
  const objUrl = URL.createObjectURL(blob);
  return {
    url: objUrl,
    cleanup: () => { try { URL.revokeObjectURL(objUrl); } catch { /* noop */ } },
  };
}

export async function prepareSeekableAudioSource(src: string): Promise<SeekableSource> {
  const noop = () => {};

  // 1) بثّ HLS: مرِّر مباشرةً (hls.js أو المتصفّح يتكفّل بالتمرير).
  if (!src || src.includes('.m3u8')) return { url: src, cleanup: noop };

  // 2) إعادة استخدام مكتبة الأوفلاين الدائمة إن كانت الأغنية محفوظة مسبقًا. بلا تنزيل جديد.
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(OFFLINE_CACHE);
      const hit = await cache.match(src, { ignoreVary: true });
      if (hit) return makeBlobSource(await hit.blob());
    }
  } catch { /* تجاوز إلى التنزيل */ }

  // 3) حل موثوق أخير: تنزيل كامل إلى blob لضمان seeking على الخوادم بلا Range.
  try {
    const r = await fetch(src);
    if (r.ok) return makeBlobSource(await r.blob());
  } catch { /* تجاوز إلى البثّ المباشر */ }

  // 4) احتياط مطلق: بثّ مباشر (قد يكون التمرير محدودًا لكن لا شيء ينكسر).
  return { url: src, cleanup: noop };
}
