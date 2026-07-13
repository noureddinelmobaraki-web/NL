import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('src/components/launcher/LauncherBackground.tsx', 'utf8');

describe('Launcher background video contract', () => {
  it('attempts video on every device and keeps hls.js lazy', () => {
    expect(source).not.toContain('shouldUseStillBackground');
    expect(source).not.toContain("import Hls from 'hls.js'");
    expect(source).toContain("await import('hls.js')");
    expect(source).toContain('MANIFEST_PARSED');
    expect(source).toContain('autoPlay');
  });
});
