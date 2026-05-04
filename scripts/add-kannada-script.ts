/**
 * One-shot build script: adds `sanskrit_kannada` to every shloka and
 * `name_kannada` to every chapter in assets/data/gita-data.json.
 *
 * Run with: npm run build:gita-data
 *
 * The script is idempotent — running it twice produces the same output.
 * It also runs three inline conversion assertions before writing, so any
 * regression in the Sanscript library will fail the build loudly instead
 * of silently corrupting bundled data.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error — package ships untyped, we only need .t()
import Sanscript from '@indic-transliteration/sanscript';

const DATA_PATH = resolve(__dirname, '..', 'assets', 'data', 'gita-data.json');

function toKannada(devanagari: string): string {
  return Sanscript.t(devanagari, 'devanagari', 'kannada');
}

interface KnownConversion {
  label: string;
  input: string;
  expected: string;
}

// Hand-verified Devanagari → Kannada conversions. If Sanscript's tables ever
// change in a way that breaks these, the build fails before the JSON is
// written, and we know to investigate before shipping.
const KNOWN_CONVERSIONS: KnownConversion[] = [
  {
    label: 'speaker attribution',
    input: 'धृतराष्ट्र उवाच',
    expected: 'ಧೃತರಾಷ್ಟ್ರ ಉವಾಚ',
  },
  {
    label: 'BG 2.47 opening',
    input: 'कर्मण्येवाधिकारस्ते',
    expected: 'ಕರ್ಮಣ್ಯೇವಾಧಿಕಾರಸ್ತೇ',
  },
  {
    label: 'Devanagari numerals in verse marker',
    input: '॥१-१॥',
    expected: '॥೧-೧॥',
  },
];

function verifyKnownConversions(): void {
  for (const { label, input, expected } of KNOWN_CONVERSIONS) {
    const actual = toKannada(input);
    if (actual !== expected) {
      throw new Error(
        `Kannada conversion mismatch for "${label}":\n` +
          `  input:    ${input}\n` +
          `  expected: ${expected}\n` +
          `  actual:   ${actual}`
      );
    }
  }
  console.log(`✓ ${KNOWN_CONVERSIONS.length} known conversions verified.`);
}

interface ShlokaShape {
  id: string;
  sanskrit: string;
  sanskrit_kannada?: string;
  [key: string]: unknown;
}

interface ChapterShape {
  chapter_number: number;
  name_sanskrit: string;
  name_kannada?: string;
  [key: string]: unknown;
}

interface DataShape {
  metadata: Record<string, unknown>;
  chapters: ChapterShape[];
  shlokas: ShlokaShape[];
  daily_readings: unknown[];
}

function main(): void {
  verifyKnownConversions();

  const raw = readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw) as DataShape;

  for (const chapter of data.chapters) {
    chapter.name_kannada = toKannada(chapter.name_sanskrit);
  }

  for (const shloka of data.shlokas) {
    shloka.sanskrit_kannada = toKannada(shloka.sanskrit);
  }

  // Preserve the existing 2-space indent style used in gita-data.json.
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(
    `✓ Wrote ${data.chapters.length} chapter names and ${data.shlokas.length} shlokas in Kannada script.`
  );
}

main();
