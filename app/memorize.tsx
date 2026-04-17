import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { SPACING, FONT_SIZES, TOUCH_TARGET, RADII, CARD_SHADOW, COLORS, getColors, getScaledFontSizes } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getDailyReading, getShlokasByIds, getChapter } from '../src/services/gitaData';
import { textToSpeech } from '../src/services/sarvamAI';
import { ensureSarvamConsent } from '../src/utils/sarvamConsent';
import {
  tokenizeSanskrit,
  computeBlanks,
  firstLetterHint,
  splitIntoLines,
  buildWordTranslitMap,
  type MemorizeToken,
} from '../src/services/memorizeUtils';
import type { MemorizationLevel } from '../src/types/gita';

type PaceOption = 0.5 | 0.75 | 1.0;

const LEVEL_LABELS: Record<MemorizationLevel, string> = {
  1: 'Full',
  2: 'Light',
  3: 'Half',
  4: 'Hints',
  5: 'Recall',
};

export default function MemorizeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const { current_day, getMemorizationLevel, updateMemorizationLevel } = useProgressStore();
  const { darkMode, fontSize } = useSettingsStore();

  const colors = getColors(darkMode);
  const fonts = getScaledFontSizes(fontSize);

  const displayDay = params.day ? Number(params.day) : current_day;
  const reading = getDailyReading(displayDay);
  const chapter = reading ? getChapter(reading.chapter) : undefined;
  const shlokas = reading ? getShlokasByIds(reading.shloka_ids) : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const shloka = shlokas[currentIndex];

  // Initialize level from store
  const storedLevel = shloka ? getMemorizationLevel(shloka.id) : 1;
  const [sessionLevel, setSessionLevel] = useState<MemorizationLevel>(storedLevel as MemorizationLevel);

  // Blanking state
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [showCheck, setShowCheck] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Level 5 line-by-line state
  const [revealedLines, setRevealedLines] = useState(0);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [pace, setPace] = useState<PaceOption>(0.75);
  const soundRef = useRef<Audio.Sound | null>(null);
  const cancelledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Compute tokens and blanks
  const tokens = useMemo(
    () => (shloka ? tokenizeSanskrit(shloka.sanskrit) : []),
    [shloka?.id]
  );
  const blanks = useMemo(
    () => computeBlanks(tokens, sessionLevel, shloka?.id ?? ''),
    [tokens, sessionLevel, shloka?.id]
  );
  const lines = useMemo(() => splitIntoLines(tokens), [tokens]);
  const translitMap = useMemo(
    () => (shloka ? buildWordTranslitMap(shloka.sanskrit, shloka.transliteration) : {}),
    [shloka?.id]
  );

  function friendlyError(msg: string): string {
    if (msg.includes('API key')) return 'Sarvam API key not set. Add it in Settings.';
    if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch'))
      return 'Network error — check your internet connection.';
    if (msg.includes('TTS failed')) return 'Audio generation failed. Please try again.';
    return msg || 'Something went wrong. Please try again.';
  }

  const resetState = useCallback(() => {
    setRevealedIndices(new Set());
    setShowCheck(false);
    setShowLevelUp(false);
    setRevealedLines(0);
    setError(null);
  }, []);

  const handleLevelChange = useCallback((level: MemorizationLevel) => {
    setSessionLevel(level);
    resetState();
  }, [resetState]);

  const goToShloka = (index: number) => {
    if (index >= 0 && index < shlokas.length) {
      setCurrentIndex(index);
      const newShloka = shlokas[index];
      const newLevel = getMemorizationLevel(newShloka.id) as MemorizationLevel;
      setSessionLevel(newLevel);
      resetState();
    }
  };

  const handlePeek = useCallback((wordIndex: number) => {
    setRevealedIndices(prev => new Set([...prev, wordIndex]));
  }, []);

  const handleCheck = useCallback(() => {
    setShowCheck(true);
  }, []);

  const handleGotIt = useCallback(() => {
    if (shloka) {
      updateMemorizationLevel(shloka.id, sessionLevel);
    }
    setShowCheck(false);
    setShowLevelUp(sessionLevel < 5);
  }, [shloka, sessionLevel, updateMemorizationLevel]);

  const handleNotYet = useCallback(() => {
    resetState();
  }, [resetState]);

  const handleNextLevel = useCallback(() => {
    if (sessionLevel < 5) {
      setSessionLevel((sessionLevel + 1) as MemorizationLevel);
    }
    resetState();
  }, [sessionLevel, resetState]);

  const handleRevealLine = useCallback(() => {
    setRevealedLines(prev => prev + 1);
  }, []);

  // Audio playback
  const handleListen = useCallback(async () => {
    if (!shloka) return;
    setError(null);

    if (isPlaying && soundRef.current) {
      setIsPlaying(false);
      const s = soundRef.current;
      soundRef.current = null;
      s.stopAsync().then(() => s.unloadAsync());
      return;
    }

    if (isLoadingAudio) {
      cancelledRef.current = true;
      setIsLoadingAudio(false);
      return;
    }

    cancelledRef.current = false;
    setIsLoadingAudio(true);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (!(await ensureSarvamConsent())) return;

      const audioBase64 = await textToSpeech(shloka.sanskrit, { pace });

      if (cancelledRef.current) return;

      const dataUri = `data:audio/wav;base64,${audioBase64}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true }
      );

      if (cancelledRef.current) {
        sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (err: any) {
      if (!cancelledRef.current) {
        setError(friendlyError(err.message ?? ''));
      }
    } finally {
      setIsLoadingAudio(false);
    }
  }, [shloka, isPlaying, isLoadingAudio, pace]);

  // --- Render helpers ---

  function renderToken(token: MemorizeToken, key: number) {
    if (token.type === 'separator') {
      if (token.text.includes('\n')) {
        return <View key={key} style={styles.lineBreak} />;
      }
      return (
        <Text key={key} style={[styles.separatorText, { color: colors.sanskritText }]}>
          {token.text.trim() ? token.text : ' '}
        </Text>
      );
    }

    const isBlanked = blanks.blankedIndices.has(token.wordIndex);
    const isRevealed = revealedIndices.has(token.wordIndex);
    const allRevealed = showCheck;
    const translit = translitMap[token.wordIndex];

    // Show full word
    if (!isBlanked || allRevealed || isRevealed) {
      const highlight = isBlanked && (allRevealed || isRevealed);
      return (
        <View key={key} style={[styles.wordGroup, highlight && { backgroundColor: colors.saffronPale, borderRadius: 6 }]}>
          <Text
            style={[
              styles.wordText,
              { color: colors.sanskritText, fontSize: fonts.sanskrit, lineHeight: fonts.sanskrit * 1.6 },
            ]}
          >
            {token.text}
          </Text>
          {translit && (
            <Text style={[styles.wordTranslit, { color: colors.textMuted, fontSize: fonts.caption }]}>
              {translit}
            </Text>
          )}
        </View>
      );
    }

    // Level 4: first-letter hint
    if (sessionLevel === 4) {
      return (
        <Pressable
          key={key}
          onPress={() => handlePeek(token.wordIndex)}
          style={[styles.blankChip, { backgroundColor: colors.saffronPale, borderColor: colors.saffron }]}
          accessibilityRole="button"
          accessibilityLabel="Reveal word"
        >
          <Text style={[styles.hintText, { color: colors.saffron, fontSize: fonts.sanskrit }]}>
            {firstLetterHint(token.text)}
          </Text>
        </Pressable>
      );
    }

    // Levels 2-3: blank underscores
    return (
      <Pressable
        key={key}
        onPress={() => handlePeek(token.wordIndex)}
        style={[styles.blankChip, { backgroundColor: colors.saffronPale, borderColor: colors.saffron }]}
        accessibilityRole="button"
        accessibilityLabel="Reveal word"
      >
        <Text style={[styles.blankText, { color: colors.saffron, fontSize: fonts.body }]}>
          {'____'}
        </Text>
      </Pressable>
    );
  }

  function renderLevel5() {
    const allLinesRevealed = revealedLines >= lines.length;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {lines.map((lineTokens, lineIndex) => {
          const isLineRevealed = lineIndex < revealedLines || showCheck;
          return (
            <View key={lineIndex} style={styles.level5Line}>
              {isLineRevealed ? (
                <View style={styles.tokenContainer}>
                  {lineTokens.map((token, i) => renderToken(
                    // Mark all as non-blanked for revealed lines
                    token,
                    lineIndex * 100 + i
                  ))}
                </View>
              ) : (
                <View
                  style={[styles.blankLine, { backgroundColor: colors.saffronPale }]}
                />
              )}
            </View>
          );
        })}

        {!showCheck && !allLinesRevealed && (
          <Pressable
            onPress={handleRevealLine}
            style={({ pressed }) => [
              styles.revealLineButton,
              { borderColor: colors.saffron },
              pressed && { backgroundColor: colors.saffronPale },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Reveal next line"
          >
            <Text style={[styles.revealLineText, { color: colors.saffron }]}>
              Show Next Line
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  // --- Empty state ---
  if (!shloka) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No shlokas found for this day.
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.saffron }]}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const showCheckButton = sessionLevel > 1 && !showCheck && !showLevelUp;
  const showSelfAssess = showCheck && !showLevelUp;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.saffronPale }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <Text style={[styles.backArrow, { color: colors.saffron }]}>{'\u2190'}</Text>
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Memorize</Text>
          {chapter && (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              Day {displayDay} — {shloka.chapter}.{shloka.verse}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shloka navigation */}
        {shlokas.length > 1 && (
          <View style={styles.shlokaNav}>
            {shlokas.map((s, i) => (
              <Pressable
                key={s.id}
                onPress={() => goToShloka(i)}
                style={[
                  styles.shlokaNavDot,
                  {
                    backgroundColor: i === currentIndex ? colors.saffron : colors.saffronPale,
                    borderColor: colors.saffron,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Shloka ${i + 1}`}
              >
                <Text
                  style={[
                    styles.shlokaNavText,
                    { color: i === currentIndex ? colors.white : colors.saffron },
                  ]}
                >
                  {s.chapter}.{s.verse}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Level selector */}
        <View style={styles.levelRow}>
          {([1, 2, 3, 4, 5] as MemorizationLevel[]).map((level) => (
            <Pressable
              key={level}
              onPress={() => handleLevelChange(level)}
              style={[
                styles.levelButton,
                {
                  backgroundColor: sessionLevel === level ? colors.saffron : colors.saffronPale,
                  borderColor: colors.saffron,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Level ${level}: ${LEVEL_LABELS[level]}`}
            >
              <Text
                style={[
                  styles.levelButtonText,
                  { color: sessionLevel === level ? colors.white : colors.saffron },
                ]}
              >
                {LEVEL_LABELS[level]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Speed control */}
        <View style={styles.speedRow}>
          <Text style={[styles.speedLabel, { color: colors.textSecondary }]}>Speed:</Text>
          {([0.5, 0.75, 1.0] as PaceOption[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPace(p)}
              style={[
                styles.speedButton,
                {
                  backgroundColor: pace === p ? colors.saffron : colors.saffronPale,
                  borderColor: colors.saffron,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Speed ${p}x`}
            >
              <Text
                style={[
                  styles.speedButtonText,
                  { color: pace === p ? colors.white : colors.saffron },
                ]}
              >
                {p}x
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Listen button */}
        <Pressable
          onPress={handleListen}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.saffron },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Stop listening' : isLoadingAudio ? 'Cancel loading' : 'Listen to shloka'}
        >
          {isLoadingAudio ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.actionButtonIcon}>
              {isPlaying ? '\u23F9' : '\u{1F50A}'}
            </Text>
          )}
          <Text style={styles.actionButtonText}>
            {isLoadingAudio ? 'Loading...' : isPlaying ? 'Stop' : 'Listen'}
          </Text>
        </Pressable>

        {/* Error */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Main memorization card */}
        {sessionLevel === 5 && !showCheck ? (
          renderLevel5()
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.tokenContainer}>
              {tokens.map((token, i) => renderToken(token, i))}
            </View>
          </View>
        )}

        {/* Transliteration (always visible at Level 1, hidden at higher levels unless checked) */}
        {(sessionLevel === 1 || showCheck) && (
          <View style={[styles.translitCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[
                styles.translitText,
                { color: colors.textSecondary, fontSize: fonts.body, lineHeight: fonts.body * 1.5 },
              ]}
            >
              {shloka.transliteration}
            </Text>
          </View>
        )}

        {/* Check button */}
        {showCheckButton && (
          <Pressable
            onPress={handleCheck}
            style={({ pressed }) => [
              styles.checkButton,
              { backgroundColor: colors.saffron },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Check your recall"
          >
            <Text style={styles.checkButtonText}>Check</Text>
          </Pressable>
        )}

        {/* Self-assess buttons */}
        {showSelfAssess && (
          <View style={styles.selfAssessRow}>
            <Pressable
              onPress={handleGotIt}
              style={({ pressed }) => [
                styles.selfAssessButton,
                styles.gotItButton,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Got it"
            >
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
            <Pressable
              onPress={handleNotYet}
              style={({ pressed }) => [
                styles.selfAssessButton,
                { borderWidth: 2, borderColor: colors.saffron },
                pressed && { backgroundColor: colors.saffronPale },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Not yet"
            >
              <Text style={[styles.notYetText, { color: colors.saffron }]}>Not yet</Text>
            </Pressable>
          </View>
        )}

        {/* Level up suggestion */}
        {showLevelUp && sessionLevel < 5 && (
          <View style={[styles.levelUpCard, { backgroundColor: colors.saffronPale }]}>
            <Text style={[styles.levelUpTitle, { color: colors.textPrimary }]}>
              Great! Ready for Level {sessionLevel + 1}?
            </Text>
            <View style={styles.levelUpRow}>
              <Pressable
                onPress={handleNextLevel}
                style={({ pressed }) => [
                  styles.levelUpButton,
                  { backgroundColor: colors.saffron },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Try next level"
              >
                <Text style={styles.levelUpButtonText}>Try Next Level</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowLevelUp(false); resetState(); }}
                style={({ pressed }) => [
                  styles.levelUpButton,
                  { borderWidth: 2, borderColor: colors.saffron },
                  pressed && { backgroundColor: colors.saffronPale },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Keep practicing"
              >
                <Text style={[styles.keepPracticingText, { color: colors.saffron }]}>
                  Keep Practicing
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Bottom nav arrows */}
      {shlokas.length > 1 && (
        <View
          style={[
            styles.bottomNav,
            { borderTopColor: colors.saffronPale, backgroundColor: colors.background },
          ]}
        >
          <Pressable
            onPress={() => goToShloka(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={({ pressed }) => [
              styles.navArrowButton,
              { borderColor: colors.saffron },
              currentIndex === 0 && { opacity: 0.3 },
              pressed && { backgroundColor: colors.saffronPale },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous shloka"
          >
            <Text style={[styles.navArrowText, { color: colors.saffron }]}>
              {'\u2190'} Prev
            </Text>
          </Pressable>

          <Text style={[styles.navCounter, { color: colors.textMuted }]}>
            {currentIndex + 1} / {shlokas.length}
          </Text>

          <Pressable
            onPress={() => goToShloka(currentIndex + 1)}
            disabled={currentIndex === shlokas.length - 1}
            style={({ pressed }) => [
              styles.navArrowButton,
              { borderColor: colors.saffron },
              currentIndex === shlokas.length - 1 && { opacity: 0.3 },
              pressed && { backgroundColor: colors.saffronPale },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Next shloka"
          >
            <Text style={[styles.navArrowText, { color: colors.saffron }]}>
              Next {'\u2192'}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyText: { fontSize: FONT_SIZES.body, marginBottom: SPACING.md },
  backLink: { fontSize: FONT_SIZES.body, fontWeight: '600' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  backButton: { width: TOUCH_TARGET.minWidth, height: TOUCH_TARGET.minHeight, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: FONT_SIZES.title },
  headerTextContainer: { flex: 1, marginLeft: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZES.subtitle, fontWeight: '700' },
  headerSubtitle: { fontSize: FONT_SIZES.caption, marginTop: 2 },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.lg },

  // Shloka nav
  shlokaNav: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg, justifyContent: 'center', flexWrap: 'wrap' },
  shlokaNavDot: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADII.sm, borderWidth: 1.5 },
  shlokaNavText: { fontSize: FONT_SIZES.caption, fontWeight: '600' },

  // Level selector
  levelRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xs, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  levelButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADII.sm, borderWidth: 1.5 },
  levelButtonText: { fontSize: FONT_SIZES.caption, fontWeight: '600' },

  // Speed
  speedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  speedLabel: { fontSize: FONT_SIZES.body, fontWeight: '500', marginRight: SPACING.xs },
  speedButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADII.sm, borderWidth: 1.5, minWidth: 52, alignItems: 'center' },
  speedButtonText: { fontSize: FONT_SIZES.small, fontWeight: '600' },

  // Action button (listen)
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADII.md, paddingVertical: SPACING.md + 2, marginBottom: SPACING.lg, minHeight: TOUCH_TARGET.minHeight, gap: SPACING.sm },
  actionButtonIcon: { fontSize: FONT_SIZES.bodyLarge },
  actionButtonText: { color: COLORS.white, fontSize: FONT_SIZES.bodyLarge, fontWeight: '700' },

  // Error
  errorCard: { borderRadius: RADII.sm, padding: SPACING.md, marginBottom: SPACING.md },
  errorText: { color: COLORS.error, fontSize: FONT_SIZES.body, textAlign: 'center' },

  // Card
  card: { borderRadius: RADII.md, padding: SPACING.lg, marginBottom: SPACING.lg, ...CARD_SHADOW },

  // Token container (flex-wrap flow)
  tokenContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  lineBreak: { width: '100%', height: SPACING.sm },
  separatorText: { fontSize: FONT_SIZES.body },
  wordGroup: { alignItems: 'center', marginHorizontal: 1 },
  wordText: { fontWeight: '500' },
  wordTranslit: { fontStyle: 'italic' },

  // Blank chips
  blankChip: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginVertical: 2 },
  blankText: { fontWeight: '600' },
  hintText: { fontWeight: '600' },

  // Level 5
  level5Line: { marginBottom: SPACING.sm },
  blankLine: { height: 28, borderRadius: 8 },
  revealLineButton: { borderWidth: 2, borderRadius: RADII.md, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.md, minHeight: TOUCH_TARGET.minHeight, justifyContent: 'center' },
  revealLineText: { fontSize: FONT_SIZES.body, fontWeight: '700' },

  // Transliteration
  translitCard: { borderRadius: RADII.md, padding: SPACING.lg, marginBottom: SPACING.lg, ...CARD_SHADOW },
  translitText: { textAlign: 'center', fontStyle: 'italic' },

  // Check button
  checkButton: { borderRadius: RADII.md, paddingVertical: SPACING.md + 2, alignItems: 'center', marginBottom: SPACING.md, minHeight: TOUCH_TARGET.minHeight, justifyContent: 'center' },
  checkButtonText: { color: COLORS.white, fontSize: FONT_SIZES.bodyLarge, fontWeight: '700' },

  // Self-assess
  selfAssessRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  selfAssessButton: { flex: 1, borderRadius: RADII.md, paddingVertical: SPACING.md + 2, alignItems: 'center', minHeight: TOUCH_TARGET.minHeight, justifyContent: 'center' },
  gotItButton: { backgroundColor: COLORS.success },
  gotItText: { color: COLORS.white, fontSize: FONT_SIZES.bodyLarge, fontWeight: '700' },
  notYetText: { fontSize: FONT_SIZES.bodyLarge, fontWeight: '700' },

  // Level up
  levelUpCard: { borderRadius: RADII.md, padding: SPACING.lg, marginBottom: SPACING.md, alignItems: 'center' },
  levelUpTitle: { fontSize: FONT_SIZES.subtitle, fontWeight: '600', marginBottom: SPACING.md, textAlign: 'center' },
  levelUpRow: { flexDirection: 'row', gap: SPACING.md, width: '100%' },
  levelUpButton: { flex: 1, borderRadius: RADII.md, paddingVertical: SPACING.md, alignItems: 'center', minHeight: TOUCH_TARGET.minHeight, justifyContent: 'center' },
  levelUpButtonText: { color: COLORS.white, fontSize: FONT_SIZES.body, fontWeight: '700' },
  keepPracticingText: { fontSize: FONT_SIZES.body, fontWeight: '700' },

  // Bottom nav
  bottomNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderTopWidth: 1 },
  navArrowButton: { borderWidth: 1.5, borderRadius: RADII.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2 },
  navArrowText: { fontSize: FONT_SIZES.small, fontWeight: '600' },
  navCounter: { fontSize: FONT_SIZES.body, fontWeight: '500' },
});
