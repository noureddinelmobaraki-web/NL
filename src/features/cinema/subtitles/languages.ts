export const SUBTITLE_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "ar", label: "العربية" }, { code: "en", label: "English" }, { code: "fr", label: "Français" },
  { code: "es", label: "Español" }, { code: "de", label: "Deutsch" }, { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" }, { code: "tr", label: "Türkçe" }, { code: "nl", label: "Nederlands" },
  { code: "ru", label: "Русский" }, { code: "fa", label: "فارسی" }, { code: "ur", label: "اردو" },
  { code: "hi", label: "हिन्दी" }, { code: "id", label: "Bahasa Indonesia" }, { code: "ms", label: "Bahasa Melayu" },
  { code: "ja", label: "日本語" }, { code: "ko", label: "한국어" }, { code: "zh", label: "中文" },
  { code: "he", label: "עברית" }, { code: "pl", label: "Polski" }, { code: "sv", label: "Svenska" },
  { code: "el", label: "Ελληνικά" }, { code: "ro", label: "Română" },
];

export const getLanguageLabel = (code: string): string =>
  SUBTITLE_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();

const ISO3: Record<string, string> = {
  ara: "ar", eng: "en", fre: "fr", fra: "fr", spa: "es", ger: "de", deu: "de", ita: "it", por: "pt",
  pob: "pt", tur: "tr", dut: "nl", nld: "nl", rus: "ru", per: "fa", fas: "fa", urd: "ur", hin: "hi",
  ind: "id", may: "ms", msa: "ms", jpn: "ja", kor: "ko", chi: "zh", zho: "zh", heb: "he", pol: "pl",
  swe: "sv", gre: "el", ell: "el", rum: "ro", ron: "ro",
};
const NAMES: Array<[RegExp, string]> = [
  [/arab/i, "ar"], [/engl/i, "en"], [/fren|fran/i, "fr"], [/span|espa/i, "es"], [/germ|deut/i, "de"],
  [/ital/i, "it"], [/portu/i, "pt"], [/turk/i, "tr"], [/dutch/i, "nl"], [/russ/i, "ru"], [/pers|fars/i, "fa"],
];

export function normalizeLangCode(raw?: string): string {
  const clean = String(raw || "").trim().toLowerCase();
  if (!clean) return "und";
  const base = clean.split(/[-_]/)[0];
  if (base.length === 2) return base;
  if (ISO3[base]) return ISO3[base];
  for (const [re, code] of NAMES) if (re.test(clean)) return code;
  return base;
}

/** Legacy single-byte encodings used by old subtitle files, per language. */
export const LEGACY_ENCODING: Record<string, string> = {
  ar: "windows-1256", fa: "windows-1256", ur: "windows-1256", he: "windows-1255", ru: "windows-1251",
  tr: "windows-1254", el: "windows-1253", pl: "windows-1250", ro: "windows-1250",
};
