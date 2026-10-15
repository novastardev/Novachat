// Tiny local proxy so the browser never calls third-party APIs directly.
// The browser has no CORS restriction when calling its own origin (this server);
// this server, calling the upstream APIs itself, is a server-to-server request,
// which CORS does not apply to at all. Run with: node server/index.js
//
// The NovaStack API key lives ONLY here (read from .env, never sent to the
// browser, never hardcoded). See server/.env.example.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { TranscriptionError, transcribeAudioBuffer, DEFAULT_BASE_URL, DEFAULT_SPEECH_MODELS } from './assemblyai.js';

const PORT = process.env.PORT || 3001;
const CHAT_TARGET = 'https://flip-ia.vercel.app';
const NOVASTACK_TARGET = 'https://api-novastack.vercel.app';
const NOVASTACK_API_KEY = process.env.NOVASTACK_API_KEY;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
// Optional overrides: EU endpoint (https://api.eu.assemblyai.com) and a comma-separated model list.
const ASSEMBLYAI_BASE_URL = process.env.ASSEMBLYAI_BASE_URL || DEFAULT_BASE_URL;
const ASSEMBLYAI_SPEECH_MODELS = process.env.ASSEMBLYAI_SPEECH_MODELS
  ? process.env.ASSEMBLYAI_SPEECH_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
  : DEFAULT_SPEECH_MODELS;

if (!NOVASTACK_API_KEY) {
  console.warn(
    'Warning: NOVASTACK_API_KEY is not set. Voice requests will fail with 401 until ' +
      'you copy server/.env.example to server/.env and add your key.',
  );
}

if (!ASSEMBLYAI_API_KEY) {
  console.warn(
    'Warning: ASSEMBLYAI_API_KEY is not set. Voice-message transcription will fail until ' +
      'you add it to server/.env (see server/.env.example).',
  );
}

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { model, messages } = req.body ?? {};

  if (typeof model !== 'string' || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Request body needs { model, messages }.' } });
  }

  let upstream;
  try {
    upstream = await fetch(`${CHAT_TARGET}/${model}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages }),
    });
  } catch (err) {
    console.error('Could not reach flip-ia.vercel.app:', err);
    return res.status(502).json({ error: { message: 'Could not reach the upstream chat API.' } });
  }

  const text = await upstream.text();
  res.status(upstream.status);
  res.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
  res.send(text);
});

// Starts a NovaStack text-to-speech job. Returns { job_id } immediately; the
// audio itself is generated asynchronously and fetched via /api/voice/jobs/:id.
app.post('/api/voice', async (req, res) => {
  const { text, voice, format } = req.body ?? {};

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: { message: 'Request body needs a non-empty "text" string.' } });
  }

  if (!NOVASTACK_API_KEY) {
    return res
      .status(500)
      .json({ error: { message: 'Server is missing NOVASTACK_API_KEY. See server/.env.example.' } });
  }

  const params = new URLSearchParams({ voice: voice || 'matthew', format: format || 'mp3' });
  // Debug: confirms the key is actually loaded and being sent, without logging the key
  // itself. Masks all but the first 14 and last 4 characters.
  const masked =
    NOVASTACK_API_KEY.length > 20
      ? `${NOVASTACK_API_KEY.slice(0, 14)}...${NOVASTACK_API_KEY.slice(-4)} (${NOVASTACK_API_KEY.length} chars)`
      : '(key too short, check .env)';
  console.log('[voice] sending x-api-key:', masked);

  let upstream;
  try {
    upstream = await fetch(`${NOVASTACK_TARGET}/v1/voice/novastack-voice-1.0?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': NOVASTACK_API_KEY },
      body: JSON.stringify({ input: text }),
    });
  } catch (err) {
    console.error('Could not reach api-novastack.vercel.app (voice):', err);
    return res.status(502).json({ error: { message: 'Could not reach the voice API.' } });
  }

  const body = await upstream.text();
  console.log('[voice] upstream responded:', upstream.status, body.slice(0, 200));
  res.status(upstream.status);
  res.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
  res.send(body);
});

// Polls a voice generation job's status, and once complete, proxies the actual
// mp3 bytes too (so the browser only ever talks to this server, never the
// third-party audio host directly — keeping this working under CORS as well).
app.get('/api/voice/jobs/:jobId', async (req, res) => {
  if (!NOVASTACK_API_KEY) {
    return res
      .status(500)
      .json({ error: { message: 'Server is missing NOVASTACK_API_KEY. See server/.env.example.' } });
  }

  let statusRes;
  try {
    statusRes = await fetch(`${NOVASTACK_TARGET}/v1/voice/jobs/${req.params.jobId}`, {
      headers: { 'x-api-key': NOVASTACK_API_KEY },
    });
  } catch (err) {
    console.error('Could not reach api-novastack.vercel.app (voice job status):', err);
    return res.status(502).json({ error: { message: 'Could not reach the voice API.' } });
  }

  const statusText = await statusRes.text();
  if (!statusRes.ok) {
    res.status(statusRes.status);
    res.set('Content-Type', statusRes.headers.get('content-type') ?? 'application/json');
    return res.send(statusText);
  }

  let job;
  try {
    job = JSON.parse(statusText);
  } catch {
    return res.status(502).json({ error: { message: 'Voice API returned an unexpected response.' } });
  }

  // Not finished yet (status is e.g. "queued" or "processing") — hand the status straight back.
  if (job.status !== 'completed' || !job.audio_url) {
    res.set('Content-Type', 'application/json');
    return res.send(statusText);
  }

  // Finished — fetch the actual audio file ourselves and stream it back, so the
  // browser never has to request tmpfiles.org (or wherever audio_url points) directly.
  let audioRes;
  try {
    audioRes = await fetch(job.audio_url);
  } catch (err) {
    console.error('Could not download finished audio file:', err);
    return res.status(502).json({ error: { message: 'Could not download the finished audio file.' } });
  }
  if (!audioRes.ok || !audioRes.body) {
    return res.status(502).json({ error: { message: 'Finished audio file could not be downloaded.' } });
  }

  res.status(200);
  res.set('Content-Type', job.content_type || 'audio/mpeg');
  const reader = audioRes.body.getReader();
  const pump = async () => {
    const { done, value } = await reader.read();
    if (done) return res.end();
    res.write(value);
    return pump();
  };
  pump().catch((err) => {
    console.error('Error streaming audio:', err);
    res.end();
  });
});

// Turns a recorded voice message into text. The browser POSTs the raw audio bytes
// (whatever MediaRecorder produced) and gets back { text }. The AssemblyAI key
// stays here, server-side.
app.post('/api/transcribe', express.raw({ type: () => true, limit: '25mb' }), async (req, res) => {
  if (!ASSEMBLYAI_API_KEY) {
    return res
      .status(500)
      .json({ error: { message: 'Server is missing ASSEMBLYAI_API_KEY. See server/.env.example.' } });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: { message: 'Request body must be the recorded audio.' } });
  }

  // Stop polling AssemblyAI if the browser gives up (cancelled, tab closed).
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const text = await transcribeAudioBuffer(req.body, {
      apiKey: ASSEMBLYAI_API_KEY,
      baseUrl: ASSEMBLYAI_BASE_URL,
      speechModels: ASSEMBLYAI_SPEECH_MODELS,
      signal: controller.signal,
    });
    return res.json({ text });
  } catch (err) {
    if (controller.signal.aborted) return undefined;
    if (err instanceof TranscriptionError) {
      return res.status(err.status).json({ error: { message: err.message } });
    }
    console.error('Unexpected transcription error:', err);
    return res.status(500).json({ error: { message: 'Unexpected error while transcribing.' } });
  }
});

// Friendly JSON for an oversized recording instead of Express's default HTML error page.
app.use((err, _req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'That recording is too large. Try a shorter one.' } });
  }
  return next(err);
});

app.listen(PORT, () => {
  console.log(`Local proxy running at http://localhost:${PORT}`);
  console.log(`  POST /api/chat             -> ${CHAT_TARGET}/{model}/v1/chat/completions`);
  console.log(`  POST /api/voice            -> ${NOVASTACK_TARGET}/v1/voice/novastack-voice-1.0`);
  console.log(`  GET  /api/voice/jobs/:id   -> ${NOVASTACK_TARGET}/v1/voice/jobs/:id (+ audio once done)`);
  console.log(`  POST /api/transcribe       -> ${ASSEMBLYAI_BASE_URL}/v2/upload + /v2/transcript`);
});
