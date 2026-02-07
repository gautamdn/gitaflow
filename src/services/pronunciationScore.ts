/**
 * Pronunciation scoring via Levenshtein distance comparison.
 * Compares Sarvam STT output against expected transliteration.
 */

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

/** Normalize text for comparison: lowercase, strip diacritics, collapse whitespace */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export interface PronunciationResult {
  /** 0-100 similarity percentage */
  score: number;
  /** The expected text (normalized) */
  expected: string;
  /** What was actually transcribed (normalized) */
  actual: string;
  /** Words that differed */
  mismatches: string[];
}

/**
 * Score pronunciation by comparing user's transcription against expected transliteration.
 */
export function scorePronunciation(
  expectedTransliteration: string,
  actualTranscription: string
): PronunciationResult {
  const expected = normalizeForComparison(expectedTransliteration);
  const actual = normalizeForComparison(actualTranscription);

  // Overall similarity score
  const maxLen = Math.max(expected.length, actual.length);
  const distance = levenshteinDistance(expected, actual);
  const score = maxLen === 0 ? 100 : Math.round(((maxLen - distance) / maxLen) * 100);

  // Word-level comparison to find mismatches
  const expectedWords = expected.split(' ');
  const actualWords = actual.split(' ');
  const mismatches: string[] = [];

  const maxWords = Math.max(expectedWords.length, actualWords.length);
  for (let i = 0; i < maxWords; i++) {
    const exp = expectedWords[i] ?? '';
    const act = actualWords[i] ?? '';
    if (exp !== act && exp !== '') {
      mismatches.push(exp);
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    expected,
    actual,
    mismatches,
  };
}
