import { supabase } from '../../../config/supabase';

const BUCKET = 'avatars';
const PUBLIC_MARKER = '/storage/v1/object/public/avatars/';

/** يرفع Blob (WebP 512²) لمجلد المستخدم ويُعيد الرابط العام. */
export async function uploadAvatarBlob(userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/${Date.now()}.webp`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '3600' });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * يحذف الصورة القديمة من التخزين **فقط** إن كانت مستضافة عندنا (bucket avatars).
 * يتجاهل روابط CDN (الأفاتارات الافتراضية) أو أي رابط خارجي. آمن ولا يُفشل العملية.
 */
export async function deleteOldAvatarIfOwned(oldUrl: string | null | undefined): Promise<void> {
  if (!oldUrl || !oldUrl.includes(PUBLIC_MARKER)) return;
  const path = oldUrl.split(PUBLIC_MARKER)[1]?.split('?')[0];
  if (!path) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    /* ثانوي — لا نُفشل النجاح بسببه */
  }
}
