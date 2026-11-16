import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import arLocales from './locales/ar.json';
import enLocales from './locales/en.json';

export function applyDirection(lng: string): void {
  const base = (lng || 'en').split('-')[0];
  const dir = base === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', base);
}

const resources = {
  ar: { translation: arLocales },
  en: { translation: enLocales },
};

let frBundlePromise: Promise<void> | null = null;

function ensureFrenchBundleLoaded(): Promise<void> {
  if (i18n.hasResourceBundle('fr', 'translation')) {
    return Promise.resolve();
  }
  if (!frBundlePromise) {
    frBundlePromise = import('./locales/fr.json')
      .then((m) => {
        i18n.addResourceBundle('fr', 'translation', m.default ?? m, true, true);
      })
      .catch(() => {
        frBundlePromise = null;
      });
  }
  return frBundlePromise;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['ar', 'en', 'fr'],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    lowerCaseLng: true,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      // لا تتبع لغة الجهاز إطلاقاً ← الإنجليزية هي الافتراضية دائماً.
      // يبقى الاختيار الصريح للمستخدم (querystring أو المبدّل) محفوظاً.
      order: ['querystring', 'localStorage'],
      caches: ['localStorage'],
    },
  });

const initialLng = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
if (initialLng === 'fr') {
  void ensureFrenchBundleLoaded().then(() => {
    void i18n.changeLanguage('fr');
  });
}

// Apply layout direction and lazy-load French bundle when language changes
i18n.on('languageChanged', (lng) => {
  applyDirection(lng);
  if ((lng || '').split('-')[0] === 'fr') {
    void ensureFrenchBundleLoaded();
  }
});

// Apply initial language direction on module load
applyDirection(i18n.resolvedLanguage || i18n.language || 'en');

export default i18n;
