import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getAllChapters, getReadingsByChapter } from '../src/services/gitaData';
import type { Chapter, DailyReading } from '../src/types/gita';
import type { ThemeColors } from '../src/constants/theme';

function ReadingRow({
  reading,
  isComplete,
  onPress,
  colors,
}: {
  reading: DailyReading;
  isComplete: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.readingRow,
        { borderBottomColor: colors.saffronPale },
        pressed && { backgroundColor: colors.saffronPale },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Day ${reading.day}, verses ${reading.shloka_range}`}
    >
      <View style={styles.readingRowLeft}>
        <Text style={[styles.readingDay, { color: colors.textPrimary }]}>
          Day {reading.day}
        </Text>
        <Text style={[styles.readingRange, { color: colors.textMuted }]}>
          {reading.shloka_range}
        </Text>
      </View>
      <Text style={[styles.readingCheck, { color: colors.saffron }]}>
        {isComplete ? '\u2713' : '\u203A'}
      </Text>
    </Pressable>
  );
}

function ChapterCard({
  chapter,
  completedCount,
  totalReadings,
  readings,
  completedReadings,
  onReadingPress,
  colors,
}: {
  chapter: Chapter;
  completedCount: number;
  totalReadings: number;
  readings: DailyReading[];
  completedReadings: number[];
  onReadingPress: (day: number) => void;
  colors: ThemeColors;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.chapterCard, { backgroundColor: colors.surface }]}>
      <Pressable
        style={({ pressed }) => [
          styles.chapterHeader,
          pressed && { backgroundColor: colors.saffronPale },
        ]}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`Chapter ${chapter.chapter_number}, ${chapter.name_english}`}
      >
        <View style={[styles.chapterNumberBadge, { backgroundColor: colors.saffronPale }]}>
          <Text style={[styles.chapterNumberText, { color: colors.saffron }]}>
            {chapter.chapter_number}
          </Text>
        </View>
        <View style={styles.chapterInfo}>
          <Text style={[styles.chapterName, { color: colors.textPrimary }]}>
            {chapter.name_english ?? chapter.name_sanskrit}
          </Text>
          {chapter.meaning_en && (
            <Text style={[styles.chapterMeaning, { color: colors.textSecondary }]}>
              {chapter.meaning_en}
            </Text>
          )}
          <Text style={[styles.chapterMeta, { color: colors.textMuted }]}>
            {chapter.verses_count} verses{' '}
            {completedCount > 0 && `\u00B7 ${completedCount}/${totalReadings} done`}
          </Text>
        </View>
        <Text style={[styles.expandArrow, { color: colors.textMuted }]}>
          {expanded ? '\u25B2' : '\u25BC'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={[styles.readingsList, { borderTopColor: colors.saffronPale }]}>
          {readings.map((reading) => (
            <ReadingRow
              key={reading.day}
              reading={reading}
              isComplete={completedReadings.includes(reading.day)}
              onPress={() => onReadingPress(reading.day)}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function BrowseScreen() {
  const router = useRouter();
  const { completed_readings } = useProgressStore();
  const { darkMode } = useSettingsStore();
  const colors = getColors(darkMode);
  const chapters = getAllChapters();

  const handleReadingPress = (day: number) => {
    router.push(`/reading?day=${day}`);
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Browse Chapters
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {chapters.map((chapter) => {
          const readings = getReadingsByChapter(chapter.chapter_number);
          const completedCount = readings.filter((r) =>
            completed_readings.includes(r.day)
          ).length;

          return (
            <ChapterCard
              key={chapter.chapter_number}
              chapter={chapter}
              completedCount={completedCount}
              totalReadings={readings.length}
              readings={readings}
              completedReadings={completed_readings}
              onReadingPress={handleReadingPress}
              colors={colors}
            />
          );
        })}
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
  chapterCard: {
    borderRadius: 16,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    minHeight: TOUCH_TARGET.minHeight,
  },
  chapterNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  chapterNumberText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  chapterMeaning: {
    fontSize: FONT_SIZES.caption,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  chapterMeta: {
    fontSize: FONT_SIZES.caption,
  },
  expandArrow: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
  readingsList: {
    borderTopWidth: 1,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: TOUCH_TARGET.minHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  readingRowLeft: {
    flex: 1,
  },
  readingDay: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  readingRange: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
  },
  readingCheck: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.md,
  },
});
