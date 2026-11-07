/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export const MEDIA_BASE =
  import.meta.env?.VITE_MEDIA_BASE ??
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn';

export const media = (p: string): string =>
  `${MEDIA_BASE}/${p.replace(/^\/+/, '')}`;

// روابط وسائط عامة (لا أسرار). فيديو خلفية الحسابات على Cloudflare R2 (HLS).
export const ACCOUNTS_BG_HLS =
  'https://pub-7f588e608b6c4bcd8d56d53f58505421.r2.dev/hls/BG.m3u8';
