/**
 * بوابة رؤية مبسّطة (مصدر حقيقة واحد):
 * - live: توجد أغنية 'song' تعمل الآن (isPlaying) → نوتش الاسم + المشغّل.
 * - orb:  وإلا → الأورب الزجاجي الصغير فقط.
 *
 * ملاحظة: لم نعد نخفي الجزيرة داخل المودالات/المعارض؛ يجب أن تظهر فوق كل الصفحات.
 * والانكماش عند الإيقاف يأتي تلقائيًا لأن hasSong يعتمد على isPlaying.
 */
export type NotchMode = 'orb' | 'live';

export function useNotchMode(args: { hasSong: boolean }): NotchMode {
  return args.hasSong ? 'live' : 'orb';
}
