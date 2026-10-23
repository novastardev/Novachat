# Local proxy

This server runs Nova Chat's protected AI requests through a local proxy:

1. **Chat** (`api-novastack.vercel.app/v1/chat/completions`) — uses a NovaStack OAuth access token with the `ai:tokens:use` scope. The browser never receives the OAuth client secret or access token; the proxy stores tokens in HttpOnly cookies and forwards the access token as a Bearer token. Authorization uses the OAuth authorization-code flow with PKCE.
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
NOVASTACK_OAUTH_CLIENT_ID=your_registered_client_id
NOVASTACK_OAUTH_CLIENT_SECRET=your_registered_client_secret
NOVASTACK_OAUTH_ISSUER=https://api-novastack.vercel.app/api/auth
NOVACHAT_PUBLIC_URL=http://localhost:3001
NOVACHAT_FRONTEND_URL=http://localhost:5173

# Optional: voice/TTS only
NOVASTACK_API_KEY=your_voice_api_key
```

`.env` is already in `.gitignore` — it will never be committed or shared.

## Run it

```
npm start
```

You should see:

```
Local proxy running at http://localhost:3001
  GET  /api/oauth/start      -> NovaStack OAuth authorization
  POST /api/chat             -> https://api-novastack.vercel.app/v1/chat/completions (OAuth Bearer)
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
