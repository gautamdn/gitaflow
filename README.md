# GitaFlow

A self-paced Bhagavad Gita study app with structured daily readings, audio chanting, and AI-powered Sanskrit pronunciation feedback.

## Features (Planned)

- **Daily Structured Readings** — 700 shlokas split into ~239 daily readings with Sanskrit text, transliteration, English translation, and commentary
- **Audio Chanting** — Listen & repeat mode with playback controls and speed adjustment
- **AI Pronunciation Feedback** — Record yourself chanting and get accuracy scores with highlighted corrections
- **Progress & Streaks** — Daily streak tracking, milestones, and a progress bar across the full 239-day journey
- **Offline-First** — All Gita content stored locally for reading without an internet connection

## Tech Stack

- React Native + Expo SDK
- TypeScript
- React Navigation
- Zustand (state management)
- expo-av (audio playback & recording)
- AsyncStorage / SQLite (local data)
- Whisper API (pronunciation scoring)

## Built With

Verse data sourced from the [Vedic Scriptures API](https://vedicscriptures.github.io/) (MIT License).
