# Gita Chant

A self-paced Bhagavad Gita study app with structured daily readings, audio chanting, and AI-powered Sanskrit pronunciation feedback. Built for learners in Geeta Pariwar's LearnGeeta classes and anyone studying the Gita.

## Features

- **Daily Structured Readings** — 700 shlokas across 18 chapters, split into 234 daily readings (~3 verses/day) with Sanskrit (Devanagari), transliteration, and English translation
- **Audio Chanting** — Listen to any verse chanted in Sanskrit with adjustable speed (0.5x, 0.75x, 1x) via Sarvam AI TTS
- **Pronunciation Practice** — Record yourself chanting and get instant accuracy scores with word-by-word diff highlighting. Tap any word to hear it individually.
- **Memorization Mode** — Progressive blanking (5 levels) from full view to complete recall, with self-assessment tracking
- **Progress & Streaks** — Daily streak tracking, 5 milestones, and a journey bar across the full 234-day path
- **Browse All Chapters** — Explore any of the 18 chapters and 700 verses at any time
- **Offline-First** — All Gita content bundled locally. Core reading experience works without internet.
- **Privacy-First** — No account required, no analytics, no tracking. In-app consent required before any data is sent to Sarvam AI.

## Tech Stack

- **Framework:** React Native + Expo SDK 54
- **Language:** TypeScript (strict)
- **Navigation:** Expo Router
- **State:** Zustand with AsyncStorage persistence
- **Audio:** Sarvam AI TTS (text-to-speech) and STT (speech-to-text)
- **Pronunciation Scoring:** Word-level DP alignment with partial credit (pronunciationScore.ts)
- **Backend Proxy:** Cloudflare Workers (rate-limited Sarvam API proxy)
- **Storage:** AsyncStorage (progress, settings), SecureStore (API keys, device ID)
- **Content:** Vedic Scriptures API (MIT licensed), bundled as gita-data.json

## Architecture

```
app/                     — Expo Router screens (7 screens)
src/
  services/              — Sarvam AI integration, Gita data, pronunciation scoring
  store/                 — Zustand stores (progress, settings, consent)
  components/            — Reusable components (consent modal, recording indicator, word diff)
  constants/theme.ts     — Design tokens (colors, spacing, fonts, radii, shadows)
  types/                 — TypeScript interfaces
  utils/                 — Helpers (consent gate, greeting)
proxy/                   — Cloudflare Worker (Sarvam API proxy with rate limiting)
assets/data/             — Bundled gita-data.json (700 shlokas)
docs/                    — Design specs, implementation plans, App Review replies
```

## Proxy Backend

The app routes audio requests through a Cloudflare Workers proxy (`proxy/`) that holds the Sarvam AI API key server-side. This means users don't need to configure an API key — audio features work out of the box.

- **Rate limits:** 30 TTS / 10 STT per device per day (daily reading flow uses ~9)
- **Global cap:** 1,000 TTS / 300 STT per day across all users (~$21/day max)
- **BYO key:** Power users can add their own Sarvam AI key in Settings for unlimited access, bypassing the proxy entirely

### Deploying the proxy

```bash
cd proxy
npm install
npx wrangler kv:namespace create RATE_LIMITS   # note the ID
# Update wrangler.toml with the KV namespace ID
npx wrangler secret put SARVAM_API_KEY         # paste your key
npx wrangler deploy
```

## Privacy

- No account, no login, no personal data collected
- In-app consent modal shown before any data is sent to Sarvam AI
- Consent can be revoked anytime from Settings > Privacy
- Audio recordings are sent to Sarvam AI for transcription only and are not stored
- Privacy policy: https://gist.github.com/gautamdn/e69083c28914e5839cdbc19bc6f66575

## Content

Verse data sourced from the [Vedic Scriptures API](https://vedicscriptures.github.io/) (MIT License). Includes 4 English translations (Sivananda, Purohit, Gambirananda, Adidevananda) and 2 Hindi translations per shloka.

## App Store

- **App Store Connect ID:** 6759271008
- **Bundle ID:** com.gitaflow.app
- **Category:** Education
- **Price:** Free
