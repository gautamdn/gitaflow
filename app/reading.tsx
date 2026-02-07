import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { SPACING, TOUCH_TARGET, getColors, getScaledFontSizes } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getDailyReading, getShlokasByIds, getChapter } from '../src/services/gitaData';
import { textToSpeech } from '../src/services/sarvamAI';
import type { Shloka } from '../src/types/gita';
import type { ThemeColors } from '../src/constants/theme';

function AudioButton({
  shloka,
  colors,
}: {
  shloka: Shloka;
  colors: ThemeColors;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlay = useCallback(async () => {
    setError(null);

    // If currently playing, stop
    if (isPlaying && sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      // Generate audio from Sanskrit text via Sarvam TTS
      const audioBase64 = await textToSpeech(shloka.sanskrit);

      // Create a data URI for the base64 WAV audio
      const audioUri = `data:audio/wav;base64,${audioBase64}`;

      // Load and play
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);

      // Listen for playback completion
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to play audio');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [shloka.sanskrit, isPlaying, sound]);

  return (
    <View style={styles.audioButtonContainer}>
      <Pressable
        onPress={handlePlay}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.audioButton,
          { backgroundColor: colors.saffronPale, borderColor: colors.saffron },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Stop audio' : 'Play shloka audio'}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.saffron} />
        ) : (
          <Text style={[styles.audioButtonIcon, { color: colors.saffron }]}>
            {isPlaying ? '\u23F9' : '\u25B6'}
          </Text>
        )}
        <Text style={[styles.audioButtonText, { color: colors.saffron }]}>
          {isLoading ? 'Loading...' : isPlaying ? 'Stop' : 'Listen'}
        </Text>
      </Pressable>
      {error && (
        <Text style={[styles.audioError, { color: '#D32F2F' }]} numberOfLines={2}>
          {error}
        </Text>
      )}
    </View>
  );
}

function ShlokaCard({
  shloka,
  colors,
  fonts,
  showSanskrit,
  showTransliteration,
  showTranslation,
}: {
  shloka: Shloka;
  colors: ThemeColors;
  fonts: ReturnType<typeof getScaledFontSizes>;
  showSanskrit: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
}) {
  const needsDivider =
    (showSanskrit || showTransliteration) && showTranslation;

  return (
    <View style={[styles.shlokaCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.verseNumber, { color: colors.saffron, fontSize: fonts.caption }]}>
        {shloka.chapter}.{shloka.verse}
      </Text>

      {showSanskrit && (
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
      )}

      {/* Audio player */}
      <AudioButton shloka={shloka} colors={colors} />

      {showTransliteration && (
        <Text
          style={[
            styles.transliteration,
            {
              color: colors.textSecondary,
              fontSize: fonts.body,
              lineHeight: fonts.body * 1.5,
            },
          ]}
        >
          {shloka.transliteration}
        </Text>
      )}

      {needsDivider && (
        <View style={[styles.divider, { backgroundColor: colors.saffronPale }]} />
      )}

      {showTranslation && (
        <Text
          style={[
            styles.translation,
            {
              color: colors.textPrimary,
              fontSize: fonts.bodyLarge,
              lineHeight: fonts.bodyLarge * 1.6,
            },
          ]}
        >
          {shloka.translations.sivananda}
        </Text>
      )}
    </View>
  );
}

export default function ReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const { current_day, completed_readings, markDayComplete } = useProgressStore();
  const { darkMode, fontSize, showSanskrit, showTransliteration, showTranslation } =
    useSettingsStore();

  const colors = getColors(darkMode);
  const fonts = getScaledFontSizes(fontSize);

  const browseDay = params.day ? Number(params.day) : undefined;
  const displayDay = browseDay ?? current_day;
  const isBrowseMode = browseDay !== undefined;

  const reading = getDailyReading(displayDay);
  const chapter = reading ? getChapter(reading.chapter) : undefined;
  const shlokas = reading ? getShlokasByIds(reading.shloka_ids) : [];
  const isComplete = completed_readings.includes(displayDay);

  const handleMarkComplete = () => {
    markDayComplete(displayDay);
    router.back();
  };

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
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Day {displayDay}
          </Text>
          {chapter && (
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Chapter {chapter.chapter_number}:{' '}
              {chapter.name_english ?? chapter.name_sanskrit}
            </Text>
          )}
        </View>
        {/* Practice button */}
        <Pressable
          onPress={() => router.push(`/practice?day=${displayDay}`)}
          style={({ pressed }) => [
            styles.practiceHeaderButton,
            { backgroundColor: colors.saffronPale, borderColor: colors.saffron },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Practice pronunciation"
        >
          <Text style={[styles.practiceHeaderText, { color: colors.saffron }]}>
            Practice
          </Text>
        </Pressable>
      </View>

      {/* Shlokas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {shlokas.map((shloka) => (
          <ShlokaCard
            key={shloka.id}
            shloka={shloka}
            colors={colors}
            fonts={fonts}
            showSanskrit={showSanskrit}
            showTransliteration={showTransliteration}
            showTranslation={showTranslation}
          />
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed footer */}
      {(!isBrowseMode || !isComplete) && (
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.saffronPale, backgroundColor: colors.background },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.completeButton,
              { backgroundColor: colors.saffron },
              isComplete && styles.completeButtonDone,
              pressed && !isComplete && styles.completeButtonPressed,
            ]}
            onPress={handleMarkComplete}
            disabled={isComplete}
            accessibilityRole="button"
            accessibilityLabel={
              isComplete ? 'Reading completed' : 'Mark reading as complete'
            }
          >
            <Text
              style={[
                styles.completeButtonText,
                isComplete && styles.completeButtonTextDone,
              ]}
            >
              {isComplete ? 'Completed \u2713' : 'Mark Complete'}
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
  headerText: {
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
  practiceHeaderButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  practiceHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  shlokaCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  verseNumber: {
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  sanskritText: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  audioButtonContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: SPACING.sm,
  },
  audioButtonIcon: {
    fontSize: 14,
  },
  audioButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  audioError: {
    fontSize: 12,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  transliteration: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  translation: {},
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  completeButton: {
    borderRadius: 16,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
  },
  completeButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  completeButtonDone: {
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  completeButtonTextDone: {
    fontWeight: '600',
  },
});
