# GitaFlow v1.1.0 — Proxy Backend + UI Polish

## Context

**Proxy:** GitaFlow was rejected twice by App Review because pronunciation features require a Sarvam AI API key that users must manually configure. The reviewer never pasted the test key, resulting in "API key not set" errors. The permanent fix: a Cloudflare Workers proxy that holds the Sarvam API key server-side. No API key needed for end users. Power users can still BYO key for unlimited access.

**UI Polish:** The app's styling is inconsistent across screens — hardcoded font sizes (15+ instances), hardcoded colors (25+ instances), 8 different border radius values instead of 2, inconsistent shadows, a cluttered Settings screen, and a consent modal that looks like a generic legal document instead of matching the app's warm/spiritual aesthetic.

Both ship together as v1.1.0.

---

## Part 1: Cloudflare Worker (new project)

### Setup

- New directory: `proxy/` at the repo root
- Runtime: Cloudflare Workers (Wrangler CLI)
- Language: TypeScript
- Storage: Cloudflare KV namespace `RATE_LIMITS` for daily counters
- Secret: `SARVAM_API_KEY` stored via `wrangler secret put`

### Files

```
proxy/
├── wrangler.toml        — Worker config, KV binding
├── src/
│   └── index.ts         — Router, rate limiter, TTS/STT handlers
├── package.json
└── tsconfig.json
```

### Endpoints

**`POST /tts`**
- Reads `X-Device-Id` header (required, UUID format)
- Checks KV key `tts:{deviceId}:{YYYY-MM-DD}` — if >= 30, return 429
- Forwards JSON body to `https://api.sarvam.ai/text-to-speech` with `api-subscription-key` from secret
- Returns Sarvam's response verbatim
- Increments KV counter (48h TTL for auto-cleanup)

**`POST /stt`**
- Same pattern, limit 10/day
- Forwards multipart form body to `https://api.sarvam.ai/speech-to-text`

**Error responses:**
- `400` — missing/invalid `X-Device-Id`
- `429` — `{ error: "daily_limit_reached", message: "Daily limit reached...", resets_at: "<ISO string>" }`
- `502` — Sarvam error (forward status + body)

**`GET /`** — `{ status: "ok" }` health check

### Deploy

```bash
cd proxy && npm install
npx wrangler kv:namespace create RATE_LIMITS    # note ID → wrangler.toml
npx wrangler secret put SARVAM_API_KEY          # paste key
npx wrangler deploy                              # → https://gitaflow-proxy.<account>.workers.dev
```

---

## Part 2: App — Proxy Integration

### Files Modified

- `src/services/sarvamAI.ts` — proxy routing + device ID generation
- `app/settings.tsx` — reframe API key section text

### `src/services/sarvamAI.ts` Changes

**Routing logic:** BYO key exists → call Sarvam directly (existing). No key → call proxy with `X-Device-Id` header.

**Device ID:** Generate UUID on first launch via `crypto.randomUUID()`, persist in SecureStore as `gitaflow-device-id`.

**429 handling:** `throw new Error('Daily limit reached. Add your own Sarvam AI key in Settings for unlimited access.')` — existing `friendlyError()` surfaces this to users.

### `app/settings.tsx` Changes

Reframe hint text from "Enter your Sarvam AI API key to enable audio..." to "Audio features work out of the box (30 listens, 10 recordings per day). For unlimited access, add your own key." TextInput + Save Key button stay as-is.

---

## Part 3: UI Polish

### 3a. Expand `theme.ts` with missing constants

**File:** `src/constants/theme.ts`

Add semantic colors used across 20+ files:

```ts
// Add to COLORS:
white: '#FFFFFF',
error: '#D32F2F',
warning: '#FF9800',

// Add to DARK_COLORS (overrides if needed):
// error and warning stay the same in dark mode
```

Add missing font size:

```ts
// Add to FONT_SIZES:
small: 14,     // used in 10+ places for secondary buttons, nav text
score: 32,     // pronunciation score display
```

Add standard border radii:

```ts
export const RADII = {
  sm: 12,      // buttons, inputs, chips
  md: 16,      // cards, sections, modals
} as const;
```

Add standard shadow:

```ts
export const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;
```

### 3b. Replace hardcoded values across all screens

**Files to sweep:** `app/practice.tsx`, `app/reading.tsx`, `app/memorize.tsx`, `app/ask-gita.tsx`, `app/browse.tsx`, `app/progress.tsx`, `app/settings.tsx`, `app/index.tsx`

For each file:
- Replace hardcoded `'#FFFFFF'` → `colors.white` (or just `COLORS.white`)
- Replace hardcoded `'#D32F2F'` → `colors.error`
- Replace hardcoded `'#FF9800'` → `colors.warning`
- Replace hardcoded `'#4CAF50'` → `colors.success` (already exists)
- Replace hardcoded `fontSize: 20` → `FONT_SIZES.subtitle`
- Replace hardcoded `fontSize: 13` → `FONT_SIZES.caption`
- Replace hardcoded `fontSize: 14` → `FONT_SIZES.small`
- Replace hardcoded `fontSize: 18` → `FONT_SIZES.bodyLarge`
- Replace hardcoded `fontSize: 32` → `FONT_SIZES.score`
- Replace hardcoded `borderRadius: 16` → `RADII.md`
- Replace hardcoded `borderRadius: 12` → `RADII.sm`
- Normalize outlier border radii (5, 14, 20, 24) to nearest standard (sm=12 or md=16)
- Replace inline shadow definitions → spread `CARD_SHADOW`

### 3c. Polish the consent modal

**File:** `src/components/SarvamConsentModal.tsx`

Current problems: looks like a generic legal document, no visual warmth, disconnected from the saffron theme.

Changes:
- Wrap each disclosure section (What is sent / What is NOT sent / Retention) in a light card with `backgroundColor: colors.saffronPale` and `borderRadius: RADII.md` — matches the card patterns on Home screen
- Add a small saffron accent icon or Om symbol at the top (using Unicode `\u0950` — ॐ) in `colors.saffron` as a visual anchor
- Fix `letterSpacing` from `0.5` to `1` to match section headers elsewhere
- Make the "Allow" button larger (full width) and "Not Now" smaller/secondary — guide the user toward the happy path
- Add subtle `CARD_SHADOW` to the button row container

### 3d. Clean up Settings screen

**File:** `app/settings.tsx`

Current problems: cluttered, inconsistent section spacing, API key section has different padding than other sections.

Changes:
- Standardize all section internal padding to `SPACING.lg`
- Remove the `borderBottomWidth: 0` overrides on last rows — use a consistent pattern where `borderBottomWidth` is only on rows that aren't last (can use array index check)
- Reorder sections for the proxy world:
  1. Appearance (dark mode, font size) — unchanged
  2. Reading Display (Sanskrit, transliteration, translation) — unchanged
  3. Audio & AI — reframed hint text per Part 2
  4. Privacy — consent status + revoke (unchanged)
  5. About — version, data source (unchanged)
  6. Data — reset progress (unchanged)
- Ensure font size selector buttons use theme constants not hardcoded 14/18/22
- Use `colors.error` instead of hardcoded `'#D32F2F'` for reset/revoke buttons
- Use `colors.success` instead of hardcoded `'#4CAF50'` for "Saved!" state

### 3e. Normalize progress screen border radii

**File:** `app/progress.tsx`

This screen has the most outlier values (borderRadius: 2, 5, 14, 24). Normalize:
- Calendar cells: `borderRadius: RADII.sm` (12)
- Achievement badges: `borderRadius: RADII.md` (16)
- Graph bars: `borderRadius: 4` (keep small but round to a clean value)
- Stat items: `borderRadius: RADII.md` (16)

---

## Verification

### Worker:
1. `npx wrangler dev` → local worker running
2. `curl POST /tts` with device ID → returns base64 audio
3. Hit 31 times → 31st returns 429
4. `curl GET /` → `{"status":"ok"}`

### App (proxy):
1. Fresh install, no API key → tap Listen → audio plays via proxy
2. Practice → Record → speak → Stop → score appears via proxy
3. Listen 30+ times → "daily limit reached" message
4. Add BYO key in Settings → Listen works unlimited (direct to Sarvam)
5. Consent modal still appears on first use

### App (UI polish):
1. Compare each screen visually in light + dark mode
2. Settings: sections have consistent padding, no visual weight differences
3. Consent modal: saffron-themed cards, warm aesthetic, matches the rest of the app
4. Progress screen: calendar cells and badges look consistent with card patterns elsewhere
5. No hardcoded color strings remain (grep for `'#FFFFFF'`, `'#D32F2F'`, `'#4CAF50'`, `'#FF9800'`)
6. No hardcoded font sizes remain outside theme.ts (grep for `fontSize:` and verify all use constants)

### Regression:
- Dark mode: all screens, consent modal, recording indicator render correctly
- Font size scaling: change Settings → Font Size and verify all screens respect it
- Offline: reading/browse/progress work, Listen shows network error (expected)
