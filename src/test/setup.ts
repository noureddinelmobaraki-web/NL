import { beforeAll, afterEach, vi } from 'vitest';

beforeAll(() => {
  // بعد إصلاح المشكلة 01 صار loadFvTracks() يستدعي fetch.
  // في jsdom لا يوجد خادم -> وعد مرفوض يقتل العامل.
  // نردّ مصفوفة فارغة بدل الرفض.
  if (!('fetch' in globalThis) || !vi.isMockFunction(globalThis.fetch)) {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('nl-music-fv.json')) {
        return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }));
  }
});

afterEach(() => {
  vi.clearAllTimers();
});
