import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { SPACING, FONT_SIZES, RADII, CARD_SHADOW, COLORS, TOUCH_TARGET, getColors, getScaledFontSizes } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getDailyReading, getShlokasByIds, getChapter } from '../src/services/gitaData';
import { textToSpeech, speechToText } from '../src/services/sarvamAI';
import { ensureSarvamConsent } from '../src/utils/sarvamConsent';
import { scorePronunciation, buildTransliterationMap, type PronunciationResult } from '../src/services/pronunciationScore';
import { WordDiffDisplay } from '../src/components/WordDiffDisplay';
import { RecordingIndicator } from '../src/components/RecordingIndicator';

type PaceOption = 0.5 | 0.75 | 1.0;

export default function PracticeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const { current_day, addPronunciationScore, getBestScore } = useProgressStore();
  const { darkMode, fontSize, showSanskritKannada } = useSettingsStore();

  const colors = getColors(darkMode);
  const fonts = getScaledFontSizes(fontSize);

  const displayDay = params.day ? Number(params.day) : current_day;
  const reading = getDailyReading(displayDay);
  const chapter = reading ? getChapter(reading.chapter) : undefined;
  const shlokas = reading ? getShlokasByIds(reading.shloka_ids) : [];

  // Current shloka index
  const [currentIndex, setCurrentIndex] = useState(0);
  const shloka = shlokas[currentIndex];

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [pace, setPace] = useState<PaceOption>(0.75);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Result state
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bestScore = shloka ? getBestScore(shloka.id) : null;

  // Build transliteration map for the current shloka
  const translitMap = shloka ? buildTransliterationMap(shloka.sanskrit, shloka.transliteration) : {};

  // Word drill state
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const wordSoundRef = useRef<Audio.Sound | null>(null);

  const cancelledRef = useRef(false);

  function friendlyError(msg: string): string {
    if (msg.includes('API key')) return 'Sarvam API key not set. Add it in Settings.';
    if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch'))
      return 'Network error — check your internet connection.';
    if (msg.includes('TTS failed')) return 'Audio generation failed. Please try again.';
    if (msg.includes('STT failed')) return 'Speech recognition failed. Please try again.';
    if (msg.includes('nothing detected')) return 'No speech detected. Try speaking louder or closer to the mic.';
    return msg || 'Something went wrong. Please try again.';
  }

  // Play a single word's audio
  const handleWordPress = useCallback(async (word: string) => {
    // Stop any currently playing word audio
    if (wordSoundRef.current) {
      wordSoundRef.current.stopAsync().then(() => wordSoundRef.current?.unloadAsync());
      wordSoundRef.current = null;
    }

    // If tapping the same word that's playing, just stop
    if (playingWord === word) {
      setPlayingWord(null);
      return;
    }

    setPlayingWord(word);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (!(await ensureSarvamConsent())) {
        setPlayingWord(null);
        return;
      }

      const audioBase64 = await textToSpeech(word, { pace: 0.65 });
      const dataUri = `data:audio/wav;base64,${audioBase64}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true }
      );
      wordSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingWord(null);
          sound.unloadAsync();
          wordSoundRef.current = null;
        }
      });
    } catch {
      setPlayingWord(null);
    }
  }, [playingWord]);

  // Play reference audio
  const handleListen = useCallback(async () => {
    if (!shloka) return;
    setError(null);

    // If playing, stop instantly
    if (isPlaying && soundRef.current) {
      setIsPlaying(false);
      const s = soundRef.current;
      soundRef.current = null;
      s.stopAsync().then(() => s.unloadAsync());
      return;
    }

    // If loading, cancel
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

  // Start/stop recording
  const handleRecord = useCallback(async () => {
    setError(null);

    if (isRecording && recordingRef.current) {
      // Stop recording
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri || !shloka) return;

      // Process the recording. Consent was already obtained in the start
      // branch below before recording began, so no second prompt is needed.
      setIsProcessing(true);
      try {
        const sttResult = await speechToText(uri);
        // STT returns Devanagari, so compare against Sanskrit text (also Devanagari)
        const scoreResult = scorePronunciation(
          shloka.sanskrit,
          sttResult.transcript
        );
        setResult(scoreResult);
        addPronunciationScore(shloka.id, scoreResult.score);
      } catch (err: any) {
        setError(friendlyError(err.message ?? ''));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Start recording. Consent must be obtained BEFORE the microphone turns
    // on — Apple App Review (5.1.1(i)) requires permission for sending data
    // to a third party to be granted before the data is even captured, not
    // just before it is transmitted.
    if (!(await ensureSarvamConsent())) return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone Access',
          'Microphone permission is needed to record your chanting. Please go to Settings > Expo Go and enable Microphone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setResult(null);
    } catch (err: any) {
      setError(friendlyError(err.message ?? ''));
    }
  }, [isRecording, shloka, addPronunciationScore]);

  // Navigate between shlokas
  const goToShloka = (index: number) => {
    if (index >= 0 && index < shlokas.length) {
      setCurrentIndex(index);
      setResult(null);
      setError(null);
      setPlayingWord(null);
      if (wordSoundRef.current) {
        wordSoundRef.current.stopAsync().then(() => wordSoundRef.current?.unloadAsync());
        wordSoundRef.current = null;
      }
    }
  };

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
          <Text style={[styles.backArrow, { color: colors.saffron }]}>
            {'\u2190'}
          </Text>
        </Pressable>
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

        {/* Sanskrit text */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sanskritText,
              {
                color: colors.sanskritText,
                fontSize: fonts.sanskrit,
                lineHeight: fonts.sanskrit * 1.6,
              },
            ]}
          >
            {showSanskritKannada ? shloka.sanskrit_kannada : shloka.sanskrit}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.saffronPale }]} />

          <Text
            style={[
              styles.transliterationText,
              {
                color: colors.textSecondary,
                fontSize: fonts.body,
                lineHeight: fonts.body * 1.5,
              },
            ]}
          >
            {shloka.transliteration}
          </Text>
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

        {/* Record button */}
        <Pressable
          onPress={handleRecord}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: isRecording ? colors.error : colors.surface,
              borderWidth: isRecording ? 0 : 2,
              borderColor: colors.saffron,
            },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.saffron} />
          ) : (
            <Text style={styles.actionButtonIcon}>
              {isRecording ? '\u23F9' : '\u{1F3A4}'}
            </Text>
          )}
          <Text
            style={[
              styles.actionButtonText,
              { color: isRecording ? colors.white : colors.saffron },
            ]}
          >
            {isProcessing
              ? 'Analyzing...'
              : isRecording
                ? 'Stop Recording'
                : 'Record Your Chanting'}
          </Text>
        </Pressable>

        {/* Best score badge */}
        {bestScore !== null && !result && (
          <View style={[styles.bestScoreBadge, { backgroundColor: colors.saffronPale }]}>
            <Text style={[styles.bestScoreText, { color: colors.saffron }]}>
              Best Score: {bestScore}%
            </Text>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Result card */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
            {/* Score circle */}
            <View
              style={[
                styles.scoreCircle,
                {
                  borderColor:
                    result.score >= 80
                      ? colors.success
                      : result.score >= 50
                        ? colors.warning
                        : colors.error,
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreNumber,
                  {
                    color:
                      result.score >= 80
                        ? colors.success
                        : result.score >= 50
                          ? colors.warning
                          : colors.error,
                  },
                ]}
              >
                {result.score}%
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>
                accuracy
              </Text>
            </View>

            {/* Feedback */}
            <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>
              {result.score >= 80
                ? 'Excellent!'
                : result.score >= 60
                  ? 'Good effort!'
                  : result.score >= 40
                    ? 'Keep practicing!'
                    : 'Try again — listen first, then repeat.'}
            </Text>

            {/* Word-by-word visual diff */}
            {result.wordComparisons && result.wordComparisons.length > 0 && (
              <WordDiffDisplay
                wordComparisons={result.wordComparisons}
                darkMode={darkMode}
                textMutedColor={colors.textMuted}
                onWordPress={handleWordPress}
                playingWord={playingWord}
                transliterationMap={translitMap}
                displayScript={showSanskritKannada ? 'kannada' : 'devanagari'}
              />
            )}

            {/* Full transcript */}
            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonLabel, { color: colors.textMuted }]}>
                Full transcript:
              </Text>
              <Text style={[styles.comparisonText, { color: colors.textPrimary }]}>
                {result.actual || '(nothing detected)'}
              </Text>
            </View>

            {/* Try again button */}
            <Pressable
              onPress={() => setResult(null)}
              style={({ pressed }) => [
                styles.tryAgainButton,
                { borderColor: colors.saffron },
                pressed && { backgroundColor: colors.saffronPale },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={[styles.tryAgainText, { color: colors.saffron }]}>
                Try Again
              </Text>
            </Pressable>
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
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    marginBottom: SPACING.md,
  },
  backLink: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: TOUCH_TARGET.minWidth,
    height: TOUCH_TARGET.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  shlokaNav: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  shlokaNavDot: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1.5,
  },
  shlokaNavText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  card: {
    borderRadius: RADII.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...CARD_SHADOW,
  },
  sanskritText: {
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  transliterationText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  speedLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
    marginRight: SPACING.xs,
  },
  speedButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.sm,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: 'center',
  },
  speedButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
    paddingVertical: SPACING.md + 2,
    marginBottom: SPACING.md,
    minHeight: TOUCH_TARGET.minHeight,
    gap: SPACING.sm,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
  bestScoreBadge: {
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginBottom: SPACING.md,
  },
  bestScoreText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: RADII.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: RADII.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...CARD_SHADOW,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  scoreNumber: {
    fontSize: FONT_SIZES.score,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
  },
  feedbackTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '600',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  comparisonSection: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  comparisonLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  comparisonText: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
  },
  tryAgainButton: {
    borderWidth: 2,
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    minHeight: TOUCH_TARGET.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryAgainText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  navArrowButton: {
    borderWidth: 1.5,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  navArrowText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  navCounter: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
  },
});
