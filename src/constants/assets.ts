
const CDN = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn';

export const ASSETS = {
  profile: {
    main:      `${CDN}/profile_img.webp`,
    photo:     `${CDN}/photo.webp`,
    headerBg:  `${CDN}/header_bg.webp`,
    heroBg:    `${CDN}/hero_bg.webp`,
    footerDeco:`${CDN}/footer_deco.gif`,
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
      `${CDN}/14.%20L'AI%20Could...%20-%20Background.webp`,
      `${CDN}/15.%20L'bayda%20M...%20-%20Background.webp`,
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
    ],
    sharePaths: Array.from({ length: 25 }, (_, i) => `/NL/share/song-${i + 1}.html`)
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

// Export CDN base for use in SW and cache configs
export const CDN_ORIGIN = 'noureddinelmobaraki-web.github.io';
