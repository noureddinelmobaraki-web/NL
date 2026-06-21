const SUPPORTED = ['ar', 'en', 'fr'] as const;

export function normLang(lng?: string): 'ar' | 'en' | 'fr' {
  const base = (lng || 'en').toLowerCase().split('-')[0];
  return (SUPPORTED as readonly string[]).includes(base) ? (base as any) : 'en';
}

export function tmdbLang(lng?: string): string {
  const m: Record<string, string> = { ar: 'ar-SA', fr: 'fr-FR', en: 'en-US' };
  return m[normLang(lng)];
}
