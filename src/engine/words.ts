import type { WordSet } from "./types";

type SetDef = Omit<WordSet, "id">;

/**
 * Daily word bank (plan §04). Decoys are same-category near misses so the imposter
 * has real options; they matter more than the word. Generic clues are the fallback
 * when an agent's clue is rejected twice, so they must be safe for the word.
 */
export const WORD_SETS: readonly SetDef[] = [
  { category: "Breakfast", word: "waffle", decoys: ["pancake", "crepe", "bagel", "omelette"], generic: ["morning", "plate", "warm"] },
  { category: "Coastline", word: "lighthouse", decoys: ["pier", "harbor", "cliff", "dune"], generic: ["shore", "salty", "view"] },
  { category: "Kitchen tools", word: "whisk", decoys: ["spatula", "ladle", "tongs", "peeler"], generic: ["cook", "drawer", "handle"] },
  { category: "Board games", word: "chess", decoys: ["checkers", "backgammon", "scrabble", "monopoly"], generic: ["table", "turn", "rules"] },
  { category: "Weather", word: "thunder", decoys: ["hail", "drizzle", "fog", "sleet"], generic: ["sky", "forecast", "outside"] },
  { category: "Dog breeds", word: "beagle", decoys: ["poodle", "corgi", "dachshund", "husky"], generic: ["bark", "leash", "fur"] },
  { category: "Instruments", word: "cello", decoys: ["violin", "viola", "harp", "bassoon"], generic: ["music", "practice", "concert"] },
  { category: "Office supplies", word: "stapler", decoys: ["paperclip", "tape", "binder", "highlighter"], generic: ["desk", "paper", "work"] },
  { category: "Fruit", word: "mango", decoys: ["papaya", "peach", "pineapple", "guava"], generic: ["sweet", "juice", "ripe"] },
  { category: "Winter sports", word: "curling", decoys: ["skiing", "hockey", "luge", "snowboarding"], generic: ["ice", "cold", "olympics"] },
  { category: "Desserts", word: "tiramisu", decoys: ["cheesecake", "brownie", "flan", "cannoli"], generic: ["sugar", "after", "slice"] },
  { category: "Furniture", word: "hammock", decoys: ["sofa", "recliner", "futon", "beanbag"], generic: ["sit", "rest", "home"] },
  { category: "Vegetables", word: "artichoke", decoys: ["asparagus", "leek", "eggplant", "zucchini"], generic: ["green", "garden", "side"] },
  { category: "Ocean animals", word: "octopus", decoys: ["squid", "jellyfish", "starfish", "eel"], generic: ["water", "deep", "swim"] },
  { category: "Camping", word: "tent", decoys: ["campfire", "lantern", "canoe", "compass"], generic: ["outdoors", "night", "trip"] },
  { category: "Birds", word: "flamingo", decoys: ["pelican", "heron", "stork", "ostrich"], generic: ["feather", "wing", "nest"] },
  { category: "Sports gear", word: "helmet", decoys: ["skates", "racket", "whistle", "cleats"], generic: ["team", "gear", "game"] },
  { category: "Cheese", word: "brie", decoys: ["camembert", "gouda", "cheddar", "feta"], generic: ["wine", "cracker", "aged"] },
  { category: "Holidays", word: "halloween", decoys: ["thanksgiving", "easter", "valentines", "hanukkah"], generic: ["party", "calendar", "family"] },
  { category: "Space", word: "comet", decoys: ["asteroid", "meteor", "nebula", "satellite"], generic: ["sky", "night", "far"] },
  { category: "Jobs", word: "firefighter", decoys: ["paramedic", "lifeguard", "plumber", "electrician"], generic: ["uniform", "shift", "work"] },
  { category: "Pasta", word: "ravioli", decoys: ["tortellini", "lasagna", "gnocchi", "penne"], generic: ["sauce", "italian", "dinner"] },
  { category: "Bathroom", word: "toothbrush", decoys: ["floss", "loofah", "razor", "comb"], generic: ["sink", "morning", "mirror"] },
  { category: "Music genres", word: "jazz", decoys: ["blues", "funk", "swing", "soul"], generic: ["radio", "band", "listen"] },
  { category: "Insects", word: "firefly", decoys: ["ladybug", "dragonfly", "cricket", "moth"], generic: ["summer", "tiny", "garden"] },
  { category: "Tools", word: "wrench", decoys: ["pliers", "hammer", "screwdriver", "chisel"], generic: ["garage", "fix", "metal"] },
  { category: "Drinks", word: "lemonade", decoys: ["iced tea", "smoothie", "milkshake", "cider"], generic: ["glass", "cold", "sip"] },
  { category: "Fairy tales", word: "rapunzel", decoys: ["cinderella", "snow white", "rumpelstiltskin", "goldilocks"], generic: ["castle", "story", "once"] },
  { category: "Shoes", word: "sandal", decoys: ["sneaker", "loafer", "boot", "slipper"], generic: ["feet", "pair", "walk"] },
  { category: "Fabrics", word: "velvet", decoys: ["silk", "denim", "corduroy", "satin"], generic: ["soft", "sew", "fabric"] },
];

/** Day 1 of the daily puzzle. Share cards count from here. */
const LAUNCH_DAY = dayNumber("2026-10-05");
const DATE_SEED = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
}

/** Local date as YYYY-MM-DD, used as the daily seed. */
export function todaySeed(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic word set for a seed. A date seed walks the bank one set per day from
 * launch day (set 0) and carries the puzzle number; any other seed ("Play again") hashes to a set with id 0.
 */
export function wordSetForSeed(seed: string): WordSet {
  if (DATE_SEED.test(seed)) {
    const offset = dayNumber(seed) - LAUNCH_DAY;
    const index = ((offset % WORD_SETS.length) + WORD_SETS.length) % WORD_SETS.length;
    return { id: Math.max(1, offset + 1), ...WORD_SETS[index] };
  }
  const index = Math.floor(seededRandom(seed)() * WORD_SETS.length);
  return { id: 0, ...WORD_SETS[index] };
}

/**
 * Seeded PRNG: cyrb53-style string hash into mulberry32. Roles use seed + playerId so
 * the word is shared but who's the imposter isn't.
 */
export function seededRandom(seed: string): () => number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  let a = h1 >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
