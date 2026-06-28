import { Mp3Encoder } from '@breezystack/lamejs';

const PROFILE_IMG = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp';
let _busy = false;

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

// Unified cover -> square JPEG bytes.
async function coverJpeg(): Promise<Uint8Array> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = rej; im.src = PROFILE_IMG;
  });
  const S = 600;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c0e18'; ctx.fillRect(0, 0, S, S);
  const r = Math.max(S / img.width, S / img.height);
  const w = img.width * r, h = img.height * r;
  ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  const blob: Blob = await new Promise(res => c.toBlob(b => res(b!), 'image/jpeg', 0.9));
  return new Uint8Array(await blob.arrayBuffer());
}

function f32ToI16(f: Float32Array): Int16Array {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function encodeMp3(audio: AudioBuffer): Uint8Array {
  const channels = Math.min(2, audio.numberOfChannels);
  const enc = new Mp3Encoder(channels, audio.sampleRate, 192);
  const left = f32ToI16(audio.getChannelData(0));
  const right = channels > 1 ? f32ToI16(audio.getChannelData(1)) : left;
  const block = 1152;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += block) {
    const l = left.subarray(i, i + block);
    const r = right.subarray(i, i + block);
    const buf = channels > 1 ? enc.encodeBuffer(l, r) : enc.encodeBuffer(l);
    if (buf.length) chunks.push(new Uint8Array(buf));
  }
  const end = enc.flush();
  if (end.length) chunks.push(new Uint8Array(end));
  let len = 0; chunks.forEach(c => (len += c.length));
  const out = new Uint8Array(len); let o = 0;
  chunks.forEach(c => { out.set(c, o); o += c.length; });
  return out;
}

// Minimal ID3v2.3 tag: TIT2 (title) + APIC (front cover JPEG).
function id3(title: string, jpeg: Uint8Array): Uint8Array {
  const te = new TextEncoder();
  const frame = (id: string, data: Uint8Array) => {
    const h = new Uint8Array(10); h.set(te.encode(id), 0);
    const s = data.length;
    h[4] = (s >>> 24) & 0xff; h[5] = (s >>> 16) & 0xff; h[6] = (s >>> 8) & 0xff; h[7] = s & 0xff;
    const out = new Uint8Array(10 + s); out.set(h, 0); out.set(data, 10); return out;
  };
  const t = te.encode(title);
  const tit2 = new Uint8Array(1 + t.length); tit2[0] = 0x03; tit2.set(t, 1); // UTF-8
  const mime = te.encode('image/jpeg');
  const apic = new Uint8Array(1 + mime.length + 1 + 1 + 1 + jpeg.length);
  let p = 0; apic[p++] = 0x00; apic.set(mime, p); p += mime.length; apic[p++] = 0x00;
  apic[p++] = 0x03; /* front cover */ apic[p++] = 0x00; /* empty desc */ apic.set(jpeg, p);
  const f1 = frame('TIT2', tit2), f2 = frame('APIC', apic);
  const body = new Uint8Array(f1.length + f2.length);
  body.set(f1, 0); body.set(f2, f1.length);
  const sz = body.length;
  const head = new Uint8Array(10); head.set(te.encode('ID3'), 0); head[3] = 0x03; head[4] = 0; head[5] = 0;
  head[6] = (sz >>> 21) & 0x7f; head[7] = (sz >>> 14) & 0x7f; head[8] = (sz >>> 7) & 0x7f; head[9] = sz & 0x7f;
  const out = new Uint8Array(10 + body.length); out.set(head, 0); out.set(body, 10); return out;
}

export async function downloadTrack(
  track: { url: string; title: string },
  onState?: (s: 'start' | 'done' | 'error') => void,
) {
  if (!track?.url || _busy) return;
  _busy = true;
  onState?.('start');
  try {
    const buf = await (await fetch(track.url)).arrayBuffer();
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const audio = await ctx.decodeAudioData(buf.slice(0));
    try { await ctx.close(); } catch {}
    const mp3 = encodeMp3(audio);
    let tag: Uint8Array | null = null;
    try { tag = id3('NL ' + (track.title || 'track'), await coverJpeg()); } catch {}
    const parts = tag ? [tag, mp3] : [mp3];
    saveBlob(new Blob(parts as any[], { type: 'audio/mpeg' }), safeBase(track.title) + '.mp3');
    onState?.('done');
  } catch {
    // Last resort: plain copy of the original file (still named NL ...).
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
