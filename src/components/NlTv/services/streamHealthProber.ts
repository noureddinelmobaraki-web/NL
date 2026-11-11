const healthCache = new Map<string, { ok: boolean; latencyMs: number; checkedAt: number }>();

export async function probeStreamHealth(
  streamUrl: string,
  timeoutMs = 3800
): Promise<{ ok: boolean; latencyMs: number }> {
  if (!streamUrl || !streamUrl.startsWith('https://')) {
    return { ok: false, latencyMs: 9999 };
  }

  const cached = healthCache.get(streamUrl);
  if (cached && Date.now() - cached.checkedAt < 1000 * 60 * 10) {
    return { ok: cached.ok, latencyMs: cached.latencyMs };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const res = await fetch(streamUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - start);
    const ok = res.ok || res.type === 'opaque';
    healthCache.set(streamUrl, { ok, latencyMs, checkedAt: Date.now() });
    return { ok, latencyMs };
  } catch {
    const latencyMs = Math.round(performance.now() - start);
    healthCache.set(streamUrl, { ok: false, latencyMs, checkedAt: Date.now() });
    return { ok: false, latencyMs };
  } finally {
    window.clearTimeout(timer);
  }
}
