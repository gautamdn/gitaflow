/**
 * Pronunciation scoring via word-level DP alignment with partial credit.
 * Compares Sarvam STT Devanagari output against expected Sanskrit text.
 */

export type WordStatus = 'correct' | 'partial' | 'wrong' | 'missing' | 'extra';

export interface WordComparison {
  /** The expected word from the shloka (normalized Devanagari) */
  expected: string;
  /** What STT actually produced, or '' if missing */
  actual: string;
  /** Character-level similarity 0-100 */
  similarity: number;
  /** Classification for color coding */
  status: WordStatus;
}

export interface PronunciationResult {
  /** 0-100 overall weighted score */
  score: number;
  /** The expected text (normalized) */
  expected: string;
  /** What was actually transcribed (normalized) */
  actual: string;
  /** Words that differed (backward compat) */
  mismatches: string[];
  /** Per-word comparison results for visual diff */
  wordComparisons: WordComparison[];
}

/** Compute Levenshtein edit distance between two strings */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/** Strip speaker attribution lines like "धृतराष्ट्र उवाच |" from the start of a shloka */
function stripSpeakerAttribution(text: string): string {
  // Match lines ending with उवाच followed by optional punctuation (speaker headers)
  return text.replace(/^.*उवाच\s*[|।॥\n]+\s*/u, '');
}

/** Normalize text for comparison: strip punctuation and verse numbers, collapse whitespace */
function normalizeForComparison(text: string): string {
  return stripSpeakerAttribution(text)
    .toLowerCase()
    .replace(/\|\|[\d\p{Nd}\-]+\|\|/gu, '') // strip verse numbers like ||1-7|| or ||१-७|| (MUST come before pipe stripping)
    .replace(/[\u0964\u0965]/g, '') // strip Devanagari danda (। ॥)
    .replace(/[॥।|]/g, '') // additional danda variants
    .replace(/[\d\u0966-\u096F]+/g, '') // strip ASCII and Devanagari digits
    .replace(/[^\p{L}\s]/gu, '') // keep only letters (any script) and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/** Character-level similarity between two words (0-1) */
function computeWordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b);
  return (maxLen - dist) / maxLen;
}

/** Word-level DP alignment that handles insertions/deletions */
function alignWords(
  expectedWords: string[],
  actualWords: string[]
): WordComparison[] {
  const m = expectedWords.length;
  const n = actualWords.length;

  // dp[i][j] = minimum cost to align expectedWords[0..i-1] with actualWords[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const wordSim = computeWordSimilarity(expectedWords[i - 1], actualWords[j - 1]);
      const subCost = 1 - wordSim;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // delete (expected word missing from actual)
        dp[i][j - 1] + 1, // insert (extra actual word)
        dp[i - 1][j - 1] + subCost // substitute/match
      );
    }
  }

  // Backtrace to produce alignment
  const result: WordComparison[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const wordSim = computeWordSimilarity(expectedWords[i - 1], actualWords[j - 1]);
      const subCost = 1 - wordSim;
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + subCost)) < 1e-9) {
        const simPercent = Math.round(wordSim * 100);
        result.unshift({
          expected: expectedWords[i - 1],
          actual: actualWords[j - 1],
          similarity: simPercent,
          status: simPercent === 100 ? 'correct' : simPercent >= 50 ? 'partial' : 'wrong',
        });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 1e-9) {
      result.unshift({
        expected: expectedWords[i - 1],
        actual: '',
        similarity: 0,
        status: 'missing',
      });
      i--;
    } else {
      result.unshift({
        expected: '',
        actual: actualWords[j - 1],
        similarity: 0,
        status: 'extra',
      });
      j--;
    }
  }

  return result;
}

/**
 * Build a map from normalized Sanskrit words to their transliteration equivalents.
 * Both inputs should be the raw shloka text (before normalization).
 */
export function buildTransliterationMap(
  sanskrit: string,
  transliteration: string
): Record<string, string> {
  const normSanskrit = normalizeForComparison(sanskrit);
  const normTranslit = transliteration
    .replace(/^.*uvāca\s*[.|।॥\n]+\s*/iu, '') // strip speaker attribution in transliteration
    .replace(/\|\|[\d\p{Nd}\-]+\|\|/gu, '')
    .replace(/[।॥|.]/g, '')
    .replace(/[\d\u0966-\u096F]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const sWords = normSanskrit.split(' ').filter(w => w.length > 0);
  const tWords = normTranslit.split(' ').filter(w => w.length > 0);

  const map: Record<string, string> = {};
  const len = Math.min(sWords.length, tWords.length);
  for (let i = 0; i < len; i++) {
    map[sWords[i]] = tWords[i];
  }
  return map;
}

/**
 * Score pronunciation by comparing user's transcription against expected Sanskrit text.
 * Uses word-level DP alignment with partial credit.
 */
export function scorePronunciation(
  expectedText: string,
  actualTranscription: string
): PronunciationResult {
  const expected = normalizeForComparison(expectedText);
  const actual = normalizeForComparison(actualTranscription);

  const expectedWords = expected.split(' ').filter(w => w.length > 0);
  const actualWords = actual.split(' ').filter(w => w.length > 0);

  // Word-level alignment
  const wordComparisons = alignWords(expectedWords, actualWords);

  // Weighted score from expected words only (not extras)
  const expectedComparisons = wordComparisons.filter(wc => wc.status !== 'extra');
  const totalWords = expectedComparisons.length;
  const score =
    totalWords === 0
      ? 100
      : Math.round(
          expectedComparisons.reduce((sum, wc) => sum + wc.similarity, 0) / totalWords
        );

  // Backward-compatible mismatches
  const mismatches = wordComparisons
    .filter(wc => wc.status !== 'correct' && wc.status !== 'extra' && wc.expected !== '')
    .map(wc => wc.expected);

  return {
    score: Math.max(0, Math.min(100, score)),
    expected,
    actual,
    mismatches,
    wordComparisons,
  };
}
