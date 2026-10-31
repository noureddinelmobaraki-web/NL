# خطة إضافة الأغاني الـ 14 الجديدة وإعادة ترتيب القائمة

## نظرة عامة
إضافة **14 أغنية جديدة** في صدارة قائمة الأغاني الخاصة بالموقع مع استبدال النسخة القديمة من أغنية **`ink`** (التي كانت في المرتبة 34 بنفس رابط يوتيوب `9sbkfd12gI4`) بالنسخة الجديدة **`INK`** في المرتبة 6 لمنع التكرار، ليصبح إجمالي الأغاني **61 أغنية** مرتبة من `1` إلى `61`، مع توفير ملفات الترجمة الزمنية (`.sbv`) وروابط يوتيوب وبيانات الفهرسة والبحث.

---

## الترتيب الجديد للأغاني في المقدمة (1 إلى 14)

| الترتيب (`id`) | اسم الأغنية (`title`) | رابط البث الصوتي (`url`) | ملف الترجمة (`lrcFile`) | معرف يوتيوب (`song-youtube.json`) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `100 ans` | `.../songs/song_01/index.m3u8` | `100 ans.sbv` | `-sDZtcRZEag` |
| **2** | `20260916 184153275` | `.../songs/song_02/index.m3u8` | `20260916 184153275.sbv` | `lfnKMMFeu5k` |
| **3** | `Apologize for my weird mix` | `.../songs/song_03/index.m3u8` | `Apologize for my weird mix.sbv` | `DufbYqHpJP8` |
| **4** | `Dekhla` | `.../songs/song_04/index.m3u8` | `Dekhla.sbv` | `yyejPkrXBeI` |
| **5** | `gha Noel` | `.../songs/song_05/index.m3u8` | `gha Noel.sbv` | `QvhkgA3cN4Y` |
| **6** | `INK` | `.../songs/song_06/index.m3u8` | `INK.sbv` | `9sbkfd12gI4` |
| **7** | `L’Morphiniya 35` | `.../songs/song_07/index.m3u8` | `L’Morphiniya 35.sbv` | `vLSuVXtcq-s` |
| **8** | `Money Call` | `.../songs/song_08/index.m3u8` | `Money Call.sbv` | `8YCr-D18FrI` |
| **9** | `Pyramid` | `.../songs/song_09/index.m3u8` | `Pyramid.sbv` | `Wy6OjKvXkYE` |
| **10** | `Python` | `.../songs/song_10/index.m3u8` | `Python.sbv` | `0llIMet7IN0` |
| **11** | `Warner brothers` | `.../songs/song_11/index.m3u8` | `Warner brothers.sbv` | `JttVnQPRM_E` |
| **12** | `ألا كل ماشية الخيزلى` | `.../songs/song_12/index.m3u8` | `ألا كل ماشية الخيزلى.sbv` | `9S9R872FJaM` |
| **13** | `بث تجريبي` | `.../songs/song_13/index.m3u8` | `بث تجريبي.sbv` | `pCZVGsM2Ywk` |
| **14** | `غَيْرُ مُجْدٍ فِي مِلَّتِي وَاعْتِقَادِي` | `.../songs/song_14/index.m3u8` | `غَيْرُ مُجْدٍ فِي مِلَّتِي وَاعْتِقَادِي.sbv` | `w_PFK6wS_84` |

- الأغاني الـ 47 المتبقية (بعد إزالة النسخة القديمة المكررة من `ink`) ستُعاد فهرستها بالتسلسل من **`id: 15`** إلى **`id: 61`** بنفس ترتيبها الأصلي مع الحفاظ على روابطها وخلفياتها (`bgIndex`) وملفات ترجمتها وروابط يوتيوب الخاصة بها.

---

## الخطوات التنفيذية والملفات المستهدفة

### 1. ملفات الترجمة الزمنية (`/public/lrc/*.sbv` ودعم الروابط المباشرة)
- جلب وحفظ ملفات الترجمة الـ 14 (`sub.sbv`) من خادم R2 (`https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/songs/song_01..14/sub.sbv`) داخل مجلد `/public/lrc/` بأسماء الأغاني المقابلة لضمان عمل محرك الكلمات (`LyricsEngine`) واجتياز فحص البناء (`scripts/verify-lrc.mjs`).
- تحديث خطافات تحميل الكلمات (`/src/hooks/useSongLyrics.ts`، `/src/components/MySongs/hooks/useSongsData.ts`، `/src/components/MySongs/hooks/useLrcHoverPreload.ts`) لدعم روابط الترجمة المباشرة أو المحلية بسلاسة تامة.

### 2. تحديث قائمة الأغاني وروابط يوتيوب في الصفحة الرئيسية (`Home`) وبيانات XP
- **`/public/data/songs.json`**:
  - وضع الأغاني الـ 14 الجديدة في المقدمة (`id: 1` إلى `id: 14`) مع تفعيل `hasLrc: true` وربط `lrcFile` وتوزيع `bgIndex` بشكل متناسق.
  - إعادة ترقيم الأغاني الـ 47 السابقة من `id: 15` إلى `id: 61` (مع استبعاد `ink` القديمة رقم 34 منعاً للتكرار).
- **`/public/data/song-youtube.json`**:
  - ربط المعرفات `"1"` إلى `"14"` بمعرفات يوتيوب الجديدة، وتحديث مفاتيح الأغاني `"15"` إلى `"61"` لتطابق الترقيم الجديد لكل أغنية بدقة.
- **مزامنة بيانات Windows XP (`VLC` و `My Music`)**:
  - تمرير القائمة المحدثة (`songs.json` وملفات الترجمة) عبر قناة الاتصال (`postMessage`) في `/src/components/WindowsXp/WindowsXpPage.tsx` وتحديث ملفات البيانات المشتركة بحيث تتوفر القائمة الجديدة بالترتيب نفسه.

### 3. تحديث الفهرسة والبحث (`Search Index` & `SEO Data`)
- إعادة توليد وتحديث `/public/data/search-index.json` و `/public/songs-jsonld.json` و `/public/sitemap.xml` عبر سكريبتات البناء (`scripts/seo-generate.mjs`) ليظهر الترتيب الجديد (`own-1` إلى `own-61`) بصور مصغرات يوتيوب وروابط الاستماع المباشرة.

### 4. التحقق والاختبار
- تشغيل `scripts/verify-lrc.mjs` و `compile_applet` و `lint_applet` للتأكد من سلامة جميع الروابط والملفات وعدم وجود أي أخطاء برمجية.
