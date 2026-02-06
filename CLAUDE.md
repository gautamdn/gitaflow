# GitaFlow — Daily Bhagavad Gita Study with Pronunciation Training

## Vision
A self-paced Bhagavad Gita study app that combines structured daily readings with audio chanting and AI-powered Sanskrit pronunciation feedback. Think "10 Minute Gita meets Duolingo."

## Target User
- Primary: Indian parents/grandparents who attend Gita classes and want to practice independently
- Secondary: Anyone interested in learning Sanskrit chanting and studying the Gita

## Core Features (MVP)

### 1. Daily Structured Readings
- Gita split into ~239 daily readings (one reading per day)
- Each reading contains 2-5 shlokas (verses)
- For each shloka:
  - Sanskrit text (Devanagari)
  - Transliteration (IAST or simplified Roman)
  - English translation
  - Brief commentary/reflection
- "Mark Complete" to progress; can also browse freely
- Daily greeting screen with current day/progress

### 2. Audio Chanting (Listen & Repeat)
- Pre-recorded audio for each shloka (professional Sanskrit chanting)
- Playback controls: play/pause, repeat, speed adjustment (0.5x–1.5x)
- Line-by-line mode: plays one line, pauses for user to repeat, then continues
- Full shloka mode: plays the complete verse continuously
- Audio source: Public domain recordings or licensed content (TODO: source audio)

### 3. AI Pronunciation Feedback
- User records themselves chanting a shloka
- App compares user's pronunciation against reference audio
- Provides feedback:
  - Overall accuracy score (percentage)
  - Highlights mispronounced words/syllables
  - Playback comparison (reference vs. user, side by side)
- Tech approach: Speech-to-text (Whisper or Google Speech API) → compare phonemes against expected transliteration
- Stretch: real-time feedback as user chants

### 4. Progress & Streaks
- Daily streak counter
- Milestones (first day, one week, one month, etc.)
- Progress bar showing position in the 239-day journey
- Completed readings log

### 5. Settings
- Dark mode / light mode
- Font size adjustment
- Language toggle: Show/hide Sanskrit, transliteration, translation independently
- Notification reminder for daily reading

## Tech Stack (Recommended)

### Option A: React Native + Expo (Recommended for cross-platform)
- **Framework:** React Native with Expo SDK
- **Language:** TypeScript
- **Navigation:** React Navigation
- **State:** Zustand or Redux Toolkit
- **Audio:** expo-av for playback & recording
- **Speech-to-text:** Whisper API (OpenAI) or Google Cloud Speech-to-Text
- **Storage:** AsyncStorage for local progress; SQLite for verse data
- **Content:** All Gita text stored locally as JSON/SQLite (offline-first)
- **Styling:** NativeWind (Tailwind for React Native) or StyleSheet

### Option B: Swift (iOS only)
- SwiftUI + AVFoundation + Speech framework
- Simpler if targeting iOS only initially

## Data Model

```
Chapter (18 total)
  ├── id: number
  ├── title_en: string
  ├── title_sa: string (Sanskrit)
  └── readings: Reading[]

Reading (239 total)
  ├── id: number
  ├── day_number: number
  ├── chapter_id: number
  ├── title: string
  ├── reflection: string
  └── shlokas: Shloka[]

Shloka
  ├── id: string (e.g., "2.47")
  ├── sanskrit: string (Devanagari)
  ├── transliteration: string
  ├── translation: string
  ├── word_by_word: { word: string, meaning: string }[]
  ├── audio_url: string
  └── commentary: string

UserProgress
  ├── current_day: number
  ├── completed_readings: number[]
  ├── streak_count: number
  ├── last_read_date: string
  └── pronunciation_scores: { shloka_id: string, score: number, date: string }[]
```

## Screen Map

1. **Home** — Greeting, today's reading card, streak, "Begin Today's Reading" CTA
2. **Reading** — Shloka text (Sanskrit + transliteration + translation), commentary, audio player, "Mark Complete"
3. **Practice** — Listen & Repeat mode, record button, pronunciation score/feedback
4. **Progress** — Streak calendar, milestones, completed readings list
5. **Browse** — All 18 chapters, tap to see readings/shlokas (non-linear access)
6. **Settings** — Display preferences, notifications, language toggles

## Design Direction
- Warm, spiritual aesthetic (saffron/orange accents like 10 Minute Gita)
- Clean typography prioritizing readability of Sanskrit text
- Large tap targets (older users)
- Minimal clutter — one action per screen

## Content Sourcing (TODO)
- [ ] Gita text: Public domain (Gita Supersite by IIT Kanpur, or similar)
- [ ] Translations: Multiple public domain options (Swami Sivananda, etc.)
- [ ] Audio: Record or source CC-licensed chanting audio
- [ ] Commentary: Write original or use public domain

## Pronunciation Scoring Approach

### Phase 1 (MVP)
1. Record user audio via device mic
2. Send to Whisper API → get transcription
3. Compare transcription against expected transliteration using Levenshtein distance
4. Score = similarity percentage
5. Highlight differing segments

### Phase 2 (Post-launch)
- Phoneme-level comparison using forced alignment
- Real-time visual feedback (waveform comparison)
- Specific pronunciation tips for common Sanskrit sounds (retroflex, aspirated consonants)

## App Store Readiness Checklist
- [ ] App icon (Om symbol + warm gradient, similar to 10 Min Gita aesthetic)
- [ ] Screenshots for 6.7" and 5.5" displays
- [ ] Privacy policy (required for App Store)
- [ ] App Store description and keywords
- [ ] TestFlight beta testing
- [ ] Age rating: 4+
- [ ] Category: Books or Education

## Development Phases

### Phase 1: Core Reading Experience (Weeks 1-3)
- Project setup (React Native + Expo)
- Gita content database (all 700 shlokas)
- Home screen + reading screen
- Mark complete + progress tracking
- Basic navigation

### Phase 2: Audio & Practice (Weeks 4-6)
- Audio playback integration
- Listen & repeat mode
- Recording functionality
- Basic pronunciation scoring (Whisper comparison)

### Phase 3: Polish & Ship (Weeks 7-8)
- Streaks & milestones UI
- Settings screen
- Dark mode
- Notifications
- App Store assets & submission
