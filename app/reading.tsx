import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, TOUCH_TARGET } from '../src/constants/theme';
import { useProgressStore } from '../src/store/useProgressStore';
import { getDailyReading, getShlokasByIds, getChapter } from '../src/services/gitaData';
import type { Shloka } from '../src/types/gita';

function ShlokaCard({ shloka }: { shloka: Shloka }) {
  return (
    <View style={styles.shlokaCard}>
      <Text style={styles.verseNumber}>
        {shloka.chapter}.{shloka.verse}
      </Text>

      {/* Sanskrit — Devanagari */}
      <Text style={styles.sanskritText}>{shloka.sanskrit}</Text>

      {/* Transliteration */}
      <Text style={styles.transliteration}>{shloka.transliteration}</Text>

      <View style={styles.divider} />

      {/* Sivananda translation */}
      <Text style={styles.translation}>{shloka.translations.sivananda}</Text>
    </View>
  );
}

export default function ReadingScreen() {
  const router = useRouter();
  const { current_day, completed_readings, markDayComplete } = useProgressStore();

  const reading = getDailyReading(current_day);
  const chapter = reading ? getChapter(reading.chapter) : undefined;
  const shlokas = reading ? getShlokasByIds(reading.shloka_ids) : [];
  const isComplete = completed_readings.includes(current_day);

  const handleMarkComplete = () => {
    markDayComplete(current_day);
    router.back();
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
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Day {current_day}</Text>
          {chapter && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Chapter {chapter.chapter_number}:{' '}
              {chapter.name_english ?? chapter.name_sanskrit}
            </Text>
          )}
        </View>
      </View>

      {/* Shlokas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {shlokas.map((shloka) => (
          <ShlokaCard key={shloka.id} shloka={shloka} />
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.completeButton,
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
  headerText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  shlokaCard: {
    backgroundColor: COLORS.surface,
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
    fontSize: FONT_SIZES.caption,
    color: COLORS.saffron,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  sanskritText: {
    fontSize: FONT_SIZES.sanskrit,
    color: COLORS.sanskritText,
    textAlign: 'center',
    lineHeight: FONT_SIZES.sanskrit * 1.6,
    marginBottom: SPACING.md,
  },
  transliteration: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: FONT_SIZES.body * 1.5,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.saffronPale,
    marginVertical: SPACING.md,
  },
  translation: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.bodyLarge * 1.6,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.saffronPale,
    backgroundColor: COLORS.background,
  },
  completeButton: {
    backgroundColor: COLORS.saffron,
    borderRadius: 16,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
  },
  completeButtonPressed: {
    backgroundColor: COLORS.saffronLight,
    transform: [{ scale: 0.98 }],
  },
  completeButtonDone: {
    backgroundColor: COLORS.success,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
  completeButtonTextDone: {
    fontWeight: '600',
  },
});
