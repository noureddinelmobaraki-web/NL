// src/config/streams.ts
// M3U stream sources — hosted on GitHub CDN
// To update: replace these 3 URLs only. Do not modify anything else.

export const STREAM_SOURCES = {
  RADIO:    "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/working_radio.m3u",
  MUSIC:    "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/working_music.m3u",
  CHANNELS: "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/channels.m3u",
} as const;
