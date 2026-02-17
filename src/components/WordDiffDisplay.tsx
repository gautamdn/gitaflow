import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SPACING, FONT_SIZES } from '../constants/theme';
import type { WordComparison, WordStatus } from '../services/pronunciationScore';

const STATUS_COLORS: Record<WordStatus, { bg: string; text: string }> = {
  correct: { bg: '#E8F5E9', text: '#2E7D32' },
  partial: { bg: '#FFF3E0', text: '#E65100' },
  wrong: { bg: '#FFEBEE', text: '#C62828' },
  missing: { bg: '#FFEBEE', text: '#C62828' },
  extra: { bg: '#E3F2FD', text: '#1565C0' },
};

const DARK_STATUS_COLORS: Record<WordStatus, { bg: string; text: string }> = {
  correct: { bg: '#1B5E20', text: '#81C784' },
  partial: { bg: '#3E2723', text: '#FFB74D' },
  wrong: { bg: '#3E0000', text: '#EF9A9A' },
  missing: { bg: '#3E0000', text: '#EF9A9A' },
  extra: { bg: '#0D47A1', text: '#64B5F6' },
};

interface WordDiffDisplayProps {
  wordComparisons: WordComparison[];
  darkMode: boolean;
  textMutedColor: string;
  onWordPress?: (word: string) => void;
  playingWord?: string | null;
}

export function WordDiffDisplay({
  wordComparisons,
  darkMode,
  textMutedColor,
  onWordPress,
  playingWord,
}: WordDiffDisplayProps) {
  const palette = darkMode ? DARK_STATUS_COLORS : STATUS_COLORS;
  const mainWords = wordComparisons.filter(wc => wc.status !== 'extra');
  const extraWords = wordComparisons.filter(wc => wc.status === 'extra');
  const hasWeakWords = mainWords.some(wc => wc.status !== 'correct');

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: textMutedColor }]}>
        WORD-BY-WORD{hasWeakWords && onWordPress ? '  \u2022  tap to hear' : ''}
      </Text>
      <View style={styles.chipContainer}>
        {mainWords.map((wc, index) => {
          const colors = palette[wc.status];
          const showActual = wc.status !== 'correct';
          const isTappable = wc.status !== 'correct' && onWordPress;
          const isPlaying = playingWord === wc.expected;

          const chipContent = (
            <>
              <View style={styles.chipHeader}>
                <Text style={[styles.expectedWord, { color: colors.text }]}>
                  {wc.expected}
                </Text>
                {isTappable && (
                  isPlaying ? (
                    <ActivityIndicator size={12} color={colors.text} style={styles.spinner} />
                  ) : (
                    <Text style={[styles.speakerIcon, { color: colors.text }]}>
                      {'\u{1F50A}'}
                    </Text>
                  )
                )}
              </View>
              {showActual && (
                <Text style={[styles.actualWord, { color: textMutedColor }]}>
                  {wc.status === 'missing' ? '(skipped)' : wc.actual}
                </Text>
              )}
            </>
          );

          if (isTappable) {
            return (
              <Pressable
                key={index}
                onPress={() => onWordPress(wc.expected)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: colors.bg },
                  isPlaying && styles.chipPlaying,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Hear pronunciation of ${wc.expected}`}
              >
                {chipContent}
              </Pressable>
            );
          }

          return (
            <View
              key={index}
              style={[styles.chip, { backgroundColor: colors.bg }]}
            >
              {chipContent}
            </View>
          );
        })}
      </View>
      {extraWords.length > 0 && (
        <View style={styles.extraSection}>
          <Text style={[styles.extraLabel, { color: textMutedColor }]}>
            Extra words heard:
          </Text>
          <Text style={[styles.extraWords, { color: palette.extra.text }]}>
            {extraWords.map(wc => wc.actual).join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 48,
  },
  chipPlaying: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expectedWord: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  speakerIcon: {
    fontSize: 10,
  },
  spinner: {
    marginLeft: 2,
  },
  actualWord: {
    fontSize: FONT_SIZES.caption,
    marginTop: 2,
    fontStyle: 'italic',
  },
  extraSection: {
    marginTop: SPACING.sm,
  },
  extraLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  extraWords: {
    fontSize: FONT_SIZES.body,
    fontStyle: 'italic',
  },
});
