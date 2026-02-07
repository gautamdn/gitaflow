import { useState, useCallback, useRef } from 'react';
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
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors, getScaledFontSizes } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getDailyReading, getShlokasByIds, getChapter } from '../src/services/gitaData';
import { textToSpeech, speechToText } from '../src/services/sarvamAI';
import { scorePronunciation, type PronunciationResult } from '../src/services/pronunciationScore';

type PaceOption = 0.5 | 0.75 | 1.0;

export default function PracticeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const { current_day, addPronunciationScore, getBestScore } = useProgressStore();
  const { darkMode, fontSize } = useSettingsStore();

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

  // Play reference audio
  const handleListen = useCallback(async () => {
    if (!shloka) return;
    setError(null);

    if (isPlaying && soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const audioBase64 = await textToSpeech(shloka.sanskrit, { pace });
      const audioUri = `data:audio/wav;base64,${audioBase64}`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
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
      setError(err.message ?? 'Failed to play audio');
    } finally {
      setIsLoadingAudio(false);
    }
  }, [shloka, isPlaying, pace]);

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

      // Process the recording
      setIsProcessing(true);
      try {
        const sttResult = await speechToText(uri);
        const scoreResult = scorePronunciation(
          shloka.transliteration,
          sttResult.transcript
        );
        setResult(scoreResult);
        addPronunciationScore(shloka.id, scoreResult.score);
      } catch (err: any) {
        setError(err.message ?? 'Failed to process recording');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Start recording
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required to record.');
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
      setError(err.message ?? 'Failed to start recording');
    }
  }, [isRecording, shloka, addPronunciationScore]);

  // Navigate between shlokas
  const goToShloka = (index: number) => {
    if (index >= 0 && index < shlokas.length) {
      setCurrentIndex(index);
      setResult(null);
      setError(null);
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
                    { color: i === currentIndex ? '#FFFFFF' : colors.saffron },
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
            {shloka.sanskrit}
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
                  { color: pace === p ? '#FFFFFF' : colors.saffron },
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
          disabled={isLoadingAudio}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.saffron },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Stop listening' : 'Listen to shloka'}
        >
          {isLoadingAudio ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
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
              backgroundColor: isRecording ? '#D32F2F' : colors.surface,
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
              { color: isRecording ? '#FFFFFF' : colors.saffron },
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
                      ? '#4CAF50'
                      : result.score >= 50
                        ? '#FF9800'
                        : '#D32F2F',
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreNumber,
                  {
                    color:
                      result.score >= 80
                        ? '#4CAF50'
                        : result.score >= 50
                          ? '#FF9800'
                          : '#D32F2F',
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

            {/* What we heard */}
            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonLabel, { color: colors.textMuted }]}>
                We heard:
              </Text>
              <Text style={[styles.comparisonText, { color: colors.textPrimary }]}>
                {result.actual || '(nothing detected)'}
              </Text>
            </View>

            {result.mismatches.length > 0 && (
              <View style={styles.comparisonSection}>
                <Text style={[styles.comparisonLabel, { color: colors.textMuted }]}>
                  Words to practice:
                </Text>
                <Text style={[styles.mismatchWords, { color: '#D32F2F' }]}>
                  {result.mismatches.join(', ')}
                </Text>
              </View>
            )}

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
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
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
    borderRadius: 12,
    borderWidth: 1.5,
  },
  shlokaNavText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: 'center',
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: SPACING.md + 2,
    marginBottom: SPACING.md,
    minHeight: TOUCH_TARGET.minHeight,
    gap: SPACING.sm,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    color: '#FFFFFF',
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
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
    fontSize: 32,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 13,
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
  mismatchWords: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  tryAgainButton: {
    borderWidth: 2,
    borderRadius: 16,
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
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  navArrowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navCounter: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
  },
});
