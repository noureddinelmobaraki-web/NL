# خطة تحسين واجهة الزجاج السائل ومشغل البث المتسلسل (Movies & Series)

## 1. إصلاح وتجميل أزرار الشريط العلوي والتنقل (`cinema.css` & `MoviesPage.tsx`)
- **تحويل الأزرار العلوية في اليمين (البحث، قائمة المشاهدة، الصوت، الإغلاق) إلى كبسولات دائرية زجاجية واضحة**:
  - ضبط `.lg-cinema-icon-pill` بأبعاد دائرية متناسقة (`width: 40px; height: 40px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center`) بدلاً من المربعات الصغيرة التي ظهرت سابقاً، مع حواف مضيئة ولمعة زجاجية سائلة (`backdrop-filter: blur(18px) saturate(185%)`).
- **إصلاح كبسولة التبديل بين `Movies` و`Series`**:
  - ضبط `.lg-cinema-pill-group` ليكون أفقياً بالكامل (`display: inline-flex; align-items: center; border-radius: 9999px; padding: 4px; gap: 4px`) مع كبسولة نشطة دائرية الحواف (`border-radius: 9999px`).
- **تحويل أزرار التصنيفات وأزرار الإجراءات (`Watch Now` / `Details & Trailer`) إلى كبسولات دائرية انسيابية (`border-radius: 9999px`)**:
  - إزالة الحواف المربعة الحادة من كافة الأزرار في الهيدر والبانر ونافذة التفاصيل.

## 2. معالجة تلاشي صورة البانر الرئيسي والخلفيات بدون قطع حاد (`cinema.css` & `MoviesPage.tsx`)
- **تلاشي تدريجي ناعم للصورة الكبيرة نحو السواد في الأسفل**:
  - استخدام قناع تلاشي متعدد التدريجات (`mask-image: linear-gradient(to bottom, black 0%, black 52%, rgba(0,0,0,0.6) 76%, transparent 100%)`) بالإضافة إلى طبقة تدرج لوني عميقة تمتد بسلاسة إلى خلفية صفوف الأفلام السفلية (`#05070e`) بحيث تذوب الصورة تدريجياً في السواد دون أي خط أو قطع حاد.
  - إصلاح `.lg-cinema-ambient-bg` عبر تحديد `background-size: cover; background-position: center; filter: blur(70px) brightness(0.28);` لمنع تكرار الصورة في الخلفية خلف الصفوف.
- **إزالة الإطار الصندوقي المحيط بنص الفيلم الرئيسي في البانر**:
  - عرض عنوان الفيلم، التقييم، السنة، القصة، وأزرار الكبسولات الزجاجية مباشرة فوق التلاشي التدريجي للصورة مع تظليل نصي سينمائي ناعم بدون صندوق محيط.

## 3. تطوير نظام البث المتسلسل ومشغل `MovieSourcesModal.tsx`
- **ضبط خصائص `<iframe>` لمنع الحظر**:
  - عدم استخدام أي خاصية `sandbox` نهائياً.
  - تعيين `referrerPolicy="no-referrer"` لإخفاء نطاق الإحالة (`Referer`) عن سيرفرات البث.
- **ترتيب السيرفرات المتسلسل الذكي (Iframe-Friendly أولاً ثم السيرفرات البديلة)**:
  1. **2Embed** (`https://www.2embed.cc/embed/{imdbId}` للأفلام و`https://www.2embed.cc/embedtvfull/{imdbId}` للمسلسلات) — يدعم التضمين المباشر كما في الصورة المرفقة.
  2. **MultiEmbed** (`https://multiembed.mov/?video_id={imdbId}`).
  3. **VidSrc ICU** (`https://vidsrc.icu/embed/{movie|tv}/{imdbId}`).
  4. **VidSrc XYZ** (`https://vidsrc.xyz/embed/{movie|tv}/{imdbId}`).
  5. **AutoEmbed** (`https://autoembed.co/{movie|tv}/imdb/{imdbId}`).
  6. **StreamIMDb / IMDb.su** (مع إمكانية فتحها عبر **نافذة مشغل عائمة في وسط الشاشة** تتجاوز قيود `X-Frame-Options` نهائياً، أو تجريب تمريرها عبر بروكسي Cloudflare Worker `https://broad-block-7bd7.nordinegb2018.workers.dev/?url=...`).
- **شريط تحكم زجاجي علوي وسفلي داخل نافذة المشغل**:
  - أزرار كبسولات دائرية للتبديل الفوري بين السيرفرات بضغطة واحدة، مع زر **"التالي تلقائياً / جرب السيرفر التالي"** وزر **"نافذة مشغل عائمة (Popup Player)"** لتشغيل `StreamIMDb` أو `IMDb.su` أو أي سيرفر في نافذة سينمائية تتوسط الشاشة إذا حجب المتصفح الإطار المدمج.
