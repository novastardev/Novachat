import { useCallback, useEffect, useRef } from 'react';

export class RecorderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecorderError';
  }
}

// Chrome/Firefox/Android record webm or ogg; Safari/iOS only record mp4. The first
// type this browser supports wins.
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickMimeType(): string | undefined {
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access was blocked. Allow it in your browser settings and try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone was found on this device.';
  }
  if (name === 'NotReadableError') {
    return 'The microphone is busy or unavailable. Close other apps using it and try again.';
  }
  return 'Could not start recording.';
}

/**
 * Wraps MediaRecorder for the composer's voice button. start() asks for the mic
 * and begins recording; stop() resolves to the recorded audio (or null if nothing
 * was captured); cancel() throws the recording away. The mic is always released
 * afterwards, and on unmount.
 */
export function useVoiceRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      throw new RecorderError('The microphone only works on a secure page (https:// or localhost).');
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new RecorderError('Voice recording is not supported in this browser.');
    }

    // Drop any leftover session before starting a new one.
    release();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      throw new RecorderError(describeMicError(err));
    }

    try {
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      release();
      throw new RecorderError('Could not start recording.');
    }
  }, [release]);

  const pause = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.pause();
  }, []);

  const resume = useCallback(() => {
    if (recorderRef.current?.state === 'paused') recorderRef.current.resume();
  }, []);

  const stop = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder) {
          resolve(null);
          return;
        }

        const finish = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          release();
          resolve(blob.size > 0 ? blob : null);
        };

        if (recorder.state === 'inactive') {
          finish();
          return;
        }
        recorder.onstop = finish;
        recorder.stop();
      }),
    [release],
  );

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    release();
  }, [release]);

  // Release the mic if the composer unmounts mid-recording.
  useEffect(() => cancel, [cancel]);

  return { start, pause, resume, stop, cancel };
}
