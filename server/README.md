# Local proxy

This server runs three things through one local proxy:

1. **Chat** (`flip-ia.vercel.app`) — no API key needed, proxied purely to get
   around a missing CORS header on their side.
2. **Voice/text-to-speech** (`api-novastack.vercel.app`) — proxied for the
   same CORS reason, AND because it requires an `x-api-key` header that must
   never be exposed in frontend code (anyone could read it from the browser
   and use your NovaStack account). It lives only here, server-side.

3. **Speech-to-text** (`api.assemblyai.com`) — turns recorded voice messages
   into text. Needs `ASSEMBLYAI_API_KEY` in `.env`, kept server-side for the
   same reason as the voice key.

## Setup

```
cd server
npm install
cp .env.example .env
```

Open `.env` and set your real key:

```
NOVASTACK_API_KEY=your_real_key_here
```

`.env` is already in `.gitignore` — it will never be committed or shared.

## Run it

```
npm start
```

You should see:

```
Local proxy running at http://localhost:3001
  POST /api/chat             -> https://flip-ia.vercel.app/{model}/v1/chat/completions
  POST /api/voice            -> https://api-novastack.vercel.app/v1/voice/novastack-voice-1.0
  GET  /api/voice/jobs/:id   -> https://api-novastack.vercel.app/v1/voice/jobs/:id (+ audio once done)
  POST /api/transcribe       -> https://api.assemblyai.com/v2/upload + /v2/transcript
```

If you see a warning about `NOVASTACK_API_KEY` not being set, double-check
`.env` exists in this folder (not the project root) and has the key filled
in, then restart `npm start`.

In another terminal, start the chat app as usual:

```
npm run dev
```

Both need to be running at the same time.

## If you deploy later

On Vercel, this same logic can become serverless functions in your main
project instead of a separate server — the API key would go in Vercel's
Environment Variables settings (same idea: never in frontend code). Ask and
I can set that up when you're ready to deploy.
