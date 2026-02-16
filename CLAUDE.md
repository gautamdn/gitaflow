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
- AI-generated audio for each shloka via Sarvam AI TTS
- Playback controls: play/stop, speed adjustment (0.5x, 0.75x, 1.0x)
- Audio on both Reading and Practice screens

### 3. AI Pronunciation Feedback
- User records themselves chanting a shloka
- Sarvam AI STT transcribes recording to Devanagari
- Compares transcription against Sanskrit source text (Levenshtein distance)
- Provides feedback:
  - Overall accuracy score (0-100%)
  - Highlights mismatched words
  - Best score tracking per shloka

### 4. Progress & Streaks
- Daily streak counter
- Milestones (first day, one week, one month, etc.)
- Progress bar showing position in the 239-day journey
- Completed readings log

### 5. Settings
- Dark mode / light mode
- Font size adjustment (small, medium, large)
- Language toggle: Show/hide Sanskrit, transliteration, translation independently
- Sarvam AI API key management
- Reset progress option
- Notification reminder for daily reading (TODO)

## Tech Stack

- **Framework:** React Native with Expo SDK 54, expo-router v6
- **Language:** TypeScript
- **Navigation:** expo-router (file-based routing)
- **State:** Zustand with AsyncStorage persistence
- **Audio:** expo-av for playback & recording
- **TTS:** Sarvam AI Text-to-Speech (`bulbul:v2`, speaker `anushka`, hi-IN)
- **STT:** Sarvam AI Speech-to-Text (`saarika:v2.5`, hi-IN)
- **Storage:** AsyncStorage for progress & settings; JSON for verse data (offline-first)
- **Styling:** React Native StyleSheet with custom theme system (saffron palette, dark mode)

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

## Content Sourcing
- [x] Gita text: All 700 shlokas loaded from local JSON (Sanskrit, transliteration, translations)
- [x] Translations: Swami Sivananda (public domain)
- [x] Audio: Generated via Sarvam AI TTS (hi-IN, bulbul:v2)
- [ ] Commentary: Write original or use public domain

## Pronunciation Scoring Approach

### Current Implementation
1. Record user audio via device mic (M4A format, HIGH_QUALITY preset)
2. Send to Sarvam AI STT (`saarika:v2.5`) → get Devanagari transcription
3. Compare Devanagari transcription against Sanskrit source text using Levenshtein distance
4. Score = similarity percentage (0-100%)
5. Show mismatched words for focused practice

### Technical Notes
- STT returns Devanagari text — must compare against `shloka.sanskrit`, NOT transliteration
- Audio playback uses data URIs (`data:audio/wav;base64,...`) — SDK 54's `File.write()` only accepts 1 argument, `{ encoding: 'base64' }` causes a Swift crash
- Sarvam API key stored in SecureStore (iOS Keychain), configured via Settings screen
- Recording format: M4A (iOS default) sent as `audio/m4a` MIME type to Sarvam

### Future Improvements
- Phoneme-level comparison using forced alignment
- Real-time visual feedback (waveform comparison)
- Specific pronunciation tips for common Sanskrit sounds (retroflex, aspirated consonants)

## App Store Readiness Checklist
- [x] App icon (Om symbol on saffron gradient, generated via sharp)
- [ ] Screenshots for 6.7" and 5.5" displays
- [x] Privacy policy (privacy-policy.html)
- [x] App Store description and keywords (APPSTORE.md)
- [ ] TestFlight beta testing
- [x] Age rating: 4+
- [x] Category: Education

## Development Phases

### Phase 1: Core Reading Experience — COMPLETE
- [x] Project setup (React Native + Expo SDK 54, expo-router v6)
- [x] Gita content database (all 700 shlokas as local JSON)
- [x] Home screen with greeting, streak, daily reading card
- [x] Reading screen (Sanskrit, transliteration, translation, audio player)
- [x] Mark complete + progress tracking (Zustand + AsyncStorage)
- [x] Browse screen (all 18 chapters, non-linear access)
- [x] Settings screen (dark mode, font size, language toggles, reset progress)
- [x] Tab navigation (Home, Browse, Settings)

### Phase 2: Audio & Practice — COMPLETE
- [x] Sarvam AI TTS integration (audio playback via data URIs)
- [x] Listen button on Reading screen with play/stop
- [x] Practice screen with speed control (0.5x, 0.75x, 1.0x)
- [x] Recording via expo-av (M4A format)
- [x] Sarvam AI STT integration (saarika:v2.5)
- [x] Pronunciation scoring (Levenshtein distance on Devanagari text)
- [x] Score display with accuracy %, mismatched words, best score tracking
- [x] Microphone permission flow with Settings deep link
- [x] Sarvam API key management in Settings

### Phase 3: Polish & Ship — IN PROGRESS
- [ ] Streaks & milestones UI improvements
- [ ] Notification reminders for daily reading
- [x] App icon and splash screen (Om on saffron gradient, expo-splash-screen)
- [x] App Store assets (APPSTORE.md, privacy-policy.html)
- [x] API key security (migrated from AsyncStorage to SecureStore/Keychain)
- [x] Word-by-word visual diff with partial credit scoring
- [ ] Screenshots for App Store
- [ ] EAS Build (production IPA)
- [ ] TestFlight beta testing
