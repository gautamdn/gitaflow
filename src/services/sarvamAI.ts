import * as SecureStore from 'expo-secure-store';

const SARVAM_API_BASE = 'https://api.sarvam.ai';
const PROXY_BASE = 'https://gitaflow-proxy.gautamdn.workers.dev';
const API_KEY_STORAGE_KEY = 'gitaflow-sarvam-api-key';
const DEVICE_ID_KEY = 'gitaflow-device-id';

const audioCache = new Map<string, string>();

async function getDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function getSarvamApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
}

export async function setSarvamApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
}

export async function clearSarvamApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
}

export async function textToSpeech(
  text: string,
  options?: {
    speaker?: string;
    pace?: number;
    pitch?: number;
    model?: string;
  }
): Promise<string> {
  const cacheKey = `${text}_${options?.pace ?? 1.0}_${options?.speaker ?? 'anushka'}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = await getSarvamApiKey();
  const ttsBody = JSON.stringify({
    inputs: [text],
    target_language_code: 'hi-IN',
    speaker: options?.speaker ?? 'anushka',
    pace: options?.pace ?? 0.85,
    pitch: options?.pitch ?? 0.0,
    model: options?.model ?? 'bulbul:v2',
  });

  let response: Response;

  if (apiKey) {
    response = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: ttsBody,
    });
  } else {
    const deviceId = await getDeviceId();
    response = await fetch(`${PROXY_BASE}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: ttsBody,
    });
  }

  if (response.status === 429) {
    throw new Error('Daily limit reached. Add your own Sarvam AI key in Settings for unlimited access.');
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam TTS failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const audioBase64: string = data.audios?.[0];
  if (!audioBase64) {
    throw new Error('No audio returned from Sarvam TTS');
  }

  audioCache.set(cacheKey, audioBase64);
  return audioBase64;
}

export async function speechToText(
  audioFileUri: string,
  options?: {
    language?: string;
    model?: string;
  }
): Promise<{ transcript: string; language_code: string }> {
  const apiKey = await getSarvamApiKey();

  const formData = new FormData();
  formData.append('file', {
    uri: audioFileUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('language_code', options?.language ?? 'hi-IN');
  formData.append('model', options?.model ?? 'saarika:v2.5');

  let response: Response;

  if (apiKey) {
    response = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: formData,
    });
  } else {
    const deviceId = await getDeviceId();
    response = await fetch(`${PROXY_BASE}/stt`, {
      method: 'POST',
      headers: {
        'X-Device-Id': deviceId,
      },
      body: formData,
    });
  }

  if (response.status === 429) {
    throw new Error('Daily limit reached. Add your own Sarvam AI key in Settings for unlimited access.');
  }
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

export function clearAudioCache(): void {
  audioCache.clear();
}
