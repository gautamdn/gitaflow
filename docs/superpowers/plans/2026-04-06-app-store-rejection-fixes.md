# App Store Rejection Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two issues that caused App Review to reject GitaFlow v1.0: add an explicit in-app consent gate before any Sarvam AI call, and add a persistent visual recording indicator on the Practice screen.

**Architecture:** A small Zustand "consent" store holds a boolean flag (persisted) plus a transient `pendingResolve` callback that lets a centralized helper, `ensureSarvamConsent()`, return a Promise from any event handler. A globally-mounted `SarvamConsentModal` reads the store, displays the disclosure, and resolves the pending promise. Six existing Sarvam call sites get one new line each. Separately, a `RecordingIndicator` banner is mounted in the Practice screen header area while `isRecording === true`.

**Tech Stack:** React Native + Expo, TypeScript, Zustand (with persist + AsyncStorage), expo-av (already in use). No new dependencies. No test framework exists in this project — verification is manual on a simulator/device.

**Conventions:**
- All file paths are relative to the repo root `/Users/gautamdambekodi/repos/gita-app/`.
- Commit after each task using a `fix:` prefix (matches recent history style: `fix: …` / `feat: …`).
- Do **not** run `expo start` between tasks unless a manual verification step says to.
- TypeScript strictness: this repo uses `strict` TS — make sure each task leaves `tsc --noEmit` clean. (Run `npx tsc --noEmit` to check; expected output: no errors.)

---

## File map

**New files:**
- `src/store/useSarvamConsentStore.ts` — transient modal state (visible flag + pendingResolve)
- `src/utils/sarvamConsent.ts` — `ensureSarvamConsent()` helper
- `src/components/SarvamConsentModal.tsx` — the disclosure modal UI
- `src/components/RecordingIndicator.tsx` — the persistent red banner

**Modified files:**
- `src/store/useSettingsStore.ts` — add `sarvamConsentGranted` flag + setter
- `app/_layout.tsx` — mount `<SarvamConsentModal />` at root
- `app/practice.tsx` — gate `textToSpeech` (×2) and `speechToText` (×1); mount `<RecordingIndicator />`
- `app/reading.tsx` — gate `textToSpeech`
- `app/memorize.tsx` — gate `textToSpeech`
- `app/ask-gita.tsx` — gate `textToSpeech`
- `app/settings.tsx` — add Privacy section with consent status + Revoke
- `privacy-policy.html` — add the in-app consent sentence

---

## Task 1: Add `sarvamConsentGranted` to settings store

**Files:**
- Modify: `src/store/useSettingsStore.ts`

- [ ] **Step 1: Add the flag and setter**

Replace the entire contents of `src/store/useSettingsStore.ts` with:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeOption = 'small' | 'medium' | 'large';

interface SettingsState {
  darkMode: boolean;
  fontSize: FontSizeOption;
  showSanskrit: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  sarvamConsentGranted: boolean;

  toggleDarkMode: () => void;
  setFontSize: (size: FontSizeOption) => void;
  toggleShowSanskrit: () => void;
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
      showTransliteration: true,
      showTranslation: true,
      sarvamConsentGranted: false,

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setFontSize: (size) => set({ fontSize: size }),
      toggleShowSanskrit: () => set((s) => ({ showSanskrit: !s.showSanskrit })),
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

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useSettingsStore.ts
git commit -m "fix: add sarvamConsentGranted flag to settings store"
```

---

## Task 2: Create the transient consent-modal store

This store is intentionally separate from `useSettingsStore` because it holds non-persistable state (a function reference for the pending resolver).

**Files:**
- Create: `src/store/useSarvamConsentStore.ts`

- [ ] **Step 1: Write the store**

Create `src/store/useSarvamConsentStore.ts`:

```ts
import { create } from 'zustand';

interface SarvamConsentModalState {
  visible: boolean;
  pendingResolve: ((granted: boolean) => void) | null;

  /** Open the modal and return a promise that resolves when the user chooses. */
  request: () => Promise<boolean>;
  /** Called by the modal when the user taps Allow or Not Now. */
  resolve: (granted: boolean) => void;
}

export const useSarvamConsentStore = create<SarvamConsentModalState>()((set, get) => ({
  visible: false,
  pendingResolve: null,

  request: () => {
    // If a request is already in flight, resolve the previous one as denied
    // so we never strand a caller. (Should not normally happen.)
    const prev = get().pendingResolve;
    if (prev) prev(false);

    return new Promise<boolean>((resolve) => {
      set({ visible: true, pendingResolve: resolve });
    });
  },

  resolve: (granted) => {
    const cb = get().pendingResolve;
    set({ visible: false, pendingResolve: null });
    if (cb) cb(granted);
  },
}));
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useSarvamConsentStore.ts
git commit -m "fix: add transient store for Sarvam consent modal state"
```

---

## Task 3: Create the `ensureSarvamConsent` helper

This is the single chokepoint every Sarvam call site uses.

**Files:**
- Create: `src/utils/sarvamConsent.ts`

- [ ] **Step 1: Write the helper**

Create `src/utils/sarvamConsent.ts`:

```ts
import { useSettingsStore } from '../store/useSettingsStore';
import { useSarvamConsentStore } from '../store/useSarvamConsentStore';

/**
 * Gate every Sarvam AI call through this helper.
 *
 * If the user has previously granted consent, resolves `true` immediately.
 * Otherwise, displays the SarvamConsentModal and resolves with the user's
 * choice. Granting consent persists the decision so future calls do not
 * re-prompt until the user revokes from Settings.
 */
export async function ensureSarvamConsent(): Promise<boolean> {
  const { sarvamConsentGranted, setSarvamConsent } = useSettingsStore.getState();
  if (sarvamConsentGranted) return true;

  const granted = await useSarvamConsentStore.getState().request();
  if (granted) setSarvamConsent(true);
  return granted;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/sarvamConsent.ts
git commit -m "fix: add ensureSarvamConsent gate helper"
```

---

## Task 4: Build the `SarvamConsentModal` component

**Files:**
- Create: `src/components/SarvamConsentModal.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/SarvamConsentModal.tsx`:

```tsx
import { Modal, View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors } from '../constants/theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSarvamConsentStore } from '../store/useSarvamConsentStore';

export function SarvamConsentModal() {
  const visible = useSarvamConsentStore((s) => s.visible);
  const resolve = useSarvamConsentStore((s) => s.resolve);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const colors = getColors(darkMode);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      // iOS: presentationStyle "formSheet" stays on-screen but cannot be
      // swiped away — user must choose. Android: hardware back is ignored.
      onRequestClose={() => {
        // Hardware back / Esc — treat as Not Now (cancels the pending action).
        resolve(false);
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Use Sarvam AI for Audio & Pronunciation?
          </Text>

          <Text style={[styles.body, { color: colors.textPrimary }]}>
            GitaFlow uses <Text style={styles.bold}>Sarvam AI</Text>, a third-party AI service based in India, to:
          </Text>

          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  Generate spoken Sanskrit audio from verse text (when you tap Listen)
            </Text>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  Transcribe your recorded chanting to score your pronunciation (when you tap Record)
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            What is sent to Sarvam AI
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  The Sanskrit text of the verse you are listening to
            </Text>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  The audio of your voice when you record yourself chanting
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            What is NOT sent
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            No name, no account information, no contacts, no location, no other personal data. GitaFlow does not require an account.
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            Retention
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            Sarvam AI processes your request and returns a result. GitaFlow does not store your recordings, and Sarvam AI's policy is not to retain them after processing.
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Using these features is optional — the daily reading experience works fully offline without them. You can revoke this consent at any time from the Settings screen.
          </Text>

          <Pressable
            onPress={() => Linking.openURL('https://www.sarvam.ai/privacy')}
            accessibilityRole="link"
          >
            <Text style={[styles.link, { color: colors.saffron }]}>
              Sarvam AI Privacy Policy
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://gautamdn.github.io/gitaflow/privacy-policy.html')}
            accessibilityRole="link"
          >
            <Text style={[styles.link, { color: colors.saffron }]}>
              GitaFlow Privacy Policy
            </Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.buttonRow, { borderTopColor: colors.saffronPale }]}>
          <Pressable
            onPress={() => resolve(false)}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              { borderColor: colors.saffron },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Not Now — do not send data to Sarvam AI"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.saffron }]}>
              Not Now
            </Text>
          </Pressable>
          <Pressable
            onPress={() => resolve(true)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.saffron },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Allow GitaFlow to send data to Sarvam AI"
          >
            <Text style={styles.primaryButtonText}>Allow</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  body: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
    marginBottom: SPACING.sm,
  },
  bold: {
    fontWeight: '700',
  },
  bulletList: {
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
  },
  bullet: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
    marginBottom: SPACING.xs,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  link: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: SPACING.md + 2,
    minHeight: TOUCH_TARGET.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Verify `theme.ts` exports the names we used**

Run: `npx tsc --noEmit`
Expected: no errors. If `FONT_SIZES.title` or `bodyLarge` does not exist on the theme, replace with the closest existing constant — read `src/constants/theme.ts` to confirm.

- [ ] **Step 3: Commit**

```bash
git add src/components/SarvamConsentModal.tsx
git commit -m "fix: add SarvamConsentModal disclosure component"
```

---

## Task 5: Mount the modal at the root layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Mount `<SarvamConsentModal />`**

Replace the entire contents of `app/_layout.tsx` with:

```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { getColors } from '../src/constants/theme';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { SarvamConsentModal } from '../src/components/SarvamConsentModal';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { darkMode } = useSettingsStore();
  const colors = getColors(darkMode);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
      <SarvamConsentModal />
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "fix: mount SarvamConsentModal at root layout"
```

---

## Task 6: Gate Sarvam calls in `app/reading.tsx`

**Files:**
- Modify: `app/reading.tsx` (around line 62 — the `handlePlay` callback inside `AudioButton`)

- [ ] **Step 1: Add the import**

In `app/reading.tsx`, find the import block (around line 10) and add a new line directly below `import { textToSpeech } from '../src/services/sarvamAI';`:

```ts
import { ensureSarvamConsent } from '../src/utils/sarvamConsent';
```

- [ ] **Step 2: Add the gate before `textToSpeech`**

In the `handlePlay` callback, find the line:

```ts
      const audioBase64 = await textToSpeech(shloka.sanskrit);
```

Replace it with:

```ts
      if (!(await ensureSarvamConsent())) {
        setIsLoading(false);
        return;
      }

      const audioBase64 = await textToSpeech(shloka.sanskrit);
```

(The early `setIsLoading(false)` is needed because we're returning before reaching the `finally` block? No — `finally` will run, so the explicit set is redundant. Use this instead:)

Actually use this exact replacement:

```ts
      if (!(await ensureSarvamConsent())) return;

      const audioBase64 = await textToSpeech(shloka.sanskrit);
```

The enclosing `try` … `finally { setIsLoading(false); }` will still run on early `return`, so loading state is cleaned up correctly.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/reading.tsx
git commit -m "fix: gate Reading screen Listen behind Sarvam consent"
```

---

## Task 7: Gate Sarvam calls in `app/memorize.tsx`

**Files:**
- Modify: `app/memorize.tsx` (around line 179 — `handleListen`)

- [ ] **Step 1: Add the import**

Find the existing import:

```ts
import { textToSpeech } from '../src/services/sarvamAI';
```

Add directly below:

```ts
import { ensureSarvamConsent } from '../src/utils/sarvamConsent';
```

- [ ] **Step 2: Add the gate**

Find the line:

```ts
      const audioBase64 = await textToSpeech(shloka.sanskrit, { pace });
```

(at approximately line 179, inside the `try` block of `handleListen`)

Replace with:

```ts
      if (!(await ensureSarvamConsent())) return;

      const audioBase64 = await textToSpeech(shloka.sanskrit, { pace });
```

The surrounding `finally { setIsLoadingAudio(false); }` runs on early return, so state is cleaned up.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/memorize.tsx
git commit -m "fix: gate Memorize screen Listen behind Sarvam consent"
```

---

## Task 8: Gate Sarvam calls in `app/ask-gita.tsx`

**Files:**
- Modify: `app/ask-gita.tsx` (around line 52 — `handlePlay` inside `AudioChip`)

- [ ] **Step 1: Add the import**

Find:

```ts
import { textToSpeech } from '../src/services/sarvamAI';
```

Add directly below:

```ts
import { ensureSarvamConsent } from '../src/utils/sarvamConsent';
```

- [ ] **Step 2: Add the gate**

Find the line:

```ts
      const audioBase64 = await textToSpeech(shloka.sanskrit);
```

Replace with:

```ts
      if (!(await ensureSarvamConsent())) return;

      const audioBase64 = await textToSpeech(shloka.sanskrit);
```

The enclosing `finally { setIsLoading(false); }` cleans up state.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/ask-gita.tsx
git commit -m "fix: gate Ask Gita Listen behind Sarvam consent"
```

---

## Task 9: Gate Sarvam calls in `app/practice.tsx`

This screen has **three** Sarvam call sites: word tap-to-hear, full-shloka Listen, and post-recording STT. Each gets the gate.

**Files:**
- Modify: `app/practice.tsx`

- [ ] **Step 1: Add the import**

Find:

```ts
import { textToSpeech, speechToText } from '../src/services/sarvamAI';
```

Add directly below:

```ts
import { ensureSarvamConsent } from '../src/utils/sarvamConsent';
```

- [ ] **Step 2: Gate the word tap-to-hear (line ~100)**

In `handleWordPress`, find:

```ts
      const audioBase64 = await textToSpeech(word, { pace: 0.65 });
```

Replace with:

```ts
      if (!(await ensureSarvamConsent())) {
        setPlayingWord(null);
        return;
      }

      const audioBase64 = await textToSpeech(word, { pace: 0.65 });
```

(Word-tap doesn't have a finally block that resets `playingWord`, so we reset it explicitly on the early-return path.)

- [ ] **Step 3: Gate the full-shloka Listen (line ~149)**

In `handleListen`, find:

```ts
      const audioBase64 = await textToSpeech(shloka.sanskrit, { pace });
```

Replace with:

```ts
      if (!(await ensureSarvamConsent())) return;

      const audioBase64 = await textToSpeech(shloka.sanskrit, { pace });
```

The enclosing `finally { setIsLoadingAudio(false); }` cleans up.

- [ ] **Step 4: Gate the recording STT (line ~199)**

In `handleRecord`, the recording STOP branch contains:

```ts
      // Process the recording
      setIsProcessing(true);
      try {
        const sttResult = await speechToText(uri);
```

Insert the gate **before** `setIsProcessing(true)` (so we don't show the spinner when consent is denied). Replace:

```ts
      // Process the recording
      setIsProcessing(true);
      try {
        const sttResult = await speechToText(uri);
```

with:

```ts
      // Process the recording
      if (!(await ensureSarvamConsent())) return;
      setIsProcessing(true);
      try {
        const sttResult = await speechToText(uri);
```

Note: at this point the recording has already been captured and saved to `uri`. If consent is denied, the recording is silently discarded (no STT call). This is the correct behavior — we never send audio to Sarvam without consent.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/practice.tsx
git commit -m "fix: gate Practice screen Sarvam calls behind consent"
```

---

## Task 10: Build the `RecordingIndicator` component

**Files:**
- Create: `src/components/RecordingIndicator.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/RecordingIndicator.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { SPACING } from '../constants/theme';

interface Props {
  /** When true, the banner is visible and the timer + pulse are running. */
  active: boolean;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RecordingIndicator({ active }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  // Tick the timer every second while active.
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250); // 250ms feels responsive; we still display 1-second resolution
    return () => clearInterval(interval);
  }, [active]);

  // Pulse the dot opacity while active.
  useEffect(() => {
    if (!active) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);

  if (!active) return null;

  return (
    <View
      style={styles.banner}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Recording in progress, ${formatElapsed(elapsed)}`}
    >
      <Animated.View style={[styles.dot, { opacity }]} />
      <Text style={styles.label}>Recording</Text>
      <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timer: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecordingIndicator.tsx
git commit -m "fix: add persistent RecordingIndicator banner component"
```

---

## Task 11: Mount `RecordingIndicator` in the Practice screen

**Files:**
- Modify: `app/practice.tsx`

- [ ] **Step 1: Add the import**

Add directly below the existing `WordDiffDisplay` import:

```ts
import { RecordingIndicator } from '../src/components/RecordingIndicator';
```

- [ ] **Step 2: Mount the banner**

In the JSX, find the closing `</View>` of the header (around line 305):

```tsx
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Practice
          </Text>
          {chapter && (
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Day {displayDay} — {shloka.chapter}.{shloka.verse}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
```

Insert the `RecordingIndicator` between the `</View>` that closes the header and the `<ScrollView>` that follows:

```tsx
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Practice
          </Text>
          {chapter && (
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Day {displayDay} — {shloka.chapter}.{shloka.verse}
            </Text>
          )}
        </View>
      </View>

      <RecordingIndicator active={isRecording} />

      <ScrollView
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/practice.tsx
git commit -m "fix: show persistent recording indicator on Practice screen"
```

---

## Task 12: Add Privacy section to Settings screen

**Files:**
- Modify: `app/settings.tsx`

- [ ] **Step 1: Pull the new state from the store**

Find the destructuring around line 92:

```tsx
  const {
    darkMode,
    fontSize,
    showSanskrit,
    showTransliteration,
    showTranslation,
    toggleDarkMode,
    setFontSize,
    toggleShowSanskrit,
    toggleShowTransliteration,
    toggleShowTranslation,
  } = useSettingsStore();
```

Replace with:

```tsx
  const {
    darkMode,
    fontSize,
    showSanskrit,
    showTransliteration,
    showTranslation,
    sarvamConsentGranted,
    toggleDarkMode,
    setFontSize,
    toggleShowSanskrit,
    toggleShowTransliteration,
    toggleShowTranslation,
    setSarvamConsent,
  } = useSettingsStore();
```

- [ ] **Step 2: Add a Privacy section above the "About" section**

Find the existing block:

```tsx
        {/* Info */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          About
        </Text>
```

Insert directly above it:

```tsx
        {/* Privacy */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Privacy
        </Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Sarvam AI consent
              </Text>
              <Text style={[styles.settingValue, { color: sarvamConsentGranted ? '#4CAF50' : colors.textMuted }]}>
                {sarvamConsentGranted ? 'Granted' : 'Not granted'}
              </Text>
            </View>
            <Text style={[styles.apiKeyHint, { color: colors.textSecondary, marginTop: SPACING.sm, marginBottom: 0 }]}>
              GitaFlow asks for your permission before sending any text or audio to Sarvam AI. The next time you tap Listen or Record, you will be asked again.
            </Text>
            {sarvamConsentGranted && (
              <Pressable
                onPress={() => setSarvamConsent(false)}
                style={({ pressed }) => [
                  styles.apiKeySaveButton,
                  { backgroundColor: '#D32F2F', marginTop: SPACING.md },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Revoke Sarvam AI consent"
              >
                <Text style={styles.apiKeySaveText}>Revoke Consent</Text>
              </Pressable>
            )}
          </View>
        </View>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/settings.tsx
git commit -m "fix: add Privacy section with Sarvam consent revoke"
```

---

## Task 13: Update the privacy policy

**Files:**
- Modify: `privacy-policy.html`

- [ ] **Step 1: Add the in-app consent sentence**

In `privacy-policy.html`, find the "Third-Party Services" section. The current paragraph after the `<ul>` is:

```html
  <p>Use of the pronunciation feature is optional. The core reading experience works entirely offline.</p>
```

Replace it with:

```html
  <p>Before any text or audio is sent to Sarvam AI, GitaFlow asks for your explicit in-app consent. You can revoke this consent at any time from the Settings screen. Use of the pronunciation feature is optional — the core reading experience works entirely offline.</p>
```

- [ ] **Step 2: Bump the effective date**

Find:

```html
  <p class="date">Effective Date: February 15, 2026</p>
```

Replace with:

```html
  <p class="date">Effective Date: April 6, 2026</p>
```

- [ ] **Step 3: Commit**

```bash
git add privacy-policy.html
git commit -m "fix: privacy policy describes in-app Sarvam consent"
```

---

## Task 14: Manual verification on simulator

This project has no automated tests. Walk through the following on an iOS simulator (or device) to confirm everything works before resubmitting.

- [ ] **Step 1: Boot the app fresh**

Reset the simulator's app data (or delete + reinstall) so settings are at defaults. Then:

```bash
cd /Users/gautamdambekodi/repos/gita-app
npx expo start --ios
```

- [ ] **Step 2: Verify consent gate — Reading screen**

Navigate to the Reading screen. Tap **Listen**.
Expected: the Sarvam consent modal slides up. No network call has fired yet (you can confirm by checking the Sarvam dashboard usage if desired).

Tap **Not Now**.
Expected: modal closes, no audio plays, no error shown.

Tap **Listen** again.
Expected: modal reappears (consent not persisted yet).

Tap **Allow**.
Expected: modal closes, the existing loading flow runs and audio plays.

- [ ] **Step 3: Verify consent persists**

Navigate to Practice → tap Listen.
Expected: audio plays immediately, no modal.

Navigate to Memorize → tap Listen.
Expected: audio plays immediately, no modal.

Navigate to Ask Gita → run a query → tap Listen on a result.
Expected: audio plays immediately, no modal.

- [ ] **Step 4: Verify recording gate**

Navigate to Practice. Tap **Record Your Chanting**, speak briefly, tap **Stop Recording**.
Expected: STT runs, score appears.

Now go to Settings → Privacy → tap **Revoke Consent**.
Return to Practice → tap Record → speak → Stop.
Expected: the consent modal appears AFTER stopping (between recording capture and STT). Tapping **Not Now** discards the recording silently. Tapping **Allow** runs STT and shows the score.

- [ ] **Step 5: Verify recording indicator**

On Practice, with consent granted, tap **Record Your Chanting**.
Expected:
- A red banner appears below the header showing a pulsing white dot, the word "Recording", and a live mm:ss timer.
- The banner remains visible while you scroll the screen.
- The banner disappears the moment you tap Stop Recording.
- The "Analyzing…" spinner phase does NOT show the banner (only actual recording does).

- [ ] **Step 6: Verify Settings UI**

Settings → Privacy section shows "Granted" with a red Revoke Consent button.
Tap Revoke. Expected: status changes to "Not granted" and the Revoke button disappears.

- [ ] **Step 7: Verify VoiceOver**

Enable VoiceOver (Accessibility settings). On Practice, start recording.
Expected: VoiceOver announces "Recording in progress, 0:00" (and the time updates as it polls).

Open the consent modal. Expected: VoiceOver reads the title and body. The Allow / Not Now buttons have descriptive labels ("Allow GitaFlow to send data to Sarvam AI" / "Not Now — do not send data to Sarvam AI").

- [ ] **Step 8: Smoke test for regressions**

Walk the Home → Reading → Mark Complete flow. Walk the Browse → chapter → individual shloka flow. Tap Settings → Reset Progress → Cancel. Confirm nothing else is broken.

If any step fails, fix the relevant task before proceeding.

- [ ] **Step 9: No commit needed for this task** — verification only.

---

## Task 15: Bump build number and prepare resubmission

- [ ] **Step 1: Bump the iOS build number**

Open `app.json` (or `app.config.js`, whichever this Expo project uses) and increment the iOS `buildNumber` (e.g. `"1.0.1"` or `"2"`). Read the file first, then make the minimal change.

- [ ] **Step 2: Commit**

```bash
git add app.json
git commit -m "chore: bump iOS build number for App Review resubmission"
```

- [ ] **Step 3: Build & upload to TestFlight**

Run the existing EAS build / submit pipeline (whatever the user normally uses — usually `eas build --platform ios` followed by `eas submit`). Do NOT run this automatically; surface the command to the user and let them run it.

- [ ] **Step 4: Reply to App Review in App Store Connect**

Draft a message to App Review (the user will paste it):

> Hello,
>
> Thank you for the detailed review. We have addressed both issues in this build:
>
> 1. **Guidelines 5.1.1(i) / 5.1.2(i):** GitaFlow now displays a full-screen consent modal the first time the user attempts to use any feature that contacts Sarvam AI. The modal explains exactly what data is sent (Sanskrit verse text and, for pronunciation scoring, the user's voice recording), identifies Sarvam AI as a third-party AI service based in India, links to both Sarvam AI's privacy policy and our own, and requires explicit "Allow" before any data is sent. The user can revoke consent at any time from Settings → Privacy. Our privacy policy has been updated to describe this in-app consent flow.
>
> 2. **Guideline 2.5.14:** While the Practice screen is recording audio, a persistent red banner is displayed at the top of the screen with a pulsing dot, the word "Recording", and a live elapsed-time counter. The banner cannot be dismissed and remains visible the entire time recording is active.
>
> Steps to reproduce on the new build:
> - Open the app, tap any verse, tap **Listen** → consent modal appears.
> - Tap **Allow**, then go to Practice → tap **Record Your Chanting** → red recording banner appears.
> - Settings → Privacy → Revoke Consent → repeat to verify the gate re-prompts.
>
> Thank you,
> GitaFlow team

---

## Self-review checklist (read after writing the plan)

**Spec coverage:**
- ✅ Sarvam consent gate at all 6 call sites — Tasks 6, 7, 8, 9
- ✅ Centralized helper — Task 3
- ✅ Modal mounted at root — Tasks 4, 5
- ✅ Persisted flag in settings store — Task 1
- ✅ Settings revoke UI — Task 12
- ✅ Privacy policy update — Task 13
- ✅ Recording banner with pulsing dot, "Recording" label, live timer — Tasks 10, 11
- ✅ Banner accessibility — Task 10 (`accessibilityLiveRegion`, `accessibilityLabel`)
- ✅ Manual verification — Task 14

**Type consistency:**
- `useSettingsStore` exposes `sarvamConsentGranted` and `setSarvamConsent` (Task 1) — used identically in Tasks 3 and 12.
- `useSarvamConsentStore` exposes `request()` and `resolve(granted: boolean)` — both used in Tasks 3 and 4.
- `ensureSarvamConsent()` returns `Promise<boolean>` — callers in Tasks 6–9 use `await ensureSarvamConsent()` consistently.
- `RecordingIndicator` takes `active: boolean` — caller in Task 11 passes `active={isRecording}`.

No placeholders, no TBD. Each step contains the actual code or command.
