// In-house LLM client. The API key lives only in this process (from env) and
// is sent only in the request header to the model endpoint. It is never logged,
// never returned to a caller, and never rendered to a page.
import { env } from './env.mjs';

/** True when the feature is configured. Empty key disables generation. */
export function llmEnabled() {
  return env.ZS_API_KEY.length > 0;
}

/**
 * Call the chat-completions endpoint. Server-controlled messages only; callers
 * never pass raw end-user text straight through (see deepdive.mjs).
 *
 * @param {{role:string,content:string}[]} messages
 * @param {{maxTokens?:number, timeoutMs?:number}} [opts]
 * @returns {Promise<string>} the assistant text
 */
export async function chat(messages, opts = {}) {
  if (!llmEnabled()) throw new Error('llm_disabled');
  const maxTokens = Math.min(Math.max(opts.maxTokens ?? 600, 1), 1024);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? 30_000);
  try {
    const res = await fetch(env.ZS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Key is read from env here and nowhere else.
        'X-API-Key': env.ZS_API_KEY,
      },
      body: JSON.stringify({
        model: env.ZS_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal: ac.signal,
    });
    if (!res.ok) {
      // Deliberately generic: never echo the response body or headers, which
      // could surface auth detail. Status only.
      throw new Error(`llm_http_${res.status}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('llm_empty');
    return text.trim();
  } catch (err) {
    // Normalise to a safe error with no secret material.
    if (err && err.name === 'AbortError') throw new Error('llm_timeout');
    throw new Error(err && err.message ? String(err.message) : 'llm_error');
  } finally {
    clearTimeout(timer);
  }
}
