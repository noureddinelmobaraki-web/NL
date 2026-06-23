import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useDocumentMeta(titleKey: string, descKey: string) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // احفظ القيم الحالية لاسترجاعها لاحقاً
    const prevTitle = document.title;
    const descEl = document.querySelector('meta[name="description"]');
    const prevDesc = descEl?.getAttribute("content") ?? null;
    const prevLang = document.documentElement.lang;
    const prevDir = document.documentElement.dir;

    document.title = `${t(titleKey)} | Cinema NL`;
    if (descEl) descEl.setAttribute("content", t(descKey));
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir();

    return () => {
      document.title = prevTitle;
      if (descEl && prevDesc !== null) descEl.setAttribute("content", prevDesc);
      document.documentElement.lang = prevLang;
      document.documentElement.dir = prevDir;
    };
  }, [t, titleKey, descKey, i18n.language, i18n]);
}
