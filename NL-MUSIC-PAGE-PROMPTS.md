# NL MUSIC — حزمة برومتات كاملة لإنشاء **صفحة موسيقى خارقة ومستقلة تمامًا**

> ملف واحد يحوي كل البرومتات (00 → 05) بالترتيب. الصفحة الجديدة = `NL Music`، منفصلة كليًا عن قسم الأغاني القديم (`MySongs`). تعمل مع 116 أغنية (m4a على CDN). الهدف: مشغّل يفوق نسخة ويندوز XP بعشر مرات.

---

# ⛔ برومت 00 — السياق المشترك + القواعد الصارمة (الصقه في System Instructions داخل Google AI Studio)

## من أنت وما المهمة
أنت مهندس واجهات أمامية خبير (React 19 + Vite + TypeScript). تعمل على موقع شخصي متقدّم قائم (اسمه NL). مهمتك: **إضافة صفحة موسيقى جديدة مستقلة تمامًا** دون المساس بأي شيء قائم.

## 🔴🔴 القاعدة الصارمة #1 — لا تخرّب شيئًا (NON-NEGOTIABLE)
حدث سابقًا أن وكيلًا حذف أغاني الموقع القديمة واستبدلها. **هذا ممنوع منعًا باتًا.** الأغاني الجديدة تذهب إلى **صفحة منفصلة جديدة فقط**.

### ملفات مقدّسة — ممنوع تعديلها أو حذفها أو لمسها إطلاقًا:
- `public/data/songs.json` — أغاني الموقع القديمة (48). **لا تفتحه ولا تعدّله.**
- أي شيء داخل `src/components/MySongs/` (ومنها `hooks/useMySongsState.ts` و `hooks/useSongsData.ts`).
- `src/components/MusicMood/`، `src/components/NowPlaying/`، `src/components/lyrics/`، `src/components/songs/`.
- أي سكربت في `scripts/`: `generate-sitemap.mjs`، `generate-posters.mjs`، `verify-build.mjs` \`verify-lrc.mjs\`، وأي ملف `generate-share.*`.
- `src/audio/audioManager.ts` — يُستخدم عبر دواله العامة فقط، لا تعدّل محتواه.
- `public/lrc/` — **ممنوع إنشاء ملفات LRC وهمية** (الوكيل السابق أخطأ بفعل ذلك). اقرأ فقط ما هو موجود.

### الملفات الوحيدة المسموح بتعديلها (وبالإضافة فقط — لا حذف):
1. `src/context/navigationController.ts`
2. `src/context/AppContext.tsx`
3. `src/App.tsx`
4. `src/components/app/AppNavGrid.tsx`
5. `src/components/MobileNavBar.tsx`
6. `src/components/layout/GlassModeSwitcher.tsx`
7. `src/i18n/locales/{ar,en,fr}.json` — **إضافة مفاتيح جديدة فقط**، لا تعدّل مفاتيح قائمة.

أي شيء آخر = **إنشاء ملفات جديدة** تحت `src/features/music/` و `public/data/nl-music-fv.json`. لا تلمس غير ذلك.

> بعد كل برومت: شغّل `npm run build` و `npx tsc --noEmit`. إن ظهر خطأ، أصلحه دون المساس بالملفات المقدّسة. **لا تحذف ميزات لتمرير البناء.**

## البنية التقنية للموقع (مؤكّدة من الشيفرة)
- React 19 + Vite + TypeScript + framer-motion + react-i18next (ar/en/fr) + PWA (vite-plugin-pwa). Tailwind utility classes + CSS متغيرات للثيمات.
- **لا يوجد React Router.** التنقل عبر reducer يدوي (`navigationController.ts`). الصفحات تُركّب كـ overlay بـ `z-[8500]` فوق الصفحة الرئيسية.
- Zustand **غير مثبّت حاليًا** — ستضيفه في البرومت 02.
- الثيمات: dark / light / midnight / bit / lite. الزجاج: `backdrop-filter: blur(24px) saturate(180%)`. لون accent بنفسجي `rgba(139,148,255)` + برتقالي `rgba(255,140,66)`.
- تحميل كسول: `lazyWithRetry` (موجود في `src/utils/lazyWithRetry.ts`).
- الصوت العام للموقع: `src/audio/audioManager.ts` (قنوات: bg/song/lens/mebit/video/intro/games/movies/series/tv/retro/xp). صفحة الموسيقى الجديدة لها محرّك صوتي **مستقل** خاص بها، وتتكامل مع audioManager فقط عبر `suppressBg('music_mode')`/`releaseBg('music_mode')` و `stop('bg')`.

## اسماء موحّدة لكل السلسلة (التزم بها حرفيًا)
- معرّف الصفحة (PageId): `'music'`
- مجلد الميزة: `src/features/music/` (منفصل تمامًا عن `src/components/MySongs/`)
- مكوّن الصفحة: `src/features/music/MusicPage.tsx` (export: `export function MusicPage({ onClose }: { onClose: () => void })`)
- ملف البيانات الجديد: `public/data/nl-music-fv.json` (اسم مميّز جدًا — **ليس songs.json ولا songs-fv.json**)
- متجر Zustand: `src/features/music/store/musicStore.ts` (مفتاح persist: `nl-music-store-v1`)
- محرّك الصوت: `src/features/music/engine/audioEngine.ts` (singleton)
- مفاتيح i18n: `nav.music` + namespace جديد `music.*`

## كيف تستخدم هذه السلسلة
نفّذ البرومتات بالترتيب 01 → 02 → 03 → 04 → 05. بعد كل واحد، تأكد أن البناء ينجح ولا شيء قديم تعطّل. البيانات الكاملة للـ 116 أغنية موجودة في **الملحق ألف (Appendix A)** في آخر هذا الملف — انسخها حرفيًا إلى `public/data/nl-music-fv.json`.

---

# 🟢 برومت 01 — الدمج والتوجيه ونقاط الوصول

الهدف: تسجيل صفحة `'music'` جديدة وربطها بثلاث نقاط وصول (صفحة الاستقبال + شريط الموبايل + فقاعة الأوضاع) دون كسر أي صفحة. **كل التعديلات إضافية فقط.**

## 1.1 — `src/context/navigationController.ts` (إضافة سطر واحد)
السطر الحالي:
```ts
export type PageId = 'home' | 'games' | 'cinema' | 'tv' | 'retro' | 'xp';
```
اجعله:
```ts
export type PageId = 'home' | 'games' | 'cinema' | 'tv' | 'retro' | 'xp' | 'music';
```
لا شيء آخر في هذا الملف.

## 1.2 — `src/context/AppContext.tsx` (إضافات فقط)
الملف يتبع نمطًا متكررًا لكل صفحة. أضف الموسيقى بنفس نمط XP:

الـ (1) في `interface AppContextType` — بعد كتلة ويندوز XP أضف:
```ts
  // ── صفحة الموسيقى NL Music ────────────────────────────
  isMusicOpen: boolean;
  openMusic: () => void;
  closeMusic: () => void;
```

الـ (2) في `AppProvider` بجانب `const isXpOpen = nav.activePage === 'xp';` أضف:
```ts
  const isMusicOpen = nav.activePage === 'music';
```

الـ (3) في `useEffect` الخاص بمغادرة الصفحات (حيث توجد أسطر `if (prev === 'xp') {...}`) أضف بعدها:
```ts
    if (prev === 'music') { try { audioManager.releaseBg('music_mode'); } catch {} }
```
> ملاحظة: عند دخول أي صفحة `page !== 'home'` يستدعي الكود تلقائيًا `suppressBg('music_mode')` (لأن reason = `${page}_mode`). لا تحتاج إضافة للدخول. لا توقف قناة audioManager للموسيقى لأن المحرّك مستقل (سيوقِفه hook الصفحة عند الحاجة).

الـ (4) بجانب `openXp/closeXp` أضف:
```ts
  const openMusic   = useCallback(() => navigateTo('music'), [navigateTo]);
  const closeMusic  = useCallback(() => navigateTo('home'), [navigateTo]);
```

الـ (5) في كائن قيمة `<AppContext.Provider value= ... >` أضف المفاتيح الثلاثة: `isMusicOpen, openMusic, closeMusic`.

> ملاحظة: `returnToWelcome` يستخدم RESET ويوقف قنوات audioManager فقط؛ محرّك الموسيقى المستقل سيتوقّف عبر hook الصفحة عند إزالة التركيب (unmount) إن أردت (انظر البرومت 02). لا حاجة لتعديل returnToWelcome.

## 1.3 — `src/App.tsx` (إضافات فقط)
الـ (1) بعد سطر lazy لـ `WindowsXpPage` أضف استيرادًا كسولًا:
```ts
const MusicPage = lazyWithRetry(
  () => import('./features/music/MusicPage').then(m => ({ default: m.MusicPage })),
  'MusicPage',
);
```
الـ (2) في `AppInner` حيث `const { ... isXpOpen, closeXp, endTransition } = useAppContext();` أضف `isMusicOpen, closeMusic`.
الـ (3) في `isAnyPageActive` أضف `|| isMusicOpen`:
```ts
  const isAnyPageActive = isGamesOpen || isTvOpen || isMoviesOpen || isSeriesOpen || isRetroOpen || isXpOpen || isMusicOpen;
```
الـ (4) في سلسلة `AnimatePresence` أضف فرعًا جديدًا **قبل** فرع `: (` الأخير (main-app-screen)، بنفس نمط xp-screen:
```tsx
        ) : loaded && isMusicOpen ? (
          <motion.div
            key="music-screen"
            data-mode={theme}
            initial={/* نفس initial المستخدم في باقي الفروع */ undefined}
            animate={undefined}
            exit={undefined}
            transition={undefined}
            className="fixed inset-0 w-full h-full z-[8500]"
          >
            <SectionErrorBoundary sectionName="music">
              <Suspense fallback={<PageLoader pageType="music" />}>
                <MusicPage onClose={closeMusic} />
              </Suspense>
            </SectionErrorBoundary>
          </motion.div>
```
> مهم: انسخ قيم `initial/animate/exit/transition` الفعلية من فرع `xp-screen` المجاور (هي متطابقة لكل الفروع). لا تخترع قيمًا.
> `PageLoader` يقبل `pageType`؛ إن لم يدعم `"music"` استخدم `"retro"` كبديل (كما تفعل صفحة XP) أو أضف حالة `music` داخل PageLoader إن كان سهلًا دون كسر.

الـ (5) **اختياري (مُستحسَن):** في `LoadingScreen` يوجد `onEnterXp` وأخواته. يمكنك إضافة `onEnterMusic` مماثل إن أردت دخولًا مباشرًا من شاشة التحميل، لكنه غير إلزامي ولا تكسر شيئًا إن تركته. إن أضفته: مرّر prop جديدًا لـ LoadingScreen واستدعِ `openMusic()` داخله (أضف `openMusic` إلى destructure in `MainApp`).

## 1.4 — `src/components/app/AppNavGrid.tsx` (زر في صفحة الاستقبال قرب الأفلام/الألعاب)
الـ (1) في الاستيراد من lucide أضف أيقونة مميّزة (لا تستخدم `Music2` لأنها محجوزة لقسم الأغاني). استخدم `AudioLines` (أو `Disc3` / `Headphones`):
```ts
import { Camera, Music2, Pencil, Aperture, Gamepad2, Clapperboard, Tv, Monitor, AudioLines } from 'lucide-react';
```
الـ (2) في `useAppContext()` أضف `openMusic`:
```ts
  const { openGames, openMovies, openTv, openXp, openMusic } = useAppContext();
```
الـ (3) بعد زر ويندوز XP (آخر `NavButton`) أضف:
```tsx
      <NavButton 
        icon={AudioLines} 
        label={t('nav.music').toUpperCase()} 
        onClick={(e) => {
          setGenieOriginFromElement(e.currentTarget);
          openMusic();
        }} 
        onMouseEnter={() => { import('../../features/music/MusicPage').catch(() => {}); }}
        onPointerDown={() => { import('../../features/music/MusicPage').catch(() => {}); }}
        theme={resolvedTheme} 
      />
```

## 1.5 — `src/components/MobileNavBar.tsx` (تبويب جديد)
الـ (1) أضف `AudioLines` إلى استيراد lucide.
الـ (2) أضف `openMusic` إلى `useAppContext()`.
الـ (3) في مصفوفة `tabs` أضف بعد تبويب `xp`:
```ts
    { id: 'music', Icon: AudioLines, label: t('nav.music'), isMusicPage: true },
```
الـ (4) في `onClick` أضف فرعًا قبل `else { onNavigate(tab.id); }`:
```ts
              else if (tab.isMusicPage) { openMusic(); }
```
> الشريط سيصبح 9 تبويبات؛ grid يتوزّع تلقائيًا (`repeat(${tabs.length}, 1fr)`). تأكّد أن الأيقونات والنص لا تفيض على شاشات صغيرة (قلّل حجم الخط إن لزم عبر CSS الموجود دون كسر).

## 1.6 — `src/components/layout/GlassModeSwitcher.tsx` (خلية في الفقاعة)
الـ (1) أضف أيقونة إلى استيراد lucide: أضف `AudioLines` (بجانب Monitor/Joystick...).
الـ (2) في `useAppContext()` داخل `GlassModeSwitcherInner` أضف:
```ts
    isMusicOpen, openMusic, closeMusic,
```
الـ (3) داخل `<div className="glass-switcher__features-grid">` بعد زر ويندوز XP أضف خلية جديدة (بنفس نمط باقي الخلايا التي تغلق الباقي أولًا):
```tsx
                {/* زر صفحة الموسيقى NL Music */}
                <button
                  type="button"
                  className={`gs-cell gs-icon${isMusicOpen ? ' is-active' : ''}`}
                  role="menuitem"
                  aria-label={isMusicOpen ? 'Close Music' : 'Music'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isGamesOpen) closeGames();
                    if (isMoviesOpen) closeMovies();
                    if (isTvOpen) closeTv();
                    if (isRetroOpen) closeRetro();
                    if (isXpOpen) closeXp();
                    if (isMusicOpen) closeMusic();
                    else { openMusic(); setOpen(false); }
                  }}
                >
                  <AudioLines size={16} />
                </button>
```
> لا تعدّل مصفوفة `SOURCES` (خاصة بصوت الثيم)؛ محرّك الموسيقى مستقل وله أزرار تحكّمه داخل الصفحة.

## 1.7 — i18n: `src/i18n/locales/{ar,en,fr}.json` (إضافة مفاتيح فقط)
داخل كتلة `"nav"` أضف مفتاح `"music"`:
- en: `"music": "Music"`
- ar: `"music": "الموسيقى"`
- fr: `"music": "Musique"`
وأضف namespace جديد على المستوى الأعلى (مثل `xp`) لنصوص الصفحة:
```jsonc
  "music": {
    "title": "NL Music",          // ar: "موسيقى NL" — fr: "NL Musique"
    "subtitle": "...",            // وصف قصير
    "search": "Search songs...",  // ar/fr مقابل
    "library": "Library",
    "playlists": "Playlists",
    "queue": "Queue",
    "recent": "Recently Played",
    "mostPlayed": "Most Played",
    "lyrics": "Lyrics",
    "nowPlaying": "Now Playing",
    "shuffle": "Shuffle", "repeat": "Repeat",
    "sleepTimer": "Sleep Timer", "equalizer": "Equalizer",
    "resume": "Resume", "close": "Close"
  }
```
املأ المقابل العربي والفرنسي بدقة. **لا تعدّل أي مفتاح قائم.**

## 1.8 — هيكل الصفحة المبدئي + ملف البيانات
- أنشئ `src/features/music/MusicPage.tsx`: مكوّن أوّلي يعرض عنوان الصفحة + زر إغلاق (`onClose`) + رسالة "جارٍ التحميل" مؤقتًا. خلفية بـ `position: fixed; inset: 0` تحترم الثيم.
- أنشئ `public/data/nl-music-fv.json` — **انسخ محتواه حرفيًا من الملحق ألف (Appendix A) أدناه**. هذا ملف جديد تمامًا. **لا تلمس songs.json.**

## ✅ معايير القبول للبرومت 01
- `npm run build` ينجح.
- يظهر زر/تبويب/خلية "الموسيقى" في الأماكن الثلاثة، والنقر عليه يفتح `MusicPage` كـ overlay، وزر الإغلاق يعود للرئيسية.
- أغاني الموقع القديمة (قسم MySongs) تعمل كما هي تمامًا — لا تغيير.
- `git diff --stat` يُظهر أن الملفات المقدّسة لم تُمس.

---

# 🟢 برومت 02 — محرّك Web Audio + متجر Zustand (القلب غير المرئي)

الهدف: بناء المحرّك الصوتي الاحترافي (singleton خارج React) + متجر الحالة + MediaSession + الثبات. **لا UI نهائية هنا** — فقط محرّك + متجر + hooks + لوحة اختبار debug مؤقتة.

## 2.1 — التبعيات
```bash
npm i zustand jsmediatags hls.js
npm i -D @types/jsmediatags
```
(إن كان `hls.js` مثبّتًا مسبقًا في الموقع لا تعد تثبيته). أغاني صفحتنا بصيغة m4a مباشرة فلا تحتاج HLS، لكن أبقِه جاهزًا لدعم مصادر m3u8 اختياريًا.

## 2.2 — بنية المجلدات
```
src/features/music/
  engine/ audioEngine.ts  audioGraph.ts  eqPresets.ts  crossfade.ts  mediaSession.ts  types.ts
  store/  musicStore.ts  selectors.ts
  hooks/  useMusicEngine.ts  useNowPlaying.ts
  data/   loadSongs.ts
  __debug__/ EngineDebugPanel.tsx
```

## 2.3 — الأنواع `engine/types.ts`
```ts
export interface RawSongFv {
  id: number; file: string; title: string; artist: string;
  url: string; urlJsdelivr: string; lrcFile: string | null; hasLrc: boolean;
}
export interface Track {
  id: string;            // `fv-${id}`
  title: string; artist: string; album?: string;
  src: string;           // url (m4a مباشر)
  srcFallback?: string;  // urlJsdelivr
  kind: 'file' | 'hls';
  lrcUrl?: string; hasLrc: boolean;
  durationSec?: number; coverColor?: string;
  source: 'fv' | 'upload' | 'remote';
}
```

## 2.4 — `data/loadSongs.ts`
- اجلب `${import.meta.env.BASE_URL}data/nl-music-fv.json` (لاحظ الاسم الجديد) عبر `fetch` مع try/catch.
- حوّل كل `RawSongFv` → `Track`: `id: \`fv-${r.id}\``، `src: r.url`، `srcFallback: r.urlJsdelivr`، `kind:'file'`، `lrcUrl: r.hasLrc && r.lrcFile ? \`${import.meta.env.BASE_URL}lrc/${r.lrcFile}\` : undefined`، `source:'fv'`.
- `coverColor`: HSL مشتق من hash بسيط للعنوان (لون ثابت مميّز لكل أغنية).
- صدّر `loadFvTracks(): Promise<Track[]>`.

## 2.5 — الرسم البياني `engine/audioGraph.ts`
السلسلة:
```
MediaElementSource(A|B) → InputGain → [EQ: 10×BiquadFilter] → StereoPanner
  → preGain(A|B) → masterGain → ChannelSplitter → analyserL/analyserR (VU)
                              ↘ Analyser (طيف رئيسي) → destination
```
`eqPresets.ts`:
```ts
export const EQ_FREQS = [32,64,125,250,500,1000,2000,4000,8000,16000] as const;
// الأول lowshelf، الأخير highshelf، البقية peaking (Q≈1.0)، gain ∈ [-12,+12] dB
export const EQ_PRESETS: Record<string, number[]> = {
  'Flat':[0,0,0,0,0,0,0,0,0,0], 'Bass Boost':[7,6,5,3,1,0,0,0,0,0],
  'Treble Boost':[0,0,0,0,0,1,3,5,6,7], 'Vocal':[-2,-1,0,2,4,4,3,1,0,-1],
  'Rock':[5,4,3,1,-1,-1,1,3,4,5], 'Pop':[-1,0,2,4,4,3,1,0,-1,-2],
  'Jazz':[4,3,1,2,-1,-1,0,1,2,3], 'Classical':[5,4,3,2,-1,-1,0,2,3,4],
  'Hip-Hop':[6,5,4,2,1,-1,1,2,3,4], 'Electronic':[6,5,2,0,-2,1,1,3,4,6],
};
```
- `buildEqChain(ctx)` تُرجع 10 عقد متسلسلة + طرفي input/output. دعم **bypass** (تجاوز السلسلة). AnalyserNode: `fftSize:2048` (قابل 512–4096)، `smoothingTimeConstant:0.8`.
- **استخدم AnalyserNode للتصوير (لا AudioWorklet/ScriptProcessor)** — الأفضل أداءً والأقل latency على الموبايل.

## 2.6 — `engine/audioEngine.ts` (Singleton)
`export const audioEngine = new AudioEngine()`. **خارج React تمامًا.**
- عنصرا `<audio>` (A,B) لـ crossfade/gapless، كلٌّ له `MediaElementSource` + `preGain`، يلتقيان عند `masterGain`.
- **حرج (CORS):** اضبط `audio.crossOrigin='anonymous'` قبل ضبط `src`، وإلا `MediaElementSource` يُخرج أصفارًا (لا EQ ولا تصوير). ملفات CDN (GitHub Pages/jsDelivr) ترسل `Access-Control-Allow-Origin: *` فتعمل.
- **ملاحظة Safari:** `createMediaElementSource` مع HLS/MSE معطوب (gain/EQ بلا تأثير)، وiOS أحيانًا مع الملفات. نفّذ كشف قدرات: إن فشل الربط شغّل عبر `<audio>` مباشرة (EQ/visualizer معطّلان برفق مع إشعار خفيف) مع إبقاء كل التحكمات تعمل.

واجهة المحرّك:
```ts
interface AudioEngineApi {
  init(): void; resumeContext(): Promise<void>;
  load(track: Track, opts?: { autoplay?: boolean }): Promise<void>;
  play(): Promise<void>; pause(): void; toggle(): void; seek(sec: number): void;
  setVolume(v: number): void;  // 0..1 مع منحنى لوغاريتمي للإدراك
  setMuted(m: boolean): void; setRate(r: number): void; // preservesPitch=true
  setPan(p: number): void; setEqGain(i: number, db: number): void;
  setEqPreset(name: string): void; setEqBypass(b: boolean): void;
  setCrossfadeSec(s: number): void; preloadNext(track: Track): void;
  getAnalyser(): AnalyserNode | null;
  getStereoAnalysers(): { left: AnalyserNode; right: AnalyserNode } | null;
  // callbacks يربطها المتجر:
  onTimeUpdate?: (t: number, d: number, buffered: number) => void;
  onEnded?: () => void; onTrackError?: (msg: string) => void; onPlayState?: (p: boolean) => void;
  destroy(): void;
}
```
السلوكيات المطلوبة:
1. **Autoplay policy:** أنشئ/استأنف AudioContext داخل gesture (أول play) + مستمع أول لمسة/نقرة.
2. **Crossfade/gapless (`crossfade.ts`):** إذا `crossfadeSec>0` ابدأ العنصر الخامل المحمّل مسبقًا عند (duration−crossfadeSec) و`linearRampToValueAtTime` على preGain للعنصرين، ثم بدّل الأدوار. إذا `=0` فـ gapless بالتبديل الفوري عند `ended`. استخدم `cancelScheduledValues` قبل أي ramp. تلاشٍ 15ms عند seek/pause/skip لمنع طقطقة pop.
3. repeat: `off|all|one`؛ shuffle مع سجل منع تكرار قريب.
4. **A–B Loop**، **Sleep Timer** (إيقاف أو fade-out آخر 20s).
5. **fallback**: عند فشل `src` جرّب `srcFallback` (jsDelivr) تلقائيًا ثم أبلِغ خطأ قابل للعرض.
6. حدّث الوقت عبر `requestAnimationFrame` (أنعم من timeupdate) وأوقفه عند pause. اعرض buffered لشريط seek مزدوج الطبقة.

## 2.7 — `engine/mediaSession.ts`
- `MediaMetadata({title,artist,album,artwork})` + action handlers (play/pause/prev/next/seekbackward/seekforward/seekto/stop) + `setPositionState` (try/catch) + `playbackState`.
- **artwork لـ iOS:** ولّد 128/256/512 عبر canvas من `coverColor` + شعار NL (iOS يرفض الصور الكبيرة)، وحرّر الـ objectURL القديم بـ `revokeObjectURL`.

## 2.8 — متجر `store/musicStore.ts`
`create` + middleware `persist` (مفتاح `nl-music-store-v1`). **خزّن التفضيلات والاستئناف فقط.**
```ts
interface MusicState {
  tracks: Track[]; status:'idle'|'loading'|'ready'|'error'; error?: string;
  currentId?: string; isPlaying: boolean; currentTime: number; duration: number; buffered: number;
  volume: number; muted: boolean; rate: number; pan: number;
  repeat:'off'|'all'|'one'; shuffle: boolean; crossfadeSec: number;
  eqGains: number[]; eqPreset: string; eqBypass: boolean;
  queue: string[]; queueIndex: number;
  lastTrackId?: string; lastPositionSec?: number;
  actions: { setTracks; playTrack(id); togglePlay; next; prev; seek; setVolume; setMuted; setRate; setPan; setEqGain; setEqPreset; setEqBypass; setRepeat; toggleShuffle; setCrossfade; enqueue; clearQueue; /* ... */ };
}
```
- الإجراءات تستدعي `audioEngine`، والمحرّك يكتب الحالة عبر callbacks. المتجر = مصدر الحقيقة للـ UI، المحرّك = مصدر الحقيقة للصوت.
- عند الإقلاع: استعد التفضيلات وطبّقها على المحرّك بعد init؛ اعرض زر "استئناف" لـ lastTrackId (لا تشغّل تلقائيًا).
- `partialize`: استثنِ tracks/status/currentTime/duration/buffered/isPlaying/error.

`store/selectors.ts`: `useIsPlaying, useCurrentTrack, useProgress, useVolume, useEq, useQueue` — كلٌّ عبر selector لتقليل re-renders.

## 2.9 — Hooks
- `useMusicEngine.ts`: يُستدعى مرة واحدة في `MusicPage`. عند mount: `audioEngine.init()` + جلب `loadFvTracks()` + ربط callbacks + تطبيق التفضيلات + `audioManager.suppressBg('music_mode')`. عند unmount: `releaseBg('music_mode')` + إيقاف rAF (لا تدمّر المحرّك إلا إن أردت إيقاف التشغيل عند الخروج).
- `useNowPlaying.ts`: selector خفيف `{track,isPlaying,progress,duration}`.

## 2.10 — `__debug__/EngineDebugPanel.tsx` (مؤقتة، تُحذف في 03)
أول 20 أغنية (أزرار) + play/pause + seek + volume + pan + 10 EQ + presets + bypass + crossfade + next/prev/shuffle/repeat + canvas يرسم `getByteFrequencyData`. تظهر خلف `?debugAudio=1`.

## ✅ معايير القبول 02
`build` + `tsc --noEmit` ينجحان. `?debugAudio=1` يحمّل 116 أغنية، التشغيل يعمل، EQ يغيّر الصوت، panner يحرّك يمين/يسار، canvas يرسم الطيف، crossfade يعمل. التفضيلات تُحفظ/تُستعاد. MediaSession يظهر في النظام. fallback لـ jsDelivr يعمل. لا تسريب عقد صوتية عند التبديل.

---

# 🟢 برومت 03 — التصميم الخارق: واجهة زجاجية + Visualizer ثلاثي الأبعاد

الهدف: تحويل `MusicPage` إلى تجربة بصرية تفوق أي مشغّل — بإلهام awwwards (Music & Sound)، muz.li top-100 2025، Codrops 2025 audio visualizers، siteinspire. **لا تمس أي ملف مقدّس؛ كل العمل داخل `src/features/music/`.**

## 3.1 — التبعيات
```bash
npm i three gsap
npm i -D @types/three
```
حمّل Three.js و Visualizer بـ lazy/dynamic import داخل الصفحة فقط (لا تزد حجم الحزمة الرئيسية).

## 3.2 — البنية التخطيطية (App Shell)
```
src/features/music/
  MusicPage.tsx              // الغلاف + تخطيط grid
  components/
    TopBar.tsx               // بحث، ثيم، إغلاق
    Sidebar.tsx              // المكتبة/القوائم/الطابور
    StageView.tsx            // الواجهة الرئيسية (غلاف + visualizer + كلمات)
    PlayerBar.tsx            // شريط التحكم السفلي
    Visualizer3D.tsx         // Three.js + GSAP (lazy)
    VisualizerCanvas2D.tsx   // بديل خفيف (موبايل/reduced-motion)
    EqualizerPanel.tsx  PanPanel.tsx  SettingsSheet.tsx
    MiniPlayer.tsx           // عند التصغير + PiP
  styles/ music.css
```

## 3.3 — اللغة البصرية (Glassmorphism حديث)
- خلفية: تدرّج متحرّك بطيء (mesh gradient) مشتق من `coverColor` للأغنية الحالية مع انتقال GSAP ناعم عند تغيير الأغنية.
- بطاقات زجاجية: `background: color-mix(in srgb, var(--surface) 70%, transparent); backdrop-filter: blur(24px) saturate(180%); border:1px solid rgba(255,255,255,.12); border-radius:20px; box-shadow:0 8px 40px rgba(0,0,0,.35)`.
- تحترم ثيمات الموقع (dark/light/midnight/bit/lite) عبر متغيرات CSS الموجودة. ثيم bit = حواف حادة/بكسل بدل الزجاج.
- حركة دخول الصفحة عبر framer-motion (متسقة مع باقي صفحات الموقع). احترم `prefers-reduced-motion`.
- RTL: الواجهة تعمل عربي/إنجليزي/فرنسي (`dir` حسب i18n).

## 3.4 — Visualizer3D.tsx (Three.js + GSAP audio-reactive)
مستوحى من Codrops "Coding a 3D Audio Visualizer with Three.js, GSAP & Web Audio API" (يونيو 2025) و `Interactive-Particles-Music-Visualizer`:
- اقرأ الطيف من `audioEngine.getAnalyser()` عبر `getByteFrequencyData` داخل render loop.
- وضعان (أو أكثر) قابلان للتبديل:
  1. **Particle Sphere/Field**: آلاف الجسيمات (BufferGeometry + ShaderMaterial)، تزاح بالترددات (bass → نبض نصف القطر، treble → وميض).
  2. **Reactive Terrain/Bars**: شبكة أعمدة/تضاريس ترتفع بالترددات.
- استخدم GSAP لانتقالات الألوان/الكاميرا عند تغيير الأغنية، وsmoothing (lerp) لمنع ارتجاف.
- **الأداء:** `renderer.setPixelRatio(Math.min(devicePixelRatio,2))`؛ أوقِف render loop عند pause/التبويب مخفي (`visibilitychange`)؛ حرّر geometry/material/renderer عند unmount. على الموبايل/ضعيف الجهاز أو reduced-motion → استخدم `VisualizerCanvas2D` تلقائيًا.
- WebGL context lost handler (التقاط `webglcontextlost` وإعادة التهيئة).

## 3.5 — VisualizerCanvas2D.tsx (بديل خفيف)
Canvas 2D يرسم أعمدة طيف + موجة + VU ستيريو (من `getStereoAnalysers`). خفيف جدًا للموبايل. يحترم reduced-motion (حركة خفيفة).

## 3.6 — PlayerBar.tsx (شريط التحكم)
- غلاف مصغّر + عنوان/فنان (scroll عند الطول) + أزرار prev/play/next/shuffle/repeat.
- شريط seek مزدوج الطبقة (buffered + progress) مع معاينة وقت عند hover/drag، يدعم اللمس.
- volume (مع كتم) + سرعة (0.5×–2×) + crossfade + أزرار EQ/Pan/Lyrics/Queue/Mini/PiP.
- أزرار دائرية زجاجية، تأثير hover هادئ (انظر برومت 05 للتفاعلات الهادئة).

## 3.7 — EqualizerPanel + PanPanel + SettingsSheet
- Equalizer: 10 منزلقات عمودية (−12..+12 dB) + قائمة presets + زر bypass + رسم منحنى الاستجابة. حيّ (يسمع التغيير فورًا).
- PanPanel: مقبض L↔R + مؤشر VU ستيريو.
- SettingsSheet: crossfade، gapless، sleep timer، جودة visualizer (auto/3D/2D/off)، reduced-motion override، اختيار الوضع.

## 3.8 — MiniPlayer + Picture-in-Picture
- وضع مصغّر عائم (زاوية) يبقى عند تصغير الواجهة.
- **PiP للفيديو:** ارسم الغلاف+visualizer على `<canvas>` ثم `canvas.captureStream()` → `<video>` مخفي → `requestPictureInPicture()`. يعرض الأغنية الحالية خارج المتصفح. اكتشف الدعم وأخفِ الزر إن غير مدعوم.

## ✅ معايير القبول 03
- الصفحة تبدو احترافية على مستوى awwwards، visualizer ثلاثي الأبعاد يتفاعل مع الصوت بسلاسة 60fps على الديسكتوب.
- الموبايل يستخدم 2D تلقائيًا، لا تجمّد. reduced-motion محترم.
- لا تسريب ذاكرة GPU عند فتح/إغلاق الصفحة مرارًا. حُذفت EngineDebugPanel.
- كل الملفات المقدّسة سليمة.

---

# 🟢 برومت 04 — القوائم/الطابور/المكتبة/البحث + الكلمات + ID3 + استيراد/تصدير + الاختصارات

الهدف: تحويل الصفحة إلى مشغّل كامل الميزات. **كل شيء داخل `src/features/music/`؛ لا تمس الملفات المقدّسة.**

## 4.1 — المكتبة والبحث `components/LibraryView.tsx`
- عرض الـ 116 أغنية (قائمة/شبكة قابلة للتبديل). بحث فوري (عنوان/فنان) مع debounce 150ms + إبراز المطابق.
- بحث ضبابي (fuzzy) خفيف (مثل ترتيب بسيط بـ score) دون مكتبة خارجية ثقيلة.
- فرز: العنوان/الفنان/الأحدث/الأكثر تشغيلًا. تصفية حسب الفنان (تجميع تلقائي).
- نقر = تشغيل؛ قائمة سياق (نقر يمين/مطوّل): تشغيل التالي، إضافة للطابور، إضافة لقائمة، مفضلة، نسخ رابط.

## 4.2 — الطابور `components/QueueView.tsx`
- الطابور الحالي + التالي، إعادة ترتيب بالسحب (drag, يدعم اللمس)، حذف عنصر، مسح، "التشغيل التالي". حالة shuffle تُظهر الترتيب الفعلي.

## 4.3 — القوائم `store/playlists.ts` + `components/PlaylistsView.tsx`
- إنشاء/تسمية/حذف/ترتيب قوائم. إضافة/حذف أغاني. غلاف تلقائي (فسيفساء ألوان أول 4 أغاني).
- تُحفظ في Zustand persist (`nl-music-store-v1`) — **لا localStorage خارجي يصطدم بمفاتيح الموقع.** قوائم خاصة: المفضلة، آخر تشغيل، الأكثر تشغيلًا (عدّاد playCount).

## 4.4 — الكلمات المتزامنة `components/LyricsView.tsx` + `lyrics/parseLrc.ts`
- حلّل LRC (`[mm:ss.xx]`) و SBV بسيط إن لزم. اجلب `track.lrcUrl` فقط إن `hasLrc` (أغنيتان فقط لديهما LRC حاليًا). **ممنوع إنشاء ملفات LRC وهمية** — إن لا توجد كلمات اعرض "لا توجد كلمات".
- تمرير تلقائي + إبراز السطر الحالي + نقر السطر = seek. تأثير تلاشٍ ناعم.
- لصق LRC يدوي (اختياري): حقل نص يحفظ الكلمات في Zustand persist للأغنية (لا تكتب ملفات على القرص).

## 4.5 — ID3 / الوسوم `data/readTags.ts`
- لأغاني الموقع (m4a) الوسوم منظّفة (`-map_metadata -1`)، فالبيانات تأتي من JSON. للملفات المستوردة استخدم `jsmediatags` لاستخراج العنوان/الفنان/الألبوم/الغلاف (APIC → objectURL، حرّره عند الإزالة).

## 4.6 — استيراد محلي `components/ImportSheet.tsx`
- اسحب/أسقِط أو اختر ملفات صوت (mp3/m4a/flac/wav/ogg). أنشئ `Track` بـ `source:'upload'`، `src: URL.createObjectURL(file)`، استخرج الوسوم.
- هذه الملفات مؤقتة (object URLs) ولا تُرفع؛ خزّن الوسوم فقط في IndexedDB (اختياري) مع تنبيه أنها تحتاج إعادة اختيار بعد إعادة التحميل. لا تمس بيانات الموقع.

## 4.7 — استيراد/تصدير الإعدادات `data/portable.ts`
- تصدير: قوائم + مفضلة + إعدادات EQ + crossfade إلى JSON قابل للتنزيل (`nl-music-backup-<date>.json`).
- استيراد: تحقّق من البنية (حقل `version`) ثم دمج/استبدال داخل المتجر فقط.

## 4.8 — الاختصارات `hooks/useHotkeys.ts`
تُفعّل داخل الصفحة فقط (وليس داخل input/textarea). تُزال عند unmount:
- Space: play/pause | →/←: seek ±5s | Shift+→/←: التالي/السابق | ↑/↓: volume
- M: كتم | S: shuffle | R: repeat | L: lyrics | Q: queue | E: equalizer
- F: ملء الشاشة | / : تركيز البحث | Esc: إغلاق لوحة/الصفحة (onClose)
- 0-9: القفز إلى نسبة مئوية؛ اعرض لوحة اختصارات (?).

## ✅ معايير القبول 04
- البحث/الفرز/التصفية تعمل على 116. الطابور وإعادة الترتيب تعمل. القوائم تُحفظ وتُستعاد.
- الكلمات تتزامن للأغنيتين اللتين تملكان LRC، وغيرهما تعرض "لا توجد كلمات". لم يُنشأ أي ملف LRC على القرص.
- الاستيراد المحلي يشغّل ملفات المستخدم. التصدير/الاستيراد يعمل. الاختصارات تعمل داخل الصفحة فقط.
- صفر مساس بالملفات المقدّسة.

---

# 🟢 برومت 05 — الصقل + الأداء + التفاعلات الهادئة + الاختبارات + QA

الهدف: جعل الصفحة سريعة، مصقولة، وخالية من العيوب — دون المساس بأي شيء قائم.

## 5.1 — الأداء
- **Virtual scrolling** للمكتبة (116 الآن، وأكثر مع الاستيراد): استخدم windowing خفيف (مثل IntersectionObserver أو حساب يدوي) دون مكتبة ثقيلة إن أمكن.
- **Web Worker** للبحث الضبابي/الفرز/تحليل LRC عند الأحمال الكبيرة (اختياري إن لزم).
- تحميل كسول لـ Three.js/Visualizer (من 03). صور الأغلفة lazy + decode async.
- تقليل re-renders: selectors دقيقة + `React.memo` للصفوف + `useCallback`. لا تضع currentTime في context يعيد رسم كل شيء (استخدم selector معزول لشريط التقدم).
- أوقف visualizer/rAF عند `document.hidden` أو pause. قيّد pixelRatio.

## 5.2 — التفاعلات الهادئة (Calm / refined micro-interactions)
- انتقالات قصيرة (150–250ms) ease-out، لا حركات مبالغة. hover خفيف (رفع ظل + إضاءة حافة).
- تأثير ripple/scale خفيف عند النقر. انتقال غلاف الأغنية (shared layout) بين المكتبة والواجهة.
- **تحترم `prefers-reduced-motion` تمامًا**: عطّل الحركات الكبيرة والـ 3D parallax.
- haptics خفيف على الموبايل (`navigator.vibrate`) اختياري عند next/prev.

## 5.3 — إمكانية الوصول (a11y)
- أدوار ARIA للأزرار/المنزلقات (`role=slider`, `aria-valuenow/min/max`). تركيز مرئي واضح. إدارة تركيز عند فتح/إغلاق اللوحات (focus trap).
- تباين ألوان كافٍ في كل الثيمات. دعم القارئ الصوتي لأسماء الأغاني/الحالة.

## 5.4 — المتانة والأخطاء
- `SectionErrorBoundary` يلتقط أخطاء الصفحة (موجود في App.tsx). داخل الصفحة: حالات فارغة/تحميل/خطأ لكل قائمة.
- تعامل مع فشل الشبكة/CDN: رسالة + إعادة محاولة + fallback jsDelivr (من 02).
- لا تترك أي `console.error` في الإنتاج. نظّف EngineDebugPanel.

## 5.5 — الاختبارات (داخل src/features/music فقط)
- Vitest لـ: `parseLrc`، `loadSongs` (mapping)، منطق الطابور/shuffle/repeat، منحنى الصوت، portable import/export.
- اختبار سلوك (إن وُجد Testing Library): فتح الصفحة، تشغيل أغنية، بحث، إضافة للطابور.
- **لا تعدّل إعداد الاختبار العام للموقع بما يكسر اختبارات قائمة.**

## 5.6 — قائمة QA النهائية (نفّذها وأبلِغ بالنتائج)
- [ ] `npm run build` + `tsc --noEmit` + lint — بلا أخطاء، دون تعطيل أي ميزة.
- [ ] `git status` / `git diff --stat`: **فقط** الـ 6 ملفات التكامل + i18n مُعدّلة (بالإضافة)، وباقي التغييرات ملفات جديدة تحت `src/features/music/` و `public/data/nl-music-fv.json`.
- [ ] `public/data/songs.json` **لم يتغيّر** (تحقّق بـ `git diff public/data/songs.json` → فارغ).
- [ ] `src/components/MySongs/**`, `scripts/**`, `src/audio/audioManager.ts` **لم تتغيّر**.
- [ ] لا ملفات LRC جديدة في `public/lrc/`. لا ملفات `generate-share.*` جديدة.
- [ ] قسم الأغاني القديم (MySongs) يعمل بـ 48 أغنية كما كان.
- [ ] صفحة الموسيقى تفتح من الأماكن الثلاثة، وتشغّل الـ 116، وكل الميزات (EQ/pan/crossfade/visualizer/queue/playlists/lyrics/shortcuts) تعمل.
- [ ] الموبايل: أداء سلس، 2D fallback، لمس يعمل.
- [ ] لا تسريب ذاكرة عند فتح/إغلاق متكرر.

## ✅ التسليم النهائي
الصفحة جاهزة، مستقلة، تفوق مشغّل ويندوز XP، ولم يتعطّل أي شيء قائم في الموقع.
