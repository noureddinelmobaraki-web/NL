import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('security and deployment regressions', () => {
  it('allows same-origin Retro iframe without unsafe inline scripts', () => {
    const html = read('index.html');
    expect(html).toContain("frame-src 'self'");
    expect(html).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(html).toContain("'inline-speculation-rules'");
    expect(html).not.toContain("Object.defineProperty(window, 'fetch'");
  });

  it('does not cache failed app-shell responses in the service worker', () => {
    const sw = read('public/sw.template.js');
    expect(sw).toContain('response && response.ok');
    expect(sw).toContain('cache.put(event.request, response.clone())');
  });

  it('uses an Express 5 compatible SPA fallback route', () => {
    const server = read('server.ts');
    expect(server).not.toContain("app.get('*'");
    expect(server).toContain('app.get(/.*/');
  });
});
