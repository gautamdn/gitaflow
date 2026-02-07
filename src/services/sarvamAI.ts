import AsyncStorage from '@react-native-async-storage/async-storage';

const SARVAM_API_BASE = 'https://api.sarvam.ai';
const API_KEY_STORAGE_KEY = 'gitaflow-sarvam-api-key';

// Cache generated audio to avoid redundant API calls
const audioCache = new Map<string, string>();

export async function getSarvamApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(API_KEY_STORAGE_KEY);
}

export async function setSarvamApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export async function clearSarvamApiKey(): Promise<void> {
  await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Generate speech audio from Sanskrit text using Sarvam TTS.
 * Uses hi-IN (Hindi) as the closest supported language for Sanskrit Devanagari text.
 * Returns a base64-encoded WAV audio string.
 */
export async function textToSpeech(
  text: string,
  options?: {
    speaker?: string;
    pace?: number;
    pitch?: number;
    model?: string;
  }
): Promise<string> {
  // Check cache first
  const cacheKey = `${text}_${options?.pace ?? 1.0}_${options?.speaker ?? 'anushka'}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = await getSarvamApiKey();
  if (!apiKey) {
    throw new Error('Sarvam API key not configured. Please add it in Settings.');
  }

  const response = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: 'hi-IN',
      speaker: options?.speaker ?? 'anushka',
      pace: options?.pace ?? 0.85,
      pitch: options?.pitch ?? 0.0,
      model: options?.model ?? 'bulbul:v2',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam TTS failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const audioBase64: string = data.audios?.[0];
  if (!audioBase64) {
    throw new Error('No audio returned from Sarvam TTS');
  }

  // Cache the result
  audioCache.set(cacheKey, audioBase64);
  return audioBase64;
}

/**
 * Transcribe speech audio using Sarvam STT.
 * Accepts a file URI (from expo-av recording).
 * Returns the transcribed text.
 */
export async function speechToText(
  audioFileUri: string,
  options?: {
    language?: string;
    model?: string;
  }
): Promise<{ transcript: string; language_code: string }> {
  const apiKey = await getSarvamApiKey();
  if (!apiKey) {
    throw new Error('Sarvam API key not configured. Please add it in Settings.');
  }

  // Read audio file and create form data
  const formData = new FormData();

  // For React Native, we need to append the file as a blob
  formData.append('file', {
    uri: audioFileUri,
    type: 'audio/wav',
    name: 'recording.wav',
  } as any);
  formData.append('language_code', options?.language ?? 'hi-IN');
  formData.append('model', options?.model ?? 'saarika:v2');

  const response = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam STT failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    transcript: data.transcript ?? '',
    language_code: data.language_code ?? 'unknown',
  };
}

/** Clear the in-memory audio cache */
export function clearAudioCache(): void {
  audioCache.clear();
}
