# خطة التنفيذ: تطوير الأنبوب الزجاجي المتصل، تحسين أداء الهاتف، إصلاح اختبارات GitHub، وتعميم الزجاج السائل

## 1. إخفاء شريط الأقسام العلوي على الهواتف الذكية
- **إلغاء عرض الشريط العلوي في الهواتف**: تحديث `src/App.tsx` و`src/components/app/AppNavGrid.tsx` وملفات التنسيق (`src/styles/aero-redesign.css` و`src/styles/components/home-polish.css`) لإخفاء شريط الأقسام العلوي (`.nl-top-nav`) تماماً على شاشات الهواتف (`< 768px`) اكتفاءً بشريط التنقل السفلي العائم (`AppMobileNav`).

## 2. إعادة هندسة شريط الأقسام العلوي على الحاسوب كأنبوب زجاجي سائل واحد متصل بدخان أحمر
- **إزالة الخلفية السماوية والمربعات المزدوجة نهائياً**:
  - إزالة قواعد `!important` القديمة في `src/styles/components/home-polish.css` (التي كانت داخل طبقة `layer(features)` وتتفوق على طبقة `layer(liquid)` فتُظهر الدائرة السماوية `#8cebe2` حول `.nl-top-nav__icon` والإطار المربع حول `.nl-top-nav__button`).
  - إزالة الحاوية الخارجية المربعة والجسور المنفصلة لتجنب مظهر "مربع داخل مربع".
- **بناء أنبوب زجاجي سائل موحد (`Single Continuous SVG Liquid Glass Tube`)**:
  - تحديث `src/components/app/AppNavGrid.tsx` و`src/components/NavButton.tsx` لرسم مسار منحنٍ واحد متصل (`<svg className="nl-top-nav__tube-svg">`) يحيط بجميع الأيقونات كجسم زجاجي واحد ينحني ويضيق بانسيابية بين الأيقونات ويتسع حول كل أيقونة.
  - إضافة طبقة **دخان أحمر ملكي خفيف متحرك** (`Crimson Smoke Wisps`) داخل القناع الزجاجي الشفاف للأنبوب مع لمعة حواف ثلاثية الأبعاد (`Specular Rim`).
  - عند تمرير الماوس أو التركيز على أي أيقونة، يتمدد الجزء الخاص بها داخل نفس الأنبوب الزجاجي المتصل بسلاسة ليظهر اسم القسم بجانب الأيقونة المكبرة.

## 3. تحديث نص السيرة الذاتية (Bio) بخط سيريف سينمائي ولون أحمر ملكي متوهج
- **تحديث النص الأساسي**: تعديل السيرة الذاتية في `metadata.json` و`src/components/sections/HeroSection.tsx` (العنصر المحدد `#header-card > p.hero-bio`) لتصبح:
  `"I appreciate the simplest things in the universe and try never to get too used to life. I don't care much for society or what people think—I just do what I love, and this is my website"`
- **التنسيق البصري الاحترافي**: تطبيق خط سيريف سينمائي فاخر (`'Playfair Display', 'Cormorant Garamond', Georgia, serif`) مع تدرج وتوهج باللون **الأحمر الملكي (Royal Red)** يمنح النص حضوراً فنياً واضحاً ومقروئية عالية.

## 4. إصلاح فشل الاختبارين في GitHub Actions CI
- **إصلاح اختبار `Code Quality & Integrity CI / Build & Validate`**:
  - تعديل المتغير `activePressedElements` في `src/utils/liquidGlassPhysics.ts` (السطر 86) من `let` إلى `const` لحل خطأ ESLint (`prefer-const`).
- **إصلاح اختبار `Playwright E2E Tests / test`**:
  - تحديث `.github/workflows/e2e.yml` (وبقية ملفات Workflows التي تستخدم `ubuntu-latest` مع Playwright) لتثبيت بيئة التشغيل على `runs-on: ubuntu-24.04` بدلاً من `ubuntu-latest` (الذي انتقل إلى `ubuntu-26.04` غير المدعوم في `playwright install --with-deps` للإصدار الحالي).

## 5. تحسين سرعة وأداء الصفحة الرئيسية (Home) على الهواتف الذكية
- **تثبيت التأرجح على الهاتف**: تحديث `src/home/motion/useA777StationPhysics.ts` و`src/styles/components/home-motion-system.css` لإيقاف حركة البندول والتأرجح الفيزيائي على شاشات الهواتف (`< 768px`) بحيث تبقى نوافذ وبطاقات الصفحة الرئيسية ثابتة ومستقرة تماماً أثناء التصفح باللمس، مع بقاء التأرجح كاملاً على الحاسوب.
- **ضبط سقف الإطارات على 24 إطاراً بالثانية (24 FPS) وتخفيف الضبابية**:
  - تحديد معدل التحديث الحركي على الهواتف بـ `24 FPS` (`~41.6ms` لكل إطار) في حلقات الحركة (`liquidGlassPhysics.ts` و`NotchIsland.tsx`) وتخفيف طبقات الضبابية والظلال الثقيلة على الهواتف لضمان سلاسة فائقة.

## 6. تعميم الزجاج السائل المتقدم على أزرار الصوت وزر Login ونافذة البروفايل الكاملة
- **أزرار الصوت والطفو (`.fab-button`)**: تحديث زر كتم/تشغيل الصوت العائم (`#orchestrator-portal-root` المحدد) وزر الصعود للأعلى في `src/styles/components/floating-buttons.css` و`src/styles/aero-redesign.css` و`src/styles/themes/midnight-skin.css` ليعملا بنمط الزجاج السائل ثلاثي الأبعاد مع تتبع الإضاءة والتمدد المرن.
- **زر تسجيل الدخول العائم (`.auth-launcher`)**: تحويل زر `Login` الذي يظهر لغير المسجلين (`src/styles/components/auth-launcher.css` و`src/styles/aero-redesign.css`) إلى كبسولة زجاجية سائلة ثلاثية الأبعاد تتكيف مع الثيم النشط وتستجيب للماوس واللمس.
- **نافذة عرض وتعديل البروفايل (`ProfilePage` وجميع نوافذها الفرعية والأزرار)**:
  - تطبيق الزجاج السائل المتقدم على `.profile-overlay`، `.profile-shell`، `.profile-card`، `.profile-section`، حقول الإدخال، شريط أغنية البروفايل (`.nl-theme-song`)، وجميع الأزرار (`.btn-accent`، `.btn-ghost`، `.btn-danger`، `.icon-btn`، `.profile-cam`، `.profile-theme-edit`) بالإضافة إلى النوافذ المنبثقة التابعة لها (`DeleteAccountModal`، `FeaturedPicker`، `ThemeSongPicker`، `InboxPanel`، `AvatarPickerModal`، `AvatarCropModal`، و`AdminDashboard`).
