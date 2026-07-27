/** Fonds d'écran derrière l'échiquier (style Chess.com). */

export type BoardBackgroundId =
  | "none"
  | "savanna-sunset"
  | "savanna-dawn"
  | "sahara-dunes"
  | "rainforest"
  | "kilimanjaro"
  | "nile-dusk"
  | "baobab-night"
  | "kente-gold"
  | "kente-royal"
  | "adinkra-gold"
  | "mudcloth"
  | "ankara-burst"
  | "coral-coast"
  | "lagos-neon"
  | "cape-mountains"
  | "serengeti"
  | "marrakech"
  | "ethiopian-highlands"
  | "victoria-mist"
  | "sahara-stars"
  | "fireflies"
  | "marble-hall"
  | "library-classic"
  | "midnight-tournament"
  | "aurora"
  | "deep-ocean"
  | "sakura"
  | "autumn-forest"
  | "winter-frost"
  | "zen-garden"
  | "cosmic-nebula"
  | "warm-cafe"
  | "royal-purple"
  | "emerald-palace"
  | "animal-lion"
  | "animal-elephant"
  | "animal-cheetah"
  | "animal-panther"
  | "animal-zebra"
  | "animal-eagle"
  | "animal-giraffe"
  | "animal-whale"
  | "animal-tigers"
  | "animal-tigers-sky"
  | "lichess-landscape"
  | "lichess-01"
  | "lichess-02"
  | "lichess-03"
  | "lichess-04"
  | "lichess-05"
  | "lichess-06"
  | "lichess-07"
  | "lichess-08"
  | "lichess-09"
  | "lichess-10"
  | "lichess-11"
  | "lichess-12"
  | "lichess-13"
  | "lichess-14"
  | "lichess-15"
  | "lichess-16"
  | "lichess-17"
  | "lichess-18"
  | "lichess-19"
  | "lichess-20"
  | "lichess-21"
  | "lichess-22"
  | "lichess-23"
  | "lichess-24"
  | "lichess-25"
  | "lichess-26"
  | "lichess-27"
  | "lichess-28";

/** Catégories thématiques bien séparées (animaux, désert, forêt…). */
export type BoardBackgroundCategory =
  | "none"
  | "animals"
  | "desert"
  | "forest"
  | "mountains"
  | "water"
  | "sky"
  | "culture"
  | "city"
  | "classic"
  | "abstract"
  | "gallery";

export interface BoardBackground {
  id: BoardBackgroundId;
  labelFr: string;
  labelEn: string;
  category: BoardBackgroundCategory;
  /** Chemin public ; absent pour "none" */
  src?: string;
  /** Miniature légère pour le sélecteur (évite de décoder les full-res). */
  thumbSrc?: string;
}

/** Ordre d’affichage des sections dans le sélecteur. */
export const BOARD_BACKGROUND_CATEGORY_ORDER: BoardBackgroundCategory[] = [
  "none",
  "animals",
  "desert",
  "forest",
  "mountains",
  "water",
  "sky",
  "culture",
  "city",
  "classic",
  "abstract",
  "gallery",
];

/** Galerie Picture Lichess (lifat/background/gallery, Unsplash licence). */
const LICHESS_GALLERY_BACKGROUNDS: BoardBackground[] = Array.from({ length: 28 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `lichess-${n}` as BoardBackgroundId,
    labelFr: `Galerie ${n}`,
    labelEn: `Gallery ${n}`,
    category: "gallery",
    src: `/images/backgrounds/lichess/bg${n}.webp`,
    thumbSrc: `/images/backgrounds/lichess/thumbs/bg${n}.webp`,
  };
});

export const BOARD_BACKGROUNDS: BoardBackground[] = [
  { id: "none", labelFr: "Aucun", labelEn: "None", category: "none" },

  /* —— Animaux —— */
  {
    id: "animal-tigers",
    labelFr: "Tigres — émeraude",
    labelEn: "Tigers — emerald",
    category: "animals",
    src: "/images/backgrounds/animal-tigers.webp",
  },
  {
    id: "animal-tigers-sky",
    labelFr: "Tigres — bleu ciel",
    labelEn: "Tigers — sky blue",
    category: "animals",
    src: "/images/backgrounds/animal-tigers-sky.webp",
  },
  {
    id: "animal-lion",
    labelFr: "Lion — or royal",
    labelEn: "Lion — royal gold",
    category: "animals",
    src: "/images/backgrounds/animal-lion.jpg",
  },
  {
    id: "animal-elephant",
    labelFr: "Éléphant — ivoire",
    labelEn: "Elephant — ivory",
    category: "animals",
    src: "/images/backgrounds/animal-elephant.jpg",
  },
  {
    id: "animal-cheetah",
    labelFr: "Guépard — ambre",
    labelEn: "Cheetah — amber",
    category: "animals",
    src: "/images/backgrounds/animal-cheetah.jpg",
  },
  {
    id: "animal-panther",
    labelFr: "Panthère — noir",
    labelEn: "Panther — onyx",
    category: "animals",
    src: "/images/backgrounds/animal-panther.jpg",
  },
  {
    id: "animal-zebra",
    labelFr: "Zèbre — perle",
    labelEn: "Zebra — pearl",
    category: "animals",
    src: "/images/backgrounds/animal-zebra.jpg",
  },
  {
    id: "animal-eagle",
    labelFr: "Aigle — azur",
    labelEn: "Eagle — azure",
    category: "animals",
    src: "/images/backgrounds/animal-eagle.jpg",
  },
  {
    id: "animal-giraffe",
    labelFr: "Girafe — coucher",
    labelEn: "Giraffe — dusk",
    category: "animals",
    src: "/images/backgrounds/animal-giraffe.jpg",
  },
  {
    id: "animal-whale",
    labelFr: "Baleine — soie",
    labelEn: "Whale — silk",
    category: "animals",
    src: "/images/backgrounds/animal-whale.jpg",
  },

  /* —— Désert / savane —— */
  {
    id: "sahara-dunes",
    labelFr: "Dunes du Sahara",
    labelEn: "Sahara dunes",
    category: "desert",
    src: "/images/backgrounds/sahara-dunes.svg",
  },
  {
    id: "sahara-stars",
    labelFr: "Sahara — étoiles",
    labelEn: "Sahara stars",
    category: "desert",
    src: "/images/backgrounds/sahara-stars.svg",
  },
  {
    id: "savanna-sunset",
    labelFr: "Savane — coucher",
    labelEn: "Savanna sunset",
    category: "desert",
    src: "/images/backgrounds/savanna-sunset.svg",
  },
  {
    id: "savanna-dawn",
    labelFr: "Savane — aube",
    labelEn: "Savanna dawn",
    category: "desert",
    src: "/images/backgrounds/savanna-dawn.svg",
  },
  {
    id: "serengeti",
    labelFr: "Serengeti",
    labelEn: "Serengeti",
    category: "desert",
    src: "/images/backgrounds/serengeti.svg",
  },
  {
    id: "marrakech",
    labelFr: "Marrakech",
    labelEn: "Marrakech",
    category: "desert",
    src: "/images/backgrounds/marrakech.svg",
  },

  /* —— Forêt —— */
  {
    id: "rainforest",
    labelFr: "Forêt tropicale",
    labelEn: "Rainforest",
    category: "forest",
    src: "/images/backgrounds/rainforest.svg",
  },
  {
    id: "autumn-forest",
    labelFr: "Forêt d'automne",
    labelEn: "Autumn forest",
    category: "forest",
    src: "/images/backgrounds/autumn-forest.svg",
  },
  {
    id: "baobab-night",
    labelFr: "Baobabs — nuit",
    labelEn: "Baobab night",
    category: "forest",
    src: "/images/backgrounds/baobab-night.svg",
  },
  {
    id: "fireflies",
    labelFr: "Lucioles",
    labelEn: "Fireflies",
    category: "forest",
    src: "/images/backgrounds/fireflies.svg",
  },
  {
    id: "sakura",
    labelFr: "Sakura",
    labelEn: "Sakura",
    category: "forest",
    src: "/images/backgrounds/sakura.svg",
  },
  {
    id: "zen-garden",
    labelFr: "Jardin zen",
    labelEn: "Zen garden",
    category: "forest",
    src: "/images/backgrounds/zen-garden.svg",
  },
  {
    id: "winter-frost",
    labelFr: "Givre d'hiver",
    labelEn: "Winter frost",
    category: "forest",
    src: "/images/backgrounds/winter-frost.svg",
  },

  /* —— Montagnes —— */
  {
    id: "kilimanjaro",
    labelFr: "Kilimandjaro",
    labelEn: "Kilimanjaro",
    category: "mountains",
    src: "/images/backgrounds/kilimanjaro.svg",
  },
  {
    id: "cape-mountains",
    labelFr: "Montagnes du Cap",
    labelEn: "Cape mountains",
    category: "mountains",
    src: "/images/backgrounds/cape-mountains.svg",
  },
  {
    id: "ethiopian-highlands",
    labelFr: "Hauts plateaux",
    labelEn: "Ethiopian highlands",
    category: "mountains",
    src: "/images/backgrounds/ethiopian-highlands.svg",
  },
  {
    id: "victoria-mist",
    labelFr: "Chutes Victoria",
    labelEn: "Victoria Falls",
    category: "mountains",
    src: "/images/backgrounds/victoria-mist.svg",
  },

  /* —— Eau —— */
  {
    id: "coral-coast",
    labelFr: "Côte corallienne",
    labelEn: "Coral coast",
    category: "water",
    src: "/images/backgrounds/coral-coast.svg",
  },
  {
    id: "nile-dusk",
    labelFr: "Nil au crépuscule",
    labelEn: "Nile at dusk",
    category: "water",
    src: "/images/backgrounds/nile-dusk.svg",
  },
  {
    id: "deep-ocean",
    labelFr: "Océan profond",
    labelEn: "Deep ocean",
    category: "water",
    src: "/images/backgrounds/deep-ocean.svg",
  },

  /* —— Ciel —— */
  {
    id: "aurora",
    labelFr: "Aurore boréale",
    labelEn: "Aurora",
    category: "sky",
    src: "/images/backgrounds/aurora.svg",
  },
  {
    id: "cosmic-nebula",
    labelFr: "Nébuleuse",
    labelEn: "Cosmic nebula",
    category: "sky",
    src: "/images/backgrounds/cosmic-nebula.svg",
  },

  /* —— Culture / motifs —— */
  {
    id: "kente-gold",
    labelFr: "Kente doré",
    labelEn: "Golden kente",
    category: "culture",
    src: "/images/backgrounds/kente-gold.svg",
  },
  {
    id: "kente-royal",
    labelFr: "Kente royal",
    labelEn: "Royal kente",
    category: "culture",
    src: "/images/backgrounds/kente-royal.svg",
  },
  {
    id: "adinkra-gold",
    labelFr: "Adinkra",
    labelEn: "Adinkra",
    category: "culture",
    src: "/images/backgrounds/adinkra-gold.svg",
  },
  {
    id: "mudcloth",
    labelFr: "Bogolan",
    labelEn: "Mudcloth",
    category: "culture",
    src: "/images/backgrounds/mudcloth.svg",
  },
  {
    id: "ankara-burst",
    labelFr: "Ankara",
    labelEn: "Ankara",
    category: "culture",
    src: "/images/backgrounds/ankara-burst.svg",
  },

  /* —— Ville / nuit —— */
  {
    id: "lagos-neon",
    labelFr: "Lagos — nuit",
    labelEn: "Lagos neon",
    category: "city",
    src: "/images/backgrounds/lagos-neon.svg",
  },
  {
    id: "midnight-tournament",
    labelFr: "Tournoi de minuit",
    labelEn: "Midnight tournament",
    category: "city",
    src: "/images/backgrounds/midnight-tournament.svg",
  },
  {
    id: "warm-cafe",
    labelFr: "Café chaleureux",
    labelEn: "Warm café",
    category: "city",
    src: "/images/backgrounds/warm-cafe.svg",
  },

  /* —— Classique —— */
  {
    id: "marble-hall",
    labelFr: "Salle de marbre",
    labelEn: "Marble hall",
    category: "classic",
    src: "/images/backgrounds/marble-hall.svg",
  },
  {
    id: "library-classic",
    labelFr: "Bibliothèque",
    labelEn: "Classic library",
    category: "classic",
    src: "/images/backgrounds/library-classic.svg",
  },

  /* —— Abstrait —— */
  {
    id: "royal-purple",
    labelFr: "Velours pourpre",
    labelEn: "Royal purple",
    category: "abstract",
    src: "/images/backgrounds/royal-purple.svg",
  },
  {
    id: "emerald-palace",
    labelFr: "Palais d'émeraude",
    labelEn: "Emerald palace",
    category: "abstract",
    src: "/images/backgrounds/emerald-palace.svg",
  },

  /* —— Galerie —— */
  {
    id: "lichess-landscape",
    labelFr: "Paysage",
    labelEn: "Landscape",
    category: "gallery",
    src: "/images/backgrounds/lichess/landscape.jpg",
    thumbSrc: "/images/backgrounds/lichess/thumbs/landscape.webp",
  },
  ...LICHESS_GALLERY_BACKGROUNDS,
];

export const DEFAULT_BOARD_BACKGROUND: BoardBackgroundId = "none";

const BG_MAP = new Map(BOARD_BACKGROUNDS.map((b) => [b.id, b]));

export function isBoardBackgroundId(value: string | null): value is BoardBackgroundId {
  return value !== null && BG_MAP.has(value as BoardBackgroundId);
}

export function getBoardBackground(id: BoardBackgroundId): BoardBackground {
  return BG_MAP.get(id) ?? BG_MAP.get(DEFAULT_BOARD_BACKGROUND)!;
}

export function boardBackgroundLabel(
  locale: string,
  bg: BoardBackground
): string {
  return locale === "fr" ? bg.labelFr : bg.labelEn;
}

export function backgroundsInCategory(
  category: BoardBackgroundCategory
): BoardBackground[] {
  return BOARD_BACKGROUNDS.filter((b) => b.category === category);
}
