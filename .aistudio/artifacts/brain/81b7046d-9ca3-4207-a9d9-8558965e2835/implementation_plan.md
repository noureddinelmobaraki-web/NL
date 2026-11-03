# خطة تطوير نظام المشاهدة المباشرة الشامل للأفلام والمسلسلات داخل المعرض السينمائي (In-App Gallery Player & 2Embed Integration)

## 1. نظرة عامة على التحديثات المطلوبة
بناءً على الصور المرفقة وإجاباتك، سنقوم بتطوير نافذة تفاصيل الأفلام والمسلسلات (`MoviesPage.tsx` و `MovieSourcesModal.tsx` و `cinema.css`) لتدعم المشاهدة المباشرة داخل المعرض العلوي (16:9) جنبًا إلى جنب مع قائمة السيرفرات الحالية:

1. **تفعيل مزدوج عند الضغط على زر `Watch Now`**:
   - عند الضغط على زر `Watch Now`، سيقوم بفتح قائمة السيرفرات المتفرعة (`Server 1` .. `Server 7`) مع بطاقة التنبيه (`TIP`) كما يفعل حاليًا.
   - **وفي نفس اللحظة**، سيقوم بتشغيل الفيلم أو المسلسل مباشرة داخل المعرض العلوي (`lg-cinema-gallery-stage`) مكان عرض التريلر، ليصبح المعرض مشغلًا مزدوجًا للتريلر وللمشاهدة الكاملة مع دعم ملء الشاشة (`Fullscreen`) والتبديل السلس بين السيرفرات المدمجة.

2. **إخفاء جميع الأزرار من فوق شاشة المعرض أثناء التشغيل ورفعها للأعلى**:
   - عند تشغيل الفيلم أو التريلر داخل المعرض (`lg-cinema-gallery-stage`)، **تختفي جميع العناصر والأزرار والنصوص من فوق شاشة العارض تمامًا** بحيث يعرض المعرض الفيديو فقط بدون أي عوائق.
   - يصعد زر التريلر (`Watch Trailer` / `Watch Movie`) وزر ملء الشاشة (`Fullscreen`) وزر الإغلاق/الرجوع (`✕`) إلى **شريط علوي زجاجي مستقل فوق المعرض مباشرةً**.

3. **نظام روابط التشغيل الشامل (2Embed & Multi-Server Embed Engine)**:
   - دعم روابط التضمين المباشرة من `2embed.cc` و `2embed.skin` وبقية السيرفرات بالاعتماد التلقائي على معرف `IMDb ID` (`tt...`) أو معرف `TMDB ID` مباشرة لضمان عمل المشغل دائمًا:
     - **للأفلام (Movies)**:
       - `https://www.2embed.cc/embed/{imdbId_or_tmdbId}`
       - `https://www.2embed.skin/embed/{imdbId_or_tmdbId}`
     - **للمسلسلات حسب الموسم والحلقة (TV Series by Season & Episode)**:
       - `https://www.2embed.cc/embedtv/{imdbId_or_tmdbId}&s={season}&e={episode}`
       - `https://www.2embed.skin/embedtv/{imdbId_or_tmdbId}&s={season}&e={episode}`
     - **للمسلسلات بنظام الموسم الكامل (Complete TV Season)**:
       - `https://www.2embed.cc/embedtvfull/{imdbId_or_tmdbId}`
   - إمكانية التبديل بين السيرفرات داخل العارض نفسه أو فتح أي سيرفر في نافذة خارجية عبر أزرار `Server 1..7`.

4. **شريط زجاجي لاختيار المواسم والحلقات للمسلسلات (TV Series Season & Episode Bar)**:
   - عند فتح أي مسلسل (`mediaType === 'tv'`)، يظهر شريط زجاجي أنيق مباشرة أسفل المعرض لاختيار:
     - **الموسم (`Season 1`, `Season 2`, ...)** مع جلب قائمة حلقات الموسم تلقائيًا.
     - **الحلقة (`Ep 1`, `Ep 2`, ...)** مع عرض اسم ورقم الحلقة، أو تفعيل خيار **الموسم الكامل (`Full Season`)** عبر `embedtvfull`.
   - اختيار أي موسم أو حلقة يقوم بتحديث المشغل داخل المعرض وتحديث روابط السيرفرات فورًا.

---

## 2. الملفات التي سيتم تعديلها

### أ. `/src/components/Movies/MovieSourcesModal.tsx`
- تحديث دالة `buildSources` وخطاف `useResolvedImdbSources` لدعم كل من `imdbId` و `tmdbId` (`item.id`) بالإضافة إلى معاملات المسلسلات (`season`, `episode`, `fullSeason`).
- إضافة دعم `2embed.cc` و `2embed.skin` بالمسارات الرسمية (`embed/`, `embedtv/{id}&s={s}&e={e}`, `embedtvfull/{id}`).
- ربط زر `Watch Now` وأزرار السيرفرات بخاصية تفعيل المشاهدة المباشرة داخل المعرض العلوي (`onStartInAppWatch`) مع إبقاء فتح السيرفرات المتفرعة ونافذة `TIP` كما هي تمامًا.

### ب. `/src/components/Movies/MoviesPage.tsx`
- إضافة حالات التحكم بالمشغل المدمج داخل المعرض (`isWatchingInGallery`, `activeGalleryServerIdx`, `selectedSeason`, `selectedEpisode`, `isFullSeasonMode`, `seasonEpisodes`).
- نقل شريط الأزرار العلوية (`Watch Trailer`, `Watch Movie`, `Fullscreen`, `✕`) ليصعد **فوق المعرض** عند تشغيل الفيلم أو التريلر، وإخفاء الملصق والنصوص الترويجية من داخل شاشة المعرض أثناء التشغيل ليبقى الفيديو صافيًا 100%.
- إضافة شريط اختيار المواسم والحلقات الزجاجي أسفل المعرض للمسلسلات، مع جلب بيانات الحلقات من TMDB (`/tv/{id}/season/{s}`) ودعم خيار `Full Season`.

### ج. `/src/styles/components/cinema.css`
- إضافة تنسيقات الشريط العلوي المرتفع فوق المعرض (`lg-cinema-gallery-top-bar`)، وتنسيقات شريط المواسم والحلقات الزجاجي (`lg-cinema-tv-selector-bar`)، ودعم وضع ملء الشاشة (`Fullscreen`) بسلاسة على جميع أحجام الشاشات.
