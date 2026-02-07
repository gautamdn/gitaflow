import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, TOUCH_TARGET } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { getAllChapters, getReadingsByChapter } from '../src/services/gitaData';
import type { Chapter, DailyReading } from '../src/types/gita';

function ReadingRow({
  reading,
  isComplete,
  onPress,
}: {
  reading: DailyReading;
  isComplete: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.readingRow,
        pressed && styles.readingRowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Day ${reading.day}, verses ${reading.shloka_range}`}
    >
      <View style={styles.readingRowLeft}>
        <Text style={styles.readingDay}>Day {reading.day}</Text>
        <Text style={styles.readingRange}>{reading.shloka_range}</Text>
      </View>
      <Text style={styles.readingCheck}>
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
}: {
  chapter: Chapter;
  completedCount: number;
  totalReadings: number;
  readings: DailyReading[];
  completedReadings: number[];
  onReadingPress: (day: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.chapterCard}>
      <Pressable
        style={({ pressed }) => [
          styles.chapterHeader,
          pressed && styles.chapterHeaderPressed,
        ]}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`Chapter ${chapter.chapter_number}, ${chapter.name_english}`}
      >
        <View style={styles.chapterNumberBadge}>
          <Text style={styles.chapterNumberText}>{chapter.chapter_number}</Text>
        </View>
        <View style={styles.chapterInfo}>
          <Text style={styles.chapterName}>
            {chapter.name_english ?? chapter.name_sanskrit}
          </Text>
          {chapter.meaning_en && (
            <Text style={styles.chapterMeaning}>{chapter.meaning_en}</Text>
          )}
          <Text style={styles.chapterMeta}>
            {chapter.verses_count} verses{' '}
            {completedCount > 0 && `\u00B7 ${completedCount}/${totalReadings} done`}
          </Text>
        </View>
        <Text style={styles.expandArrow}>{expanded ? '\u25B2' : '\u25BC'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.readingsList}>
          {readings.map((reading) => (
            <ReadingRow
              key={reading.day}
              reading={reading}
              isComplete={completedReadings.includes(reading.day)}
              onPress={() => onReadingPress(reading.day)}
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
  const chapters = getAllChapters();

  const handleReadingPress = (day: number) => {
    router.push(`/reading?day=${day}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Browse Chapters</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.saffronPale,
  },
  backButton: {
    width: TOUCH_TARGET.minWidth,
    height: TOUCH_TARGET.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.saffron,
  },
  headerTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  chapterCard: {
    backgroundColor: COLORS.surface,
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
  chapterHeaderPressed: {
    backgroundColor: COLORS.saffronPale,
  },
  chapterNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.saffronPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  chapterNumberText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
    color: COLORS.saffron,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  chapterMeaning: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  chapterMeta: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  expandArrow: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  readingsList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.saffronPale,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: TOUCH_TARGET.minHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.saffronPale,
  },
  readingRowPressed: {
    backgroundColor: COLORS.saffronPale,
  },
  readingRowLeft: {
    flex: 1,
  },
  readingDay: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  readingRange: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  readingCheck: {
    fontSize: 18,
    color: COLORS.saffron,
    fontWeight: '600',
    marginLeft: SPACING.md,
  },
});
