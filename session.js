// The proxy only answers requests that carry a session token. To get one, the
// browser passes an invisible Cloudflare Turnstile check, and the proxy verifies
// it with Cloudflare before signing a token valid for 30 minutes.

// Turnstile site keys are public. Development uses Cloudflare's test key, which
// always passes and only works against the proxy's test secret.
const PRODUCTION_SITE_KEY = 'TURNSTILE_SITE_KEY';
const TEST_SITE_KEY = '1x00000000000000000000AA';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
  || (import.meta.env.PROD ? PRODUCTION_SITE_KEY : TEST_SITE_KEY);

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const RENEW_BEFORE_MS = 60 * 1000;

let session = null; // { token, expiresAt }
let pending = null;
let scriptLoad = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoad = scriptLoad || new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => { scriptLoad = null; reject(new Error('Turnstile did not load')); };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

// Runs one check. The widget stays hidden unless Cloudflare needs the visitor to click.
async function turnstileToken() {
  const turnstile = await loadTurnstile();
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.className = 'turnstile-box';
    document.body.appendChild(container);
    const done = (fn) => (value) => { turnstile.remove(widget); container.remove(); fn(value); };
    const widget = turnstile.render(container, {
      sitekey: SITE_KEY,
      appearance: 'interaction-only',
      callback: done(resolve),
      'error-callback': done(() => reject(new Error('Turnstile check failed'))),
      'timeout-callback': done(() => reject(new Error('Turnstile check timed out'))),
    });
  });
}

async function newSession(api) {
  const response = await fetch(`${api}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ turnstile: await turnstileToken() }),
  });
  if (!response.ok) throw new Error(`Session refused with HTTP ${response.status}`);
  const { token, expires_in: expiresIn } = await response.json();
  session = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

// One check at a time: parallel requests share the same pending session.
export function getSessionToken(api, force = false) {
  if (!force && session && session.expiresAt - RENEW_BEFORE_MS > Date.now()) {
    return Promise.resolve(session.token);
  }
  if (!pending) pending = newSession(api).finally(() => { pending = null; });
  return pending;
}
