/**
 * Client for flip-ia.vercel.app's chat completions API, called through a local
 * proxy (server/index.js) instead of directly, since flip-ia.vercel.app does not
 * send CORS headers that allow browser requests. Run `npm start` inside server/
 * alongside `npm run dev` for this to work. See server/README.md.
 */

export const PROXY_BASE = (import.meta.env.VITE_PROXY_URL || 'http://localhost:3001').replace(/\\/+$/, '');
const PROXY_URL = `${PROXY_BASE}/api/chat`;

/** Standard model for normal replies. */
export const MODEL_STANDARD = 'novastack-1.0';
/** Used instead of the standard model when the user turns on "Think harder". */
export const MODEL_THINKING = 'novastack-1.0-thinking';

export interface NovaStackMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Sent as the first message on every request. Tells the model which markdown the chat UI
 * can render, so it formats replies in ways the app actually displays (tables, footnotes,
 * math, code with language tags, task lists) instead of guessing.
 */
export const SYSTEM_PROMPT = `You are Nova. Format replies in GitHub-Flavored Markdown; the chat UI
renders it fully, so use markdown instead of describing formatting in words.

Supported:
- Headings (#...######), paragraphs, blockquotes (>), horizontal rules (---)
- Bold **b**, italic *i*, bold italic ***bi***, strikethrough ~~s~~, inline \`code\`
- Links [label](url) and images ![alt](url)
- Bulleted (-), numbered (1.) and nested lists; task lists - [ ] / - [x]
- Fenced code blocks with a language tag, e.g. \`\`\`js ... \`\`\` — always include the language
- Tables with a header row and a --- separator row; use :---, :---:, ---: to align columns
- Inline math as $x^2$ and block math as $$ ... $$ (LaTeX via KaTeX)
- Footnotes: a marker like [^1] in the text and a matching [^1]: definition later
- Mermaid diagrams in a \`\`\`mermaid code block for flows, sequences or relationships
- A small set of raw HTML when useful: <sub>, <sup>, <kbd>, <br>, and <details><summary>...</summary>...</details> for optional/expandable content

Guidelines:
- Prefer the most specific element for the content: a real table for tabular data, a real
  list for steps or options, a real code block (with language) for code — not plain text
  pretending to be one of these.
- Use headings to organize long replies, but do not start a reply with a heading that just
  repeats the question.
- Keep replies as short as the question allows; do not pad with unnecessary formatting.`;

export class NovaStackError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NovaStackError';
    this.status = status;
  }
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message || data?.message || data?.error || JSON.stringify(data);
  } catch {
    try {
      return await res.text();
    } catch {
      return res.statusText;
    }
  }
}

/**
 * Sends a chat completion request and returns the full reply text.
 * Pass `thinkHarder: true` (from the composer's "Think harder" toggle) to use the
 * reasoning model; otherwise the standard model is used.
 */
export interface ChatReply {
  text: string;
  /** Reasoning/thinking content, when the thinking model returns it. */
  reasoning?: string;
}

export async function sendChatMessage(
  messages: NovaStackMessage[],
  options: { thinkHarder?: boolean; signal?: AbortSignal } = {},
): Promise<ChatReply> {
  const model = options.thinkHarder ? MODEL_THINKING : MODEL_STANDARD;

  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ model, messages }),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof NovaStackError) throw err;
    // Surface the real browser error (offline, mixed content, etc.) instead of hiding it,
    // so it can be read without dev tools.
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    throw new NovaStackError(
      `Could not reach the NovaStack proxy (${detail}). Make sure the Nova Chat server is running and VITE_PROXY_URL points to it.`,
    );
  }

  if (!res.ok) {
    throw new NovaStackError(await parseErrorBody(res), res.status);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  const text = message?.content;
  if (typeof text !== 'string') {
    throw new NovaStackError('The chat API returned an unexpected response shape.');
  }
  // Thinking models may return their reasoning in either supported field.
  const reasoning = message?.reasoning_content ?? message?.reasoning;
  return {
    text: text.replace(/^\s+/, ''),
    reasoning: typeof reasoning === 'string' && reasoning.trim() ? reasoning.trim() : undefined,
  };
}


/** Starts the server-side OAuth authorization-code + PKCE flow. */
export function connectNovaStack(): void {
  window.location.assign(`${PROXY_BASE}/api/oauth/start`);
}

/** Removes the server's HttpOnly OAuth token cookies. */
export async function disconnectNovaStack(): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/api/oauth/disconnect`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new NovaStackError('Could not disconnect NovaStack.', response.status);
}
