import { Modal, View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors } from '../constants/theme';
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
        // Hardware back / Esc — treat as Not Now (cancels the pending action).
        resolve(false);
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Use Sarvam AI for Audio & Pronunciation?
          </Text>

          <Text style={[styles.body, { color: colors.textPrimary }]}>
            GitaFlow uses <Text style={styles.bold}>Sarvam AI</Text>, a third-party AI service based in India, to:
          </Text>

          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  Generate spoken Sanskrit audio from verse text (when you tap Listen)
            </Text>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  Transcribe your recorded chanting to score your pronunciation (when you tap Record)
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            What is sent to Sarvam AI
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  The Sanskrit text of the verse you are listening to
            </Text>
            <Text style={[styles.bullet, { color: colors.textPrimary }]}>
              {'\u2022'}  The audio of your voice when you record yourself chanting
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            What is NOT sent
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            No name, no account information, no contacts, no location, no other personal data. GitaFlow does not require an account.
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.saffron }]}>
            Retention
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            Sarvam AI processes your request and returns a result. GitaFlow does not store your recordings, and Sarvam AI's policy is not to retain them after processing.
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Using these features is optional — the daily reading experience works fully offline without them. You can revoke this consent at any time from the Settings screen.
          </Text>

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
              GitaFlow Privacy Policy
            </Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.buttonRow, { borderTopColor: colors.saffronPale }]}>
          <Pressable
            onPress={() => resolve(false)}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              { borderColor: colors.saffron },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Not Now — do not send data to Sarvam AI"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.saffron }]}>
              Not Now
            </Text>
          </Pressable>
          <Pressable
            onPress={() => resolve(true)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.saffron },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Allow GitaFlow to send data to Sarvam AI"
          >
            <Text style={styles.primaryButtonText}>Allow</Text>
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
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  body: {
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * 1.5,
    marginBottom: SPACING.sm,
  },
  bold: {
    fontWeight: '700',
  },
  bulletList: {
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
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
    letterSpacing: 0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  link: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: SPACING.md + 2,
    minHeight: TOUCH_TARGET.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
});
