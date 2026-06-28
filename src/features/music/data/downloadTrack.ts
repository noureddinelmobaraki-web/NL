const PROFILE_IMG = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp';

let _ff: any = null;
let _ffLoading: Promise<any> | null = null;
let _busy = false;

// Build the "NL <title>" base name, sanitized for filesystems (no extension).
function safeBase(title: string): string {
  return ('NL ' + (title || 'track')).replace(/[\\/:*?"<>|]+/g, '_').trim();
}

function saveBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}

// Render the unified profile image into a square JPEG (cover art) used for every track.
async function siteCoverJpeg(): Promise<Uint8Array> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = PROFILE_IMG;
  });
  const S = 600;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c0e18'; ctx.fillRect(0, 0, S, S);
  const r = Math.max(S / img.width, S / img.height);
  const w = img.width * r, h = img.height * r;
  ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  const blob: Blob = await new Promise(res => c.toBlob(b => res(b!), 'image/jpeg', 0.9));
  return new Uint8Array(await blob.arrayBuffer());
}

async function ensureFfmpeg(): Promise<any> {
  if (_ff) return _ff;
  if (_ffLoading) return _ffLoading;
  _ffLoading = (async () => {
    // @ts-ignore
    const { FFmpeg } = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    // @ts-ignore
    const util = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
    const ff = new FFmpeg();
    const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
    await ff.load({
      coreURL: await util.toBlobURL(base + '/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await util.toBlobURL(base + '/ffmpeg-core.wasm', 'application/wasm'),
    });
    (ff as any)._util = util;
    _ff = ff;
    return ff;
  })();
  return _ffLoading;
}

// Layer A: transcode AAC/m4a -> MP3 (libmp3lame) with embedded unified cover + "NL <title>" tag.
async function transcodeToMp3(url: string, title: string) {
  const ff = await ensureFfmpeg();
  const util = (ff as any)._util;
  await ff.writeFile('in.m4a', await util.fetchFile(url));

  let haveCover = false;
  try { await ff.writeFile('c.jpg', await siteCoverJpeg()); haveCover = true; } catch {}

  const tag = 'NL ' + (title || 'track');
  const args = haveCover
    ? ['-i', 'in.m4a', '-i', 'c.jpg',
       '-map', '0:a:0', '-map', '1:0',
       '-c:a', 'libmp3lame', '-q:a', '2',
       '-c:v', 'copy', '-id3v2_version', '3',
       '-metadata', 'title=' + tag,
       '-metadata:s:v', 'title=Album cover',
       '-metadata:s:v', 'comment=Cover (front)',
       '-disposition:v:0', 'attached_pic',
       'out.mp3']
    : ['-i', 'in.m4a',
       '-map', '0:a:0',
       '-c:a', 'libmp3lame', '-q:a', '2',
       '-id3v2_version', '3',
       '-metadata', 'title=' + tag,
       'out.mp3'];

  await ff.exec(args);
  const data = await ff.readFile('out.mp3');
  saveBlob(new Blob([data.buffer], { type: 'audio/mpeg' }), safeBase(title) + '.mp3');
  try { ff.deleteFile('in.m4a'); ff.deleteFile('out.mp3'); ff.deleteFile('c.jpg'); } catch {}
}

// Layer B: keep original m4a (no transcode), just embed the unified cover + "NL <title>" tag.
async function embedM4a(url: string, title: string) {
  const ff = await ensureFfmpeg();
  const util = (ff as any)._util;
  await ff.writeFile('in.m4a', await util.fetchFile(url));

  const tag = 'NL ' + (title || 'track');
  let args = ['-i', 'in.m4a', '-c', 'copy', '-metadata', 'title=' + tag, 'out.m4a'];
  try {
    await ff.writeFile('c.jpg', await siteCoverJpeg());
    args = ['-i', 'in.m4a', '-i', 'c.jpg', '-map', '0:a', '-map', '1:v',
            '-c', 'copy', '-disposition:v:0', 'attached_pic',
            '-metadata', 'title=' + tag, 'out.m4a'];
  } catch {}

  await ff.exec(args);
  const data = await ff.readFile('out.m4a');
  saveBlob(new Blob([data.buffer], { type: 'audio/mp4' }), safeBase(title) + '.m4a');
  try { ff.deleteFile('in.m4a'); ff.deleteFile('out.m4a'); ff.deleteFile('c.jpg'); } catch {}
}

export async function downloadTrack(track: { url: string; title: string }, onState?: (s: 'start' | 'done' | 'error') => void) {
  if (!track?.url || _busy) return;
  _busy = true;
  onState?.('start');
  try {
    try {
      // Preferred: a real MP3 file with embedded cover + "NL <title>".
      await transcodeToMp3(track.url, track.title);
    } catch {
      // If transcoding isn't possible, at least embed the cover + tidy the title (stays .m4a).
      await embedM4a(track.url, track.title);
    }
    onState?.('done');
  } catch {
    // Last resort: plain copy of the original file.
    try {
      const r = await fetch(track.url);
      saveBlob(await r.blob(), safeBase(track.title) + '.m4a');
      onState?.('done');
    } catch {
      onState?.('error');
    }
  } finally {
    _busy = false;
  }
}
