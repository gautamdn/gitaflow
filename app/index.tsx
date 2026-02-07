import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, TOUCH_TARGET } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { getDailyReading, getChapter, getTotalReadings } from '../src/services/gitaData';
import { getGreeting } from '../src/utils/greeting';

export default function HomeScreen() {
  const router = useRouter();
  const { current_day, streak_count, completed_readings } = useProgressStore();

  const reading = getDailyReading(current_day);
  const chapter = reading ? getChapter(reading.chapter) : undefined;
  const totalReadings = getTotalReadings();
  const progressPercent = (completed_readings.length / totalReadings) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.appName}>GitaFlow</Text>

        {/* Today's Reading Card */}
        <View style={styles.card}>
          <Text style={styles.dayLabel}>
            Day {current_day} of {totalReadings}
          </Text>

          {chapter && (
            <>
              <Text style={styles.chapterTitle}>
                Chapter {chapter.chapter_number}:{' '}
                {chapter.name_english ?? chapter.name_sanskrit}
              </Text>
              {chapter.meaning_en && (
                <Text style={styles.chapterMeaning}>{chapter.meaning_en}</Text>
              )}
            </>
          )}

          {reading && (
            <Text style={styles.shlokaRange}>
              Verses {reading.shloka_range}
            </Text>
          )}
        </View>

        {/* Begin Reading Button */}
        <Pressable
          style={({ pressed }) => [
            styles.beginButton,
            pressed && styles.beginButtonPressed,
          ]}
          onPress={() => router.push('/reading')}
          accessibilityRole="button"
          accessibilityLabel="Begin today's reading"
        >
          <Text style={styles.beginButtonText}>Begin Today's Reading</Text>
        </Pressable>

        {/* Streak */}
        <View style={styles.streakSection}>
          <Text style={styles.streakIcon}>
            {streak_count > 0 ? '\u{1F525}' : '\u{1F331}'}
          </Text>
          <Text style={styles.streakText}>
            {streak_count === 0
              ? 'Start your journey today'
              : streak_count === 1
                ? '1 day streak'
                : `${streak_count} day streak`}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(progressPercent, 1)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completed_readings.length} of {totalReadings} readings completed
          </Text>
        </View>

        {/* Browse link */}
        <Pressable
          style={({ pressed }) => [
            styles.browseButton,
            pressed && styles.browseButtonPressed,
          ]}
          onPress={() => router.push('/browse')}
          accessibilityRole="button"
          accessibilityLabel="Browse all chapters"
        >
          <Text style={styles.browseButtonText}>Browse All Chapters</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  greeting: {
    fontSize: FONT_SIZES.title,
    color: COLORS.textSecondary,
  },
  appName: {
    fontSize: FONT_SIZES.heading,
    color: COLORS.saffron,
    fontWeight: '700',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dayLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.saffron,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  chapterTitle: {
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  chapterMeaning: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  shlokaRange: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
  beginButton: {
    backgroundColor: COLORS.saffron,
    borderRadius: 16,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
    marginBottom: SPACING.xl,
  },
  beginButtonPressed: {
    backgroundColor: COLORS.saffronLight,
    transform: [{ scale: 0.98 }],
  },
  beginButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
  streakSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  streakIcon: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  streakText: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.saffronPale,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.saffron,
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  browseButton: {
    borderWidth: 2,
    borderColor: COLORS.saffron,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
    marginTop: SPACING.lg,
  },
  browseButtonPressed: {
    backgroundColor: COLORS.saffronPale,
  },
  browseButtonText: {
    color: COLORS.saffron,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '600',
  },
});
