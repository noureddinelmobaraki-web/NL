
const CDN = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn';

export const getLocalAssetUrl = (filename: string): string => {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith('/') ? `${base}${filename}` : `${base}/${filename}`;
};

const CDN_BIT = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn';
// Bit-theme image overrides — same CDN, _bit suffix
const BIT_IMAGES = {
  profile:       `${CDN_BIT}/profile_img_bit.webp`,
  photo:         `${CDN_BIT}/photo_bit.webp`,
  headerBg:      `${CDN_BIT}/header_bg_bit.webp`,
  heroBg:        `${CDN_BIT}/hero_bg_bit.webp`,
  meBitPoster:   `${CDN_BIT}/me_bit.webp`,
  playlistCover: `${CDN_BIT}/playlist_cover_bit.webp`,
  ytHighlights:  `${CDN_BIT}/yt_highlights_bit.webp`,
} as const;

const DARK_IMAGES = {
  profile:       'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imgdark.webp',
  photo:         'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/photodark.webp',
  headerBg:      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/header_bgdark.webp',
  heroBg:        'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bgdark.webp',
  meBitPoster:   'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imgdark.webp',
  playlistCover: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_coverdark.webp',
  ytHighlights:  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlightsdark.webp',
} as const;

const LIGHT_IMAGES = {
  profile:       'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imglight.webp',
  photo:         'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/photolight.webp',
  headerBg:      'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/header_bglight.webp',
  heroBg:        'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bgdarklight.webp',
  meBitPoster:   'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imglight.webp',
  playlistCover: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_coverlight.webp',
  ytHighlights:  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlightslight.webp',
} as const;

export const LIGHT_PROFILE_OPENING = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imglightopenin.webp';
export const LIGHT_PROFILE_MAIN    = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imglight.webp';


// Per-theme background music URLs
export const THEME_BG_MUSIC: Record<string, string> = {
  'midnight':    'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/music/index.m3u8',
  'dark':        'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/darkBG/index.m3u8',
  'light':       'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/lightBG/index.m3u8',
  'bit':         'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/bitBG/index.m3u8',
  'lite':        'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Lumiere_HLS/Lumiere.m3u8',
};

// موسيقى وضع الألعاب (HLS) — تُدار عبر AudioManager بنفس قواعد بقية الأصوات
export const GAMES_BG_MUSIC = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/games_hls/index.m3u8';
export const TV_BG_MUSIC = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/nl_tv_bg_hls/index.m3u8';

// فيديو خلفية حائط صفحة الألعاب
export const GAMES_BG_VIDEO = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/gameBG_web.webm';

// Intro screen assets (responsive)
export const INTRO_VIDEOS = {
  desktop: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/opening_web_12fps.webm',
  mobile:  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/opening_phone_web_12fps.webm',
} as const;

// Mood transition videos (responsive)
export const MOOD_TRANSITION_VIDEOS = {
  desktop: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition_web.webm',
  mobile:  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition%20phone_web.webm',
} as const;

export const MOOD_TRANSITION_TIMING = {
  total: 2000,           // الفيديو طوله 2 ثانية
  revealMoodAt: 1800,    // MusicMood يبدأ يظهر في الـ 1.8 ثانية
  fadeOutDuration: 200,  // الـ 200ms الأخيرة fade-out للفيديو
} as const;

export const INTRO_MUSIC_HLS = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/intro/intro_stream.m3u8';

export const ASSETS = {
  profile: {
    main:      `${CDN}/profile_img.webp`,
    photo:     `${CDN}/photo.webp`,
    headerBg:  `${CDN}/header_bg.webp`,
    heroBg:    `${CDN}/hero_bg.webp`,
    footerDeco:`${CDN}/footer_deco.gif`,
    heroBgBlurred: {
      dark: getLocalAssetUrl('images/optimized/hero_bg.dark.blurred.webp'),
      light: getLocalAssetUrl('images/optimized/hero_bg.light.blurred.webp'),
      midnight: getLocalAssetUrl('images/optimized/hero_bg.midnight.blurred.webp'),
      bit: getLocalAssetUrl('images/optimized/hero_bg.bit.blurred.webp'),
    },
    me_bits: [
      `${CDN}/me_bit_1.webp`,
      `${CDN}/me_bit_2.webp`,
      `${CDN}/me_bit_3.webp`,
      `${CDN}/me_bit_4.webp`,
      `${CDN}/me_bit_5.webp`,
      `${CDN}/me_bit_6.webp`,
      `${CDN}/me_bit_7.webp`,
      `${CDN}/me_bit_8.webp`,
      `${CDN}/me_bit_9.webp`,
    ],
    lens: [
      `${CDN}/1.webp`,
      `${CDN}/2.webp`,
      `${CDN}/3.webp`,
      `${CDN}/4.webp`,
      `${CDN}/5.webp`,
      `${CDN}/6.webp`,
      `${CDN}/7.webp`,
      `${CDN}/8.webp`,
      `${CDN}/9.webp`,
    ],
  },
  songs: {
    playlistCover:  `${CDN}/playlist_cover.webp`,
    gameBackground: `${CDN}/game%20Background.webp`,
    ytHighlights:   `${CDN}/yt_highlights.webp`,
    backgrounds: [
      `${CDN}/01.%20TRI9%20TBA...%20-%20Background.webp`,
      `${CDN}/02.%20VETO%20-%20Background.webp`,
      `${CDN}/03.%20TOTAL%20-%20Background.webp`,
      `${CDN}/04.%207CHAYCH...%20-%20Background.webp`,
      `${CDN}/05.%20A%20Lot%20-%20Background.webp`,
      `${CDN}/06.%20BEAUTIFUL%20-%20Background.webp`,
      `${CDN}/07.%20Bouh%20-%20Background.webp`,
      `${CDN}/08.%20Brain%20Da...%20-%20Background.webp`,
      `${CDN}/09.%20Deal%20With...%20-%20Background.webp`,
      `${CDN}/10.%20Dokhana%20V2%20-%20Background.webp`,
      `${CDN}/11.%20GOUROU%20-%20Background.webp`,
      `${CDN}/12.%20ITCHY%20W%20SCRATCHY%20-%20Background.webp`,
      `${CDN}/13.%20KOUN%20NADI%20-%20Background.webp`,
      `${CDN}/CAPTCHA.webp`,
      `${CDN}/Couteau%20Suisse.webp`,
      `${CDN}/16.%20Let%20The%20R...%20-%20Background.webp`,
      `${CDN}/17.%20LMORPHINIYA%2031%20-%20Background.webp`,
      `${CDN}/18.%20LMORPHINIYA%2033%20-%20Background.webp`,
      `${CDN}/19.%20LMORPHI...%20-%20Background.webp`,
      `${CDN}/20.%20Lmorphinya%2019%20V2%20-%20Background.webp`,
      `${CDN}/21.%20MAGNETO%20-%20Background.webp`,
      `${CDN}/22.%20None%20Sha...%20-%20Background.webp`,
      `${CDN}/23.%20Ohio%20-%20Background.webp`,
      `${CDN}/24.%20Ostora%20-%20Background.webp`,
      `${CDN}/25.%20Tromso%20-%20Background.webp`,
      `${CDN}/2%20Salopards.webp`,
      `${CDN}/AL%20RIHLA.webp`,
      `${CDN}/Ay9ona%202.webp`,
      `${CDN}/Bad%20Guy.webp`,
      `${CDN}/CAPTCHA.webp`,
      `${CDN}/Couteau%20Suisse.webp`,
      `${CDN}/euphoria.webp`,
      `${CDN}/Groundhog%20Day%20112.webp`,
      `${CDN}/Lmorphiniya%2025.webp`,
      `${CDN}/Luis%20Clos.webp`,
      `${CDN}/LYAM.webp`,
      `${CDN}/Mural.webp`,
      `${CDN}/Nirvana.webp`,
      `${CDN}/None%20Shall%20Pass.webp`,
      `${CDN}/OUROBOROS.webp`,
      `${CDN}/Sparadra.webp`,
      `${CDN}/Supernova.webp`,
      `${CDN}/The%20Way%20I%20Am.webp`,
      `${CDN}/VVS.webp`,
      `${CDN}/ink.webp`,
      `${CDN}/عبلة.webp`,
    ]
  },
  gallery: {
    // These are small (20-36KB) — keep them bundled locally, no CDN needed
    draw1: new URL('../assets/images/gallery/DRAW.webp', import.meta.url).href,
    draw2: new URL('../assets/images/gallery/DRAW2.webp', import.meta.url).href,
    drawings: [
      new URL('../assets/images/gallery/DRAW.webp', import.meta.url).href,
      new URL('../assets/images/gallery/DRAW2.webp', import.meta.url).href,
    ]
  },
  media: {
    music:     `${CDN}/music/index.m3u8`,     // HLS stream
    lensMusic: `${CDN}/lensMusic.webm`,        // direct webm audio
    meBitMusic:`${CDN}/meBitMusic/index.m3u8`, // HLS stream
    opening:   `${CDN}/opening_final.mp4`,     // video
  }
};

export const SONG_BG_FALLBACK = `${CDN}/01.%20TRI9%20TBA...%20-%20Background.webp`;

// Export CDN base for use in SW and cache configs
export const CDN_ORIGIN = 'noureddinelmobaraki-web.github.io';

/**
 * Returns the correct image URL based on resolved data-theme.
 * resolvedTheme = document.documentElement.dataset.theme
 */
export function getThemedImage(
  key: keyof typeof BIT_IMAGES | 'heroBgBlurred',
  resolvedTheme: string
): string {
  if (key === 'heroBgBlurred') {
    if (resolvedTheme === 'bit')   return ASSETS.profile.heroBgBlurred.bit;
    if (resolvedTheme === 'dark')  return ASSETS.profile.heroBgBlurred.dark;
    if (resolvedTheme === 'light') return ASSETS.profile.heroBgBlurred.light;
    if (resolvedTheme === 'lite')  return ASSETS.profile.heroBgBlurred.dark;
    return ASSETS.profile.heroBgBlurred.midnight;
  }
  if (resolvedTheme === 'bit')   return BIT_IMAGES[key as keyof typeof BIT_IMAGES];
  if (resolvedTheme === 'dark')  return DARK_IMAGES[key as keyof typeof BIT_IMAGES];
  if (resolvedTheme === 'light') return LIGHT_IMAGES[key as keyof typeof BIT_IMAGES];
  if (resolvedTheme === 'lite')  return DARK_IMAGES[key as keyof typeof BIT_IMAGES];
  // midnight and system → original default assets, unchanged
  const map: Record<keyof typeof BIT_IMAGES, string> = {
    profile:       ASSETS.profile.main,
    photo:         ASSETS.profile.photo,
    headerBg:      ASSETS.profile.headerBg,
    heroBg:        ASSETS.profile.heroBg,
    meBitPoster:   ASSETS.profile.me_bits[0],
    playlistCover: ASSETS.songs.playlistCover,
    ytHighlights:  ASSETS.songs.ytHighlights,
  };
  return map[key as keyof typeof BIT_IMAGES];
}


