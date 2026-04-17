import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, FONT_SIZES, RADII, CARD_SHADOW, COLORS, TOUCH_TARGET, getColors } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getDailyReading, getChapter, getTotalReadings } from '../src/services/gitaData';

type MilestoneType = 'readings' | 'streak';

interface Milestone {
  count: number;
  label: string;
  sublabel: string;
  icon: string;
  type: MilestoneType;
}

const MILESTONES: Milestone[] = [
  { count: 1, label: 'First Step', sublabel: 'Complete 1 reading', icon: '\u{1F331}', type: 'readings' },
  { count: 7, label: '7-Day Streak', sublabel: 'Read 7 days in a row', icon: '\u{1F525}', type: 'streak' },
  { count: 30, label: '30-Day Streak', sublabel: 'Read 30 days in a row', icon: '\u2B50', type: 'streak' },
  { count: 100, label: '100-Day Streak', sublabel: 'Read 100 days in a row', icon: '\u{1F3C6}', type: 'streak' },
  { count: 239, label: 'Complete', sublabel: 'Finish all 239 readings', icon: '\u{1F54A}', type: 'readings' },
];

function isMilestoneAchieved(
  milestone: Milestone,
  completedCount: number,
  bestStreak: number
): boolean {
  if (milestone.type === 'streak') return bestStreak >= milestone.count;
  return completedCount >= milestone.count;
}

function getMilestoneProgress(
  milestone: Milestone,
  completedCount: number,
  bestStreak: number
): { current: number; target: number } {
  if (milestone.type === 'streak') {
    return { current: Math.min(bestStreak, milestone.count), target: milestone.count };
  }
  return { current: Math.min(completedCount, milestone.count), target: milestone.count };
}

export default function ProgressScreen() {
  const router = useRouter();
  const { current_day, streak_count, best_streak, completed_readings, last_read_date } =
    useProgressStore();
  const { darkMode } = useSettingsStore();
  const colors = getColors(darkMode);
  const totalReadings = getTotalReadings();
  const progressPercent = (completed_readings.length / totalReadings) * 100;
  const effectiveBestStreak = best_streak ?? streak_count;

  const achievedCount = MILESTONES.filter((m) =>
    isMilestoneAchieved(m, completed_readings.length, effectiveBestStreak)
  ).length;

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

        {/* Milestone Badges */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Milestones ({achievedCount}/{MILESTONES.length})
        </Text>

        <View style={[styles.badgesContainer, { backgroundColor: colors.surface }]}>
          {/* Badge row */}
          <View style={styles.badgeRow}>
            {MILESTONES.map((milestone, index) => {
              const achieved = isMilestoneAchieved(
                milestone,
                completed_readings.length,
                effectiveBestStreak
              );
              return (
                <View key={milestone.count} style={styles.badgeWrapper}>
                  {/* Connecting line (except first) */}
                  {index > 0 && (
                    <View
                      style={[
                        styles.badgeConnector,
                        {
                          backgroundColor: isMilestoneAchieved(
                            MILESTONES[index - 1],
                            completed_readings.length,
                            effectiveBestStreak
                          )
                            ? colors.saffron
                            : colors.saffronPale,
                        },
                      ]}
                    />
                  )}
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: achieved ? colors.saffron : colors.saffronPale,
                        borderColor: achieved ? colors.saffron : colors.saffronPale,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeIcon, !achieved && styles.badgeIconDim]}>
                      {milestone.icon}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Milestone detail cards */}
          {MILESTONES.map((milestone) => {
            const achieved = isMilestoneAchieved(
              milestone,
              completed_readings.length,
              effectiveBestStreak
            );
            const { current, target } = getMilestoneProgress(
              milestone,
              completed_readings.length,
              effectiveBestStreak
            );
            const percent = Math.round((current / target) * 100);

            return (
              <View
                key={milestone.count}
                style={[
                  styles.milestoneCard,
                  { borderBottomColor: colors.saffronPale },
                ]}
              >
                <View
                  style={[
                    styles.milestoneIconCircle,
                    {
                      backgroundColor: achieved ? colors.saffron : colors.saffronPale,
                    },
                  ]}
                >
                  <Text style={[styles.milestoneEmoji, !achieved && styles.badgeIconDim]}>
                    {milestone.icon}
                  </Text>
                </View>
                <View style={styles.milestoneInfo}>
                  <Text
                    style={[
                      styles.milestoneLabel,
                      { color: achieved ? colors.textPrimary : colors.textMuted },
                    ]}
                  >
                    {milestone.label}
                  </Text>
                  <Text style={[styles.milestoneSublabel, { color: colors.textMuted }]}>
                    {milestone.sublabel}
                  </Text>
                  {/* Mini progress bar */}
                  {!achieved && (
                    <View style={[styles.miniProgressBar, { backgroundColor: colors.saffronPale }]}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            width: `${Math.max(percent, 2)}%`,
                            backgroundColor: colors.saffron,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
                {achieved ? (
                  <View style={[styles.achievedBadge, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={styles.achievedCheck}>{'\u2713'}</Text>
                  </View>
                ) : (
                  <Text style={[styles.milestonePercent, { color: colors.textMuted }]}>
                    {percent}%
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Best streak callout */}
        {effectiveBestStreak > 0 && (
          <View style={[styles.bestStreakCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.bestStreakIcon}>{'\u{1F525}'}</Text>
            <View style={styles.bestStreakInfo}>
              <Text style={[styles.bestStreakLabel, { color: colors.textPrimary }]}>
                Best Streak
              </Text>
              <Text style={[styles.bestStreakValue, { color: colors.saffron }]}>
                {effectiveBestStreak} {effectiveBestStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </View>
        )}

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
    borderRadius: RADII.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...CARD_SHADOW,
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
    borderRadius: RADII.md,
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
    borderRadius: RADII.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: RADII.sm,
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

  // Badge row
  badgesContainer: {
    borderRadius: RADII.md,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...CARD_SHADOW,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  badgeWrapper: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  badgeConnector: {
    position: 'absolute',
    top: 24,
    right: '50%',
    left: '-50%',
    height: 3,
    borderRadius: 1.5,
    zIndex: -1,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeIcon: {
    fontSize: 22,
  },
  badgeIconDim: {
    opacity: 0.35,
  },

  // Milestone detail cards
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: TOUCH_TARGET.minHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  milestoneIconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  milestoneEmoji: {
    fontSize: 20,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  milestoneSublabel: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
  },
  miniProgressBar: {
    width: '100%',
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  milestonePercent: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    minWidth: 36,
    textAlign: 'right',
  },
  achievedBadge: {
    width: 28,
    height: 28,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  achievedCheck: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '700',
  },

  // Best streak
  bestStreakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...CARD_SHADOW,
  },
  bestStreakIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  bestStreakInfo: {
    flex: 1,
  },
  bestStreakLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '500',
  },
  bestStreakValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
  },

  // Recent readings
  recentCard: {
    borderRadius: RADII.md,
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
