// الأفاتارات الافتراضية التسعة على CDN (jsDelivr → nl-audio-cdn/profils). 512×512.
const CDN = 'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn/profils';

export interface DefaultAvatar {
  id: number;
  webp: string;
  avif: string;
}

export const DEFAULT_AVATARS: DefaultAvatar[] = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  webp: `${CDN}/${i + 1}.webp`,
  avif: `${CDN}/${i + 1}.avif`,
}));
