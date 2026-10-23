import { createHash, randomBytes } from 'node:crypto';

const DEFAULT_ISSUER = 'https://api-novastack.vercel.app/api/auth';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const COOKIE_ACCESS = 'novastack_oauth_access';
const COOKIE_REFRESH = 'novastack_oauth_refresh';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const pendingStates = new Map();

function issuerBase() {
  return (process.env.NOVASTACK_OAUTH_ISSUER || DEFAULT_ISSUER).replace(/\/+$/, '');
}

function frontendUrl() {
  return (process.env.NOVACHAT_FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
}

function callbackUrl() {
  const base = process.env.NOVACHAT_PUBLIC_URL;
  if (!base) throw new Error('NOVACHAT_PUBLIC_URL must be set to the public URL of the OAuth proxy.');
  return `${base.replace(/\/+$/, '')}/api/oauth/callback`;
}

function cookieOptions(maxAge = COOKIE_MAX_AGE) {
  const secure = callbackUrl().startsWith('https://');
  return `Path=/api; HttpOnly; SameSite=${secure ? 'None' : 'Lax'}; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function setTokenCookie(res, name, value, maxAge) {
  const cookie = `${name}=${encodeURIComponent(value)}; ${cookieOptions(maxAge)}`;
  const existing = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', existing ? [...[].concat(existing), cookie] : [cookie]);
}

function clearTokenCookies(res) {
  const secure = (process.env.NOVACHAT_PUBLIC_URL || '').startsWith('https://') ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `${COOKIE_ACCESS}=; Path=/api; HttpOnly; SameSite=${secure ? 'None' : 'Lax'}; Max-Age=0${secure}`,
    `${COOKIE_REFRESH}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  ]);
}

function cookieValue(req, name) {
  const prefix = `${name}=`;
  const part = (req.headers.cookie || '').split(';').map((v) => v.trim()).find((v) => v.startsWith(prefix));
  if (!part) return '';
  try {
    return decodeURIComponent(part.slice(prefix.length));
  } catch {
    return '';
  }
}

function randomUrlToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function configured() {
  return Boolean(process.env.NOVASTACK_OAUTH_CLIENT_ID && process.env.NOVASTACK_OAUTH_CLIENT_SECRET);
}

async function exchangeToken(body) {
  const response = await fetch(`${issuerBase()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: process.env.NOVASTACK_OAUTH_CLIENT_ID,
      client_secret: process.env.NOVASTACK_OAUTH_CLIENT_SECRET,
      ...body,
    }),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('NovaStack OAuth returned an unreadable token response.');
  }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || data.message || `OAuth token exchange failed (${response.status}).`);
  }
  return data;
}

export function registerNovaStackOAuth(app) {
  app.get('/api/oauth/status', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ configured: configured(), connected: Boolean(cookieValue(req, COOKIE_ACCESS)) });
  });

  app.get('/api/oauth/start', (req, res) => {
    if (!configured()) {
      return res.status(503).json({
        error: { message: 'NovaStack OAuth is not configured on the proxy. Set NOVASTACK_OAUTH_CLIENT_ID, NOVASTACK_OAUTH_CLIENT_SECRET, and NOVACHAT_PUBLIC_URL.' },
      });
    }

    let redirectUri;
    try {
      redirectUri = callbackUrl();
    } catch (error) {
      return res.status(503).json({ error: { message: error.message } });
    }

    const state = randomUrlToken();
    const verifier = randomUrlToken(48);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    pendingStates.set(state, { verifier, redirectUri, createdAt: Date.now() });
    // Bound temporary state storage and expire old entries.
    for (const [key, value] of pendingStates) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) pendingStates.delete(key);
    }

    const url = new URL(`${issuerBase()}/oauth2/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', process.env.NOVASTACK_OAUTH_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'ai:tokens:use');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return res.redirect(302, url.toString());
  });

  app.get('/api/oauth/callback', async (req, res) => {
    const { code, state, error, error_description: errorDescription } = req.query;
    if (error) {
      return res.status(400).send(`NovaStack authorization failed: ${String(errorDescription || error)}`);
    }
    const pending = typeof state === 'string' ? pendingStates.get(state) : undefined;
    if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000 || typeof code !== 'string') {
      return res.status(400).send('OAuth state is invalid or expired. Return to Nova Chat and connect again.');
    }
    pendingStates.delete(state);

    try {
      const token = await exchangeToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: pending.redirectUri,
        code_verifier: pending.verifier,
      });
      const accessAge = Number.isFinite(Number(token.expires_in)) ? Number(token.expires_in) : 3600;
      setTokenCookie(res, COOKIE_ACCESS, token.access_token, Math.max(0, accessAge));
      if (typeof token.refresh_token === 'string' && token.refresh_token) {
        setTokenCookie(res, COOKIE_REFRESH, token.refresh_token, COOKIE_MAX_AGE);
      }
      return res.redirect(302, frontendUrl());
    } catch (err) {
      console.error('[oauth] NovaStack code exchange failed:', err instanceof Error ? err.message : err);
      return res.status(502).send('Could not complete NovaStack OAuth. Check the OAuth client redirect URI and AI Tokens scope, then try again.');
    }
  });

  app.post('/api/oauth/disconnect', (_req, res) => {
    clearTokenCookies(res);
    res.json({ connected: false });
  });
}

export async function getNovaStackAccessToken(req, res) {
  const accessToken = cookieValue(req, COOKIE_ACCESS);
  if (accessToken) return accessToken;

  const refreshToken = cookieValue(req, COOKIE_REFRESH);
  if (!refreshToken || !configured()) return '';

  try {
    const token = await exchangeToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
    const accessAge = Number.isFinite(Number(token.expires_in)) ? Number(token.expires_in) : 3600;
    setTokenCookie(res, COOKIE_ACCESS, token.access_token, Math.max(0, accessAge));
    if (typeof token.refresh_token === 'string' && token.refresh_token) {
      setTokenCookie(res, COOKIE_REFRESH, token.refresh_token, COOKIE_MAX_AGE);
    }
    return token.access_token;
  } catch (err) {
    console.error('[oauth] NovaStack refresh failed:', err instanceof Error ? err.message : err);
    clearTokenCookies(res);
    return '';
  }
}
