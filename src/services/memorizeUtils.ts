/**
 * Utilities for the Memorize screen: tokenize Sanskrit text and compute blanks.
 */

import type { MemorizationLevel } from '../types/gita';

// --- Token types ---

export type MemorizeToken =
  | { type: 'word'; text: string; wordIndex: number }
  | { type: 'separator'; text: string };

export interface BlankConfig {
  blankedIndices: Set<number>;
  totalWords: number;
}

// --- Text cleaning (mirrors pronunciationScore.ts patterns) ---

function stripForDisplay(sanskrit: string): string {
  return sanskrit
    .replace(/^.*उवाच\s*[|।॥\n]+\s*/u, '')       // speaker attribution
    .replace(/\|\|[\d\p{Nd}\-]+\|\|/gu, '')         // verse numbers ||१-१||
    .replace(/[\u0964\u0965]/g, '')                  // Devanagari danda
    .trim();
}

// --- Tokenizer ---

export function tokenizeSanskrit(sanskrit: string): MemorizeToken[] {
  const cleaned = stripForDisplay(sanskrit);
  // Split keeping separators (whitespace, pipes) as separate tokens
  const parts = cleaned.split(/(\s+|[|]+)/u);
  const tokens: MemorizeToken[] = [];
  let wordIndex = 0;

  for (const part of parts) {
    if (!part) continue;
    if (/\p{L}/u.test(part)) {
      tokens.push({ type: 'word', text: part, wordIndex: wordIndex++ });
    } else {
      tokens.push({ type: 'separator', text: part });
    }
  }
  return tokens;
}

// --- Seeded random for deterministic blanking ---

function seededRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  }
  if (s === 0) s = 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// --- Blank computation ---

export function computeBlanks(
  tokens: MemorizeToken[],
  level: MemorizationLevel,
  shlokaId: string
): BlankConfig {
  const wordTokens = tokens.filter(
    (t): t is Extract<MemorizeToken, { type: 'word' }> => t.type === 'word'
  );
  const totalWords = wordTokens.length;

  if (level === 1) {
    return { blankedIndices: new Set(), totalWords };
  }

  if (level >= 4) {
    // Levels 4 and 5: all words blanked (rendering differs)
    return {
      blankedIndices: new Set(wordTokens.map(t => t.wordIndex)),
      totalWords,
    };
  }

  // Levels 2-3: partial blanking
  const fraction = level === 2 ? 0.25 : 0.5;
  const count = Math.max(1, Math.round(totalWords * fraction));

  const rng = seededRandom(shlokaId);
  const indices = wordTokens.map(t => t.wordIndex);
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return {
    blankedIndices: new Set(indices.slice(0, count)),
    totalWords,
  };
}

// --- First-letter hint for Level 4 ---

export function firstLetterHint(word: string): string {
  return word.charAt(0) + '\u2026'; // first character + ellipsis
}

// --- Transliteration map (wordIndex → Roman script) ---

function stripTransliteration(transliteration: string): string {
  return transliteration
    .replace(/^.*uvāca\s*[.|।॥\n]+\s*/iu, '')  // speaker attribution
    .replace(/\|\|[\d\p{Nd}\-]+\|\|/gu, '')      // verse numbers
    .replace(/[\u0964\u0965]/g, '')               // dandas
    .trim();
}

/**
 * Build a map from wordIndex → transliteration word.
 * Pairs up tokenized Sanskrit words with transliteration words by position.
 */
export function buildWordTranslitMap(
  sanskrit: string,
  transliteration: string
): Record<number, string> {
  const tokens = tokenizeSanskrit(sanskrit);
  const wordTokens = tokens.filter(t => t.type === 'word');

  const cleaned = stripTransliteration(transliteration);
  const parts = cleaned.split(/(\s+|[|.]+)/u);
  const translitWords: string[] = [];
  for (const part of parts) {
    if (part && /\p{L}/u.test(part)) {
      translitWords.push(part);
    }
  }

  const map: Record<number, string> = {};
  const len = Math.min(wordTokens.length, translitWords.length);
  for (let i = 0; i < len; i++) {
    map[wordTokens[i].wordIndex] = translitWords[i];
  }
  return map;
}

// --- Split tokens into lines for Level 5 ---

export function splitIntoLines(tokens: MemorizeToken[]): MemorizeToken[][] {
  const lines: MemorizeToken[][] = [];
  let current: MemorizeToken[] = [];

  for (const token of tokens) {
    if (token.type === 'separator' && token.text.includes('\n')) {
      if (current.length > 0) {
        lines.push(current);
        current = [];
      }
    } else {
      current.push(token);
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}
