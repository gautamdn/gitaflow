interface Env {
  RATE_LIMITS: KVNamespace;
  SARVAM_API_KEY: string;
}

const SARVAM_BASE = 'https://api.sarvam.ai';
const TTS_DAILY_LIMIT = 30;
const STT_DAILY_LIMIT = 10;
const COUNTER_TTL = 172800; // 48 hours in seconds

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function midnightUTCISO(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function checkAndIncrement(
  kv: KVNamespace,
  type: 'tts' | 'stt',
  deviceId: string,
  limit: number
): Promise<{ allowed: boolean; count: number }> {
  const key = `${type}:${deviceId}:${todayUTC()}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= limit) {
    return { allowed: false, count };
  }

  // Increment. KV is eventually consistent so this isn't atomic — a
  // determined user could squeeze a few extra requests through. Acceptable
  // for our use case.
  await kv.put(key, String(count + 1), { expirationTtl: COUNTER_TTL });
  return { allowed: true, count: count + 1 };
}

function getDeviceId(request: Request): string | null {
  const id = request.headers.get('X-Device-Id');
  if (!id || !isValidUUID(id)) return null;
  return id;
}

async function handleTTS(request: Request, env: Env): Promise<Response> {
  const deviceId = getDeviceId(request);
  if (!deviceId) {
    return jsonResponse({ error: 'missing_device_id', message: 'X-Device-Id header is required (UUID format).' }, 400);
  }

  const { allowed } = await checkAndIncrement(env.RATE_LIMITS, 'tts', deviceId, TTS_DAILY_LIMIT);
  if (!allowed) {
    return jsonResponse({
      error: 'daily_limit_reached',
      message: 'Daily limit reached (30 listens). Add your own Sarvam AI key in Settings for unlimited access.',
      resets_at: midnightUTCISO(),
    }, 429);
  }

  // Forward to Sarvam
  const body = await request.text();
  const sarvamResponse = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': env.SARVAM_API_KEY,
    },
    body,
  });

  if (!sarvamResponse.ok) {
    return new Response(sarvamResponse.body, {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(sarvamResponse.body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleSTT(request: Request, env: Env): Promise<Response> {
  const deviceId = getDeviceId(request);
  if (!deviceId) {
    return jsonResponse({ error: 'missing_device_id', message: 'X-Device-Id header is required (UUID format).' }, 400);
  }

  const { allowed } = await checkAndIncrement(env.RATE_LIMITS, 'stt', deviceId, STT_DAILY_LIMIT);
  if (!allowed) {
    return jsonResponse({
      error: 'daily_limit_reached',
      message: 'Daily limit reached (10 recordings). Add your own Sarvam AI key in Settings for unlimited access.',
      resets_at: midnightUTCISO(),
    }, 429);
  }

  // Forward multipart body to Sarvam. We stream the request body through
  // without parsing — the Worker passes the raw multipart data and headers.
  const sarvamResponse = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': env.SARVAM_API_KEY,
      'Content-Type': request.headers.get('Content-Type') || 'multipart/form-data',
    },
    body: request.body,
  });

  if (!sarvamResponse.ok) {
    return new Response(sarvamResponse.body, {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(sarvamResponse.body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === '/' && request.method === 'GET') {
      return jsonResponse({ status: 'ok' });
    }

    // TTS
    if (path === '/tts' && request.method === 'POST') {
      return handleTTS(request, env);
    }

    // STT
    if (path === '/stt' && request.method === 'POST') {
      return handleSTT(request, env);
    }

    return jsonResponse({ error: 'not_found', message: 'Unknown endpoint.' }, 404);
  },
} satisfies ExportedHandler<Env>;
