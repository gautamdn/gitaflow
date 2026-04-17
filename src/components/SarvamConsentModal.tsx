import { Modal, View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES, RADII, CARD_SHADOW, COLORS, TOUCH_TARGET, getColors } from '../constants/theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSarvamConsentStore } from '../store/useSarvamConsentStore';

export function SarvamConsentModal() {
  const visible = useSarvamConsentStore((s) => s.visible);
  const resolve = useSarvamConsentStore((s) => s.resolve);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const colors = getColors(darkMode);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        resolve(false);
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Visual anchor */}
          <Text style={[styles.omSymbol, { color: colors.saffron }]}>
            {'\u0950'}
          </Text>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Use Sarvam AI for Audio & Pronunciation?
          </Text>

          <Text style={[styles.body, { color: colors.textPrimary }]}>
            Chantr uses <Text style={styles.bold}>Sarvam AI</Text>, a third-party AI service based in India, to:
          </Text>

          <View style={[styles.card, { backgroundColor: colors.saffronPale }]}>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  Generate spoken Sanskrit audio from verse text (when you tap Listen)
            </Text>
            <Text style={[styles.bullet, { color: colors.textPrimary, marginBottom: 0 }]}>
              {'\u2022'}  Transcribe your recorded chanting to score your pronunciation (when you tap Record)
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            What is sent to Sarvam AI
          </Text>
          <View style={[styles.card, { backgroundColor: colors.saffronPale }]}>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  The Sanskrit text of the verse you are listening to
            </Text>
            <Text style={[styles.bullet, { color: colors.textPrimary, marginBottom: 0 }]}>
              {'\u2022'}  The audio of your voice when you record yourself chanting
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            What is NOT sent
          </Text>
          <View style={[styles.card, { backgroundColor: colors.saffronPale }]}>
            <Text style={[styles.body, { color: colors.textPrimary, marginBottom: 0 }]}>
              No name, no account information, no contacts, no location, no other personal data. Chantr does not require an account.
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            Retention
          </Text>
          <View style={[styles.card, { backgroundColor: colors.saffronPale }]}>
            <Text style={[styles.body, { color: colors.textPrimary, marginBottom: 0 }]}>
              Sarvam AI processes your request and returns a result. Chantr does not store your recordings, and Sarvam AI's policy is not to retain them after processing.
            </Text>
          </View>

          <Text style={[styles.body, { color: colors.textSecondary, marginTop: SPACING.lg }]}>
            Using these features is optional — the daily reading experience works fully offline without them. You can revoke this consent at any time from the Settings screen.
          </Text>

          <View style={styles.linkRow}>
            <Pressable
              onPress={() => Linking.openURL('https://www.sarvam.ai/privacy')}
              accessibilityRole="link"
            >
              <Text style={[styles.link, { color: colors.saffron }]}>
                Sarvam AI Privacy Policy
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://gist.github.com/gautamdn/e69083c28914e5839cdbc19bc6f66575')}
              accessibilityRole="link"
            >
              <Text style={[styles.link, { color: colors.saffron }]}>
                Chantr Privacy Policy
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={[styles.buttonRow, { borderTopColor: colors.saffronPale, backgroundColor: colors.background }]}>
          <Pressable
            onPress={() => resolve(true)}
            style={({ pressed }) => [
              styles.allowButton,
              { backgroundColor: colors.saffron },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Allow Chantr to send data to Sarvam AI"
          >
            <Text style={styles.allowButtonText}>Allow</Text>
          </Pressable>
          <Pressable
            onPress={() => resolve(false)}
            style={({ pressed }) => [
              styles.notNowButton,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Not Now — do not send data to Sarvam AI"
          >
            <Text style={[styles.notNowText, { color: colors.textMuted }]}>
              Not Now
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  omSymbol: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  body: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
    marginBottom: SPACING.sm,
  },
  bold: {
    fontWeight: '700',
  },
  card: {
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bullet: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
    marginBottom: SPACING.xs,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
    flexWrap: 'wrap',
  },
  link: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    ...CARD_SHADOW,
  },
  allowButton: {
    borderRadius: RADII.md,
    paddingVertical: SPACING.md + 4,
    minHeight: TOUCH_TARGET.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  allowButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
  notNowButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
  },
});
