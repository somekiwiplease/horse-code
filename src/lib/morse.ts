// Morse tables, language detection, and the horse <-> text translators.
// A "model" is words -> letters -> morse strings, e.g. [[".-", "-..."]].

export type Model = string[][];
export type Dir = "ltr" | "rtl";

export interface Lang {
  code: string;
  name: string;      // native name, shown in the picker
  english: string;   // for search / labels
  dir: Dir;
  latin: boolean;
  map: Record<string, string>;
}

const PUNCT: Record<string, string> = {
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};

const DIGITS: Record<string, string> = {
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
};

const LATIN: Record<string, string> = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....",
  i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.",
  q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-",
  y: "-.--", z: "--..",
};

const latin = (extra: Record<string, string> = {}) => ({ ...PUNCT, ...DIGITS, ...LATIN, ...extra });
const own = (letters: Record<string, string>) => ({ ...PUNCT, ...DIGITS, ...letters });

export const LANGS: Lang[] = [
  { code: "en", name: "English", english: "English", dir: "ltr", latin: true, map: latin() },
  {
    code: "es", name: "Español", english: "Spanish", dir: "ltr", latin: true,
    map: latin({ "ñ": "--.--", "é": "..-..", "á": ".--.-", "ü": "..--", "¿": "..-.-", "¡": "--...-" }),
  },
  {
    code: "fr", name: "Français", english: "French", dir: "ltr", latin: true,
    map: latin({ "à": ".--.-", "ç": "-.-..", "è": ".-..-", "é": "..-.." }),
  },
  {
    code: "de", name: "Deutsch", english: "German", dir: "ltr", latin: true,
    map: latin({ "ä": ".-.-", "ö": "---.", "ü": "..--", "ß": "...--.." }),
  },
  {
    code: "pl", name: "Polski", english: "Polish", dir: "ltr", latin: true,
    map: latin({
      "ą": ".-.-", "ć": "-.-..", "ę": "..-..", "ł": ".-..-", "ń": "--.--",
      "ó": "---.", "ś": "...-...", "ź": "--..-.", "ż": "--..-",
    }),
  },
  {
    code: "ru", name: "Русский", english: "Russian", dir: "ltr", latin: false,
    map: own({
      "а": ".-", "б": "-...", "в": ".--", "г": "--.", "д": "-..", "е": ".", "ё": ".",
      "ж": "...-", "з": "--..", "и": "..", "й": ".---", "к": "-.-", "л": ".-..",
      "м": "--", "н": "-.", "о": "---", "п": ".--.", "р": ".-.", "с": "...", "т": "-",
      "у": "..-", "ф": "..-.", "х": "....", "ц": "-.-.", "ч": "---.", "ш": "----",
      "щ": "--.-", "ъ": "--.--", "ы": "-.--", "ь": "-..-", "э": "..-..", "ю": "..--",
      "я": ".-.-",
    }),
  },
  {
    code: "el", name: "Ελληνικά", english: "Greek", dir: "ltr", latin: false,
    map: own({
      "α": ".-", "β": "-...", "γ": "--.", "δ": "-..", "ε": ".", "ζ": "--..", "η": "....",
      "θ": "-.-.", "ι": "..", "κ": "-.-", "λ": ".-..", "μ": "--", "ν": "-.", "ξ": "-..-",
      "ο": "---", "π": ".--.", "ρ": ".-.", "σ": "...", "ς": "...", "τ": "-", "υ": "-.--",
      "φ": "..-.", "χ": "----", "ψ": "--.-", "ω": ".--",
    }),
  },
  {
    code: "he", name: "עברית", english: "Hebrew", dir: "rtl", latin: false,
    map: own({
      "א": ".-", "ב": "-...", "ג": "--.", "ד": "-..", "ה": "---", "ו": ".", "ז": "--..",
      "ח": "....", "ט": "..-", "י": "..", "כ": "-.-", "ך": "-.-", "ל": ".-..", "מ": "--",
      "ם": "--", "נ": "-.", "ן": "-.", "ס": "-.-.", "ע": ".---", "פ": ".--.", "ף": ".--.",
      "צ": ".--", "ץ": ".--", "ק": "--.-", "ר": ".-.", "ש": "...", "ת": "-",
    }),
  },
  {
    code: "ar", name: "العربية", english: "Arabic", dir: "rtl", latin: false,
    map: own({
      "ا": ".-", "أ": ".-", "إ": ".-", "آ": ".-", "ب": "-...", "ت": "-", "ث": "-.-.",
      "ج": ".---", "ح": "....", "خ": "---", "د": "-..", "ذ": "--..", "ر": ".-.",
      "ز": "---.", "س": "...", "ش": "----", "ص": "-..-", "ض": "...-", "ط": "..-",
      "ظ": "-.--", "ع": ".-.-", "غ": "--.", "ف": "..-.", "ق": "--.-", "ك": "-.-",
      "ل": ".-..", "م": "--", "ن": "-.", "ه": "..-..", "ة": "..-..", "و": ".--",
      "ؤ": ".--", "ي": "..", "ى": "..", "ئ": "..", "ء": ".", "،": "--..--", "؟": "..--..",
    }),
  },
  {
    // Wabun code; dakuten (゛) and handakuten (゜) are sent as their own signs
    code: "ja", name: "日本語", english: "Japanese", dir: "ltr", latin: false,
    map: own({
      "イ": ".-", "ロ": ".-.-", "ハ": "-...", "ニ": "-.-.", "ホ": "-..", "ヘ": ".", "ト": "..-..",
      "チ": "..-.", "リ": "--.", "ヌ": "....", "ル": "-.--.", "ヲ": ".---", "ワ": "-.-",
      "カ": ".-..", "ヨ": "--", "タ": "-.", "レ": "---", "ソ": "---.", "ツ": ".--.",
      "ネ": "--.-", "ナ": ".-.", "ラ": "...", "ム": "-", "ウ": "..-", "ヰ": ".-..-",
      "ノ": "..--", "オ": ".-...", "ク": "...-", "ヤ": ".--", "マ": "-..-", "ケ": "-.--",
      "フ": "--..", "コ": "----", "エ": "-.---", "テ": ".-.--", "ア": "--.--", "サ": "-.-.-",
      "キ": "-.-..", "ユ": "-..--", "メ": "-...-", "ミ": "..-.-", "シ": "--.-.", "ヱ": ".--..",
      "ヒ": "--..-", "モ": "-..-.", "セ": ".---.", "ス": "---.-", "ン": ".-.-.",
      "゙": "..", "゚": "..--.", "ー": ".--.-", "、": ".-.-.-", "。": ".-.-..",
    }),
  },
];

export const LANG = Object.fromEntries(LANGS.map(l => [l.code, l])) as Record<string, Lang>;

// letters beat punctuation when they share a code; among letters the first listed wins (е over ё, σ over ς)
const reverse = (l: Lang) => {
  const out: Record<string, string> = {};
  const letters = new Set<string>();
  for (const [c, m] of Object.entries(l.map)) {
    const isLetter = !(c in PUNCT) && !(c in DIGITS);
    if (isLetter ? !letters.has(m) : !(m in out)) out[m] = c;
    if (isLetter) letters.add(m);
  }
  return out;
};
const REVERSE = Object.fromEntries(LANGS.map(l => [l.code, reverse(l)])) as Record<string, Record<string, string>>;

// every sign from every language, so mixed text (english words in russian) still encodes
const ANY: Record<string, string> = {};
for (const l of LANGS) for (const [c, m] of Object.entries(l.map)) ANY[c] ??= m;

const stripMarks = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

const SMALL_KANA: Record<string, string> = {
  "ァ": "ア", "ィ": "イ", "ゥ": "ウ", "ェ": "エ", "ォ": "オ", "ッ": "ツ", "ャ": "ヤ",
  "ュ": "ユ", "ョ": "ヨ", "ヮ": "ワ", "ヵ": "カ", "ヶ": "ケ",
};
const toWabunInput = (s: string) =>
  s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[ァィゥェォッャュョヮヵヶ]/g, c => SMALL_KANA[c])
    .normalize("NFD");

// ---------- detection ----------

const SCRIPTS: [string, RegExp][] = [
  ["ru", /[Ѐ-ӿ]/gu],
  ["el", /[Ͱ-Ͽἀ-῿]/gu],
  ["he", /[֐-׿]/gu],
  ["ar", /[؀-ۿ]/gu],
  ["ja", /[぀-ヿㇰ-ㇿ]/gu],
  ["pl", /[ąęłśźżńć]/giu],
  ["de", /[äöüß]/giu],
  ["es", /[ñ¿¡]/giu],
  ["fr", /[çèêàâîôûë]/giu],
];

export function detect(text: string): string {
  let best = "en", score = 0;
  for (const [code, re] of SCRIPTS) {
    const n = (text.match(re) || []).length;
    if (n > score) { best = code; score = n; }
  }
  return best;
}

// ---------- text -> horse ----------

export function encode(text: string, code: string): Model {
  const lang = LANG[code] ?? LANG.en;
  const prepared = code === "ja" ? toWabunInput(text) : text.normalize("NFC").toLowerCase();
  return prepared.trim().split(/\s+/)
    .map(word => [...word].map(ch => lang.map[ch] ?? ANY[ch] ?? ANY[stripMarks(ch)]).filter(Boolean))
    .filter(w => w.length);
}

export const HORSE: Record<string, string> = { ".": "🐴", "-": "🐎" };
export const toHorse = (m: string) => [...m].map(s => HORSE[s]).join("");
// one space between letters, two between words
export const horseText = (model: Model) => model.map(w => w.map(toHorse).join(" ")).join("  ");

// ---------- horse -> text ----------

const HORSES = /[🐴🐎]/u;

// "mostly horses" = horse code, even with a chat name or timestamp pasted along
const CHAT_PREFIX = /^\s*(\[[^\]]*\]\s*)?[^:\n🐴🐎]{1,40}:\s*/u;
const PLAIN_MORSE = /^[\s.\-…—–−·•_/|]*$/;
export function isHorses(text: string) {
  // typed dots and dashes count too: ".- -..."
  if (PLAIN_MORSE.test(text) && (text.match(/[.\-…—–−·•_]/g) || []).length >= 3 && /\s/.test(text.trim())) return true;
  const body = text.replace(CHAT_PREFIX, "");
  const horses = (body.match(/[🐴🐎]/gu) || []).length;
  return horses > 0 && horses >= (body.match(/[\p{L}\p{N}]/gu) || []).length;
}

// some keyboards put a space after every emoji: then 1 space = same letter,
// 2 = next letter, 3+ = next word
function respace(s: string) {
  const parts = s.trim().split(/( +)/);
  const tokens = parts.filter((_, i) => i % 2 === 0);
  const gaps = parts.filter((_, i) => i % 2 === 1).map(g => g.length);
  if (tokens.length < 4 || !tokens.every(t => t.length === 1) || !gaps.some(g => g >= 2)) return s;
  return tokens.map((t, i) => t + (i < gaps.length ? (gaps[i] === 1 ? "" : gaps[i] === 2 ? " " : "  ") : "")).join("");
}

export function parse(text: string): Model {
  let s = text.replace(/\p{Cf}|\uFE0F/gu, "");
  if (HORSES.test(s)) {
    // with horses, everything else (names, times, iPhone's ". " for double space) is noise
    s = s.replace(/[.\-]/g, " ").replace(/\S\/|\/\S/g, m => m.replace("/", " ")).replace(/🐴/gu, ".").replace(/🐎/gu, "-")
      .replace(/[^.\-\s/|]/gu, " ");
  } else {
    // typed dots and dashes: undo phone "smart punctuation"
    s = s.replace(/…/g, "...").replace(/—/g, "--").replace(/[–−‒―_]/g, "-").replace(/[·•∙⋅]/g, ".")
      .replace(/[^.\-\s/|]/g, " ");
  }
  s = s.replace(/\|/g, "/").replace(/[^\S\n]*\n[^\S\n]*/g, "\n");
  s = s.split(/(\s*\/\s*|\n+)/).map((seg, i) => (i % 2 ? seg : respace(seg))).join("");
  return s.trim()
    .split(/\s*\/\s*|\s{2,}|\n+/)
    .map(w => w.split(/\s+/).filter(Boolean))
    .filter(w => w.length);
}

const HEBREW_FINAL: Record<string, string> = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };

export interface Decoded {
  words: { ch: string; ok: boolean }[][];
  text: string;
  unknown: number;
}

export function decode(model: Model, code: string): Decoded {
  const rev = REVERSE[code] ?? REVERSE.en;
  let unknown = 0;
  const words = model.map(w => w.map(m => {
    const ch = rev[m];
    if (!ch) unknown++;
    return { ch: ch ?? "?", ok: !!ch };
  }));
  // letters that change shape at the end of a word
  const last = words.map(w => w[w.length - 1]);
  if (code === "he") last.forEach(l => { l.ch = HEBREW_FINAL[l.ch] ?? l.ch; });
  if (code === "el") last.forEach(l => { if (l.ch === "σ") l.ch = "ς"; });
  let text = words.map(w => w.map(l => l.ch).join("")).join(" ");
  if (code === "ja") text = text.normalize("NFC");
  return { words, text, unknown };
}
