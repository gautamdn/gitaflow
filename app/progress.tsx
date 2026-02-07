import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getDailyReading, getChapter, getTotalReadings } from '../src/services/gitaData';

const MILESTONES = [
  { days: 1, label: 'First Reading', icon: '\u{1F331}' },
  { days: 7, label: 'One Week', icon: '\u{1F525}' },
  { days: 30, label: 'One Month', icon: '\u2B50' },
  { days: 100, label: '100 Readings', icon: '\u{1F3C6}' },
  { days: 239, label: 'Complete Journey', icon: '\u{1F54A}' },
];

export default function ProgressScreen() {
  const router = useRouter();
  const { current_day, streak_count, completed_readings, last_read_date } =
    useProgressStore();
  const { darkMode } = useSettingsStore();
  const colors = getColors(darkMode);
  const totalReadings = getTotalReadings();
  const progressPercent = (completed_readings.length / totalReadings) * 100;

  // Sort completed readings descending for the log
  const recentReadings = [...completed_readings].sort((a, b) => b - a).slice(0, 20);

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Progress
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.statIcon}>
              {streak_count > 0 ? '\u{1F525}' : '\u{1F331}'}
            </Text>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {streak_count}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Day Streak
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.statIcon}>{'\u{1F4D6}'}</Text>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {completed_readings.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Completed
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.statIcon}>{'\u{1F4CA}'}</Text>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {Math.round(progressPercent)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Progress
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
            Journey Progress
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.saffronPale }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(progressPercent, 1)}%`, backgroundColor: colors.saffron },
              ]}
            />
          </View>
          <Text style={[styles.progressSubtext, { color: colors.textMuted }]}>
            {completed_readings.length} of {totalReadings} readings
          </Text>
        </View>

        {/* Milestones */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Milestones
        </Text>
        <View style={[styles.milestonesCard, { backgroundColor: colors.surface }]}>
          {MILESTONES.map((milestone) => {
            const achieved = completed_readings.length >= milestone.days;
            return (
              <View
                key={milestone.days}
                style={[
                  styles.milestoneRow,
                  { borderBottomColor: colors.saffronPale },
                ]}
              >
                <Text style={[styles.milestoneIcon, !achieved && styles.milestoneIconDim]}>
                  {milestone.icon}
                </Text>
                <View style={styles.milestoneInfo}>
                  <Text
                    style={[
                      styles.milestoneLabel,
                      { color: achieved ? colors.textPrimary : colors.textMuted },
                    ]}
                  >
                    {milestone.label}
                  </Text>
                  <Text style={[styles.milestoneDays, { color: colors.textMuted }]}>
                    {milestone.days} {milestone.days === 1 ? 'reading' : 'readings'}
                  </Text>
                </View>
                <Text style={[styles.milestoneCheck, { color: colors.saffron }]}>
                  {achieved ? '\u2713' : ''}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Recent readings log */}
        {recentReadings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Recent Readings
            </Text>
            <View style={[styles.recentCard, { backgroundColor: colors.surface }]}>
              {recentReadings.map((day) => {
                const reading = getDailyReading(day);
                const chapter = reading ? getChapter(reading.chapter) : undefined;
                return (
                  <View
                    key={day}
                    style={[
                      styles.recentRow,
                      { borderBottomColor: colors.saffronPale },
                    ]}
                  >
                    <Text style={[styles.recentDay, { color: colors.saffron }]}>
                      Day {day}
                    </Text>
                    <Text
                      style={[styles.recentChapter, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {chapter
                        ? `Ch. ${chapter.chapter_number}: ${chapter.name_english ?? chapter.name_sanskrit}`
                        : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
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
  headerTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  statNumber: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
  },
  progressSection: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  progressTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressSubtext: {
    fontSize: FONT_SIZES.caption,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  milestonesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: TOUCH_TARGET.minHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  milestoneIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  milestoneIconDim: {
    opacity: 0.3,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  milestoneDays: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
  },
  milestoneCheck: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  recentCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentDay: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    width: 64,
  },
  recentChapter: {
    fontSize: FONT_SIZES.caption,
    flex: 1,
  },
});
