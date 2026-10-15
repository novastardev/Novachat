// Minimal AssemblyAI pre-recorded transcription client: upload the raw audio,
// start a transcript, poll until it finishes, return the text.
// Kept free of Express so it can be tested on its own.

export class TranscriptionError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'TranscriptionError';
    this.status = status;
  }
}

export const DEFAULT_BASE_URL = 'https://api.assemblyai.com';
export const DEFAULT_SPEECH_MODELS = ['universal-3-pro', 'universal-2'];

/** Pulls a readable message out of an AssemblyAI error response (JSON or plain text). */
async function upstreamMessage(res) {
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    return res.statusText || `AssemblyAI request failed with status ${res.status}.`;
  }
  try {
    const data = JSON.parse(raw);
    const message = typeof data?.error === 'string' ? data.error : data?.error?.message ?? data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return raw.trim() || res.statusText || `AssemblyAI request failed with status ${res.status}.`;
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * @param {Buffer} audio  raw audio bytes (webm, mp4, ogg, mp3, wav...)
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} [options.baseUrl]       e.g. https://api.eu.assemblyai.com for EU data residency
 * @param {string[]} [options.speechModels]
 * @param {number} [options.pollIntervalMs]
 * @param {number} [options.timeoutMs]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string>} the transcript text (empty string if no speech was found)
 */
export async function transcribeAudioBuffer(audio, options) {
  const {
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
    speechModels = DEFAULT_SPEECH_MODELS,
    pollIntervalMs = 1000,
    timeoutMs = 90_000,
    signal,
  } = options;

  const call = async (path, init) => {
    let res;
    try {
      res = await fetch(`${baseUrl}${path}`, { ...init, signal });
    } catch (err) {
      if (signal?.aborted) throw new TranscriptionError('Cancelled.', 499);
      console.error(`Could not reach AssemblyAI (${path}):`, err);
      throw new TranscriptionError('Could not reach the speech-to-text service.', 502);
    }
    if (!res.ok) throw new TranscriptionError(await upstreamMessage(res), res.status);
    return res;
  };

  // 1. Upload the raw bytes.
  const uploadRes = await call('/v2/upload', {
    method: 'POST',
    headers: { authorization: apiKey, 'Content-Type': 'application/octet-stream' },
    body: audio,
  });
  const { upload_url: uploadUrl } = await uploadRes.json();
  if (typeof uploadUrl !== 'string') {
    throw new TranscriptionError('Speech-to-text service did not return an upload URL.');
  }

  // 2. Start the transcript.
  const startRes = await call('/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: uploadUrl, speech_models: speechModels }),
  });
  const { id } = await startRes.json();
  if (typeof id !== 'string') {
    throw new TranscriptionError('Speech-to-text service did not return a transcript id.');
  }

  // 3. Poll until it's done.
  const deadline = Date.now() + timeoutMs;
  while (true) {
    if (signal?.aborted) throw new TranscriptionError('Cancelled.', 499);
    if (Date.now() > deadline) throw new TranscriptionError('Transcription timed out. Please try again.', 504);

    await sleep(pollIntervalMs, signal);
    if (signal?.aborted) throw new TranscriptionError('Cancelled.', 499);

    const pollRes = await call(`/v2/transcript/${id}`, { headers: { authorization: apiKey } });
    const job = await pollRes.json();

    if (job.status === 'completed') return typeof job.text === 'string' ? job.text.trim() : '';
    if (job.status === 'error') {
      throw new TranscriptionError(job.error ? `Transcription failed: ${job.error}` : 'Transcription failed.');
    }
    // "queued" or "processing" — keep polling.
  }
}
