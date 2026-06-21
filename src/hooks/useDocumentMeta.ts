import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useDocumentMeta(titleKey: string, descKey: string) {
  const { t, i18n } = useTranslation();
  
  useEffect(() => {
    document.title = `${t(titleKey)} | Cinema NL`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute("content", t(descKey));
    }
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir();
  }, [t, titleKey, descKey, i18n.language, i18n]);
}
