import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

type VitalsEntry = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
};

function handleVital(entry: VitalsEntry) {
  // في development: اطبع في console مع color coding
  if (import.meta.env.DEV) {
    const colors: Record<string, string> = {
      good: '\x1b[32m',           // أخضر
      'needs-improvement': '\x1b[33m', // أصفر
      poor: '\x1b[31m',           // أحمر
    };
    const reset = '\x1b[0m';
    const color = colors[entry.rating] ?? '';
    console.log(
      `[CWV] ${color}${entry.name}: ${Math.round(entry.value)}ms — ${entry.rating}${reset}`
    );
  }

  // في production: خزّن آخر القياسات في localStorage للمراجعة الذاتية
  if (!import.meta.env.DEV) {
    try {
      const KEY = 'nl-vitals-v1';
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({
        name: entry.name,
        value: Math.round(entry.value),
        rating: entry.rating,
        page: window.location.pathname,
        ts: Date.now(),
      });
      // احتفظ بآخر 50 قياس فقط لمنع تضخّم localStorage
      const trimmed = arr.slice(-50);
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      // localStorage ممتلئ أو معطّل — تجاهل
    }
  }
}

export function reportWebVitals(): void {
  onCLS(handleVital);
  onFCP(handleVital);
  onLCP(handleVital);
  onTTFB(handleVital);
  onINP(handleVital);
}
