export interface CuratedMovie {
  id: number;
  imdb_id: string;
  title: {
    en: string;
    ar: string;
    fr: string;
  };
  overview: {
    en: string;
    ar: string;
    fr: string;
  };
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genres: string[];
  duration: number;
  certification: string;
  trailer_key: string;
  cast: {
    name: string;
    character: string;
    profile_path: string;
  }[];
}

export const FALLBACK_MOVIES: CuratedMovie[] = [
  {
    id: 823464,
    imdb_id: "tt15239678",
    title: {
      en: "Dune: Part Two",
      ar: "كثبان: الجزء الثاني",
      fr: "Dune : Deuxième Partie"
    },
    overview: {
      en: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.",
      ar: "يتحد بول أتريدس مع تشاني والفريمن لشن حرب انتقامية ضد المتآمرين الذين دمروا عائلته، بينما يكافح لمنع المستقبل الكارثي الذي يمكنه التنبؤ به وحده.",
      fr: "Paul Atreides s'unit à Chani et aux Fremen pour mener la révolte contre ceux qui ont détruit sa famille. Hanté par de sombres prémonitions, il doit choisir entre l'amour de sa vie et le destin de l'univers."
    },
    poster_path: "",
    backdrop_path: "",
    release_date: "2024-02-27",
    vote_average: 8.3,
    genres: ["Action", "Adventure", "Sci-Fi"],
    duration: 166,
    certification: "PG-13",
    trailer_key: "Way9Dexny3w",
    cast: [
      { name: "Timothée Chalamet", character: "Paul Atreides", profile_path: "/Ph76vM86v8S6f0V89x0p11.jpg" },
      { name: "Zendaya", character: "Chani", profile_path: "/v6Ph88Ovdv60bbtv6.jpg" },
      { name: "Rebecca Ferguson", character: "Lady Jessica", profile_path: "/7xVpM88bbv78vbbS.jpg" }
    ]
  },
  {
    id: 27205,
    imdb_id: "tt1375666",
    title: {
      en: "Inception",
      ar: "بداية",
      fr: "Inception"
    },
    overview: {
      en: "Cobb, a skilled thief who steals valuable secrets from deep within the subconscious during the dream state, is offered a chance at redemption: inception.",
      ar: "كوب، سارق ماهر يسرق الأسرار القيمة من عمق العقل الباطن أثناء حالة الحلم، تُعرض عليه فرصة للاسترداد من خلال زرع فكرة في عقل شخص ما.",
      fr: "Cobb, un voleur expérimenté dans l'art de s'emparer des secrets les plus précieux d'un individu pendant qu'il rêve, se voit offrir une chance de rachat : l'inception."
    },
    poster_path: "",
    backdrop_path: "",
    release_date: "2010-07-15",
    vote_average: 8.4,
    genres: ["Sci-Fi", "Action", "Adventure"],
    duration: 148,
    certification: "PG-13",
    trailer_key: "YoHD9XEInc0",
    cast: [
      { name: "Leonardo DiCaprio", character: "Cobb", profile_path: "" },
      { name: "Joseph Gordon-Levitt", character: "Arthur", profile_path: "" },
      { name: "Elliot Page", character: "Ariadne", profile_path: "" }
    ]
  },
  {
    id: 155,
    imdb_id: "tt0468569",
    title: {
      en: "The Dark Knight",
      ar: "فارس الظلام",
      fr: "The Dark Knight : Le Chevalier Noir"
    },
    overview: {
      en: "Batman raises the stakes in his war on crime. With the help of Gordon and Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
      ar: "يرفع باتمان الرهانات في حربه على الجريمة، وبمساعدة غوردون ودينت، يسعى إلى تفكيك منظمات الجريمة المتبقية، لكنه يواجه عقلًا إجراميًا جديدًا يُعرف باسم الجوكر.",
      fr: "Le Chevalier Noir entreprend de démanteler les dernières organisations criminelles de Gotham. Mais il se heurte bientôt à un cerveau criminel hors du commun, le Joker."
    },
    poster_path: "",
    backdrop_path: "",
    release_date: "2008-07-16",
    vote_average: 8.5,
    genres: ["Action", "Drama", "Crime"],
    duration: 152,
    certification: "PG-13",
    trailer_key: "EXeTwQWrcwY",
    cast: [
      { name: "Christian Bale", character: "Bruce Wayne / Batman", profile_path: "" },
      { name: "Heath Ledger", character: "Joker", profile_path: "" },
      { name: "Gary Oldman", character: "Jim Gordon", profile_path: "" }
    ]
  },
  {
    id: 157336,
    imdb_id: "tt0816692",
    title: {
      en: "Interstellar",
      ar: "بين النجوم",
      fr: "Interstellar"
    },
    overview: {
      en: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.",
      ar: "مجموعة من المستكشفين يخوضون رحلة ملحمية عبر ثقب دودي تم اكتشافه حديثًا للبحث عن موطن بديل للبشرية وسط احتضار كوكب الأرض.",
      fr: "Un groupe d'explorateurs utilise une faille nouvellement découverte dans l'espace-temps afin de surmonter les limites du voyage spatial humain."
    },
    poster_path: "",
    backdrop_path: "",
    release_date: "2014-11-05",
    vote_average: 8.4,
    genres: ["Aventure", "Drama", "Sci-Fi"],
    duration: 169,
    certification: "PG-13",
    trailer_key: "zSWdZAIGM3I",
    cast: [
      { name: "Matthew McConaughey", character: "Cooper", profile_path: "" },
      { name: "Anne Hathaway", character: "Brand", profile_path: "" },
      { name: "Jessica Chastain", character: "Murph", profile_path: "" }
    ]
  },
  {
    id: 569094,
    imdb_id: "tt9362722",
    title: {
      en: "Spider-Man: Across the Spider-Verse",
      ar: "رجل العنكبوت: عبر عوالم العنكبوت",
      fr: "Spider-Man : Across the Spider-Verse"
    },
    overview: {
      en: "After reuniting with Gwen Stacy, Brooklyn's full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters a team of Spider-People.",
      ar: "بعد لم شمله مع غوين ستايسي، يتم إلقاء مايلز موراليس عبر الأكوان المتعددة، حيث يلتقي بنخبة من حماة عوالم العناكب، ويواجه تهديدًا مدمرًا جديدًا.",
      fr: "Miles Morales est catapulté à travers le Multiverse, où il rencontre une équipe de Spider-Héros chargée de protéger l'existence même du Multiverse."
    },
    poster_path: "",
    backdrop_path: "",
    release_date: "2023-05-31",
    vote_average: 8.4,
    genres: ["Animation", "Action", "Adventure"],
    duration: 140,
    certification: "PG",
    trailer_key: "cqGjhVJWtEg",
    cast: [
      { name: "Shameik Moore", character: "Miles Morales", profile_path: "" },
      { name: "Hailee Steinfeld", character: "Gwen Stacy", profile_path: "" },
      { name: "Oscar Isaac", character: "Miguel O'Hara", profile_path: "" }
    ]
  }
];

export const FALLBACK_GENRES = [
  { id: 28, name: { en: "Action", ar: "أكشن", fr: "Action" } },
  { id: 12, name: { en: "Adventure", ar: "مغامرة", fr: "Aventure" } },
  { id: 18, name: { en: "Drama", ar: "دراما", fr: "Drame" } },
  { id: 27, name: { en: "Horror", ar: "رعب", fr: "Horreur" } },
  { id: 35, name: { en: "Comedy", ar: "كوميديا", fr: "Comédie" } },
  { id: 878, name: { en: "Sci-Fi", ar: "خيال علمي", fr: "Sci-Fi" } }
];
