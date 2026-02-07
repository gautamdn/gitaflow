import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getDailyReading, getChapter, getTotalReadings } from '../src/services/gitaData';
import { getGreeting } from '../src/utils/greeting';

export default function HomeScreen() {
  const router = useRouter();
  const { current_day, streak_count, completed_readings } = useProgressStore();
  const { darkMode } = useSettingsStore();
  const colors = getColors(darkMode);

  const reading = getDailyReading(current_day);
  const chapter = reading ? getChapter(reading.chapter) : undefined;
  const totalReadings = getTotalReadings();
  const progressPercent = (completed_readings.length / totalReadings) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {getGreeting()}
        </Text>
        <Text style={[styles.appName, { color: colors.saffron }]}>GitaFlow</Text>

        {/* Today's Reading Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.dayLabel, { color: colors.saffron }]}>
            Day {current_day} of {totalReadings}
          </Text>

          {chapter && (
            <>
              <Text style={[styles.chapterTitle, { color: colors.textPrimary }]}>
                Chapter {chapter.chapter_number}:{' '}
                {chapter.name_english ?? chapter.name_sanskrit}
              </Text>
              {chapter.meaning_en && (
                <Text style={[styles.chapterMeaning, { color: colors.textSecondary }]}>
                  {chapter.meaning_en}
                </Text>
              )}
            </>
          )}

          {reading && (
            <Text style={[styles.shlokaRange, { color: colors.textMuted }]}>
              Verses {reading.shloka_range}
            </Text>
          )}
        </View>

        {/* Begin Reading Button */}
        <Pressable
          style={({ pressed }) => [
            styles.beginButton,
            { backgroundColor: colors.saffron },
            pressed && styles.beginButtonPressed,
          ]}
          onPress={() => router.push('/reading')}
          accessibilityRole="button"
          accessibilityLabel="Begin today's reading"
        >
          <Text style={styles.beginButtonText}>Begin Today's Reading</Text>
        </Pressable>

        {/* Streak */}
        <Pressable
          style={styles.streakSection}
          onPress={() => router.push('/progress')}
          accessibilityRole="button"
          accessibilityLabel="View progress"
        >
          <Text style={styles.streakIcon}>
            {streak_count > 0 ? '\u{1F525}' : '\u{1F331}'}
          </Text>
          <Text style={[styles.streakText, { color: colors.textPrimary }]}>
            {streak_count === 0
              ? 'Start your journey today'
              : streak_count === 1
                ? '1 day streak'
                : `${streak_count} day streak`}
          </Text>

          <View style={[styles.progressBar, { backgroundColor: colors.saffronPale }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(progressPercent, 1)}%`, backgroundColor: colors.saffron },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {completed_readings.length} of {totalReadings} readings completed
          </Text>
        </Pressable>

        {/* Nav links */}
        <View style={styles.navRow}>
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { borderColor: colors.saffron },
              pressed && { backgroundColor: colors.saffronPale },
            ]}
            onPress={() => router.push('/browse')}
            accessibilityRole="button"
            accessibilityLabel="Browse all chapters"
          >
            <Text style={[styles.navButtonText, { color: colors.saffron }]}>
              Browse
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { borderColor: colors.saffron },
              pressed && { backgroundColor: colors.saffronPale },
            ]}
            onPress={() => router.push('/progress')}
            accessibilityRole="button"
            accessibilityLabel="View progress"
          >
            <Text style={[styles.navButtonText, { color: colors.saffron }]}>
              Progress
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              { borderColor: colors.saffron },
              pressed && { backgroundColor: colors.saffronPale },
            ]}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text style={[styles.navButtonText, { color: colors.saffron }]}>
              Settings
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  greeting: {
    fontSize: FONT_SIZES.title,
  },
  appName: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '700',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  card: {
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  chapterTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  chapterMeaning: {
    fontSize: FONT_SIZES.body,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  shlokaRange: {
    fontSize: FONT_SIZES.body,
  },
  beginButton: {
    borderRadius: 16,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
    marginBottom: SPACING.xl,
  },
  beginButtonPressed: {
    opacity: 0.85,
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
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.caption,
  },
  navRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  navButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
  },
  navButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
});
