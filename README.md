# zetra-nextjs-template

A Next.js 15 (App Router) starter with a [Zetra](https://zetra.ai) AI agent built in.

- **Streaming chat UI** on the home page, talking to a secure `/api/chat` route
- **Your secret key stays on the server** — works with private agents
- Resumes a visitor's conversation, recovers from expired ones, Stop button, dark mode, mobile-friendly
- Optional floating **Zetra widget** on every page with one env var

## Quick start

```bash
npx degit zetra-ai/zetra-nextjs-template my-site
cd my-site
cp .env.example .env.local     # add your key and agent id
npm install
npm run dev                    # http://localhost:3000
```

### Try it offline with the mock API

```bash
node ../zetra-api/mock-server/server.mjs   # from the zetra-api repo
# .env.example already points at http://localhost:4010/v1 with the test key
```

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `ZETRA_API_KEY` | server | Secret key (`zk_...`). Never prefix with `NEXT_PUBLIC_`. |
| `ZETRA_AGENT_ID` | server | Agent that `/api/chat` talks to |
| `ZETRA_BASE_URL` | server | Optional. Leave unset for production |
| `NEXT_PUBLIC_ZETRA_WIDGET_AGENT_ID` | client | Optional. Shows the floating widget (agent must be **public**) |
| `NEXT_PUBLIC_ZETRA_WIDGET_SRC` | client | Optional. Widget script URL |

## Make it yours

- Name, copy, welcome message and suggested questions: **`site.config.ts`**
- Colors: CSS variables at the top of **`app/globals.css`** (`--brand`, …)
- Chat UI: **`components/Chat.tsx`**
- Server logic (validation, logging, adding rate limiting/auth): **`app/api/chat/route.ts`**

## How it works

```
Browser ──POST /api/chat──▶ Next.js route ──@zetra/sdk + secret key──▶ Zetra API
        ◀── SSE stream ────                ◀──────── SSE stream ───────
```

The route re-emits Zetra's `start` / `delta` / `done` events, so the client parses them with
`parseSSE` from `@zetra/sdk`. Upstream errors are logged server-side and replaced with a generic message.

> Before going live, add rate limiting to `/api/chat` (e.g. per IP) — it spends your Zetra message quota.

## Deploy

Works on any Node host (Vercel, Render, Railway, a VPS). Set the env vars in your host's dashboard.

## License

MIT
