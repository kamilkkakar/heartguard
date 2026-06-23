/**
 * HeartGuard API proxy (Cloudflare Worker)
 * --------------------------------------------------------------
 * The browser app calls THIS worker instead of Google directly.
 * The Gemini API key lives only here, as a server-side secret
 * (set with: `npx wrangler secret put GEMINI_API_KEY`), so it is
 * never shipped to or visible in the browser.
 *
 * It transparently forwards POST requests of the form
 *   /v1beta/models/<model>:<generateContent|predict>
 * to https://generativelanguage.googleapis.com, injecting the key.
 */

// Only these models may be proxied (prevents your key being used for anything else).
const ALLOWED_MODELS = [
  "gemini-2.5-flash",        // text + vision
  "gemini-2.5-flash-image",  // image generation
];

// CORS. For tighter security, replace "*" with your GitHub Pages origin,
// e.g. "https://kamilkkakar.github.io".
const ALLOWED_ORIGIN = "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return json({ error: "Only POST is supported." }, 405);
    }

    const url = new URL(request.url);
    const match = url.pathname.match(
      /^\/v1beta\/models\/([^:]+):(generateContent|predict)$/
    );
    if (!match) {
      return json({ error: "Unsupported path." }, 404);
    }

    const model = match[1];
    if (!ALLOWED_MODELS.includes(model)) {
      return json({ error: `Model not allowed: ${model}` }, 403);
    }

    if (!env.GEMINI_API_KEY) {
      return json(
        { error: "Server is missing GEMINI_API_KEY. Run: wrangler secret put GEMINI_API_KEY" },
        500
      );
    }

    const googleUrl =
      `https://generativelanguage.googleapis.com${url.pathname}` +
      `?key=${env.GEMINI_API_KEY}`;

    let upstream;
    try {
      upstream = await fetch(googleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
      });
    } catch (err) {
      return json({ error: "Upstream request failed.", detail: String(err) }, 502);
    }

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  },
};
