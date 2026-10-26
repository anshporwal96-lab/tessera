import type { Difficulty, WordEntry } from '../engine/types';

/**
 * Curated answer bank.
 *
 * Tiers are chosen by familiarity and how hard the letter pattern is to deduce,
 * not by length:
 *  - easy:     everyday words a child would know.
 *  - medium:   familiar words with less common letters or patterns.
 *  - hard:     recognisable but less common vocabulary, awkward letters (J, Q, X, Z, Y-as-vowel).
 *  - veryhard: obscure-but-fair words, repeated letters, few or no vowels.
 *
 * Layout: length → tier → category → space-separated words. Categories double
 * as optional hints. Every word must be a valid, non-offensive English word.
 */
type BankSource = Record<number, Record<Difficulty, Record<string, string>>>;

const SOURCE: BankSource = {
  4: {
    easy: {
      animal: 'bird fish frog lion bear wolf duck goat deer seal crow',
      food: 'milk cake rice soup corn bean salt pear',
      home: 'door lamp book desk ring sofa bowl',
      nature: 'rain snow wind tree rock moon star fire leaf lake',
      action: 'jump swim walk sing read play cook',
      describing: 'kind warm cold blue gold fast soft',
      place: 'farm park city shop',
    },
    medium: {
      nature: 'dusk dawn mist tide glow fern moss',
      animal: 'fawn hawk moth wasp crab',
      food: 'plum lime herb kale',
      object: 'vase jade opal silk wool knot',
      abstract: 'hush gist oath pact plea whim',
      describing: 'deft glum taut',
    },
    hard: {
      noun: 'lynx ibex yolk quiz jinx hymn myth wisp zeal apex jamb kiln knob onyx cyst',
      adjective: 'glib faux',
      verb: 'coax',
    },
    veryhard: {
      noun: 'pyre yurt jowl kohl whey eddy jazz fuzz quay',
      verb: 'scry',
      adverb: 'awry',
    },
  },
  5: {
    easy: {
      animal: 'horse tiger zebra snake mouse sheep whale eagle shark camel goose otter llama koala panda moose bison puppy robin',
      food: 'apple bread lemon grape peach melon pizza pasta salad sugar honey onion juice candy toast cream mango olive',
      home: 'chair table couch plate spoon clock phone towel brush shelf glass knife paper radio',
      nature: 'plant ocean beach river cloud storm grass stone water earth flame field',
      body: 'heart brain mouth elbow thumb ankle chest spine',
      action: 'dance laugh smile write sleep throw catch speak build drive paint climb learn share',
      describing: 'happy sunny quick brave sweet fresh clean light heavy quiet green round sharp',
      place: 'house hotel store court tower plaza',
      people: 'child queen pilot nurse coach baker guest judge',
      fun: 'music piano party movie dream',
    },
    medium: {
      nature: 'frost marsh ridge grove cliff coral blaze ember gleam lunar orbit thorn',
      object: 'quilt plume prism jewel ivory flute anvil easel lever crate',
      action: 'drift lunge scour glide brace hover forge',
      describing: 'crisp noble lucid stark brisk humid rigid timid stern',
      abstract: 'charm flair knack mirth vigor rival truce',
      food: 'yeast cocoa basil cumin gravy broth',
      place: 'wharf manor cabin lodge oasis',
      people: 'nomad envoy scout tutor',
    },
    hard: {
      noun: 'nymph glyph crypt fjord qualm knoll abyss axiom blitz chasm cynic epoch ethos fluke gnome guild haiku helix irony khaki kiosk knave lyric sieve spasm thyme trove valor waltz wrath zilch quirk plaid oxide rhyme',
      verb: 'jaunt bluff lapse skulk usurp vouch nudge psych',
      adjective: 'fuzzy jazzy matte woozy',
    },
    veryhard: {
      noun: 'sylph lymph myrrh xylem tryst gauze hovel nadir oxbow yokel ennui fugue epoxy phlox bijou kayak kebab psalm ghoul pique fluff',
      verb: 'quash quaff gnash knelt wrung plumb mimic',
      adjective: 'vapid civic vivid',
      adverb: 'wryly dryly shyly slyly',
    },
  },
  6: {
    easy: {
      home: 'basket bottle pencil window ladder cookie',
      animal: 'kitten monkey rabbit turtle donkey',
      nature: 'garden flower planet forest island summer winter',
      people: 'friend doctor family',
      object: 'jacket camera guitar marble',
      place: 'school castle bridge',
      color: 'orange silver yellow purple',
      food: 'dinner butter cheese tomato',
    },
    medium: {
      nature: 'breeze desert jungle lagoon meadow tundra canyon',
      animal: 'falcon oyster parrot',
      object: 'anchor candle quiver ribbon saddle violin velvet beacon',
      food: 'nectar walnut',
      place: 'harbor',
      fantasy: 'goblin',
      color: 'cobalt',
    },
    hard: {
      noun: 'rhythm sphinx zephyr quorum enigma glitch jigsaw kernel frenzy zealot whimsy',
      verb: 'hijack muzzle squirm',
      adjective: 'oblong quaint',
      adverb: 'yonder',
    },
    veryhard: {
      noun: 'syzygy gneiss zygote quokka jujube voodoo phlegm',
      adjective: 'sylvan',
    },
  },
  7: {
    easy: {
      animal: 'chicken dolphin penguin',
      home: 'balloon blanket kitchen mailbox picture',
      food: 'popcorn pumpkin',
      nature: 'rainbow weather morning',
      people: 'teacher captain monster',
      object: 'cartoon diamond',
      abstract: 'example freedom holiday',
      place: 'library',
    },
    medium: {
      food: 'avocado',
      object: 'bracket compass lantern trumpet whistle',
      travel: 'caravan',
      color: 'crimson',
      place: 'dungeon orchard',
      nature: 'eclipse harvest sapling thunder volcano',
      abstract: 'fortune',
      animal: 'gazelle mustang pelican',
      music: 'quartet',
    },
    hard: {
      noun: 'dynasty gymnast jackpot rhubarb whiskey jukebox',
      verb: 'mystify oxidize squeeze',
      adjective: 'buoyant cryptic zealous awkward',
    },
    veryhard: {
      noun: 'kumquat jodhpur pizzazz kibbutz isthmus rhizome bivouac',
      verb: 'flummox',
      adjective: 'squalid wizened',
    },
  },
  8: {
    easy: {
      travel: 'airplane vacation',
      event: 'birthday',
      animal: 'elephant dinosaur',
      nature: 'mountain sunshine',
      food: 'sandwich',
      sport: 'football',
      place: 'hospital',
      object: 'notebook painting umbrella treasure',
      school: 'question homework',
    },
    medium: {
      weather: 'blizzard',
      event: 'carnival marathon',
      people: 'champion',
      plant: 'daffodil lavender',
      object: 'envelope necklace tapestry',
      describing: 'fragrant',
      animal: 'hedgehog mosquito scorpion',
      gem: 'sapphire',
    },
    hard: {
      animal: 'aardvark squirrel',
      food: 'gazpacho zucchini',
      describing: 'jubilant',
      noun: 'kerosene mnemonic quagmire rhapsody synopsis',
    },
    veryhard: {
      noun: 'chutzpah ziggurat zeppelin',
      plant: 'kohlrabi hyacinth',
      adjective: 'quixotic',
    },
  },
};

const COMMONNESS: Record<Difficulty, number> = { easy: 5, medium: 4, hard: 2, veryhard: 1 };

export function buildWordBank(source: BankSource = SOURCE): WordEntry[] {
  const entries: WordEntry[] = [];
  const seen = new Set<string>();
  for (const [lengthKey, tiers] of Object.entries(source)) {
    const length = Number(lengthKey);
    for (const [difficulty, categories] of Object.entries(tiers) as [Difficulty, Record<string, string>][]) {
      for (const [category, list] of Object.entries(categories)) {
        for (const raw of list.split(/\s+/)) {
          const word = raw.trim().toUpperCase();
          if (!word || seen.has(word)) continue;
          seen.add(word);
          entries.push({ word, length, difficulty, commonness: COMMONNESS[difficulty], category });
        }
      }
    }
  }
  return entries;
}

export const WORD_BANK: readonly WordEntry[] = buildWordBank();

/** Exposed for tests that validate the curated data itself. */
export const WORD_BANK_SOURCE = SOURCE;
