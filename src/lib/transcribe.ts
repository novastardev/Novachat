/**
 * Client for speech-to-text, called through the local proxy (server/index.js)
 * so the AssemblyAI key never reaches the browser. Sends the recorded audio
 * as the raw request body and resolves to the transcript text.
 */

const PROXY_URL = 'http://localhost:3001/api/transcribe';

export class TranscribeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscribeError';
  }
}

/** Extracts a readable message from { error: "..." } / { error: { message } } / plain text. */
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

/** Transcribes a recorded audio blob. Resolves to '' if no speech was detected. */
export async function transcribeAudio(audio: Blob, options: { signal?: AbortSignal } = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': audio.type || 'application/octet-stream' },
      body: audio,
      signal: options.signal,
    });
  } catch (err) {
    if (options.signal?.aborted) throw new TranscribeError('Cancelled.');
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    throw new TranscribeError(
      `Could not reach the local proxy (${detail}). Make sure \`npm start\` is running inside the server/ folder.`,
    );
  }

  if (!res.ok) {
    throw new TranscribeError(await readErrorMessage(res));
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new TranscribeError('The transcription service returned an unexpected response.');
  }

  const text = (data as { text?: unknown } | null)?.text;
  return typeof text === 'string' ? text.trim() : '';
}
