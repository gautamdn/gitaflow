import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { SPACING, FONT_SIZES, TOUCH_TARGET, getColors, getScaledFontSizes } from '../src/constants/theme';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getSuggestedTopics, findAdvice, getAdviceByTopicId } from '../src/services/gitaAdvice';
import { textToSpeech } from '../src/services/sarvamAI';
import { ensureSarvamConsent } from '../src/utils/sarvamConsent';
import type { GitaAdviceResult } from '../src/services/gitaAdvice';
import type { Shloka } from '../src/types/gita';
import type { ThemeColors } from '../src/constants/theme';

function AudioChip({
  shloka,
  colors,
}: {
  shloka: Shloka;
  colors: ThemeColors;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const handlePlay = useCallback(async () => {
    if (isPlaying && soundRef.current) {
      setIsPlaying(false);
      const s = soundRef.current;
      soundRef.current = null;
      s.stopAsync().then(() => s.unloadAsync());
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      if (!(await ensureSarvamConsent())) return;

      const audioBase64 = await textToSpeech(shloka.sanskrit);
      const dataUri = `data:audio/wav;base64,${audioBase64}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [shloka.sanskrit, isPlaying, isLoading]);

  return (
    <Pressable
      onPress={handlePlay}
      style={({ pressed }) => [
        styles.listenChip,
        { backgroundColor: colors.saffronPale, borderColor: colors.saffron },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Stop audio' : 'Listen to shloka'}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.saffron} />
      ) : (
        <Text style={{ color: colors.saffron, fontSize: 13 }}>
          {isPlaying ? '\u23F9 Stop' : '\u25B6 Listen'}
        </Text>
      )}
    </Pressable>
  );
}

function ResultShlokaCard({
  shloka,
  colors,
  fonts,
}: {
  shloka: Shloka;
  colors: ThemeColors;
  fonts: ReturnType<typeof getScaledFontSizes>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.shlokaCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.verseLabel, { color: colors.saffron, fontSize: fonts.caption }]}>
        Verse {shloka.chapter}.{shloka.verse}
      </Text>

      <Text
        style={[
          styles.sanskritText,
          { color: colors.sanskritText, fontSize: fonts.sanskrit, lineHeight: fonts.sanskrit * 1.6 },
        ]}
      >
        {shloka.sanskrit}
      </Text>

      <AudioChip shloka={shloka} colors={colors} />

      <Text
        style={[
          styles.transliteration,
          { color: colors.textSecondary, fontSize: fonts.body, lineHeight: fonts.body * 1.5 },
        ]}
      >
        {shloka.transliteration}
      </Text>

      <View style={[styles.divider, { backgroundColor: colors.saffronPale }]} />

      <Text
        style={[
          styles.translation,
          { color: colors.textPrimary, fontSize: fonts.bodyLarge, lineHeight: fonts.bodyLarge * 1.6 },
        ]}
      >
        {shloka.translations.sivananda}
      </Text>

      {shloka.commentary_en && (
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.commentaryToggle}>
          <Text style={[styles.commentaryToggleText, { color: colors.saffron }]}>
            {expanded ? 'Hide Commentary \u25B2' : 'Show Commentary \u25BC'}
          </Text>
        </Pressable>
      )}

      {expanded && shloka.commentary_en && (
        <Text
          style={[
            styles.commentary,
            { color: colors.textSecondary, fontSize: fonts.body, lineHeight: fonts.body * 1.6 },
          ]}
        >
          {shloka.commentary_en}
        </Text>
      )}
    </View>
  );
}

function AdviceResultSection({
  result,
  colors,
  fonts,
}: {
  result: GitaAdviceResult;
  colors: ThemeColors;
  fonts: ReturnType<typeof getScaledFontSizes>;
}) {
  return (
    <View style={styles.resultSection}>
      <Text style={[styles.resultTopic, { color: colors.saffron, fontSize: fonts.subtitle }]}>
        {result.topic}
      </Text>
      <View style={[styles.explanationCard, { backgroundColor: colors.saffronPale }]}>
        <Text style={[styles.explanationText, { color: colors.textPrimary, fontSize: fonts.body, lineHeight: fonts.body * 1.7 }]}>
          {result.explanation}
        </Text>
      </View>
      {result.shlokas.map((shloka) => (
        <ResultShlokaCard key={shloka.id} shloka={shloka} colors={colors} fonts={fonts} />
      ))}
    </View>
  );
}

export default function AskGitaScreen() {
  const router = useRouter();
  const { darkMode, fontSize } = useSettingsStore();
  const colors = getColors(darkMode);
  const fonts = getScaledFontSizes(fontSize);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GitaAdviceResult[] | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const suggestedTopics = getSuggestedTopics();

  const handleSearch = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setResults(null);
    setNoMatch(false);

    // Brief delay so the user sees the loading state
    setTimeout(() => {
      const found = findAdvice(trimmed, 1);
      if (found.length > 0) {
        setResults(found);
        setNoMatch(false);
      } else {
        setResults(null);
        setNoMatch(true);
      }
      setIsSearching(false);
      // Scroll to results
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 400);
  }, []);

  const handleTopicPress = useCallback((topicId: string) => {
    const advice = getAdviceByTopicId(topicId);
    if (advice) {
      setResults([advice]);
      setNoMatch(false);
      // Also set the query to the topic's prompt
      const topic = suggestedTopics.find((t) => t.id === topicId);
      if (topic) setQuery(topic.prompt);
    }
  }, [suggestedTopics]);

  const handleReset = useCallback(() => {
    setQuery('');
    setResults(null);
    setNoMatch(false);
    inputRef.current?.focus();
  }, []);

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
          <Text style={[styles.backArrow, { color: colors.saffron }]}>{'\u2190'}</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ask the Gita</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            What would Krishna advise?
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search input */}
          <View style={[styles.inputCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: fonts.body }]}>
              Describe your situation or question
            </Text>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  fontSize: fonts.body,
                  borderColor: colors.saffronPale,
                },
              ]}
              placeholder="e.g., I am anxious about my exam results..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="search"
              blurOnSubmit
              onSubmitEditing={() => handleSearch(query)}
            />
            <View style={styles.inputActions}>
              {results !== null && (
                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => [
                    styles.resetButton,
                    { borderColor: colors.textMuted },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                    Ask Again
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => handleSearch(query)}
                style={({ pressed }) => [
                  styles.searchButton,
                  { backgroundColor: colors.saffron },
                  pressed && { opacity: 0.85 },
                  (!query.trim() || isSearching) && { opacity: 0.5 },
                ]}
                disabled={!query.trim() || isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.searchButtonText}>Find Guidance</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Searching indicator */}
          {isSearching && (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="small" color={colors.saffron} />
              <Text style={[styles.searchingText, { color: colors.textSecondary, fontSize: fonts.body }]}>
                Finding relevant verses...
              </Text>
            </View>
          )}

          {/* Results */}
          {results && results.map((result, i) => (
            <AdviceResultSection key={i} result={result} colors={colors} fonts={fonts} />
          ))}

          {/* No match */}
          {noMatch && (
            <View style={[styles.noMatchCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.noMatchText, { color: colors.textPrimary, fontSize: fonts.bodyLarge }]}>
                Could not find a specific match for your question.
              </Text>
              <Text style={[styles.noMatchHint, { color: colors.textSecondary, fontSize: fonts.body }]}>
                Try using different words, or pick from the suggested topics below.
              </Text>
            </View>
          )}

          {/* Suggested topics — show when no results */}
          {!results && (
            <View style={styles.suggestedSection}>
              <Text style={[styles.suggestedTitle, { color: colors.textPrimary, fontSize: fonts.bodyLarge }]}>
                Or choose a topic
              </Text>
              {suggestedTopics.map((topic) => (
                <Pressable
                  key={topic.id}
                  onPress={() => handleTopicPress(topic.id)}
                  style={({ pressed }) => [
                    styles.topicChip,
                    { backgroundColor: colors.surface, borderColor: colors.saffron },
                    pressed && { backgroundColor: colors.saffronPale },
                  ]}
                >
                  <Text style={[styles.topicLabel, { color: colors.saffron, fontSize: fonts.body }]}>
                    {topic.label}
                  </Text>
                  <Text
                    style={[styles.topicPrompt, { color: colors.textSecondary, fontSize: fonts.caption }]}
                    numberOfLines={1}
                  >
                    {topic.prompt}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  headerText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  inputCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    marginBottom: SPACING.sm,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    minHeight: 80,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  searchButton: {
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    minHeight: TOUCH_TARGET.minHeight - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
  },
  resetButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    minHeight: TOUCH_TARGET.minHeight - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  resultSection: {
    marginTop: SPACING.xl,
  },
  resultTopic: {
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  explanationCard: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  explanationText: {
    fontStyle: 'italic',
  },
  shlokaCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  verseLabel: {
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  sanskritText: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  listenChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  transliteration: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  translation: {},
  commentaryToggle: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  commentaryToggleText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  commentary: {
    marginTop: SPACING.md,
  },
  noMatchCard: {
    borderRadius: 16,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  noMatchText: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  noMatchHint: {
    textAlign: 'center',
  },
  suggestedSection: {
    marginTop: SPACING.xl,
  },
  suggestedTitle: {
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  topicChip: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  topicLabel: {
    fontWeight: '600',
  },
  topicPrompt: {
    marginTop: 2,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  searchingText: {
    fontWeight: '500',
  },
});
