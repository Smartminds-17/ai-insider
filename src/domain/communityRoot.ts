const PREFIXES = [
  /^i\s+would\s+like\s+to\s+learn\s+/i,
  /^i'd\s+like\s+to\s+learn\s+/i,
  /^i\s+want\s+to\s+learn\s+/i,
  /^i\s+would\s+like\s+to\s+/i,
  /^i'd\s+like\s+to\s+/i,
  /^i\s+want\s+to\s+/i,
  /^i\s+need\s+to\s+/i,
  /^help\s+me\s+/i,
  /^teach\s+me\s+/i,
  /^learn\s+how\s+to\s+/i,
  /^how\s+to\s+/i,
  /^(learn|study|become|build|create|make|understand|master|start|begin)\s+/i,
];

const STOP_WORDS = new Set([
  "a", "an", "and", "about", "by", "for", "from", "i", "in", "into",
  "me", "my", "of", "on", "the", "through", "to", "using", "with",
  "your",
]);

const GENERIC_WORDS = new Set([
  "advanced", "application", "basics", "basic", "beginner", "beginners",
  "concepts", "core", "course", "fundamental", "fundamentals", "general",
  "intermediate", "introduction", "intro", "new", "practice", "real",
  "scratch", "skill", "skills", "something", "techniques", "things",
  "tutorial", "world",
]);

const ACRONYMS = new Set(["ai", "api", "css", "html", "sql", "ui", "ux"]);

export interface CommunityRoot {
  key: string;
  label: string;
}

/**
 * Normalize a learning prompt to a conservative topic root. Only the same
 * normalized root shares a community; vague prompts return null.
 */
export function getCommunityRoot(prompt: string): CommunityRoot | null {
  let root = prompt
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  let previous = "";
  while (root !== previous) {
    previous = root;
    for (const prefix of PREFIXES) {
      root = root.replace(prefix, "");
    }
  }

  root = root
    .replace(/\b(from scratch|step by step|for beginners|as a beginner)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  const words = root
    .split(/\s+/)
    .filter((word) => !STOP_WORDS.has(word) && !GENERIC_WORDS.has(word));

  if (words.length === 0) return null;

  const key = words.join("-");
  const label = words
    .map((word) => ACRONYMS.has(word) ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");

  return { key, label };
}
