const API_BASE = (import.meta.env.VITE_NOVASTACK_API_URL || 'https://api-novastack.vercel.app').replace(/\/$/, '');
const OAUTH_HANDOFF_BASE = (import.meta.env.VITE_NOVACHAT_SERVER_URL || '').replace(/\/$/, '');
const CLIENT_ID = import.meta.env.VITE_NOVASTACK_OAUTH_CLIENT_ID || '';
const CALLBACK_PATH = '/oauth/callback';

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

export function getNovaStackCallbackUrl(): string {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

export async function beginNovaStackLogin(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('NovaStack OAuth is not configured. Set VITE_NOVASTACK_OAUTH_CLIENT_ID in your environment.');
  }

  const state = base64Url(crypto.getRandomValues(new Uint8Array(24)));
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = base64Url(new Uint8Array(await sha256(verifier)));

  sessionStorage.setItem('novastack_oauth_state', state);
  sessionStorage.setItem('novastack_oauth_verifier', verifier);

  const url = new URL(`${API_BASE}/api/auth/oauth2/authorize`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', getNovaStackCallbackUrl());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (!OAUTH_HANDOFF_BASE) {
    throw new Error('NovaChat OAuth server is not configured. Set VITE_NOVACHAT_SERVER_URL in Vercel.');
  }

  const handoffUrl = new URL(`${OAUTH_HANDOFF_BASE}/api/oauth/authorize`);
  url.searchParams.forEach((value, key) => handoffUrl.searchParams.set(key, value));
  // Browser navigates to our server; it performs the cross-origin fetch and issues a real 302.
  window.location.assign(handoffUrl.toString());
}

export async function finishNovaStackLogin(): Promise<{ name?: string; email?: string }> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const expectedState = sessionStorage.getItem('novastack_oauth_state');
  const verifier = sessionStorage.getItem('novastack_oauth_verifier');
  const oauthError = params.get('error_description') || params.get('error');

  if (oauthError) throw new Error(oauthError);
  if (!code) throw new Error('NovaStack did not return an authorization code.');
  if (!expectedState || returnedState !== expectedState) throw new Error('OAuth state check failed. Please sign in again.');
  if (!verifier) throw new Error('The sign-in session expired. Please sign in again.');

  sessionStorage.removeItem('novastack_oauth_state');
  sessionStorage.removeItem('novastack_oauth_verifier');

  const tokenResponse = await fetch(`${OAUTH_HANDOFF_BASE}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getNovaStackCallbackUrl(),
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokens.access_token) {
    throw new Error(tokens.error_description || tokens.message || 'NovaStack token exchange failed.');
  }

  sessionStorage.setItem('novastack_access_token', tokens.access_token);
  if (tokens.refresh_token) sessionStorage.setItem('novastack_refresh_token', tokens.refresh_token);

  const userResponse = await fetch(`${OAUTH_HANDOFF_BASE}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = userResponse.ok ? await userResponse.json().catch(() => ({})) : {};
  window.history.replaceState({}, document.title, CALLBACK_PATH);
  return user;
}

export function getNovaStackAccessToken(): string | null {
  return sessionStorage.getItem('novastack_access_token');
}
