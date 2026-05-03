# Kannada Script Support — Design

**Date:** 2026-05-01
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Target release:** v1.1.2

## Problem

A Kannada-speaking family member, asked to use Gita Chant, found it hard to follow because every Sanskrit verse is rendered only in Devanagari. Many Kannada speakers read Sanskrit but cannot read Devanagari script. They want to chant the same Sanskrit text using Kannada lipi, which they can read fluently.

Two requests came together:
1. **Sanskrit verses in Kannada script** — same Sanskrit phonemes, rendered as ಧೃತರಾಷ್ಟ್ರ ಉವಾಚ instead of धृतराष्ट्र उवाच.
2. **Kannada translation of verse meaning** — original Kannada-language translation of each verse.

Only (1) is in scope for this spec. (2) is deferred — see "Out of scope".

## Audience and priority

- Kannada-speaking devotees, especially older users in Karnataka and the South Indian diaspora. This expands the existing target audience (Indian parents/grandparents) into a region the app currently serves poorly.
- Feedback came from a single family member, not the App Store reviewer — no submission deadline. We can take time to do this right.

## Why script-only first

The Vedic Scriptures API (the existing data source) has been confirmed to provide only English and Hindi translations — no Kannada. Bundling a Kannada translation would require finding, vetting, and licensing a separate source, which is a different, larger project with its own quality and rights questions.

By contrast, Devanagari → Kannada **script conversion** is a mechanical, lossless operation: both are Brahmic scripts with one-to-one phoneme mapping. We can ship script support immediately with high confidence, and tackle translation as a follow-up when we have a source.

This also matches the user's primary request — being able to *chant* the Sanskrit, which only needs the script, not the meaning.

## Approach

Pre-convert all Sanskrit text to Kannada script at build time using `@indic-transliteration/sanscript`, store as new fields on the bundled `gita-data.json`, and gate display behind a new Settings toggle that mirrors the existing Hindi toggle pattern.

Considered alternatives:
- **Convert at runtime in the app:** rejected — for content that never changes, doing the work once at build time is strictly better than doing it 700× per session.
- **Source from a third-party Kannada-script Gita dataset:** rejected — adds licensing and quality verification work to solve a problem that's already deterministic.

## Data model changes

`src/types/gita.ts`:

```ts
interface Shloka {
  // ...existing fields
  sanskrit_kannada: string;   // NEW — Kannada script of `sanskrit`
}

interface Chapter {
  // ...existing fields
  name_kannada: string;       // NEW — Kannada script of `name_sanskrit`
}
```

Both fields are populated by the build script (below) and committed into `assets/data/gita-data.json`. They are never written at runtime.

We **do not** add a `kannada_translation` field yet. Adding empty fields for hypothetical future content is YAGNI; we'll add the field when we have a translation source.

## Build script

New file: `scripts/add-kannada-script.ts`.

Behavior:
1. Read `assets/data/gita-data.json`.
2. For every shloka in `data.shlokas`, set `shloka.sanskrit_kannada = Sanscript.t(shloka.sanskrit, 'devanagari', 'kannada')`.
3. For every chapter in `data.chapters`, set `chapter.name_kannada = Sanscript.t(chapter.name_sanskrit, 'devanagari', 'kannada')`.
4. Write the JSON back, preserving the existing formatting style.

Run once locally with `npm run build:gita-data`, commit the regenerated JSON. No CI changes — the data file is a committed artifact.

Dependencies:
- `@indic-transliteration/sanscript` in **both** `devDependencies` (for the build script) and `dependencies` (used at runtime by `WordDiffDisplay`, see below). The library is ~30KB minified.
- `tsx` if not already present, for executing the TS build script.

## Settings & state

`src/store/useSettingsStore.ts` — add one toggle:

```ts
showSanskritKannada: boolean;   // default: false
toggleShowSanskritKannada: () => void;
```

Default `false` so existing users see no change after upgrade.

`app/settings.tsx` — add one new row in the existing **Reading Display** section, immediately after `Sanskrit (Devanagari)`:

```
Reading Display
  □ Sanskrit (Devanagari)
  □ Sanskrit (Kannada Script)   ← NEW
  □ Transliteration
  □ English Translation
```

The toggle is independently stackable. A user can show Devanagari + Kannada side by side, or turn off Devanagari and show only Kannada. This follows the same independent-boolean pattern used by the existing display toggles.

## UI rendering

### Reading screen (`app/reading.tsx`)

When `showSanskritKannada` is on, render `shloka.sanskrit_kannada` in its own card, stacked below the Devanagari card (or replacing the Devanagari card if Devanagari is off). Same visual treatment as the existing Sanskrit card: same font sizing, same spacing, same dark-mode handling.

### Browse screen (`app/browse.tsx`)

The chapter list shows `name_english` as the primary title and `name_sanskrit` (Devanagari) underneath today. When the Kannada toggle is on, render `chapter.name_kannada` as a separate line beneath `name_sanskrit` (not replacing it). When the Devanagari toggle is off and Kannada is on, only `name_kannada` is shown. The Kannada line uses the same typography as the existing Sanskrit subtitle.

### Memorize screen (`app/memorize.tsx`)

Same rule as Reading — render the Kannada-script version when the toggle is on. Progressive blanking continues to work without changes; word boundaries are preserved by Sanscript conversion.

### Practice screen (`app/practice.tsx`)

Two parts:

1. **Verse display at the top of the screen** — render Kannada script when the toggle is on, exactly like Reading.
2. **Pronunciation scoring and `WordDiffDisplay`** — all scoring logic stays in Devanagari. Sarvam STT returns Devanagari, the canonical reference text is Devanagari, and `pronunciationScore.ts` is unchanged. For display only, pass a `displayScript: 'devanagari' | 'kannada'` prop to `WordDiffDisplay` and convert each chip's word at render time using `Sanscript.t(word, 'devanagari', 'kannada')`. This is the only place that ships the runtime library, and the conversions are single-word, sub-millisecond.

### Audio (TTS / STT)

Unchanged. Sarvam AI TTS is invoked with Devanagari Sanskrit; STT returns Devanagari. Kannada is a display layer only — it never crosses the network boundary.

### Fonts

iOS ships Kannada Sangam MN as a system font, and React Native `<Text>` selects appropriate fallback fonts automatically based on Unicode codepoints. No custom font bundling is needed for v1. If we later see rendering issues on specific Android versions, that's a follow-up.

## Edge cases handled by Sanscript

- **Verse numbers** like `||१-१||`: Devanagari numerals convert cleanly to Kannada numerals (`||೧-೧||`).
- **Speaker attributions** like `धृतराष्ट्र उवाच |`: convert to `ಧೃತರಾಷ್ಟ್ರ ಉವಾಚ |` — the existing pronunciation-score normalization that strips speaker lines still applies (it operates on Devanagari before display conversion).
- **Anuswara, visarga, conjuncts** (ं, ः, joined consonants): all map deterministically to their Kannada equivalents.

## Testing

- Unit test on the build script: load three known shlokas (BG1.1, BG2.47, BG18.66), assert each `sanskrit_kannada` field matches a hand-verified Kannada-script output character-by-character. This catches any silent regression if the Sanscript library version changes.
- Unit test on `WordDiffDisplay`: render with `displayScript='kannada'`, snapshot the chip output, verify Kannada code points appear in the rendered text.
- Manual QA checklist for the implementation plan:
  - Reading, Browse, Memorize, Practice each toggled on / off
  - Devanagari toggle on + Kannada toggle on (both visible)
  - Devanagari off + Kannada on (Kannada only)
  - Dark mode + Kannada
  - Largest font size + Kannada (verify no clipping)
  - Pronunciation diff chips render Kannada when toggle on, Devanagari when off

## Rollout

- Ship as **v1.1.2** (next patch after v1.1.1, currently in App Store review).
- Single feature, low blast radius. New JSON fields are bundled offline; new Settings toggle defaults to `false`. No data migration, no proxy changes, no privacy-disclosure changes (no new data collection — Sarvam still receives only Devanagari).
- Release notes: *"Added Kannada script support — turn on in Settings → Reading Display. Kannada translation coming in a future update."*

## Out of scope

- **Kannada translation of verse meaning** — deferred until a properly licensed source is found. The data model leaves room to add a field later without disrupting v1.
- **Kannada UI labels** (buttons, menu titles, settings labels) — that's a separate, much larger i18n project. v1 keeps the chrome in English.
- **Other Indic scripts** (Tamil, Telugu, Malayalam, Bengali, Gujarati) — the same mechanical Devanagari-to-X conversion is possible via Sanscript and could be added later if demand emerges. Not in this spec.
- **Custom Kannada font bundling** — relying on iOS system font for v1; revisit only if rendering issues appear.
