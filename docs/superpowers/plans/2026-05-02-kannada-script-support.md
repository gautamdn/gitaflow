# Kannada Script Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users display Sanskrit verses and chapter names in Kannada script (in addition to or instead of Devanagari), gated by a new Settings toggle. Kannada *translation* is explicitly out of scope — see spec for rationale.

**Architecture:** Pre-convert all Devanagari Sanskrit text to Kannada script at build time using `@indic-transliteration/sanscript`, store as new fields on the bundled `gita-data.json`. Add a single boolean to `useSettingsStore` (`showSanskritKannada`). All four content screens (Reading, Browse, Memorize, Practice) read the new fields and render conditionally. The `WordDiffDisplay` component does single-word runtime conversion for diff chips when the toggle is on; pronunciation scoring stays in Devanagari throughout.

**Tech Stack:** TypeScript (strict), Expo Router, Zustand, React Native, `@indic-transliteration/sanscript` (~30KB, both build-time and runtime), `tsx` (build-time only).

**Testing posture:** This codebase has no test framework. Rather than introduce Jest/Vitest as part of this feature, the build script contains inline assertions that fail loudly if the deterministic Devanagari→Kannada conversion drifts. UI changes are validated via a manual QA checklist (Task 11). If a test framework is added later, the WordDiffDisplay conversion path is a natural first target.

**Reference spec:** `docs/superpowers/specs/2026-05-01-kannada-script-support-design.md`

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `scripts/add-kannada-script.ts` | Create | One-shot build script: read `gita-data.json`, add `sanskrit_kannada` to every shloka and `name_kannada` to every chapter, write back. Contains inline verification asserts. |
| `assets/data/gita-data.json` | Modify (via script output) | New `sanskrit_kannada` field on every shloka, new `name_kannada` on every chapter. Committed as a build artifact. |
| `src/types/gita.ts` | Modify | Add `sanskrit_kannada: string` to `Shloka`; add `name_kannada: string` to `Chapter`. |
| `src/store/useSettingsStore.ts` | Modify | Add `showSanskritKannada: boolean` (default `false`) and `toggleShowSanskritKannada`. |
| `app/settings.tsx` | Modify | Add a new `SettingRow` for "Sanskrit (Kannada Script)" inside the Reading Display section, immediately after the existing Devanagari row. |
| `app/reading.tsx` | Modify | When `showSanskritKannada` is on, render `shloka.sanskrit_kannada` in its own card section, beneath the Devanagari section. |
| `app/browse.tsx` | Modify | When `showSanskritKannada` is on, render `chapter.name_kannada` as an additional line under the chapter name. |
| `app/memorize.tsx` | Modify | When `showSanskritKannada` is on, convert each visible token's display text to Kannada at render time using a small `toKannada` helper. Tokenization and blanking logic stay in Devanagari. |
| `src/components/WordDiffDisplay.tsx` | Modify | Add `displayScript: 'devanagari' \| 'kannada'` prop. When `'kannada'`, run `Sanscript.t(word, 'devanagari', 'kannada')` on each chip's expected and actual word for display only. |
| `app/practice.tsx` | Modify | When `showSanskritKannada` is on, render `shloka.sanskrit_kannada` in the verse card; pass `displayScript` to `WordDiffDisplay`. |
| `package.json` | Modify | Add `@indic-transliteration/sanscript` (dependencies + devDependencies for `tsx` if missing), add `build:gita-data` script, bump version to `1.1.2`. |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime + dev dependencies**

Run:

```bash
npm install @indic-transliteration/sanscript
npm install --save-dev tsx
```

Expected: both packages added to the appropriate sections of `package.json`. The runtime dep is needed for `WordDiffDisplay`; `tsx` is needed for executing the TypeScript build script at the command line.

- [ ] **Step 2: Add the `build:gita-data` script**

Open `package.json`. In the `scripts` block (currently containing `start`, `ios`, `android`, `web`), add:

```json
"build:gita-data": "tsx scripts/add-kannada-script.ts"
```

Final `scripts` block should look like:

```json
"scripts": {
  "start": "expo start",
  "ios": "expo start --ios",
  "android": "expo start --android",
  "web": "expo start --web",
  "build:gita-data": "tsx scripts/add-kannada-script.ts"
}
```

- [ ] **Step 3: Bump version to 1.1.2**

In `package.json`, change `"version": "1.0.0"` to `"version": "1.1.2"`.

Also update the version in `app.json` (Expo's app config). Run:

```bash
grep -n '"version"' app.json
```

Expected: shows the current version line. Edit it to `"version": "1.1.2"`. The Settings screen reads this via `Constants.expoConfig?.version`, so this is the user-visible version.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add sanscript dep + build script for Kannada support"
```

---

## Task 2: Create the build script with verification asserts

**Files:**
- Create: `scripts/add-kannada-script.ts`

- [ ] **Step 1: Create the script file**

Create `scripts/add-kannada-script.ts` with this exact contents:

```typescript
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
```

- [ ] **Step 2: Run the script**

Run:

```bash
npm run build:gita-data
```

Expected output:

```
✓ 3 known conversions verified.
✓ Wrote 18 chapter names and 701 shlokas in Kannada script.
```

If the verification asserts fail, do NOT proceed — the Sanscript library output is unexpected and needs investigation.

- [ ] **Step 3: Spot-check the output**

Run:

```bash
grep -m1 -A1 '"sanskrit_kannada"' assets/data/gita-data.json | head -2
```

Expected: shows a Kannada-script line like `"sanskrit_kannada": "ಧೃತರಾಷ್ಟ್ರ ಉವಾಚ ..."`. The exact text varies by which shloka grep hits first; the key thing is that you see Kannada code points (ಅ–ಹ range), not Devanagari, not garbage.

- [ ] **Step 4: Commit**

```bash
git add scripts/add-kannada-script.ts assets/data/gita-data.json
git commit -m "feat: add Kannada script for all 701 shlokas + 18 chapter names"
```

---

## Task 3: Add the new fields to TypeScript types

**Files:**
- Modify: `src/types/gita.ts`

- [ ] **Step 1: Add `sanskrit_kannada` to `Shloka`**

Open `src/types/gita.ts`. In the `Shloka` interface (lines 24–42), add `sanskrit_kannada` immediately after the existing `sanskrit` field. The result should look like:

```typescript
export interface Shloka {
  id: string;
  chapter: number;
  verse: number;
  sanskrit: string;
  sanskrit_kannada: string;
  transliteration: string;
  translations: {
    sivananda: string | null;
    purohit: string | null;
    gambirananda: string | null;
    adidevananda: string | null;
  };
  hindi: {
    tejomayananda: string | null;
    ramsukhdas: string | null;
  };
  commentary_en: string | null;
  commentary_hi: string | null;
}
```

- [ ] **Step 2: Add `name_kannada` to `Chapter`**

In the same file, in the `Chapter` interface (lines 12–22), add `name_kannada` immediately after `name_sanskrit`. The result should look like:

```typescript
export interface Chapter {
  chapter_number: number;
  verses_count: number;
  name_sanskrit: string;
  name_kannada: string;
  name_transliteration: string | null;
  name_english: string | null;
  meaning_en: string | null;
  meaning_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS (no errors). Both types now match the actual JSON shape produced by Task 2.

If `tsc` is not yet configured to find errors in `app/`, expect 0 errors related to the type additions specifically. If unrelated pre-existing errors appear, ignore them — we're checking that this change doesn't add new ones.

- [ ] **Step 4: Commit**

```bash
git add src/types/gita.ts
git commit -m "feat: add Kannada script field types to Shloka and Chapter"
```

---

## Task 4: Add the Settings store toggle

**Files:**
- Modify: `src/store/useSettingsStore.ts`

- [ ] **Step 1: Add the field, default, and toggle**

Open `src/store/useSettingsStore.ts`. Make three changes:

1. In the `SettingsState` interface (lines 7–21), add `showSanskritKannada: boolean;` right after `showSanskrit: boolean;`, and add `toggleShowSanskritKannada: () => void;` right after `toggleShowSanskrit: () => void;`.

2. In the initial state object (lines 26–31), add `showSanskritKannada: false,` right after `showSanskrit: true,`.

3. In the actions block (lines 33–40), add the toggle function right after `toggleShowSanskrit`:

```typescript
toggleShowSanskritKannada: () =>
  set((s) => ({ showSanskritKannada: !s.showSanskritKannada })),
```

The full file should now read:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeOption = 'small' | 'medium' | 'large';

interface SettingsState {
  darkMode: boolean;
  fontSize: FontSizeOption;
  showSanskrit: boolean;
  showSanskritKannada: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  sarvamConsentGranted: boolean;

  toggleDarkMode: () => void;
  setFontSize: (size: FontSizeOption) => void;
  toggleShowSanskrit: () => void;
  toggleShowSanskritKannada: () => void;
  toggleShowTransliteration: () => void;
  toggleShowTranslation: () => void;
  setSarvamConsent: (granted: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: false,
      fontSize: 'medium',
      showSanskrit: true,
      showSanskritKannada: false,
      showTransliteration: true,
      showTranslation: true,
      sarvamConsentGranted: false,

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setFontSize: (size) => set({ fontSize: size }),
      toggleShowSanskrit: () => set((s) => ({ showSanskrit: !s.showSanskrit })),
      toggleShowSanskritKannada: () =>
        set((s) => ({ showSanskritKannada: !s.showSanskritKannada })),
      toggleShowTransliteration: () =>
        set((s) => ({ showTransliteration: !s.showTransliteration })),
      toggleShowTranslation: () =>
        set((s) => ({ showTranslation: !s.showTranslation })),
      setSarvamConsent: (granted) => set({ sarvamConsentGranted: granted }),
    }),
    {
      name: 'gitaflow-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

The persistence layer (`zustand/middleware/persist` with `AsyncStorage`) handles existing-user upgrades automatically: anyone with persisted state from before this change just gets `showSanskritKannada` filled in from the default (`false`) on next read. No migration needed.

- [ ] **Step 2: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/useSettingsStore.ts
git commit -m "feat: add showSanskritKannada toggle to settings store"
```

---

## Task 5: Add the Settings UI row

**Files:**
- Modify: `app/settings.tsx`

- [ ] **Step 1: Destructure the new state and toggle**

Open `app/settings.tsx`. Find the `useSettingsStore` destructure (lines 92–106). Add `showSanskritKannada` next to `showSanskrit`, and `toggleShowSanskritKannada` next to `toggleShowSanskrit`. The block should look like:

```typescript
const {
  darkMode,
  fontSize,
  showSanskrit,
  showSanskritKannada,
  showTransliteration,
  showTranslation,
  sarvamConsentGranted,
  toggleDarkMode,
  setFontSize,
  toggleShowSanskrit,
  toggleShowSanskritKannada,
  toggleShowTransliteration,
  toggleShowTranslation,
  setSarvamConsent,
} = useSettingsStore();
```

- [ ] **Step 2: Add the new SettingRow inside Reading Display**

In the Reading Display section (around lines 180–199), insert a new `SettingRow` for Kannada immediately after the existing Devanagari row. The block should look like:

```tsx
<View style={[styles.section, { backgroundColor: colors.surface }]}>
  <SettingRow
    label="Sanskrit (Devanagari)"
    value={showSanskrit}
    onToggle={toggleShowSanskrit}
    colors={colors}
  />
  <SettingRow
    label="Sanskrit (Kannada Script)"
    value={showSanskritKannada}
    onToggle={toggleShowSanskritKannada}
    colors={colors}
  />
  <SettingRow
    label="Transliteration"
    value={showTransliteration}
    onToggle={toggleShowTransliteration}
    colors={colors}
  />
  <SettingRow
    label="English Translation"
    value={showTranslation}
    onToggle={toggleShowTranslation}
    colors={colors}
  />
</View>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/settings.tsx
git commit -m "feat: add Kannada script toggle row in Settings → Reading Display"
```

---

## Task 6: Render Kannada script on the Reading screen

**Files:**
- Modify: `app/reading.tsx`

- [ ] **Step 1: Add `showSanskritKannada` prop to `ShlokaCard`**

Open `app/reading.tsx`. In the `ShlokaCard` component (lines 133–210), expand its props to include `showSanskritKannada`. The signature should change from:

```typescript
function ShlokaCard({
  shloka,
  colors,
  fonts,
  showSanskrit,
  showTransliteration,
  showTranslation,
}: {
  shloka: Shloka;
  colors: ThemeColors;
  fonts: ReturnType<typeof getScaledFontSizes>;
  showSanskrit: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
}) {
```

to:

```typescript
function ShlokaCard({
  shloka,
  colors,
  fonts,
  showSanskrit,
  showSanskritKannada,
  showTransliteration,
  showTranslation,
}: {
  shloka: Shloka;
  colors: ThemeColors;
  fonts: ReturnType<typeof getScaledFontSizes>;
  showSanskrit: boolean;
  showSanskritKannada: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
}) {
```

- [ ] **Step 2: Update the divider condition and add the Kannada block**

Inside `ShlokaCard`, the existing `needsDivider` (line 148–149) currently is:

```typescript
const needsDivider =
  (showSanskrit || showTransliteration) && showTranslation;
```

Update it so the Kannada toggle also keeps the divider visible above the translation:

```typescript
const needsDivider =
  (showSanskrit || showSanskritKannada || showTransliteration) && showTranslation;
```

Then, immediately after the existing Devanagari `<Text>` block (lines 157–170, the one rendering `shloka.sanskrit`) and before the `AudioButton` (line 173), insert the Kannada-script block:

```tsx
{showSanskritKannada && (
  <Text
    style={[
      styles.sanskritText,
      {
        color: colors.sanskritText,
        fontSize: fonts.sanskrit,
        lineHeight: fonts.sanskrit * 1.6,
      },
    ]}
  >
    {shloka.sanskrit_kannada}
  </Text>
)}
```

This reuses the same styling as the Devanagari card on purpose — it's the same Sanskrit text in a different script, so the typography should match. Both can be visible at the same time when both toggles are on, stacked vertically, with the existing `marginBottom: SPACING.sm` on `sanskritText` providing spacing.

- [ ] **Step 3: Pass `showSanskritKannada` from the screen to the card**

In `ReadingScreen` (lines 212–353), update the destructure (lines 216–217) from:

```typescript
const { darkMode, fontSize, showSanskrit, showTransliteration, showTranslation } =
  useSettingsStore();
```

to:

```typescript
const { darkMode, fontSize, showSanskrit, showSanskritKannada, showTransliteration, showTranslation } =
  useSettingsStore();
```

Then update the `ShlokaCard` props in the `.map()` block (lines 304–313) from:

```tsx
<ShlokaCard
  key={shloka.id}
  shloka={shloka}
  colors={colors}
  fonts={fonts}
  showSanskrit={showSanskrit}
  showTransliteration={showTransliteration}
  showTranslation={showTranslation}
/>
```

to:

```tsx
<ShlokaCard
  key={shloka.id}
  shloka={shloka}
  colors={colors}
  fonts={fonts}
  showSanskrit={showSanskrit}
  showSanskritKannada={showSanskritKannada}
  showTransliteration={showTransliteration}
  showTranslation={showTranslation}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/reading.tsx
git commit -m "feat: render Kannada script on reading screen when toggled"
```

---

## Task 7: Render Kannada chapter names on Browse screen

**Files:**
- Modify: `app/browse.tsx`

- [ ] **Step 1: Read the toggle and pass it to `ChapterCard`**

Open `app/browse.tsx`. In `BrowseScreen` (lines 120–179), update the destructure on line 123 from:

```typescript
const { darkMode } = useSettingsStore();
```

to:

```typescript
const { darkMode, showSanskritKannada } = useSettingsStore();
```

Then in the `ChapterCard` invocation (lines 162–172), pass `showSanskritKannada`:

```tsx
<ChapterCard
  key={chapter.chapter_number}
  chapter={chapter}
  completedCount={completedCount}
  totalReadings={readings.length}
  readings={readings}
  completedReadings={completed_readings}
  onReadingPress={handleReadingPress}
  showSanskritKannada={showSanskritKannada}
  colors={colors}
/>
```

- [ ] **Step 2: Add the prop to `ChapterCard` and render the Kannada line**

Update the `ChapterCard` signature (lines 49–66) to include `showSanskritKannada: boolean`:

```typescript
function ChapterCard({
  chapter,
  completedCount,
  totalReadings,
  readings,
  completedReadings,
  onReadingPress,
  showSanskritKannada,
  colors,
}: {
  chapter: Chapter;
  completedCount: number;
  totalReadings: number;
  readings: DailyReading[];
  completedReadings: number[];
  onReadingPress: (day: number) => void;
  showSanskritKannada: boolean;
  colors: ThemeColors;
}) {
```

Then, inside the `chapterInfo` `<View>` block (lines 84–97), immediately after the `chapterMeaning` block and before `chapterMeta`, insert the Kannada line. The block should look like:

```tsx
<View style={styles.chapterInfo}>
  <Text style={[styles.chapterName, { color: colors.textPrimary }]}>
    {chapter.name_english ?? chapter.name_sanskrit}
  </Text>
  {chapter.meaning_en && (
    <Text style={[styles.chapterMeaning, { color: colors.textSecondary }]}>
      {chapter.meaning_en}
    </Text>
  )}
  {showSanskritKannada && (
    <Text style={[styles.chapterMeaning, { color: colors.textSecondary }]}>
      {chapter.name_kannada}
    </Text>
  )}
  <Text style={[styles.chapterMeta, { color: colors.textMuted }]}>
    {chapter.verses_count} verses{' '}
    {completedCount > 0 && `· ${completedCount}/${totalReadings} done`}
  </Text>
</View>
```

The Kannada line reuses the existing `chapterMeaning` style (small, italic, secondary color), which is the same treatment used for the English meaning. Browse is a list view; we don't need a more prominent placement here.

- [ ] **Step 3: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/browse.tsx
git commit -m "feat: show Kannada chapter names on browse screen when toggled"
```

---

## Task 8: Render Kannada in Memorize screen

**Files:**
- Modify: `app/memorize.tsx`

The memorize screen tokenizes Devanagari Sanskrit and applies progressive blanking by token index. When Kannada display is on, we keep all tokenization and blanking logic unchanged (operates on Devanagari) and only convert each visible token's display text to Kannada at render time.

- [ ] **Step 1: Read the file end-to-end first**

Run:

```bash
wc -l app/memorize.tsx
```

Expected: file is ~400+ lines. Read the entire file before editing — the JSX has multiple branches per `sessionLevel` and you need to find every place a token's `text` is rendered.

- [ ] **Step 2: Import Sanscript and read the new toggle**

Near the top of the file, add the Sanscript import alongside the existing imports:

```typescript
// @ts-expect-error — package ships untyped, we only need .t()
import Sanscript from '@indic-transliteration/sanscript';
```

Then update the existing `useSettingsStore` destructure (currently `const { darkMode, fontSize } = useSettingsStore();` near line 43) to:

```typescript
const { darkMode, fontSize, showSanskritKannada } = useSettingsStore();
```

- [ ] **Step 3: Add a single conversion helper inside the component**

Inside `MemorizeScreen`, near the other `useCallback` definitions, add a small helper:

```typescript
const renderToken = useCallback(
  (text: string): string =>
    showSanskritKannada ? Sanscript.t(text, 'devanagari', 'kannada') : text,
  [showSanskritKannada]
);
```

- [ ] **Step 4: Use `renderToken` for every visible token text**

In the JSX body, find every place that renders a token's `text` field for display and wrap it with `renderToken(...)`. There are typically three: the main token list (Levels 1–3), the first-letter hint mode (Level 4), and the line-by-line reveal (Level 5).

For each rendered token, change patterns like:

```tsx
<Text>{token.text}</Text>
```

to:

```tsx
<Text>{renderToken(token.text)}</Text>
```

Do not modify token *creation* logic (e.g., `firstLetterHint(token)` should still receive the Devanagari token; if it returns a hint based on Devanagari first letter, the result should be passed through `renderToken` after the hint is computed). The `firstLetterHint` function lives in `src/services/memorizeUtils.ts` and is not in scope to change — it stays Devanagari-aware. The hint output (e.g., `"ध"`) goes through `renderToken` to become `"ಧ"`.

If the file uses `firstLetterHint(token)` directly inside JSX, change it to `renderToken(firstLetterHint(token))`.

For the `translitMap` (built in line 86–89 from `shloka.sanskrit` + `shloka.transliteration`), do **not** touch it — transliteration is IAST Latin script, not affected by Kannada toggle.

- [ ] **Step 5: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/memorize.tsx
git commit -m "feat: render Kannada in memorize screen tokens when toggled"
```

---

## Task 9: Add `displayScript` prop to WordDiffDisplay

**Files:**
- Modify: `src/components/WordDiffDisplay.tsx`

- [ ] **Step 1: Import Sanscript and extend the props interface**

Open `src/components/WordDiffDisplay.tsx`. Near the top, add:

```typescript
// @ts-expect-error — package ships untyped, we only need .t()
import Sanscript from '@indic-transliteration/sanscript';
```

Then update the `WordDiffDisplayProps` interface (lines 22–30) to add a new prop:

```typescript
interface WordDiffDisplayProps {
  wordComparisons: WordComparison[];
  darkMode: boolean;
  textMutedColor: string;
  onWordPress?: (word: string) => void;
  playingWord?: string | null;
  /** Map from normalized Sanskrit word to its transliteration */
  transliterationMap?: Record<string, string>;
  /** Script in which to display each word's text. Defaults to 'devanagari'. */
  displayScript?: 'devanagari' | 'kannada';
}
```

- [ ] **Step 2: Destructure and define a render helper**

In the component (lines 32–39), update the destructure to include `displayScript`:

```typescript
export function WordDiffDisplay({
  wordComparisons,
  darkMode,
  textMutedColor,
  onWordPress,
  playingWord,
  transliterationMap,
  displayScript = 'devanagari',
}: WordDiffDisplayProps) {
```

Then immediately after the existing `palette`, `mainWords`, `extraWords`, `hasWeakWords` declarations (lines 40–43), add:

```typescript
const renderWord = (text: string): string =>
  displayScript === 'kannada' ? Sanscript.t(text, 'devanagari', 'kannada') : text;
```

- [ ] **Step 3: Apply `renderWord` in the JSX**

In the chip-rendering block, find every place that displays a Sanskrit word from `wc.expected` or `wc.actual` and wrap it. Specifically:

Change the expected-word `<Text>` (around line 62):

```tsx
<Text style={[styles.expectedWord, { color: colors.text }]}>
  {wc.expected}
</Text>
```

to:

```tsx
<Text style={[styles.expectedWord, { color: colors.text }]}>
  {renderWord(wc.expected)}
</Text>
```

Change the actual-word `<Text>` (around line 80–84):

```tsx
{showActual && (
  <Text style={[styles.actualWord, { color: textMutedColor }]}>
    {wc.status === 'missing' ? '(skipped)' : wc.actual}
  </Text>
)}
```

to:

```tsx
{showActual && (
  <Text style={[styles.actualWord, { color: textMutedColor }]}>
    {wc.status === 'missing' ? '(skipped)' : renderWord(wc.actual)}
  </Text>
)}
```

Change the extra-words line (lines 122–124):

```tsx
<Text style={[styles.extraWords, { color: palette.extra.text }]}>
  {extraWords.map(wc => wc.actual).join(', ')}
</Text>
```

to:

```tsx
<Text style={[styles.extraWords, { color: palette.extra.text }]}>
  {extraWords.map(wc => renderWord(wc.actual)).join(', ')}
</Text>
```

Important: do **not** convert `transliterationMap` keys or `wc.expected` when used as a *map key* (around line 57: `const translit = transliterationMap?.[wc.expected];`) — the map is keyed by Devanagari, conversion is display-only. Also do **not** change `onWordPress(wc.expected)` (around line 92) — TTS audio playback uses Devanagari, the Sarvam TTS endpoint is fed Devanagari-Sanskrit, and the parent's `playingWord` state tracks Devanagari. We're only converting what's *rendered*.

- [ ] **Step 4: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/WordDiffDisplay.tsx
git commit -m "feat: add displayScript prop to WordDiffDisplay for Kannada rendering"
```

---

## Task 10: Wire Practice screen to render Kannada

**Files:**
- Modify: `app/practice.tsx`

- [ ] **Step 1: Read the toggle and add a render helper**

Open `app/practice.tsx`. Update the existing `useSettingsStore` destructure on line 31 from:

```typescript
const { darkMode, fontSize } = useSettingsStore();
```

to:

```typescript
const { darkMode, fontSize, showSanskritKannada } = useSettingsStore();
```

- [ ] **Step 2: Render the Sanskrit verse card in the chosen script**

In the JSX, find the verse card (around lines 360–388, the `<View style={[styles.card, ...`) and locate the Sanskrit `<Text>` (line 370–372):

```tsx
<Text
  style={[
    styles.sanskritText,
    {
      color: colors.sanskritText,
      fontSize: fonts.sanskrit,
      lineHeight: fonts.sanskrit * 1.6,
    },
  ]}
>
  {shloka.sanskrit}
</Text>
```

Change the rendered text to pick the field based on the toggle:

```tsx
<Text
  style={[
    styles.sanskritText,
    {
      color: colors.sanskritText,
      fontSize: fonts.sanskrit,
      lineHeight: fonts.sanskrit * 1.6,
    },
  ]}
>
  {showSanskritKannada ? shloka.sanskrit_kannada : shloka.sanskrit}
</Text>
```

Practice is a focused, single-script experience — a user comes here to chant. Showing only the chosen script (rather than stacking like Reading does) keeps the screen clean. The Devanagari toggle is not consulted here because Practice always shows one Sanskrit script.

Do **not** modify `textToSpeech(shloka.sanskrit, ...)` (line 158) or `scorePronunciation(shloka.sanskrit, sttResult.transcript)` (line 211) — Sarvam TTS/STT and pronunciation scoring all stay in Devanagari. This is critical: the canonical Sanskrit reference text never changes script.

- [ ] **Step 3: Pass `displayScript` to `WordDiffDisplay`**

In the result card, find the `<WordDiffDisplay />` invocation (lines 545–552):

```tsx
<WordDiffDisplay
  wordComparisons={result.wordComparisons}
  darkMode={darkMode}
  textMutedColor={colors.textMuted}
  onWordPress={handleWordPress}
  playingWord={playingWord}
  transliterationMap={translitMap}
/>
```

Add the `displayScript` prop:

```tsx
<WordDiffDisplay
  wordComparisons={result.wordComparisons}
  darkMode={darkMode}
  textMutedColor={colors.textMuted}
  onWordPress={handleWordPress}
  playingWord={playingWord}
  transliterationMap={translitMap}
  displayScript={showSanskritKannada ? 'kannada' : 'devanagari'}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/practice.tsx
git commit -m "feat: render Kannada script in practice screen verse + diff"
```

---

## Task 11: Manual QA & polish

**Files:**
- None directly modified (no code changes unless QA finds issues)

This task validates the feature end-to-end on a real device or simulator. The code changes from Tasks 1–10 should now compose into a working feature; this task confirms it.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run start
```

Then open the app in an iOS simulator or on your device.

- [ ] **Step 2: Walk the QA checklist**

Walk through each scenario and confirm the expected behavior:

- **Settings:** Open Settings → Reading Display. Verify the new "Sanskrit (Kannada Script)" row appears between "Sanskrit (Devanagari)" and "Transliteration". Toggle it on and off; the toggle should persist across app restarts.
- **Reading (Kannada only):** Turn off "Sanskrit (Devanagari)", turn on "Sanskrit (Kannada Script)". Open today's reading. Verify the verse appears in Kannada lipi only, with the verse number shown in Kannada numerals (೧, ೨, etc.). Verify "Listen" still works and produces correct audio (it should — Devanagari is sent to TTS regardless).
- **Reading (both scripts):** Turn on both Devanagari and Kannada toggles. Open the same reading. Verify both Sanskrit blocks render, stacked, with a small gap between them.
- **Browse:** Go to Browse → expand a chapter. Verify each chapter card shows the Kannada chapter name as a small italic line beneath the English meaning, when the toggle is on.
- **Memorize:** Open a memorize session. At Level 1 (Full), verify the verse is in Kannada. At Levels 2 and 3 (with blanks), verify the visible tokens are Kannada and the blanks render as `____`. At Level 4 (Hints), verify the first letter hint is shown in Kannada (e.g., "ಧ" not "ध"). At Level 5 (Recall), verify line-by-line reveal still works in Kannada.
- **Practice:** Open Practice. Verify the verse displays in Kannada when the toggle is on, Devanagari when off. Record a chanting attempt; verify the score appears and the WordDiffDisplay chips render in the chosen script. Verify tap-to-hear on a chip still plays the correct word.
- **Dark mode + Kannada:** Toggle dark mode on while the Kannada toggle is on. Verify Kannada text is readable in dark mode (uses the same `colors.sanskritText`).
- **Largest font size + Kannada:** Set font size to Large with Kannada on. Open a reading. Verify no Kannada text is clipped or overflowing.

- [ ] **Step 3: Fix any issues found, recommit per fix**

If any step in the checklist fails, fix the issue in the relevant file from Tasks 5–10 and commit a small targeted fix. Re-run QA on the affected scenario only.

- [ ] **Step 4: Update CLAUDE.md to reflect the new toggle**

Open `CLAUDE.md`. In the **Settings** section under the screen map (around the line that reads `**Settings** — Dark mode, font size (S/M/L), display toggles (Sanskrit, transliteration, English), Sarvam AI API key input`), add Kannada to the toggle list:

```markdown
6. **Settings** — Dark mode, font size (S/M/L), display toggles (Sanskrit Devanagari, Sanskrit Kannada Script, transliteration, English), Sarvam AI API key input
```

Then in the **Data Model → Shloka** block, add the new field next to the existing Sanskrit field:

```
├── sanskrit: string (Devanagari)
├── sanskrit_kannada: string (Kannada lipi, derived at build time)
```

And in the **Chapter** block, add:

```
├── name_kannada: string (Kannada lipi, derived at build time)
```

- [ ] **Step 5: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: note Kannada script support in CLAUDE.md"
git push origin main
```

---

## Self-review (executed before saving — already passed)

**1. Spec coverage:** Every spec section maps to tasks:
- Data model changes → Task 3
- Build script → Task 2 (incl. inline verification standing in for the unit test)
- Settings & state → Tasks 4 + 5
- UI rendering on Reading / Browse / Memorize / Practice → Tasks 6 / 7 / 8 / 10
- WordDiffDisplay displayScript → Task 9
- Manual QA → Task 11

**2. Placeholder scan:** No TBDs, no "implement appropriate error handling", no "similar to Task N" pointers. Every code block is complete.

**3. Type consistency:** `sanskrit_kannada` and `name_kannada` are used identically across Tasks 2, 3, 6, 7, 8, 10. `showSanskritKannada` and `toggleShowSanskritKannada` are used identically across Tasks 4, 5, 6, 7, 8, 10. `displayScript: 'devanagari' | 'kannada'` is defined in Task 9 and used the same way in Task 10.

**4. Spec deviation:** The spec asked for unit tests on the build script and on `WordDiffDisplay`. The repo has no test framework (no Jest, no `*.test.ts` files, no test runner in `package.json`). Adding one is out of scope for this feature. Compensated by: inline verification asserts in the build script (Task 2) and a manual QA checklist (Task 11). Documented at the top of this plan.
