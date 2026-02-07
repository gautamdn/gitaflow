import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors } from '../src/constants/theme';
import { useSettingsStore, type FontSizeOption } from '../src/store/useSettingsStore';
import { useProgressStore } from '../src/store/useProgressStore';

function SettingRow({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.saffronPale }]}>
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.textMuted, true: colors.saffronLight }}
        thumbColor={value ? colors.saffron : '#f4f3f4'}
      />
    </View>
  );
}

function FontSizeSelector({
  current,
  onSelect,
  colors,
}: {
  current: FontSizeOption;
  onSelect: (size: FontSizeOption) => void;
  colors: ReturnType<typeof getColors>;
}) {
  const options: { key: FontSizeOption; label: string }[] = [
    { key: 'small', label: 'A' },
    { key: 'medium', label: 'A' },
    { key: 'large', label: 'A' },
  ];

  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.saffronPale }]}>
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
        Font Size
      </Text>
      <View style={styles.fontSizeOptions}>
        {options.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={[
              styles.fontSizeButton,
              {
                backgroundColor:
                  current === opt.key ? colors.saffron : colors.saffronPale,
                borderColor: colors.saffron,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${opt.key} font size`}
          >
            <Text
              style={[
                styles.fontSizeButtonText,
                {
                  fontSize: opt.key === 'small' ? 14 : opt.key === 'large' ? 22 : 18,
                  color: current === opt.key ? '#FFFFFF' : colors.saffron,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    darkMode,
    fontSize,
    showSanskrit,
    showTransliteration,
    showTranslation,
    toggleDarkMode,
    setFontSize,
    toggleShowSanskrit,
    toggleShowTransliteration,
    toggleShowTranslation,
  } = useSettingsStore();
  const { resetProgress } = useProgressStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const colors = getColors(darkMode);

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
          Settings
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Appearance
        </Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            label="Dark Mode"
            value={darkMode}
            onToggle={toggleDarkMode}
            colors={colors}
          />
          <FontSizeSelector
            current={fontSize}
            onSelect={setFontSize}
            colors={colors}
          />
        </View>

        {/* Reading Display */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Reading Display
        </Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            label="Sanskrit (Devanagari)"
            value={showSanskrit}
            onToggle={toggleShowSanskrit}
            colors={colors}
          />
          <SettingRow
            label="Transliteration"
            value={showTransliteration}
            onToggle={toggleShowTransliteration}
            colors={colors}
          />
          <SettingRow
            label="English Translation"
            value={showTranslation}
            onToggle={toggleShowTranslation}
            colors={colors}
          />
        </View>

        {/* Info */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          About
        </Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.saffronPale }]}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Version
            </Text>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>
              1.0.0
            </Text>
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Data Source
            </Text>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>
              Vedic Scriptures API
            </Text>
          </View>
        </View>

        {/* Reset Progress */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Data
        </Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {!showResetConfirm ? (
            <Pressable
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
              onPress={() => setShowResetConfirm(true)}
              accessibilityRole="button"
              accessibilityLabel="Reset all progress"
            >
              <Text style={[styles.settingLabel, { color: '#D32F2F' }]}>
                Reset Progress
              </Text>
            </Pressable>
          ) : (
            <View style={styles.resetConfirm}>
              <Text style={[styles.resetWarning, { color: colors.textPrimary }]}>
                This will reset your streak, completed readings, and current day back to Day 1.
              </Text>
              <View style={styles.resetButtons}>
                <Pressable
                  style={[styles.resetButton, { backgroundColor: colors.saffronPale }]}
                  onPress={() => setShowResetConfirm(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reset"
                >
                  <Text style={[styles.resetButtonText, { color: colors.textPrimary }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.resetButton, { backgroundColor: '#D32F2F' }]}
                  onPress={() => {
                    resetProgress();
                    setShowResetConfirm(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm reset progress"
                >
                  <Text style={[styles.resetButtonText, { color: '#FFFFFF' }]}>
                    Reset
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
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
  sectionTitle: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
    marginLeft: SPACING.xs,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: TOUCH_TARGET.minHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
    flex: 1,
  },
  settingValue: {
    fontSize: FONT_SIZES.body,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  fontSizeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  fontSizeButtonText: {
    fontWeight: '700',
  },
  resetConfirm: {
    padding: SPACING.lg,
  },
  resetWarning: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
    marginBottom: SPACING.md,
  },
  resetButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  resetButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
  },
  resetButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
});
