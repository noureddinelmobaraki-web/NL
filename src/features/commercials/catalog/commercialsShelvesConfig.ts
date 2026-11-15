export interface CommercialShelfSpec {
  id: string;
  titleEn: string;
  badgeText: string;
  luceneQuery: string;
}

export const COMMERCIALS_SHELVES_CONFIG: CommercialShelfSpec[] = [
  {
    id: 'adviews-classic',
    titleEn: 'Duke AdViews: Golden Age TV Commercials (1950s–1980s)',
    badgeText: 'AdViews Archive',
    luceneQuery: 'collection:(adviews) AND mediatype:(movies)',
  },
  {
    id: 'vintage-tv-bumpers',
    titleEn: 'Vintage Television Bumpers & Sign-Offs',
    badgeText: 'Broadcast TV',
    luceneQuery:
      '(collection:(television) OR subject:(commercials) OR title:("commercial")) AND mediatype:(movies)',
  },
  {
    id: 'prelinger-sponsored',
    titleEn: 'Prelinger Mid-Century Consumer & Sponsored Spots',
    badgeText: 'Prelinger',
    luceneQuery:
      'collection:(prelinger) AND (subject:(Advertising) OR subject:(Commercials) OR title:(Commercial)) AND mediatype:(movies)',
  },
  {
    id: 'arabic-vintage-ads',
    titleEn: 'Classic Arabic TV & Spacetoon Nostalgia Promos',
    badgeText: 'Arabic Zaman',
    luceneQuery:
      '(SPACET00N OR "سبيستون" OR "إعلانات" OR "فاصل" OR "رمضان") AND mediatype:(movies)',
  },
  {
    id: 'retro-gaming-toy-ads',
    titleEn: '80s & 90s Retro Video Game & Toy Commercials',
    badgeText: 'Arcade & Toys',
    luceneQuery:
      '((Nintendo OR Sega OR PlayStation OR Atari OR Mattel OR Hasbro) AND (commercial OR promo OR ad)) AND mediatype:(movies)',
  },
  {
    id: 'drive-in-intermissions',
    titleEn: 'Drive-In Theater Intermissions & Snack Bar Reels',
    badgeText: 'Drive-In 35mm',
    luceneQuery:
      '(collection:(ephemera) OR "drive-in" OR "intermission") AND mediatype:(movies)',
  },
];
