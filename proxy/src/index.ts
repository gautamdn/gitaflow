interface Env {
  RATE_LIMITS: KVNamespace;
  SARVAM_API_KEY: string;
}

const SARVAM_BASE = 'https://api.sarvam.ai';
const TTS_DAILY_LIMIT = 30;
const STT_DAILY_LIMIT = 10;
const KV_TTL = 172800; // 48 hours

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextUtcMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

function getDeviceId(request: Request): string | null {
  const id = request.headers.get('X-Device-Id');
  if (!id || !UUID_RE.test(id)) return null;
  return id;
}

async function checkAndIncrementRate(
  kv: KVNamespace,
  type: 'tts' | 'stt',
  deviceId: string,
  limit: number
): Promise<{ allowed: boolean; count: number }> {
  const key = `${type}:${deviceId}:${utcDateString()}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);
  if (current >= limit) {
    return { allowed: false, count: current };
  }
  await kv.put(key, String(current + 1), { expirationTtl: KV_TTL });
  return { allowed: true, count: current + 1 };
}

async function handleTts(request: Request, env: Env): Promise<Response> {
  const deviceId = getDeviceId(request);
  if (!deviceId) {
    return json({ error: 'invalid_device_id', message: 'Missing or invalid X-Device-Id header.' }, 400);
  }

  const rate = await checkAndIncrementRate(env.RATE_LIMITS, 'tts', deviceId, TTS_DAILY_LIMIT);
  if (!rate.allowed) {
    return json({
      error: 'daily_limit_reached',
      message: 'Daily limit reached. Add your own Sarvam AI key in Settings for unlimited access.',
      resets_at: nextUtcMidnight(),
    }, 429);
  }

  const body = await request.text();

  const upstream = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': env.SARVAM_API_KEY,
    },
    body,
  });

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: 502,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', ...corsHeaders() },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', ...corsHeaders() },
  });
}

async function handleStt(request: Request, env: Env): Promise<Response> {
  const deviceId = getDeviceId(request);
  if (!deviceId) {
    return json({ error: 'invalid_device_id', message: 'Missing or invalid X-Device-Id header.' }, 400);
  }

  const rate = await checkAndIncrementRate(env.RATE_LIMITS, 'stt', deviceId, STT_DAILY_LIMIT);
  if (!rate.allowed) {
    return json({
      error: 'daily_limit_reached',
      message: 'Daily limit reached. Add your own Sarvam AI key in Settings for unlimited access.',
      resets_at: nextUtcMidnight(),
    }, 429);
  }

  const contentType = request.headers.get('Content-Type') ?? '';
  const body = await request.arrayBuffer();

  const upstream = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'api-subscription-key': env.SARVAM_API_KEY,
    },
    body,
  });

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: 502,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', ...corsHeaders() },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      return json({ status: 'ok' });
    }

    if (url.pathname === '/tts' && request.method === 'POST') {
      return handleTts(request, env);
    }

    if (url.pathname === '/stt' && request.method === 'POST') {
      return handleStt(request, env);
    }

    return json({ error: 'not_found' }, 404);
  },
};
