# HeartGuard

A single-page web app for tracking cholesterol and stroke-risk: lipid-panel
comparison, a daily adherence tracker, a vitals diary, and AI-assisted food and
recipe tools.

The AI features run through a small **Cloudflare Worker** so the Gemini API key
stays server-side and is never exposed in the browser.

> **Not medical advice.** This is an educational prototype, not a medical device.
> AI output can be inaccurate — always consult a qualified clinician.

**Live demo:** https://kamilkkakar.github.io/heartguard/
*(AI features need the proxy below to be deployed and `API_BASE` set.)*

## How it works

```
Browser (index.html)  ──►  Cloudflare Worker  ──►  Google Gemini API
  no key                   holds GEMINI_API_KEY
```

The static site contains no secrets, so it's safe to host publicly.

## Setup

### 1. Deploy the proxy

Needs a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and a
[Gemini API key](https://aistudio.google.com/apikey).

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY   # paste your key when prompted
npx wrangler deploy                       # prints your worker URL
```

### 2. Point the app at it

In `index.html`, set `API_BASE` (near the top of the `<script>`) to the worker
URL, with no trailing slash:

```js
const API_BASE = "https://heartguard-proxy.your-subdomain.workers.dev";
```

Commit and push — GitHub Pages redeploys automatically.

## Notes

- **Models:** the app uses `gemini-3-flash-preview` and
  `imagen-4.0-generate-001`. Verify these against the current
  [model list](https://ai.google.dev/gemini-api/docs/models); if a name changed,
  update it in both `index.html` and `ALLOWED_MODELS` in `worker/worker.js`.
- **Local testing:** `cd worker && npx wrangler dev`, then set
  `API_BASE = "http://localhost:8787"`.
- **Tighter CORS:** set `ALLOWED_ORIGIN` in `worker/worker.js` to your Pages
  origin instead of `*`, then redeploy.
- **Data:** all user data lives in the browser's `localStorage`. Lab and food
  images are sent to Gemini (via the proxy) for analysis and are not stored by
  this app.
