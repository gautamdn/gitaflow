# GitaFlow — Daily Bhagavad Gita Study with Pronunciation Training

## Vision
A self-paced Bhagavad Gita study app that combines structured daily readings with audio chanting, AI-powered Sanskrit pronunciation feedback, and memorization tools. Think "10 Minute Gita meets Duolingo." Designed as a companion app for learners in Geeta Pariwar's LearnGeeta classes.

## Target User
- Primary: Indian parents/grandparents who attend Gita classes (especially LearnGeeta / Geeta Pariwar) and want to practice independently
- Secondary: Anyone interested in learning Sanskrit chanting and studying the Gita

## Current State
- **TestFlight:** Live (App Store Connect ID: 6759271008)
- **GitHub:** github.com/gautamdn/gitaflow
- **Phases 1-3:** Complete (see below)
- **Phase 4:** In progress (new features from LearnGeeta analysis)

---

## Tech Stack

- **Framework:** React Native with Expo SDK
- **Language:** TypeScript
- **Navigation:** React Navigation (6 screens)
- **State:** Zustand (useProgressStore, useSettingsStore)
- **Audio:** Sarvam AI TTS (Sanskrit audio generation on-device)
- **Pronunciation:** Sarvam AI STT → word-level diff scoring (pronunciationScore.ts)
- **Storage:** AsyncStorage for progress, SecureStore for API keys
- **Content:** Vedic Scriptures API (MIT licensed) → bundled gita-data.json (~5-10MB)
- **Styling:** StyleSheet with theme.ts (saffron/orange palette)

## Project Structure

```
app/
  _layout.tsx          — Root layout + navigation
  index.tsx            — Home screen
  reading.tsx          — Daily reading view
  practice.tsx         — Listen & record chanting
  progress.tsx         — Streaks, milestones, stats
  browse.tsx           — All 18 chapters
  settings.tsx         — Appearance, display, API key
src/
  services/
    gitaData.ts        — Load & query gita-data.json
    sarvamAI.ts        — TTS and STT via Sarvam AI
    pronunciationScore.ts — Word-level diff scoring
  store/
    useProgressStore.ts — Reading progress, streaks, completions
    useSettingsStore.ts — Dark mode, font size, display toggles
  constants/
    theme.ts           — Colors, spacing, typography
  types/
    gita.ts            — TypeScript interfaces
  utils/
    greeting.ts        — Time-based greeting
assets/
  data/
    gita-data.json     — All 700 shlokas (bundled, offline-first)
```

## Data Model

```
Chapter (18 total)
  ├── id: number
  ├── title_en: string
  ├── title_sa: string (Sanskrit)
  ├── summary: string
  └── shlokas: Shloka[]

Shloka (700 total)
  ├── id: string (e.g., "BG1.1")
  ├── sanskrit: string (Devanagari)
  ├── transliteration: string (IAST)
  ├── translations: { author: string, text: string }[]  // 4 English, 2 Hindi
  ├── word_by_word: { word: string, meaning: string }[] // TODO: Phase 4
  ├── commentaries: { author: string, text: string }[]
  └── audio_url: string (generated via Sarvam AI)

Reading (234 total, ~3 shlokas/day)
  ├── day_number: number
  ├── chapter_id: number
  ├── shloka_ids: string[]
  └── curriculum_mode: "sequential" | "learngeeta"  // TODO: Phase 4

UserProgress
  ├── current_day: number
  ├── completed_readings: number[]
  ├── streak_count: number
  ├── last_read_date: string
  ├── pronunciation_scores: { shloka_id: string, score: number, date: string }[]
  ├── bookmarked_shlokas: string[]              // TODO: Phase 4
  └── memorization_progress: { shloka_id: string, level: number }[]  // TODO: Phase 4
```

## Screen Map

1. **Home** — Greeting, today's reading card, streak, "Begin Today's Reading" CTA, Practice Chanting shortcut
2. **Reading** — Sanskrit (Devanagari) + transliteration + English translation, Listen button (Sarvam AI), "Mark Complete", Practice link
3. **Practice** — Speed control (0.5x/0.75x/1x), Listen button, Record Your Chanting, pronunciation score with word-level diff, Prev/Next navigation
4. **Progress** — Day streak, completed count, progress %, journey bar (X of 239), milestones (First Step, 7/30/100-day streaks, Complete Journey)
5. **Browse** — All 18 chapters with verse counts + completion status, expandable to individual shlokas
6. **Settings** — Dark mode, font size (S/M/L), display toggles (Sanskrit, transliteration, English), Sarvam AI API key input
7. **Memorize** — *(NEW - Phase 4)* Progressive blanking memorization mode

## Design Direction
- Warm, spiritual aesthetic (saffron/orange accents)
- Clean typography prioritizing readability of Sanskrit text
- Large tap targets (older users)
- Minimal clutter — one action per screen
- Theme colors defined in theme.ts

---

## Completed Phases

### ✅ Phase 1: Core Reading Experience
- [x] Project setup (React Native + Expo)
- [x] Gita content: 700 shlokas via Vedic Scriptures API (MIT license)
- [x] Auto-generated 234 daily readings (~3 verses/day)
- [x] Home screen with greeting + daily reading card
- [x] Reading screen with Sanskrit, transliteration, translation
- [x] Mark complete + progress tracking
- [x] Browse all 18 chapters
- [x] Navigation between all 6 screens

### ✅ Phase 2: Audio & Practice
- [x] Sarvam AI integration for TTS (Sanskrit audio)
- [x] Speed control (0.5x, 0.75x, 1x)
- [x] Recording functionality via Sarvam AI STT
- [x] Pronunciation scoring with word-level diff highlighting
- [x] Practice screen with verse navigation (Prev/Next)

### ✅ Phase 3: Polish & Ship
- [x] Streaks & milestones UI (5 milestones)
- [x] Settings screen (dark mode, font size, display toggles)
- [x] App icon + splash screen
- [x] Privacy policy
- [x] TestFlight deployment
- [x] App Store listing copy prepared
- [x] Screenshots (1284×2778px) created

---

## Phase 4: LearnGeeta Integration (NEW — Current Focus)

Features inspired by mom's daily use of content.learngeeta.com and practice.learngeeta.com:

### 4.1 Memorization Mode (HIGH PRIORITY)
The single biggest gap vs. LearnGeeta's practice tool. Build a new "Memorize" screen.

**Progressive blanking approach:**
1. **Level 1 — Full view:** Show complete shloka (Sanskrit + transliteration). User reads along with audio.
2. **Level 2 — Light blanks:** Hide ~25% of words randomly, replaced with `____`. User fills in from memory.
3. **Level 3 — Heavy blanks:** Hide ~50% of words.
4. **Level 4 — First letters only:** Show only the first letter/syllable of each word as hints.
5. **Level 5 — Full recall:** Blank screen. User recites entirely from memory, with option to reveal line-by-line.

**UX details:**
- Tap a blank to reveal the hidden word (peek)
- "Check" button to reveal all and self-assess (Got it / Not yet)
- Track memorization level per shloka in useProgressStore
- Filter: "Memorized" / "In Progress" / "Not Started"
- Audio loop toggle for repeated listening during memorization

### 4.2 LearnGeeta Curriculum Mode (HIGH PRIORITY)
LearnGeeta classes do NOT follow chapter order. Add a curriculum toggle in Settings:

**Sequential mode** (current default): Chapters 1→2→3→...→18

**LearnGeeta mode** (new): Follows Geeta Pariwar's 4-level pedagogy:
- Level 1 (30 days): Chapters 12, 15
- Level 2 (40 days): Chapters 9, 14, 16, 17
- Level 3 (90 days): Chapters 1, 3, 4, 5, 6, 7
- Level 4 (120 days): Chapters 2, 8, 10, 11, 13, 18

When "LearnGeeta" mode is selected, reorder daily readings to follow this sequence. Show current Level (1-4) on Home screen.

### 4.3 Word-by-Word Meanings (MEDIUM)
LearnGeeta's book breaks each shloka into individual words with meanings (padaccheda).

- Add expandable "Word by Word" section on Reading screen, below the translation
- Each word shows: Sanskrit → transliteration → English meaning
- Data: Check if Vedic Scriptures API provides word_meanings field; if not, explore shlokam.org or build from translations

### 4.4 Hindi Translation Toggle (MEDIUM)
- Data already available from Vedic Scriptures API (2 Hindi translations per shloka)
- Add "Hindi Translation" toggle in Settings (Reading Display section)
- Show below English translation when enabled

### 4.5 Bookmark/Favorite Verses (MEDIUM)
- Heart/star icon on each shloka in Reading and Browse screens
- "Bookmarks" section accessible from Home or Browse
- Useful for marking verses being memorized or discussed in class

### 4.6 Audio Loop/Repeat (LOWER)
- Toggle on Listen button: single play vs. loop
- Essential for memorization — hear the same shloka on repeat while practicing
- Count-based repeat option (play 3x, 5x, 10x then stop)

### 4.7 Chapter Completion Shareable (LOWER)
- When all verses in a chapter are marked complete, show celebration screen
- "Share" button generates an image: "I completed Chapter 12: Bhakti Yoga 🕉"
- Mirrors LearnGeeta's certificate system in a lightweight way

### 4.8 Pronunciation Notation Hints (LOWER)
- Small colored highlights or tooltips on tricky Sanskrit sounds in transliteration
- Anuswara (ṁ), visarga (ḥ), retroflex (ṭ, ḍ, ṇ), aspirated consonants
- Brief tooltip explaining how to pronounce each sound

---

## App Store Info

- **App Name:** GitaFlow
- **Subtitle:** Daily Gita Study & Chanting
- **Bundle ID:** (set in Expo config)
- **App Store Connect ID:** 6759271008
- **Category:** Education (primary), Books (secondary)
- **Age Rating:** 4+
- **Price:** Free
- **Keywords:** bhagavad,gita,sanskrit,chanting,pronunciation,daily,reading,hindu,vedic,meditation,spiritual,mantra

## Content Sourcing
- [x] Gita text: Vedic Scriptures API (vedicscriptures.github.io) — MIT license
- [x] Translations: 4 English (Sivananda, Purohit, Gambirananda, Adidevananda) + 2 Hindi
- [x] Audio: Sarvam AI TTS (generated on-demand, no static files)
- [x] Commentaries: Included from API
- [ ] Word-by-word meanings: TODO — check API or external source

## Pronunciation Scoring (Implemented)
1. Record user audio via device mic
2. Send to Sarvam AI STT → get Devanagari transcription
3. Normalize both texts: strip speaker attribution lines (e.g., "धृतराष्ट्र उवाच |"), verse numbers (||१-१||), dandas, digits
4. Word-level DP alignment with partial credit (pronunciationScore.ts)
5. Score = average character-level similarity across expected words
6. Word-by-word diff chips: correct (green), partial (orange), wrong/missing (red), extra (blue)
7. Each chip shows romanized transliteration (via buildTransliterationMap) so users can read the word in English
8. Tap-to-hear: tap any non-correct word chip to hear its pronunciation via Sarvam TTS