# App Store Rejection Fixes — Design

**Date:** 2026-04-06
**Submission ID rejected:** 84a5688d-3853-4b29-b948-1e2f77c2b96c (v1.0)
**Status:** Approved design, ready for implementation plan

## Background

GitaFlow v1.0 was rejected by App Review citing two distinct guidelines:

1. **Guidelines 5.1.1(i) / 5.1.2(i) — Privacy / Data Collection & Use.** The app sends Sanskrit text and microphone audio to Sarvam AI (a third-party AI service) without in-app disclosure or explicit user consent. The privacy policy alone is not sufficient; Apple requires the app itself to disclose what is sent, to whom, and obtain consent before sending.

2. **Guideline 2.5.14 — Recording indicators.** While recording audio on the Practice screen, the app shows only a subtle Record-button color change. Apple requires a clear, persistent visual indicator that the app is recording, which cannot be disabled or hidden.

This document specifies the changes required to address both issues with the minimum scope necessary to pass review.

## Goals

- Pass App Review on resubmission against the cited guidelines.
- Centralize Sarvam-AI consent so no caller can bypass it.
- Provide an unmistakable recording indicator on the Practice screen.
- Avoid feature creep — no unrelated changes.

## Non-goals

- No changes to the STT/TTS pipeline, scoring logic, or Sarvam request format.
- No new app features.
- No refactoring of unrelated code.
- No analytics, no telemetry.

---

## Issue 1 — Sarvam AI consent

### Where Sarvam is currently called

| Screen | Call | Purpose |
|---|---|---|
| `app/reading.tsx` | `textToSpeech(shloka.sanskrit)` | Listen button |
| `app/practice.tsx` | `textToSpeech(shloka.sanskrit, { pace })` | Listen button |
| `app/practice.tsx` | `textToSpeech(word, { pace: 0.65 })` | Tap-to-hear word in diff |
| `app/practice.tsx` | `speechToText(uri)` | Score recorded chanting |
| `app/memorize.tsx` | `textToSpeech(shloka.sanskrit, { pace })` | Listen during memorization |
| `app/ask-gita.tsx` | `textToSpeech(shloka.sanskrit)` | Listen to recommended verse |

All six call sites must pass through the consent gate before invoking the Sarvam service.

### Consent gate

A small helper centralizes the rule so callers cannot bypass it:

```ts
// src/utils/sarvamConsent.ts
export async function ensureSarvamConsent(): Promise<boolean>
```

Behavior:
- Reads `sarvam_consent_granted` from `useSettingsStore`.
- If `true`, resolves `true` immediately.
- If `false`, emits an event (or sets a Zustand flag) that causes a globally-mounted `SarvamConsentModal` to appear, and resolves with the user's choice (`true` if they tap **Allow**, `false` otherwise).
- Granting consent persists `sarvam_consent_granted = true` to the settings store (AsyncStorage-backed).

Each call site changes from:

```ts
const audio = await textToSpeech(shloka.sanskrit);
```

to:

```ts
if (!(await ensureSarvamConsent())) return;
const audio = await textToSpeech(shloka.sanskrit);
```

### `SarvamConsentModal` component

A new component, `src/components/SarvamConsentModal.tsx`, mounted once at the root layout (`app/_layout.tsx`) so any screen can trigger it. It is a full-screen `Modal` (React Native's `Modal` with `transparent={false}`, `animationType="slide"`).

**Content (final copy, not placeholder):**

> ## Use Sarvam AI for Audio & Pronunciation?
>
> GitaFlow uses **Sarvam AI**, a third-party AI service based in India, to:
>
> - Generate spoken Sanskrit audio from verse text (when you tap **Listen**)
> - Transcribe your recorded chanting to score your pronunciation (when you tap **Record**)
>
> **What is sent to Sarvam AI:**
> - The Sanskrit text of the verse you are listening to, and
> - The audio of your voice when you record yourself chanting.
>
> **What is NOT sent:** No name, no account information, no contacts, no location, no other personal data. GitaFlow does not require an account.
>
> **Retention:** Sarvam AI processes your request and returns a result. GitaFlow does not store your recordings, and Sarvam AI's policy is not to retain them after processing.
>
> Using these features is optional — the daily reading experience works fully offline without them.
>
> Learn more: [Sarvam AI Privacy Policy](https://www.sarvam.ai/privacy) · [GitaFlow Privacy Policy](https://gautamdn.github.io/gitaflow/privacy-policy.html)
>
> [ **Allow** ]   [ **Not Now** ]

**Behavior:**
- **Allow** → set `sarvam_consent_granted = true`, dismiss modal, the pending action proceeds.
- **Not Now** → dismiss modal, pending action is cancelled (resolves `false`). No flag change. Next attempt will re-prompt.
- The modal is not dismissable by tapping outside or by hardware back; user must tap one of the two buttons. (This makes the consent decision explicit.)

### Settings screen — revoke

Add a new "Privacy" section in `app/settings.tsx` containing one row:

- **Sarvam AI consent:** shows current state — "Granted" or "Not granted"
- A **Revoke** button (only visible when granted) that flips the flag back to `false`. After revocation, the next Sarvam call re-prompts.

### Settings store change

Add to `useSettingsStore`:

```ts
sarvam_consent_granted: boolean;        // default false
setSarvamConsent: (granted: boolean) => void;
```

Persisted alongside existing settings via the existing AsyncStorage middleware.

### Privacy policy update

`privacy-policy.html`: in the "Third-Party Services" section, add one sentence:

> Before any text or audio is sent to Sarvam AI, GitaFlow asks for your explicit in-app consent. You can revoke this consent at any time from the Settings screen.

No other privacy-policy changes needed — Sarvam is already disclosed there.

---

## Issue 2 — Recording visual indicator

### Current state

`app/practice.tsx` shows recording state only by:
- Changing the Record button background to red (`#D32F2F`)
- Changing the button label to "Stop Recording"

Apple's reviewer found this insufficient.

### Solution: persistent recording banner

Add a new component, `src/components/RecordingIndicator.tsx`, used only on the Practice screen.

**Visual:**
- Pinned at the top of the Practice screen, **directly below the header** and **above the ScrollView**, so it is always visible regardless of scroll position.
- Full width, height ~44pt.
- Background: solid red `#D32F2F`.
- Contents (left-to-right, centered vertically):
  - A **pulsing red dot** — a 12pt circle of color `#FFFFFF` with an animated opacity loop (1.0 → 0.3 → 1.0 over 1.0s, repeating, using `Animated.loop`). The pulse continues for the entire recording duration.
  - The text **"Recording"** in bold white.
  - A live **mm:ss timer** in white, updated every second from a `setInterval` started when `isRecording` becomes true and cleared when it becomes false.
- The banner has `accessibilityLiveRegion="polite"` and `accessibilityLabel={`Recording in progress, ${mm}:${ss}`}` so VoiceOver users are also informed.

**Visibility rule:** the banner is mounted only while `isRecording === true`. It does not appear during processing (STT request) — only during the actual capture.

**No new behavior:** the banner is purely a visual indicator. Tapping it does nothing. The Record button continues to function as the stop control.

**Why a banner and not an overlay:** an overlay could be perceived as obscuring content; a banner sits above content non-intrusively but is impossible to miss.

### What stays the same

- The existing red Record button + "Stop Recording" label remains as a secondary affordance — additive, not a replacement.
- iOS's system-level recording dot in the status bar remains (system-provided).
- The microphone permission flow (`Audio.requestPermissionsAsync`) is unchanged.

---

## Files touched

**New:**
- `src/components/SarvamConsentModal.tsx` — the consent modal UI
- `src/components/RecordingIndicator.tsx` — the recording banner
- `src/utils/sarvamConsent.ts` — `ensureSarvamConsent()` gate helper

**Modified:**
- `src/store/useSettingsStore.ts` — add `sarvam_consent_granted` flag and setter
- `app/_layout.tsx` — mount `SarvamConsentModal` at root so it can be triggered from any screen
- `app/practice.tsx` — gate Sarvam calls; mount recording banner
- `app/reading.tsx` — gate Sarvam call
- `app/memorize.tsx` — gate Sarvam call
- `app/ask-gita.tsx` — gate Sarvam call
- `app/settings.tsx` — add Privacy section with revoke control
- `privacy-policy.html` — add the in-app consent sentence

No other files are touched.

---

## Acceptance criteria

A reviewer (and we) can verify the fixes by checking:

**Consent:**
1. Fresh install: open Reading screen, tap Listen → consent modal appears before any network call. Tap "Not Now" → no Sarvam call is made.
2. Tap Listen again → modal reappears. Tap "Allow" → audio plays.
3. From the same fresh install, tap Listen on Practice / Memorize / Ask Gita → no further prompt (consent persisted).
4. Open Settings → Privacy section shows "Granted" with Revoke button.
5. Tap Revoke → state shows "Not granted". Tap Listen again → modal reappears.
6. The same gate fires before `speechToText` on Practice's Record action.
7. The privacy policy contains the new sentence about in-app consent.

**Recording indicator:**
1. On Practice, tap Record → red banner with pulsing dot, "Recording" text, and live mm:ss timer appears at the top.
2. Banner remains visible while scrolling the screen.
3. Banner disappears the moment Stop is tapped (and does not reappear during the "Analyzing…" phase).
4. Banner is reachable by VoiceOver and announces recording status.

---

## Out of scope (explicitly)

- Rewriting `practice.tsx` (it's large but the change is additive).
- Adding analytics, error reporting, or any other telemetry.
- Changing the existing microphone permission UX.
- Internationalization of the consent copy (English only, matching the rest of the app).
- A general-purpose modal/dialog system — `SarvamConsentModal` is single-purpose.

## Risks

- **Modal triggered from a non-React-tree context.** The gate must be callable from event handlers, so the trigger uses a Zustand store flag (not React context). Low risk.
- **Banner z-index on iPad.** The Practice screen uses `SafeAreaView` with `edges={['top']}`; the banner sits inside that, so it should layer correctly. Verify on iPad Air 11" (the device Apple used for review).
- **Apple may still want stronger language.** The copy above is conservative and explicit; if review pushes back, the copy is the cheapest thing to iterate on.
