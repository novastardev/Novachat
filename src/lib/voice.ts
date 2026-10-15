/**
 * Client for NovaStack text-to-speech, called through the local proxy
 * (server/index.js) for the same CORS reason as the chat client — see
 * lib/novastack.ts. Starts a generation job, polls until it's done, and
 * returns a playable object URL for the resulting audio.
 */

const PROXY_BASE = 'http://localhost:3001/api/voice';
const DEFAULT_VOICE = 'matthew';
const POLL_INTERVAL_MS = 900;
const POLL_TIMEOUT_MS = 30_000;

export class VoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceError';
  }
}

interface VoiceJobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed' | string;
  audio_url?: string;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reads an error response body and extracts a human-readable message.
 * Handles both { error: "..." } and { error: { message: "..." } } shapes
 * (both are common across OpenAI-compatible and custom APIs), and falls back
 * to the raw body text if it isn't JSON, so nothing is ever silently dropped.
 */
async function readErrorMessage(res: Response): Promise<string> {
  let raw: string;
  try {
    raw = await res.text();
  } catch {
    return res.statusText || `Request failed with status ${res.status}.`;
  }

  try {
    const data = JSON.parse(raw);
    const message = typeof data?.error === 'string' ? data.error : data?.error?.message ?? data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  } catch {
    // Not JSON — fall through to the raw text below.
  }

  return raw.trim() || res.statusText || `Request failed with status ${res.status}.`;
}

/**
 * Generates speech for `text` and resolves to a blob: URL playable in an
 * <audio> element. Caller is responsible for revoking it (URL.revokeObjectURL)
 * once playback is no longer needed.
 */
export async function synthesizeSpeech(
  text: string,
  options: { voice?: string; signal?: AbortSignal } = {},
): Promise<string> {
  let startRes: Response;
  try {
    startRes = await fetch(PROXY_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: options.voice ?? DEFAULT_VOICE, format: 'mp3' }),
      signal: options.signal,
    });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    throw new VoiceError(
      `Could not reach the local voice proxy (${detail}). Make sure \`npm start\` is running inside the server/ folder.`,
    );
  }

  if (!startRes.ok) {
    throw new VoiceError(await readErrorMessage(startRes));
  }

  const { job_id: jobId } = await startRes.json();
  if (typeof jobId !== 'string') {
    throw new VoiceError('Voice API did not return a job id.');
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (true) {
    if (options.signal?.aborted) throw new VoiceError('Cancelled.');
    if (Date.now() > deadline) throw new VoiceError('Voice generation timed out. Please try again.');

    await wait(POLL_INTERVAL_MS);

    const pollRes = await fetch(`${PROXY_BASE}/jobs/${jobId}`, { signal: options.signal });
    const contentType = pollRes.headers.get('content-type') ?? '';

    if (!pollRes.ok) {
      throw new VoiceError(await readErrorMessage(pollRes));
    }

    // Once the job is done, the proxy streams the actual audio bytes with an
    // audio/* content type instead of another JSON status object.
    if (contentType.startsWith('audio/')) {
      const blob = await pollRes.blob();
      return URL.createObjectURL(blob);
    }

    const job: VoiceJobStatus & { error?: string } = await pollRes.json();
    if (job.status === 'failed') {
      throw new VoiceError(job.error ? `Voice generation failed: ${job.error}` : 'Voice generation failed. Please try again.');
    }
    // status is "queued" or "processing" — keep polling.
  }
}
