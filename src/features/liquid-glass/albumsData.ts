/**
 * src/features/liquid-glass/albumsData.ts
 * Auto-generated complete dataset of 46 HLS videos and 99 Albums (1,426 HLS tracks).
 */

export interface LiquidGlassTrack {
  readonly num: number;
  readonly title: string;
  readonly url: string;
}

export interface LiquidGlassAlbum {
  readonly id: string;
  readonly index: number;
  readonly title: string;
  readonly artist: string;
  readonly coverUrl: string;
  readonly tracks: readonly LiquidGlassTrack[];
}

export const LIQUID_GLASS_ALL_HLS_VIDEOS: readonly string[] = [
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/1/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/2/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/3/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/4/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/5/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/6/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/7/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/8/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/9/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/10/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/11/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/12/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/13/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/14/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/15/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/16/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/17/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/18/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/19/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/20/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/21/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/21.5/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/22/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/23/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/24/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/25/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/26/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/27/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/28/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/29/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/30/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/31/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/32/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/33/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/34/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/35/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/36/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/37/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/38/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/39/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/40/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/41/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/42/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/43/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/44/index.m3u8",
  "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/45/index.m3u8"
];

export const LIQUID_GLASS_ALBUMS: readonly LiquidGlassAlbum[] = [
  {
    "id": "album_001",
    "index": 1,
    "title": "2001",
    "artist": "Dr. Dre, Xzibit, Tray Dee",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Lolo (Intro)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Watcher",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Fuck You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Still D.R.E.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Big Ego's",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Xxplosive",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "What's The Difference",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Bar One",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Light Speed",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Forgot About Dre",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "The Next Episode",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Let's Get High",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Bitch Niggaz",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "The Car Bomb",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Murder Ink",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Ed-Ucation",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Some L.A. Niggaz",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Pause 4 Porno",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Housewife",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Ackrite",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "Bang Bang",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_021/index.m3u8"
      },
      {
        "num": 22,
        "title": "The Message",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_022/index.m3u8"
      },
      {
        "num": 23,
        "title": "Outro",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_001/track_023/index.m3u8"
      }
    ]
  },
  {
    "id": "album_002",
    "index": 2,
    "title": "808s & Heartbreak",
    "artist": "Kanye West",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Say You Will",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Welcome To Heartbreak",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Heartless",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Amazing",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Love Lockdown (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Paranoid",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "RoboCop",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Street Lights",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Bad News",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "See You In My Nightmares",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Coldest Winter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Pinocchio Story",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_002/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_003",
    "index": 3,
    "title": "A Fever You Can't Sweat Out",
    "artist": "Panic! At The Disco",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Introduction",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Only Difference Between Martyrdom and Suicide Is Press Coverage",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "London Beckoned Songs About Money Written by Machines",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Nails for Breakfast, Tacks for Snacks",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Camisado",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Time to Dance",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Lying Is the Most Fun a Girl Can Have Without Taking Her Clothes Off",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Intermission",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "But It's Better If You Do",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "I Write Sins Not Tragedies",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "I Constantly Thank God for Esteban",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "There's a Good Reason These Tables Are Numbered Honey, You Just Haven't Thought of It Yet",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Build God, Then We'll Talk",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_003/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_004",
    "index": 4,
    "title": "After Hours",
    "artist": "The Weeknd",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Alone Again",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Too Late",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Hardest To Love",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Scared To Live",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Snowchild",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Escape From LA",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Heartless",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Faith",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Blinding Lights",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "In Your Eyes",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Save Your Tears",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Repeat After Me (Interlude)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "After Hours",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Until I Bleed Out",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_004/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_005",
    "index": 5,
    "title": "Alice In Chains",
    "artist": "Alice In Chains",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Grind",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Brush Away",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Sludge Factory",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Heaven Beside You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Head Creeps",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Again",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Shame In You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "God Am",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "So Close",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Nothin' Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Frogs",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Over Now",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_005/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_006",
    "index": 6,
    "title": "AM",
    "artist": "Arctic Monkeys",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Do I Wanna Know?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "R U Mine?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "One For The Road",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Arabella",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "I Want It All",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "No. 1 Party Anthem",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Mad Sounds",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Fireside",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Why'd You Only Call Me When You're High?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Snap Out Of It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Knee Socks",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "I Wanna Be Yours",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_006/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_007",
    "index": 7,
    "title": "American Idiot",
    "artist": "Green Day",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "American Idiot",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Jesus of Suburbia",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Holiday / Boulevard of Broken Dreams",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Are We the Waiting / St. Jimmy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Give Me Novacaine / She's a Rebel",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Extraordinary Girl / Letterbomb",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Wake Me up When September Ends",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Homecoming",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Whatsername",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_007/track_009/index.m3u8"
      }
    ]
  },
  {
    "id": "album_008",
    "index": 8,
    "title": "Antichrist Superstar",
    "artist": "Marilyn Manson",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Irresponsible Hate Anthem (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Beautiful People",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Dried Up, Tied And Dead To The World",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Tourniquet (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Little Horn (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Cryptorchid (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Deformography (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Wormboy (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Mister Superstar (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Angel With The Scabbed Wings (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Kinderfeld (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Antichrist Superstar (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "1996 (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Minute Of Decay (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "The Reflecting God (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Man That You Fear (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Untitled (Album Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_008/track_017/index.m3u8"
      }
    ]
  },
  {
    "id": "album_009",
    "index": 9,
    "title": "Appetite For Destruction",
    "artist": "Guns N' Roses",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Welcome To The Jungle",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "It's So Easy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Nightrain",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Out Ta Get Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Mr. Brownstone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Paradise City",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "My Michelle",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Think About You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Sweet Child O' Mine",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "You're Crazy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Anything Goes",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Rocket Queen",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_009/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_010",
    "index": 10,
    "title": "Around the Fur",
    "artist": "Deftones",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "My Own Summer (Shove It)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Lhabia",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Mascara",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Around the Fur",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Rickets",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Be Quiet and Drive (Far Away)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Lotion",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Dai the Flu",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Headup",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "MX",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_010/track_010/index.m3u8"
      }
    ]
  },
  {
    "id": "album_011",
    "index": 11,
    "title": "Back To Black",
    "artist": "Amy Winehouse",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Rehab",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "You Know I'm No Good",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Me & Mr Jones",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Just Friends",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Back To Black",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Love Is A Losing Game",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Tears Dry On Their Own",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Wake Up Alone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Some Unholy War",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "He Can Only Hold Her",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Addicted",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_011/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_012",
    "index": 12,
    "title": "Bad",
    "artist": "Michael Jackson",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Bad (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Way You Make Me Feel (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Speed Demon (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Liberian Girl (2012 Remastered Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Just Good Friends (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Another Part of Me (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Man in the Mirror (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "I Just Can't Stop Loving You (feat. Siedah Garrett) (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Dirty Diana (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Smooth Criminal (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Leave Me Alone (2012 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_012/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_013",
    "index": 13,
    "title": "BALLADS 1",
    "artist": "Joji",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "ATTENTION",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "SLOW DANCING IN THE DARK",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "TEST DRIVE",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "WANTED U",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "CAN'T GET OVER YOU (feat. Clams Casino)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "YEAH RIGHT",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "WHY AM I STILL IN LA (feat. Shlohmo & D33J)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "NO FUN",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "COME THRU",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "R.I.P. (feat. Trippie Redd)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "XNXX",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "I'LL SEE YOU IN 40",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_013/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_014",
    "index": 14,
    "title": "Beatopia",
    "artist": "beabadoobee",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Beatopia Cultsong",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "10:36",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Sunny day",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "See you Soon",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Ripples",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "the perfect pair",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "broken cd",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Talk",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Lovesong",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Pictures of Us",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "fairy song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Don’t get the deal",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "tinkerbell is overrated feat. PinkPantheress",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "You’re here that’s the thing",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_014/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_015",
    "index": 15,
    "title": "Best Of Bee Gees",
    "artist": "Bee Gees",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Holiday",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "I've Gotta Get A Message To You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "I Can't See Nobody",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Words",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "I Started A Joke",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Tomorrow Tomorrow",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "First Of May",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "World",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Massachusetts",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "To Love Somebody",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Every Christian Lion Hearted Man Will Show You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "New York Mining Disaster 1941",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_015/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_016",
    "index": 16,
    "title": "blink-182",
    "artist": "blink-182",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Feeling This",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Obvious",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "I Miss You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Violence",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Stockholm Syndrome Interlude",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Stockholm Syndrome",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Down",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "The Fallen Interlude",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Go",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Asthenia",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Always",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Easy Target",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "All Of This",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Here's Your Letter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "I'm Lost Without You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Anthem Part Two (Live In Chicago)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_016/track_016/index.m3u8"
      }
    ]
  },
  {
    "id": "album_017",
    "index": 17,
    "title": "Blonde",
    "artist": "Frank Ocean",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Nikes",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Ivy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Pink + White",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Be Yourself",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Solo",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Skyline To",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Self Control",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Good Guy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Nights",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Solo (Reprise)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Pretty Sweet",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Facebook Story",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Close To You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "White Ferrari",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Seigfried",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Godspeed",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Futura Free",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_017/track_017/index.m3u8"
      }
    ]
  },
  {
    "id": "album_018",
    "index": 18,
    "title": "Born Again",
    "artist": "The Notorious B.I.G.",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Born Again (Intro) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Notorious B.I.G. (feat. Lil' Kim & Puff Daddy) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Dead Wrong (feat. Eminem) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Hope You Niggas Sleep (feat. Hot Boys & Big Tmer) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Dangerous MC's (feat. Mark Curry, Snoop Dogg & Busta Rhymes) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Biggie (feat. Junior M.A.F.I.A.) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Niggas (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Big Booty Hoes (feat. Too $hort) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Would You Die for Me (feat. Lil' Kim & Puff Daddy) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Come On (feat. Sadat X) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Rap Phenomenon (feat. Redman & Methodman) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Let Me Get Down (feat. G-Dep, Craig Mack & Missy \"Misdemeanor\" Elliott) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Tonight (feat. Mobb Deep & Joe Hooker) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "If I Should Die Before I Wake (feat. Black Rob, Ice Cube, & Beanie Sigel) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Who Shot Ya? (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Can I Get Witcha (feat. Lil' Cease) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "I Really Want to Show You (feat. K-CI & Jo-Jo & Nas) (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Ms. Wallace (2005 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_018/track_018/index.m3u8"
      }
    ]
  },
  {
    "id": "album_019",
    "index": 19,
    "title": "Born To Die",
    "artist": "Lana Del Rey",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Born To Die",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Off To The Races",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Blue Jeans (Remastered 2011)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Video Games",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Diet Mountain Dew",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "National Anthem",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Dark Paradise",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Radio",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Carmen",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Million Dollar Man",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Summertime Sadness",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "This Is What Makes Us Girls",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_019/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_020",
    "index": 20,
    "title": "Californication",
    "artist": "Red Hot Chili Peppers",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Around the World",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Parallel Universe",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Scar Tissue",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Otherside",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Get on Top",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Californication",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Easily",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Porcelain",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Emit Remmus",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "I Like Dirt",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "This Velvet Glove",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Savior",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Purple Stain",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Right on Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Road Trippin'",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_020/track_015/index.m3u8"
      }
    ]
  },
  {
    "id": "album_021",
    "index": 21,
    "title": "channel ORANGE",
    "artist": "Frank Ocean",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Start",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Thinkin Bout You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Fertilizer",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Sierra Leone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Sweet Life",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Not Just Money",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Super Rich Kids",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Pilot Jones",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Crack Rock",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Pyramids",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Lost",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "White",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Monks",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Bad Religion",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Pink Matter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Forrest Gump",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "End",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_021/track_017/index.m3u8"
      }
    ]
  },
  {
    "id": "album_022",
    "index": 22,
    "title": "Collide With The Sky",
    "artist": "Pierce The Veil",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "May These Noises Startle You In Your Sleep Tonight",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Hell Above",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "A Match Into Water",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "King For A Day",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Bulls In The Bronx",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Props & Mayhem",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Tangled In The Great Escape",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "I'm Low On Gas And You Need A Jacket",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "The First Punch",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "One Hundred Sleepless Nights",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Stained Glass Eyes And Colorful Tears",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Hold On Till May",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_022/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_023",
    "index": 23,
    "title": "Currents",
    "artist": "Tame Impala",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Let It Happen",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Nangs",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "The Moment",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Yes I'm Changing",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Eventually",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Gossip",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "The Less I Know The Better",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Past Life",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Disciples",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "'Cause I'm A Man",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Reality In Motion",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Love/Paranoia",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "New Person, Same Old Mistakes",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_023/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_024",
    "index": 24,
    "title": "D'eux",
    "artist": "Céline Dion",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Pour que tu m'aimes encore",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Le ballet",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Regarde-moi",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Je sais pas",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "La mémoire d'Abraham",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Cherche encore",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Destin",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Les derniers seront les premiers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "J'irai où tu iras (with Jean-Jacques Goldman)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "J'attendais",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Prière païenne",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Vole",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_024/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_025",
    "index": 25,
    "title": "Damn",
    "artist": "Kendrick Lamar",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "BLOOD.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "DNA.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "YAH.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "ELEMENT.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "FEEL.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "LOYALTY.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "PRIDE.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "HUMBLE.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "LUST.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "LOVE.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "XXX.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "FEAR.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "GOD.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "DUCKWORTH.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_025/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_026",
    "index": 26,
    "title": "Dangerous",
    "artist": "Michael Jackson",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Jam",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Why You Wanna Trip on Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "In the Closet",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "She Drives Me Wild",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Remember the Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Can't Let Her Get Away",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Heal the World",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Black or White",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Who Is It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Give In to Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Will You Be There",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Keep the Faith",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Gone Too Soon",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Dangerous",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_026/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_027",
    "index": 27,
    "title": "Deathconsciousness",
    "artist": "Have a Nice Life",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "A Quick One Before the Eternal Worm Devours Connecticut",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Bloodhail",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "The Big Gloom",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Hunter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Telephony",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Who Would Leave Their Son out in the Sun?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "There Is No Food",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Waiting for Black Metal Records to Come in the Mail",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Holy Fucking Shit: 40,000",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "The Future",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Deep, Deep",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "I Don't Love",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Earthmover",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_027/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_028",
    "index": 28,
    "title": "Deftones",
    "artist": "Deftones",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Hexagram",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Needles and Pins",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Minerva",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Good Morning Beautiful",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Deathblow",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "When Girls Telephone Boys",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Battle-axe",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Lucky You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Bloody Cape",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Anniversary of an Uninteresting Event",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Moana",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_028/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_029",
    "index": 29,
    "title": "Demon Days",
    "artist": "Gorillaz",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Intro",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Last Living Souls",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Kids with Guns",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "O Green World",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Dirty Harry",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Feel Good Inc.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "El Mañana",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Every Planet We Reach Is Dead",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "November Has Come",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "All Alone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "White Light",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "DARE",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Fire Coming out of the Monkey's Head",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Don't Get Lost in Heaven",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Demon Days",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_029/track_015/index.m3u8"
      }
    ]
  },
  {
    "id": "album_030",
    "index": 30,
    "title": "Dirt",
    "artist": "Alice In Chains",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Them Bones (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Dam That River (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Rain When I Die (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Down In A Hole (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Sickman (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Rooster (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Junkhead (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Dirt (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "God Smack (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Untitled (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Hate To Feel (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Angry Chair (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Would? (2022 Remaster)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_030/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_031",
    "index": 31,
    "title": "Doo-Wops & Hooligans",
    "artist": "Bruno Mars",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Grenade",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Just the Way You Are",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Our First Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Runaway Baby",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "The Lazy Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Marry You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Talking to the Moon",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Liquor Store Blues (feat. Damian Marley)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Count on Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "The Other Side (feat. CeeLo Green and B.o.B)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Somewhere in Brooklyn",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Talking to the Moon (Acoustic Piano)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_031/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_032",
    "index": 32,
    "title": "Encore",
    "artist": "Eminem",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Curtains Up",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Evil Deeds",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Never Enough",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Yellow Brick Road",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Like Toy Soldiers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Mosh",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Puke",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "My 1st Single",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Paul (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Rain Man",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Big Weenie",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Em Calls Paul (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Just Lose It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Ass Like That",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Spend Some Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Mockingbird",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Crazy In Love",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "One Shot 2 Shot",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Final Thought (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Encore/Curtains Down",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_032/track_020/index.m3u8"
      }
    ]
  },
  {
    "id": "album_033",
    "index": 33,
    "title": "Enema Of The State",
    "artist": "blink-182",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Dumpweed",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Don't Leave Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Aliens Exist",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Going Away To College",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "What's My Age Again?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Dysentery Gary",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Adam's Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "All The Small Things",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "The Party Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Mutt",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Wendy Clear",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Anthem",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_033/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_034",
    "index": 34,
    "title": "eternal sunshine deluxe: brighter days ahead",
    "artist": "Ariana Grande",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "intro (end of the world)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "bye",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "don't wanna break up again",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Saturn Returns Interlude",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "eternal sunshine",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "supernatural",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "true story",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "the boy is mine",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "yes, and?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "we can't be friends (wait for your love)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "i wish i hated you",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "imperfect for you",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "ordinary things",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "intro (end of the world) (extended)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "twilight zone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "warm",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "dandelion",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "past life",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Hampstead",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_034/track_019/index.m3u8"
      }
    ]
  },
  {
    "id": "album_035",
    "index": 35,
    "title": "Fallen",
    "artist": "Evanescence",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Going Under",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Bring Me To Life",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Everybody's Fool",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "My Immortal",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Haunted",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Tourniquet",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Imaginary",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Taking Over Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Hello",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "My Last Breath",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Whisper",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "My Immortal (Band Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_035/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_036",
    "index": 36,
    "title": "Frogstomp",
    "artist": "Silverchair",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Israel's Son",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Tomorrow",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Faultline",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Pure Massacre",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Shade",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Leave Me Out",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Suicidal Dream",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Madman",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Undecided",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Cicada",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Findaway",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_036/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_037",
    "index": 37,
    "title": "good kid, m.A.A.d city",
    "artist": "Kendrick Lamar",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Sherane a.k.a Master Splinter’s Daughter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Bitch, Don’t Kill My Vibe",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Backseat Freestyle",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "The Art of Peer Pressure",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Money Trees",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Poetic Justice",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "good kid",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "m.A.A.d city",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Swimming Pools (Drank) (Extended Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Sing About Me, I'm Dying Of Thirst",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Real",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Compton",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Bitch, Don’t Kill My Vibe (Remix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Bitch, Don’t Kill My Vibe (International Remix / Explicit Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_037/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_038",
    "index": 38,
    "title": "Gorillaz",
    "artist": "Gorillaz",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Re-Hash",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "5/4",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Tomorrow Comes Today",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "New Genius (Brother)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Clint Eastwood",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Man Research (Clapper)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Punk",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Sound Check (Gravity)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Double Bass",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Rock the House",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "19-2000",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Latin Simone (Que Pasa Contigo)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Starshine",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Slow Country",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "M1 A1",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Clint Eastwood (Ed Case / Sweetie Irie Refix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "19-2000 (Soulchild Remix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_038/track_017/index.m3u8"
      }
    ]
  },
  {
    "id": "album_039",
    "index": 39,
    "title": "Graduation",
    "artist": "Kanye West",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Good Morning",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Champion",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Stronger",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "I Wonder",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Good Life",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Can't Tell Me Nothing",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Barry Bonds",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Drunk and Hot Girls",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Flashing Lights",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Everything I Am",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "The Glory",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Homecoming",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Big Brother",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Good Night (Bonus Track)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_039/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_040",
    "index": 40,
    "title": "Holy Wood",
    "artist": "Marilyn Manson",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Godeatgod",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Love Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "The Fight Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Disposable Teens",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Target Audience (Narcissus Narcosis)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "\"President Dead\"",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "In The Shadow Of The Valley Of Death",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Cruci-fiction In Space",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "A Place In The Dirt",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "The Nobodies",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "The Death Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Lamb Of God",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Born Again",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Burning Flag",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Coma Black",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Valentine's Day",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "The Fall Of Adam",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "King Kill 33",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Count To Six And Die (The Vacuum Of Infinite Space Encompassing)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_040/track_019/index.m3u8"
      }
    ]
  },
  {
    "id": "album_041",
    "index": 41,
    "title": "Hozier",
    "artist": "Hozier",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Take Me To Church",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Angel Of Small Death & The Codeine Scene",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Jackie And Wilson",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Someone New",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "To Be Alone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "From Eden",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "In A Week",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Sedated",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Work Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Like Real People Do",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "It Will Come Back",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Foreigner's God",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Cherry Wine (Live)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_041/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_042",
    "index": 42,
    "title": "I Brought You My Bullets, You Brought Me Your Love",
    "artist": "My Chemical Romance",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Romance",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Honey, This Mirror Isn't Big Enough for the Two of Us",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Vampires Will Never Hurt You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Drowning Lessons",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Our Lady of Sorrows",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Headfirst for Halos",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Skylines and Turnstiles",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Early Sunsets Over Monroeville",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "This Is the Best Day Ever",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Cubicles",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Demolition Lovers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_042/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_043",
    "index": 43,
    "title": "I'M HIS, HE'S MINE",
    "artist": "Katy Perry, Doechii",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_043/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "I'M HIS, HE'S MINE",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_043/track_001/index.m3u8"
      }
    ]
  },
  {
    "id": "album_044",
    "index": 44,
    "title": "Illmatic",
    "artist": "Nas",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "The Genesis",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "N.Y. State of Mind",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Life's a Bitch (feat. AZ & Olu Dara)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "The World Is Yours",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Halftime",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Memory Lane (Sittin' in da Park)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "One Love (feat. Q-Tip)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "One Time 4 Your Mind",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Represent",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "It Ain't Hard to Tell",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_044/track_010/index.m3u8"
      }
    ]
  },
  {
    "id": "album_045",
    "index": 45,
    "title": "In Rainbows",
    "artist": "Radiohead",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "15 Step",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Bodysnatchers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Nude",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Weird Fishes/ Arpeggi",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "All I Need",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Faust Arp",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Reckoner",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "House Of Cards",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Jigsaw Falling Into Place",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Videotape",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_045/track_010/index.m3u8"
      }
    ]
  },
  {
    "id": "album_046",
    "index": 46,
    "title": "In The Court Of The Crimson King",
    "artist": "King Crimson",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "21st Century Schizoid Man (Including \"Mirrors\")",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "I Talk To The Wind",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Epitaph (Including \"March for No Reason\" and \"Tomorrow and Tomorrow\")",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Moonchild (Including \"The Dream\" and \"The Illusion\")",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "The Court Of The Crimson King (Including \"The Return of the Fire Witch\" and \"The Dance of the Puppets\")",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "21st Century Schizoid Man [Bonus Track] (Radio Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "I Talk To The Wind [Bonus Track] (Duo Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "A Man A City [Bonus Track] (Live At the Fillmore West)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_046/track_008/index.m3u8"
      }
    ]
  },
  {
    "id": "album_047",
    "index": 47,
    "title": "In Utero",
    "artist": "Nirvana",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Serve The Servants",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Scentless Apprentice",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Heart-Shaped Box",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Rape Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Frances Farmer Will Have Her Revenge On Seattle",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Dumb",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Very Ape",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Milk It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Pennyroyal Tea",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Radio Friendly Unit Shifter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Tourette's",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "All Apologies",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_047/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_048",
    "index": 48,
    "title": "InnerSpeaker",
    "artist": "Tame Impala",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "It Is Not Meant To Be",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Desire Be Desire Go",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Alter Ego",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Lucidity",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Why Won't You Make Up Your Mind?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Solitude Is Bliss",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Jeremy's Storm",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Expectation",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "The Bold Arrow Of Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Runway Houses City Clouds",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "I Don't Really Mind",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_048/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_049",
    "index": 49,
    "title": "Issues",
    "artist": "Korn",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Dead",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Falling Away from Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Trash",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "4U",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Beg for Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Make Me Bad",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "It's Gonna Go Away",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Wake Up",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Am I Going Crazy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Hey Daddy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Somebody Someone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "No Way",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Let's Get This Party Started",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Wish You Could Be Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Counting",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Dirty",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_049/track_016/index.m3u8"
      }
    ]
  },
  {
    "id": "album_050",
    "index": 50,
    "title": "Jar Of Flies",
    "artist": "Alice In Chains",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Rotten Apple",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Nutshell",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "I Stay Away",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "No Excuses",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Whale & Wasp",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Don't Follow",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Swing On This",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_050/track_007/index.m3u8"
      }
    ]
  },
  {
    "id": "album_051",
    "index": 51,
    "title": "Late Registration",
    "artist": "Kanye West",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Wake Up Mr. West",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Heard 'Em Say",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Touch The Sky",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Gold Digger",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Skit #1",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Drive Slow",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "My Way Home",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Crack Music",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Roses",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Bring Me Down",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Addiction",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Skit #2",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Diamonds From Sierra Leone (Remix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "We Major",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Skit #3",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Hey Mama",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Celebration",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Skit #4",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Gone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Diamonds From Sierra Leone (Bonus Track)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "Late",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_051/track_021/index.m3u8"
      }
    ]
  },
  {
    "id": "album_052",
    "index": 52,
    "title": "Legend - The Best Of Bob Marley And The Wailers",
    "artist": "Bob Marley & The Wailers",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Is This Love",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "No Woman, No Cry (Live At The Lyceum, London/1975)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Could You Be Loved",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Three Little Birds",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Buffalo Soldier",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Get Up, Stand Up",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Stir It Up",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Easy Skanking",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "One Love / People Get Ready",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "I Shot The Sheriff",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Waiting In Vain",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Redemption Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Satisfy My Soul",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Exodus",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Jamming",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Punky Reggae Party (12\" Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_052/track_016/index.m3u8"
      }
    ]
  },
  {
    "id": "album_053",
    "index": 53,
    "title": "Let It Be",
    "artist": "The Beatles",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Two Of Us (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Dig A Pony (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Across The Universe (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "I Me Mine (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Dig It (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Let It Be (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Maggie Mae (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "I've Got A Feeling (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "One After 909 (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "The Long And Winding Road (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "For You Blue (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Get Back (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_053/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_054",
    "index": 54,
    "title": "Lioness: Hidden Treasures",
    "artist": "Amy Winehouse",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Our Day Will Come",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Between The Cheats",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Tears Dry (Original Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Will You Still Love Me Tomorrow? (2011)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Like Smoke",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Valerie ('68 Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "The Girl From Ipanema",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Half Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Wake Up Alone (Original Recording)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Best Friends, Right?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Body And Soul",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "A Song For You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_054/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_055",
    "index": 55,
    "title": "Lover",
    "artist": "Taylor Swift",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "I Forgot That You Existed",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Cruel Summer",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Lover",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "The Man",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "The Archer",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "I Think He Knows",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Miss Americana & The Heartbreak Prince",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Paper Rings",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Cornelia Street",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Death By A Thousand Cuts",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "London Boy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Soon You’ll Get Better",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "False God",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "You Need To Calm Down",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Afterglow",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "ME! (feat. Brendon Urie of Panic! At The Disco)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "It’s Nice To Have A Friend",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Daylight",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_055/track_018/index.m3u8"
      }
    ]
  },
  {
    "id": "album_056",
    "index": 56,
    "title": "Mechanical Animals",
    "artist": "Marilyn Manson",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Great Big White World",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Dope Show",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Mechanical Animals",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Rock Is Dead",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Disassociative",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "The Speed Of Pain",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Posthuman",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "I Want To Disappear",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "I Don't Like The Drugs (But The Drugs Like Me)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "New Model No. 15",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "User Friendly",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Fundamentally Loathsome",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "The Last Day On Earth",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Coma White",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_056/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_057",
    "index": 57,
    "title": "Nashville Skyline",
    "artist": "Bob Dylan, Johnny Cash",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Girl from the North Country",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Nashville Skyline Rag",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "To Be Alone with You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "I Threw It All Away",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Peggy Day",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Lay, Lady, Lay",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "One More Night",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Tell Me That It Isn't True",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Country Pie",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Tonight I'll Be Staying Here with You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_057/track_010/index.m3u8"
      }
    ]
  },
  {
    "id": "album_058",
    "index": 58,
    "title": "Nevermind",
    "artist": "Nirvana",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Drain You (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Negative Creep (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Smells Like Teen Spirit (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Aneurysm (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Drain You (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Aneurysm (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Aneurysm (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Been A Son (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "In Bloom (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Drain You (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Come As You Are (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "On A Plain (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "School (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "School (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "School (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Blew (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Breed (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Floyd The Barber (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Floyd The Barber (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Sliver (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "Come As You Are (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_021/index.m3u8"
      },
      {
        "num": 22,
        "title": "Lithium (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_022/index.m3u8"
      },
      {
        "num": 23,
        "title": "About A Girl (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_023/index.m3u8"
      },
      {
        "num": 24,
        "title": "Smells Like Teen Spirit (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_024/index.m3u8"
      },
      {
        "num": 25,
        "title": "Smells Like Teen Spirit (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_025/index.m3u8"
      },
      {
        "num": 26,
        "title": "Lithium (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_026/index.m3u8"
      },
      {
        "num": 27,
        "title": "Polly (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_027/index.m3u8"
      },
      {
        "num": 28,
        "title": "About A Girl (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_028/index.m3u8"
      },
      {
        "num": 29,
        "title": "About A Girl (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_029/index.m3u8"
      },
      {
        "num": 30,
        "title": "Come As You Are (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_030/index.m3u8"
      },
      {
        "num": 31,
        "title": "Breed (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_031/index.m3u8"
      },
      {
        "num": 32,
        "title": "Polly (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_032/index.m3u8"
      },
      {
        "num": 33,
        "title": "Polly (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_033/index.m3u8"
      },
      {
        "num": 34,
        "title": "Territorial Pissings (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_034/index.m3u8"
      },
      {
        "num": 35,
        "title": "Lithium (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_035/index.m3u8"
      },
      {
        "num": 36,
        "title": "Drain You (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_036/index.m3u8"
      },
      {
        "num": 37,
        "title": "Lithium (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_037/index.m3u8"
      },
      {
        "num": 38,
        "title": "Sliver (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_038/index.m3u8"
      },
      {
        "num": 39,
        "title": "Sliver (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_039/index.m3u8"
      },
      {
        "num": 40,
        "title": "Breed (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_040/index.m3u8"
      },
      {
        "num": 41,
        "title": "Breed (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_041/index.m3u8"
      },
      {
        "num": 42,
        "title": "Drain You (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_042/index.m3u8"
      },
      {
        "num": 43,
        "title": "Lounge Act (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_043/index.m3u8"
      },
      {
        "num": 44,
        "title": "Sliver (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_044/index.m3u8"
      },
      {
        "num": 45,
        "title": "Polly (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_045/index.m3u8"
      },
      {
        "num": 46,
        "title": "About A Girl (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_046/index.m3u8"
      },
      {
        "num": 47,
        "title": "Breed (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_047/index.m3u8"
      },
      {
        "num": 48,
        "title": "Stay Away (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_048/index.m3u8"
      },
      {
        "num": 49,
        "title": "Come As You Are (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_049/index.m3u8"
      },
      {
        "num": 50,
        "title": "Lounge Act (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_050/index.m3u8"
      },
      {
        "num": 51,
        "title": "Lithium (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_051/index.m3u8"
      },
      {
        "num": 52,
        "title": "On A Plain (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_052/index.m3u8"
      },
      {
        "num": 53,
        "title": "School (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_053/index.m3u8"
      },
      {
        "num": 54,
        "title": "Come As You Are (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_054/index.m3u8"
      },
      {
        "num": 55,
        "title": "In Bloom (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_055/index.m3u8"
      },
      {
        "num": 56,
        "title": "Aneurysm (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_056/index.m3u8"
      },
      {
        "num": 57,
        "title": "Something In The Way (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_057/index.m3u8"
      },
      {
        "num": 58,
        "title": "Been A Son (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_058/index.m3u8"
      },
      {
        "num": 59,
        "title": "Love Buzz (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_059/index.m3u8"
      },
      {
        "num": 60,
        "title": "Territorial Pissings (Live In Del Mar, California/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_060/index.m3u8"
      },
      {
        "num": 61,
        "title": "Endless, Nameless (Remastered 2021)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_061/index.m3u8"
      },
      {
        "num": 62,
        "title": "Love Buzz (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_062/index.m3u8"
      },
      {
        "num": 63,
        "title": "Negative Creep (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_063/index.m3u8"
      },
      {
        "num": 64,
        "title": "Smells Like Teen Spirit (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_064/index.m3u8"
      },
      {
        "num": 65,
        "title": "Polly (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_065/index.m3u8"
      },
      {
        "num": 66,
        "title": "Feedback Jam (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_066/index.m3u8"
      },
      {
        "num": 67,
        "title": "On A Plain (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_067/index.m3u8"
      },
      {
        "num": 68,
        "title": "Blew (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_068/index.m3u8"
      },
      {
        "num": 69,
        "title": "Negative Creep (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_069/index.m3u8"
      },
      {
        "num": 70,
        "title": "Territorial Pissings (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_070/index.m3u8"
      },
      {
        "num": 71,
        "title": "Love Buzz (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_071/index.m3u8"
      },
      {
        "num": 72,
        "title": "On A Plain (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_072/index.m3u8"
      },
      {
        "num": 73,
        "title": "Smells Like Teen Spirit (Live In Tokyo, Japan/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_073/index.m3u8"
      },
      {
        "num": 74,
        "title": "Blew (Live In Melbourne, Australia For Triple J/1992)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_074/index.m3u8"
      },
      {
        "num": 75,
        "title": "Territorial Pissings (Live In Amsterdam, Netherlands/1991)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_058/track_075/index.m3u8"
      }
    ]
  },
  {
    "id": "album_059",
    "index": 59,
    "title": "News Of The World",
    "artist": "Queen",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "We Will Rock You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "We Are The Champions",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Sheer Heart Attack",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "All Dead, All Dead",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Spread Your Wings",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Fight From The Inside",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Get Down, Make Love",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Sleeping On The Sidewalk",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Who Needs You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "It's Late",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "My Melancholy Blues",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_059/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_060",
    "index": 60,
    "title": "Norman Fucking Rockwell!",
    "artist": "Lana Del Rey",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Norman fucking Rockwell",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Mariners Apartment Complex",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Venice Bitch",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Fuck it I love you",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Doin' Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Love song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Cinnamon Girl",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "How to disappear",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "California",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "The Next Best American Record",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "The greatest",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Bartender",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Happiness is a butterfly",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "hope is a dangerous thing for a woman like me to have - but I have it",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_060/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_061",
    "index": 61,
    "title": "Nothing Was The Same",
    "artist": "Drake",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Tuscan Leather",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Furthest Thing",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Started From the Bottom",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Wu-Tang Forever",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Own It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Worst Behavior",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "From Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Hold On, We're Going Home",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Connect",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "The Language",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "305 To My City",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Too Much",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Pound Cake / Paris Morton Music 2",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_061/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_062",
    "index": 62,
    "title": "Off the Wall",
    "artist": "Michael Jackson",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Don't Stop 'Til You Get Enough",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Rock with You (Single Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Workin' Day and Night",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Get on the Floor",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Off the Wall",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Girlfriend",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "She's Out of My Life (Single Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "I Can't Help It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "It's the Falling in Love",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Burn This Disco Out",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_062/track_010/index.m3u8"
      }
    ]
  },
  {
    "id": "album_063",
    "index": 63,
    "title": "OK Computer",
    "artist": "Radiohead",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Airbag",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Paranoid Android",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Subterranean Homesick Alien",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Exit Music (For A Film)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Let Down",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Karma Police",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Fitter Happier",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Electioneering",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Climbing Up the Walls",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "No Surprises",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Lucky",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "The Tourist",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_063/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_064",
    "index": 64,
    "title": "PARTYNEXTDOOR 4",
    "artist": "PARTYNEXTDOOR",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "C o n t r o l",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "L o s e M y M i n d",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "S t u c k I n M y W a y s",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "C h e e r s",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "M a k e I t T o T h e M o r n i n g",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "N o C h i l l",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "H e r O l d F r i e n d s",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "T h e R e t r e a t",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "F o r C e r t a i n",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "S o r r y, B u t I’ m O u t s i d e",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "R e a l W o m a n",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "A M o t h e r' s P r a y e r",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "F a m i l y",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "R e s e n t m e n t",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_064/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_065",
    "index": 65,
    "title": "Pink Friday: Roman Reloaded",
    "artist": "Nicki Minaj",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Up In Flames",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Roman Holiday",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Freedom",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Come On A Cone",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Hell Yeah",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "I Am Your Leader",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "High School",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Beez In The Trap",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "I'm Legit",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "HOV Lane",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "I Endorse These Strippers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Roman Reloaded",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "The Boys",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Champion",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Right By My Side",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Va Va Voom",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Sex In The Lounge",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Starships",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Pound The Alarm",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Whip It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "Automatic",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_021/index.m3u8"
      },
      {
        "num": 22,
        "title": "Beautiful Sinner",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_022/index.m3u8"
      },
      {
        "num": 23,
        "title": "Marilyn Monroe",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_023/index.m3u8"
      },
      {
        "num": 24,
        "title": "Young Forever",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_024/index.m3u8"
      },
      {
        "num": 25,
        "title": "Fire Burns",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_025/index.m3u8"
      },
      {
        "num": 26,
        "title": "Gun Shot",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_026/index.m3u8"
      },
      {
        "num": 27,
        "title": "Stupid Hoe",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_065/track_027/index.m3u8"
      }
    ]
  },
  {
    "id": "album_066",
    "index": 66,
    "title": "POST HUMAN: SURVIVAL HORROR",
    "artist": "Bring Me The Horizon",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Dear Diary,",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Parasite Eve",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Teardrops",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Obey (with YUNGBLUD)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Itch For The Cure (When Will We Be Free?)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Kingslayer (feat. BABYMETAL)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "1x1 (feat. Nova Twins)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Ludens",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "One Day The Only Butterflies Left Will Be In Your Chest As You March Towards Your Death (feat. Amy Lee)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_066/track_009/index.m3u8"
      }
    ]
  },
  {
    "id": "album_067",
    "index": 67,
    "title": "Random Access Memories",
    "artist": "Daft Punk",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Give Life Back to Music",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Game of Love",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Giorgio by Moroder",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Within",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Instant Crush (feat. Julian Casablancas)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Lose Yourself to Dance (feat. Pharrell Williams)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Touch (feat. Paul Williams)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Get Lucky (feat. Pharrell Williams and Nile Rodgers)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Beyond",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Motherboard",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Fragments of Time (feat. Todd Edwards)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Doin' it Right (feat. Panda Bear)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Contact",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_067/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_068",
    "index": 68,
    "title": "Ride The Lightning",
    "artist": "Metallica",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Fight Fire With Fire (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Ride The Lightning (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "For Whom The Bell Tolls (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Fade To Black (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Trapped Under Ice (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Escape (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Creeping Death (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "The Call Of Ktulu (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_068/track_008/index.m3u8"
      }
    ]
  },
  {
    "id": "album_069",
    "index": 69,
    "title": "Rust In Peace",
    "artist": "Megadeth",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Holy Wars...The Punishment Due",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Hangar 18",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Take No Prisoners",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Five Magics",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Poison Was The Cure",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Lucretia",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Tornado Of Souls",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Dawn Patrol",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Rust In Peace...Polaris",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_069/track_009/index.m3u8"
      }
    ]
  },
  {
    "id": "album_070",
    "index": 70,
    "title": "Sgt. Pepper's Lonely Hearts Club Band",
    "artist": "The Beatles",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Sgt. Pepper's Lonely Hearts Club Band (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "With A Little Help From My Friends (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Lucy In The Sky With Diamonds (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Getting Better (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Fixing A Hole (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "She's Leaving Home (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Being For The Benefit Of Mr. Kite! (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Within You Without You (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "When I'm Sixty Four (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Lovely Rita (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Good Morning Good Morning (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Sgt. Pepper's Lonely Hearts Club Band (Reprise / Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "A Day In The Life (Remastered 2009)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_070/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_071",
    "index": 71,
    "title": "Short n' Sweet",
    "artist": "Sabrina Carpenter",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Taste",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Please Please Please",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Good Graces",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Sharpest Tool",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Coincidence",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Bed Chem",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Espresso",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Dumb & Poetic",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Slim Pickins",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Juno",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Lie To Girls",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Don’t Smile",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_071/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_072",
    "index": 72,
    "title": "SIS (Soft Is Strong)",
    "artist": "KATSEYE",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_072/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Debut",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_072/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Touch",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_072/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "My Way",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_072/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "I'm Pretty",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_072/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Tonight I Might",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_072/track_005/index.m3u8"
      }
    ]
  },
  {
    "id": "album_073",
    "index": 73,
    "title": "Soda Stereo",
    "artist": "Soda Stereo",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Por Qué No Puedo Ser Del Jet Set? (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Sobredosis de T.V. (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Te Hacen Falta Vitaminas (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Trátame Suavemente (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Dietético (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Tele-Ka (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Ni Un Segundo (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Un Misil En Mi Placard (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "El Tiempo Es Dinero (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Afrodisíacos (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Mi Novia Tiene Bíceps (Remasterizado 2007)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_073/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_074",
    "index": 74,
    "title": "SOUR",
    "artist": "Olivia Rodrigo",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "brutal",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "traitor",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "drivers license",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "1 step forward, 3 steps back",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "deja vu",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "good 4 u",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "enough for you",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "happier",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "jealousy, jealousy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "favorite crime",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "hope ur ok",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_074/track_011/index.m3u8"
      }
    ]
  },
  {
    "id": "album_075",
    "index": 75,
    "title": "Sweetener",
    "artist": "Ariana Grande",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "raindrops (an angel cried)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "blazed",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "the light is coming",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "R.E.M",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "God is a woman",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "sweetener",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "successful",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "everytime",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "breathin",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "no tears left to cry",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "borderline",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "better off",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "goodnight n go",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "pete davidson",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "get well soon",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_075/track_015/index.m3u8"
      }
    ]
  },
  {
    "id": "album_076",
    "index": 76,
    "title": "Taylor Swift",
    "artist": "Taylor Swift",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Tim McGraw",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Picture To Burn",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Teardrops On My Guitar (Radio Single Remix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "A Place in this World",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Cold As You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "The Outside",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Tied Together with a Smile",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Stay Beautiful",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Should've Said No",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Mary's Song (Oh My My My)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Our Song",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "I'm Only Me When I'm With You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Invisible",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "A Perfectly Good Heart",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Teardrops on My Guitar (ポップヴァージョン)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_076/track_015/index.m3u8"
      }
    ]
  },
  {
    "id": "album_077",
    "index": 77,
    "title": "Tha Carter III",
    "artist": "Lil Wayne",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "3 Peat",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Mr. Carter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "A Milli (Album Version Explicit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Got Money",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Comfortable",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Dr. Carter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Phone Home",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Tie My Hands",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Mrs. Officer",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Let The Beat Build",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Shoot Me Down",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Lollipop (Album Version Explicit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "La La",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Pussy Monster",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "You Ain't Got Nuthin",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "DontGetIt",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_077/track_016/index.m3u8"
      }
    ]
  },
  {
    "id": "album_078",
    "index": 78,
    "title": "Tha Doggfather",
    "artist": "Snoop Dogg",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Intro",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Doggfather",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Ride 4 Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Up Jump Tha Boogie",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Freestyle Conversation",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "When I Grow Up",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Snoop Bounce",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Gold Rush",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "(Tear 'Em Off) Me and My Doggz",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "You Thought",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Vapors",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Groupie",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "2001",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Sixx Minutes",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "(O.J.) Wake Up",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Snoop's Upside Ya Head",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Blueberry",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Traffic Jam",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Doggyland",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Downtown Assassins",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "Outro",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_078/track_021/index.m3u8"
      }
    ]
  },
  {
    "id": "album_079",
    "index": 79,
    "title": "The Bends",
    "artist": "Radiohead",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Planet Telex",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "The Bends",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "High and Dry",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Fake Plastic Trees",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Bones",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "(Nice Dream)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Just",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "My Iron Lung",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Bullet Proof ... I Wish I Was",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Black Star",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Sulk",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Street Spirit (Fade Out)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_079/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_080",
    "index": 80,
    "title": "The Black Parade",
    "artist": "My Chemical Romance",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "The End.",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Dead!",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "This Is How I Disappear",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "The Sharpest Lives",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Welcome to the Black Parade",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "I Don't Love You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "House of Wolves",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Cancer",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Mama",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Sleep",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Teenagers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Disenchanted",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Famous Last Words",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Blood (Hidden Track)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_080/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_081",
    "index": 81,
    "title": "The Blueprint",
    "artist": "JAY-Z",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "The Ruler's Back",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Takeover",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Izzo (H.O.V.A.)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Girls, Girls, Girls",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Jigga That Nigga",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "U Don't Know",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Hola' Hovito",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Heart Of The City (Ain't No Love)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Never Change",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Song Cry",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "All I Need",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Renegade",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Blueprint (Momma Loves Me)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Lyrical Exercise",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Girls, Girls, Girls (Part 2)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_081/track_015/index.m3u8"
      }
    ]
  },
  {
    "id": "album_082",
    "index": 82,
    "title": "The Life of a Showgirl",
    "artist": "Taylor Swift",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "The Fate of Ophelia",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Elizabeth Taylor",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Opalite",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Father Figure",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Eldest Daughter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Ruin The Friendship",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Actually Romantic",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Wi$h Li$t",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Wood",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "CANCELLED!",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Honey",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "The Life of a Showgirl",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_082/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_083",
    "index": 83,
    "title": "The Life Of Pablo",
    "artist": "Kanye West",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Ultralight Beam",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Father Stretch My Hands Pt. 1",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Pt. 2",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Famous",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Feedback",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Low Lights",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Highlights",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Freestyle 4",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "I Love Kanye",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Waves",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "FML",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Real Friends",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Wolves",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Frank's Track",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Siiiiiiiiilver Surffffeeeeer Intermission",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "30 Hours",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "No More Parties In LA",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Facts (Charlie Heat Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Fade",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Saint Pablo",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_083/track_020/index.m3u8"
      }
    ]
  },
  {
    "id": "album_084",
    "index": 84,
    "title": "The Marshall Mathers LP",
    "artist": "Eminem",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Public Service Announcement 2000",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Kill You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Stan",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Paul (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Who Knew",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Steve Berman",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "The Way I Am",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "The Real Slim Shady",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Remember Me?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "I'm Back",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Marshall Mathers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Ken Kaniff (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Drug Ballad",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Amityville (Album Version Explicit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Bitch Please II",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Kim",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Under The Influence",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Criminal",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_084/track_018/index.m3u8"
      }
    ]
  },
  {
    "id": "album_085",
    "index": 85,
    "title": "The Miseducation of Lauryn Hill",
    "artist": "Lauryn Hill",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Intro",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Lost Ones",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Ex-Factor",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "To Zion (feat. Carlos Santana)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Doo Wop (That Thing)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Superstar",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Final Hour",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "When It Hurts so Bad",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "I Used to Love Him (feat. Mary J. Blige)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Forgive Them Father",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Every Ghetto, Every City",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Nothing Even Matters (feat. D'Angelo)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Everything Is Everything",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "The Miseducation of Lauryn Hill",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Can't Take My Eyes Off of You (I Love You Baby)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Tell Him",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_085/track_016/index.m3u8"
      }
    ]
  },
  {
    "id": "album_086",
    "index": 86,
    "title": "The Return of the Space Cowboy",
    "artist": "Jamiroquai",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Just Another Story",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Light Years (4 To Da Floor Mix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Space Cowboy (David Morales Mix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Stillness in Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Half the Man",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Space Cowboy (Demo Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Light Years",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Morning Glory (Instrumental)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Manifest Destiny",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Stillness in Time (Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Space Clav",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "The Kids",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Mr Moon",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Light Years (Live at the Theatre Du Moulin)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Scam (Live)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Scam",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Journey to Arnhemland (Live)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Journey to Arnhemland",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Morning Glory",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "We Gettin' Down (Live)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "Space Cowboy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_086/track_021/index.m3u8"
      }
    ]
  },
  {
    "id": "album_087",
    "index": 87,
    "title": "The Singles",
    "artist": "Basement Jaxx",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Magnificent Romeo",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Red Alert (Jaxx Radio Mix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "I Beg U",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Good Luck",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Mere Pass",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Romeo (Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Miracles Keep On Playin'",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Oh My Gosh",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Bingo Bango (Radio Mix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Bongoloid",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Good Luck (Live Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Where's Your Head At (Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Rendez-Vu (Latin Vocal)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Rendez-Vu (Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Broken Dreams (Acoustic Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Jump 'N Shout (Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Ah-choo",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Lucky Star (Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Onyx",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Plug It In (Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "I Live In Camberwell",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_021/index.m3u8"
      },
      {
        "num": 22,
        "title": "U Don't Know Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_022/index.m3u8"
      },
      {
        "num": 23,
        "title": "Camberskank (7\" Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_023/index.m3u8"
      },
      {
        "num": 24,
        "title": "Do Your Thing",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_024/index.m3u8"
      },
      {
        "num": 25,
        "title": "Jus 1 Kiss (Isley Bootleg Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_025/index.m3u8"
      },
      {
        "num": 26,
        "title": "Jus 1 Kiss (Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_026/index.m3u8"
      },
      {
        "num": 27,
        "title": "Flylife",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_027/index.m3u8"
      },
      {
        "num": 28,
        "title": "Romeo (Acoustic Version)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_028/index.m3u8"
      },
      {
        "num": 29,
        "title": "Samba Magic",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_087/track_029/index.m3u8"
      }
    ]
  },
  {
    "id": "album_088",
    "index": 88,
    "title": "The Slim Shady LP",
    "artist": "Eminem",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Public Service Announcement",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "My Name Is",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Guilty Conscience",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Brain Damage",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Paul (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "If I Had",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "'97 Bonnie & Clyde",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Bitch (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Role Model",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Lounge (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "My Fault",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Ken Kaniff (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Cum On Everybody",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Rock Bottom",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Just Don't Give A Fuck",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Soap (Skit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "As The World Turns",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "I'm Shady",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Bad Meets Evil",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Still Don't Give A Fuck",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_088/track_020/index.m3u8"
      }
    ]
  },
  {
    "id": "album_089",
    "index": 89,
    "title": "The Slow Rush",
    "artist": "Tame Impala",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "One More Year",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Instant Destiny",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Borderline",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Posthumous Forgiveness",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Breathe Deeper",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Tomorrow's Dust",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "On Track",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Lost In Yesterday",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Is It True",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "It Might Be Time",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Glimmer",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "One More Hour",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_089/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_090",
    "index": 90,
    "title": "The Sun's Tirade",
    "artist": "Isaiah Rashad",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "where u at?",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "4r Da Squaw",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Free Lunch",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Rope (feat. SiR) // rosegold",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Wat's Wrong (feat. Zacari & Kendrick Lamar)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Park",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Bday (feat. Deacon Blues & Kari Faux)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Silkk da Shocka (feat. Syd)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Tity and Dolla (feat. Hugh Augustine & Jay Rock)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Stuck in the Mud (feat. SZA)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "A lot",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "AA",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Dressed Like Rappers",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Don't Matter",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Brenda",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "by george (outro)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Find a Topic (homies begged)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_090/track_017/index.m3u8"
      }
    ]
  },
  {
    "id": "album_091",
    "index": 91,
    "title": "Three Cheers for Sweet Revenge",
    "artist": "My Chemical Romance",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Helena",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Give 'Em Hell, Kid",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "To the End",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "You Know What They Do to Guys Like Us in Prison",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "I'm Not Okay (I Promise)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "The Ghost of You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "The Jetset Life Is Gonna Kill You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Interlude",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Thank You for the Venom",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Hang 'Em High",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "It's Not a Fashion Statement, It's a Deathwish",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Cemetery Drive",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "I Never Told You What I Do for a Living",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_091/track_013/index.m3u8"
      }
    ]
  },
  {
    "id": "album_092",
    "index": 92,
    "title": "Travelling Without Moving",
    "artist": "Jamiroquai",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Virtual Insanity (Remastered 2013)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Virtual Insanity (Salaam Remi Remix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Cosmic Girl (Quasar Mix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Cosmic Girl (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Alright (Alan Braxe and Fred Falke Remix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Use the Force (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Everyday (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "High Times (Sanchez Radio Edit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Alright (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Do You Know Where You're Coming From? (feat. Jamiroquai)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Bullet",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "High Times (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Drifting Along (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Slipin' 'n' Slidin'",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Didjerama (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Hollywood Swinging",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_016/index.m3u8"
      },
      {
        "num": 17,
        "title": "Didjital Vibrations (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_017/index.m3u8"
      },
      {
        "num": 18,
        "title": "Alright (Live at the Verona Amphitheatre, Italy, 2002)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_018/index.m3u8"
      },
      {
        "num": 19,
        "title": "Travelling Without Moving (Remastered 2013)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_019/index.m3u8"
      },
      {
        "num": 20,
        "title": "Virtual Insanity (Live at the Verona Amphitheatre, Italy, 2002)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_020/index.m3u8"
      },
      {
        "num": 21,
        "title": "You Are My Love (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_021/index.m3u8"
      },
      {
        "num": 22,
        "title": "Spend a Lifetime (Remastered)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_022/index.m3u8"
      },
      {
        "num": 23,
        "title": "Funktion (Remastered - Ruff Mix)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_092/track_023/index.m3u8"
      }
    ]
  },
  {
    "id": "album_093",
    "index": 93,
    "title": "Use Your Illusion I",
    "artist": "Guns N' Roses",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Right Next Door To Hell",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Dust N' Bones",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Live And Let Die",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Don't Cry (Original)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Perfect Crime",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "You Ain't The First",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Bad Obsession",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Back Off Bitch",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Double Talkin' Jive",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "November Rain",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "The Garden",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Garden Of Eden",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Don't Damn Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Bad Apples",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Dead Horse",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "Coma",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_093/track_016/index.m3u8"
      }
    ]
  },
  {
    "id": "album_094",
    "index": 94,
    "title": "Viva La Vida or Death and All His Friends",
    "artist": "Coldplay",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Life in Technicolor",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Cemeteries of London",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Lost!",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "42",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Lovers in Japan",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Yes",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Viva La Vida",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Violet Hill",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Strawberry Swing",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Death and All His Friends",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_094/track_010/index.m3u8"
      }
    ]
  },
  {
    "id": "album_095",
    "index": 95,
    "title": "Vol.2... Hard Knock Life",
    "artist": "JAY-Z, Memphis Bleek",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Intro - Hand It Down",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Hard Knock Life",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "If I Should Die",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Ride Or Die",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "N*** What, N*** Who (Originator 99)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Money, Cash, Hoes",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "A Week Ago",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Coming Of Age (Da Sequel)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Can I Get A...",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Paper Chase",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Reservoir Dogs",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "It's Like That",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "It's Alright",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "Money Ain't A Thang",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_095/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_096",
    "index": 96,
    "title": "Watch The Throne",
    "artist": "JAY-Z; Kanye West; Frank Ocean; The-Dream",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "No Church In The Wild",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Lift Off",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Ni**as In Paris",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Otis",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Gotta Have It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "New Day",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "That's My Bitch",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Welcome To The Jungle",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Who Gon Stop Me",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Murder To Excellence",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Made In America",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Why I Love You",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "Illest Motherf***** Alive",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "H•A•M (Album Version Explicit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_014/index.m3u8"
      },
      {
        "num": 15,
        "title": "Primetime",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_015/index.m3u8"
      },
      {
        "num": 16,
        "title": "The Joy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_096/track_016/index.m3u8"
      }
    ]
  },
  {
    "id": "album_097",
    "index": 97,
    "title": "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
    "artist": "Billie Eilish",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "!!!!!!!",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "bad guy",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "xanny",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "you should see me in a crown",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "all the good girls go to hell",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "wish you were gay",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "when the party's over",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "8",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "my strange addiction",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "bury a friend",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "ilomilo",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "listen before i go",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_012/index.m3u8"
      },
      {
        "num": 13,
        "title": "i love you",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_013/index.m3u8"
      },
      {
        "num": 14,
        "title": "goodbye",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_097/track_014/index.m3u8"
      }
    ]
  },
  {
    "id": "album_098",
    "index": 98,
    "title": "White Pony",
    "artist": "Deftones",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "Back to School (Mini Maggit)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Feiticeira",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "Digital Bath",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "Elite",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Rx Queen",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "Street Carp",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Teenager",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Knife Prty",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Korea",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Passenger",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_010/index.m3u8"
      },
      {
        "num": 11,
        "title": "Change (In the House of Flies)",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_011/index.m3u8"
      },
      {
        "num": 12,
        "title": "Pink Maggit",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_098/track_012/index.m3u8"
      }
    ]
  },
  {
    "id": "album_099",
    "index": 99,
    "title": "Yeezus",
    "artist": "Kanye West",
    "coverUrl": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/cover.webp",
    "tracks": [
      {
        "num": 1,
        "title": "On Sight",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_001/index.m3u8"
      },
      {
        "num": 2,
        "title": "Black Skinhead",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_002/index.m3u8"
      },
      {
        "num": 3,
        "title": "I Am A God",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_003/index.m3u8"
      },
      {
        "num": 4,
        "title": "New Slaves",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_004/index.m3u8"
      },
      {
        "num": 5,
        "title": "Hold My Liquor",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_005/index.m3u8"
      },
      {
        "num": 6,
        "title": "I'm In It",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_006/index.m3u8"
      },
      {
        "num": 7,
        "title": "Blood On The Leaves",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_007/index.m3u8"
      },
      {
        "num": 8,
        "title": "Guilt Trip",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_008/index.m3u8"
      },
      {
        "num": 9,
        "title": "Send It Up",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_009/index.m3u8"
      },
      {
        "num": 10,
        "title": "Bound 2",
        "url": "https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/albums/album_099/track_010/index.m3u8"
      }
    ]
  }
];
