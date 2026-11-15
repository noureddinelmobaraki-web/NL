export interface CuratedSeries {
  id: number;
  imdb_id: string;
  name: {
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
  first_air_date: string;
  vote_average: number;
  genres: string[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  trailer_key: string;
  cast: {
    name: string;
    character: string;
    profile_path: string;
  }[];
}

export const FALLBACK_SERIES: CuratedSeries[] = [
  {
    id: 1396,
    imdb_id: "tt0903747",
    name: {
      en: "Breaking Bad",
      ar: "Breaking Bad",
      fr: "Breaking Bad"
    },
    overview: {
      en: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future.",
      ar: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future.",
      fr: "Un professeur de chimie de lycée, diagnostiqué avec un cancer du poumon inopérable, se tourne vers la fabrication et la vente de méthamphétamine avec un ancien élève afin de sécuriser l'avenir de sa famille."
    },
    poster_path: "",
    backdrop_path: "",
    first_air_date: "2008-01-20",
    vote_average: 9.5,
    genres: ["Drama", "Crime"],
    number_of_seasons: 5,
    number_of_episodes: 62,
    trailer_key: "HhesaQXLuRY",
    cast: [
      { name: "Bryan Cranston", character: "Walter White", profile_path: "" },
      { name: "Aaron Paul", character: "Jesse Pinkman", profile_path: "" },
      { name: "Anna Gunn", character: "Skyler White", profile_path: "" }
    ]
  },
  {
    id: 66732,
    imdb_id: "tt5027774",
    name: {
      en: "Stranger Things",
      ar: "Stranger Things",
      fr: "Stranger Things"
    },
    overview: {
      en: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
      ar: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
      fr: "Quand un jeune garçon disparaît, une petite ville découvre un mystère entourant des expériences secrètes, des forces surnaturelles terrifiantes et une étrange petite fille."
    },
    poster_path: "",
    backdrop_path: "",
    first_air_date: "2016-07-15",
    vote_average: 8.6,
    genres: ["Sci-Fi", "Drama", "Mystery"],
    number_of_seasons: 4,
    number_of_episodes: 34,
    trailer_key: "b9EkMc79ZSU",
    cast: [
      { name: "Millie Bobby Brown", character: "Eleven", profile_path: "" },
      { name: "Finn Wolfhard", character: "Mike Wheeler", profile_path: "" },
      { name: "Winona Ryder", character: "Joyce Byers", profile_path: "" }
    ]
  },
  {
    id: 1399,
    imdb_id: "tt0944947",
    name: {
      en: "Game of Thrones",
      ar: "Game of Thrones",
      fr: "Game of Thrones : Le Trône de Fer"
    },
    overview: {
      en: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest North.",
      ar: "Nine noble families fight for control over the mythical lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
      fr: "Sept familles royales se disputent le contrôle de la terre mythique de Westeros. Les frictions entre ces maisons mènent à une guerre ouverte, alors qu'un mal très ancien s'éveille dans le grand Nord."
    },
    poster_path: "",
    backdrop_path: "",
    first_air_date: "2011-04-17",
    vote_average: 8.4,
    genres: ["Adventure", "Drama", "Fantasy"],
    number_of_seasons: 8,
    number_of_episodes: 73,
    trailer_key: "bjqEWgDVy0M",
    cast: [
      { name: "Emilia Clarke", character: "Daenerys Targaryen", profile_path: "" },
      { name: "Kit Harington", character: "Jon Snow", profile_path: "" },
      { name: "Peter Dinklage", character: "Tyrion Lannister", profile_path: "" }
    ]
  },
  {
    id: 19885,
    imdb_id: "tt1475582",
    name: {
      en: "Sherlock",
      ar: "Sherlock",
      fr: "Sherlock"
    },
    overview: {
      en: "A modern update finds the famous sleuth and his doctor partner solving crime in 21st century London.",
      ar: "A modern update finds the famous sleuth and his doctor partner solving crime in 21st century London.",
      fr: "Une version moderne des aventures du célèbre détective Sherlock Holmes et de son partenaire le docteur John Watson résolvant des crimes dans le Londres du XXIe siècle."
    },
    poster_path: "",
    backdrop_path: "",
    first_air_date: "2010-07-25",
    vote_average: 8.5,
    genres: ["Mystery", "Drama", "Crime"],
    number_of_seasons: 4,
    number_of_episodes: 13,
    trailer_key: "xK7S9mr1yQ8",
    cast: [
      { name: "Benedict Cumberbatch", character: "Sherlock Holmes", profile_path: "" },
      { name: "Martin Freeman", character: "John Watson", profile_path: "" },
      { name: "Andrew Scott", character: "Jim Moriarty", profile_path: "" }
    ]
  },
  {
    id: 87108,
    imdb_id: "tt7366338",
    name: {
      en: "Chernobyl",
      ar: "Chernobyl",
      fr: "Chernobyl"
    },
    overview: {
      en: "The true story of one of the worst man-made catastrophes in history: the catastrophic nuclear accident at Chernobyl. A tale of the brave men and women who sacrificed to save Europe from unimaginable disaster.",
      ar: "The true story of one of the worst man-made catastrophes in history: the catastrophic nuclear accident at Chernobyl. A tale of the brave men and women who sacrificed to save Europe from unimaginable disaster.",
      fr: "L'histoire vraie de l'une des pires catastrophes provoquées par l'homme dans l'histoire : l'accident nucléaire catastrophique de Tchernobyl."
    },
    poster_path: "",
    backdrop_path: "",
    first_air_date: "2019-05-06",
    vote_average: 8.7,
    genres: ["Drama", "History"],
    number_of_seasons: 1,
    number_of_episodes: 5,
    trailer_key: "s9APLXM9Ei8",
    cast: [
      { name: "Jared Harris", character: "Valery Legasov", profile_path: "" },
      { name: "Stellan Skarsgård", character: "Boris Shcherbina", profile_path: "" },
      { name: "Emily Watson", character: "Ulana Khomyuk", profile_path: "" }
    ]
  }
];

export const FALLBACK_SERIES_GENRES = [
  { id: 10759, name: { en: "Action & Adventure", ar: "Action & Adventure", fr: "Action & Aventure" } },
  { id: 18, name: { en: "Drama", ar: "Drama", fr: "Drame" } },
  { id: 35, name: { en: "Comedy", ar: "Comedy", fr: "Comédie" } },
  { id: 10765, name: { en: "Sci-Fi & Fantasy", ar: "Sci-Fi & Fantasy", fr: "Sci-Fi & Fantaisie" } },
  { id: 9648, name: { en: "Mystery", ar: "Mystery", fr: "Mystère" } }
];
