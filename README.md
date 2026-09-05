# EventView

Private live event watch page. The host opens **Live**, signs in or creates a camera account, and taps **Go live**. Guests open the homepage and only watch. The picture stays on this site.

The filming phone publishes **once** into LiveKit Cloud (an SFU). Guests subscribe from the SFU — not a peer-to-peer mesh — so about **200 concurrent viewers** is the designed load. This website stays on Vercel.

## Two links

| Who | Where | What they do |
|---|---|---|
| Guests | `/` | Watch. No account. No camera. Send a ready-made chat note when live. |
| Host | `/host` | Sign in or [create an account](/register), copy the guest link, tap Go live |

## Camera account (register + login)

Hosts use **email and password** on this app's own Better Auth (not a third-party IdP).

1. Open **Live** (or `/register`).
2. Create a camera account: name, email, password (8+ characters). You are signed in immediately and land on Live.
3. Next time, sign in at `/login` with the same email and password.
4. Tap **Go live**. Signed in is enough — the API will not mint a host token without that session.

Google / X only show on Grok sandbox hosts, or when this project has its own `GROK_AUTH_CLIENT_ID`. They are not the path to test on Vercel.

### What was broken

1. **Production origin (old deploys):** `https://yoan-claire-live.vercel.app` rejected email sign-in/sign-up with `403 Invalid origin` because Better Auth only trusted `BETTER_AUTH_URL` / `*.grok-sandbox.com`. Trusted origins now include Vercel, Grok, and the request Origin when it is this app.
2. **Preview empty HTTP 500 (the remaining blocker):** `POST /api/auth/sign-up/email` on the Vercel preview returned **500 with an empty body**. That is not an origin error. On Vercel, Better Auth was still falling through to embedded **PGLite** when `DATABASE_URL` was missing (or the auth tables were never applied because `db:migrate` skipped at build). PGLite cannot run on Vercel serverless, so sign-up crashed. Sessions signed with a **per-lambda random secret** would also look like “login does not work” on the next request.
3. Google / X buttons on `*.vercel.app` cannot complete OAuth (the baked preview client only allows `*.grok-sandbox.com` callbacks). They are hidden on Vercel unless a real broker client is configured.

Fixes: apply auth migrations at **runtime** when Postgres is configured; never use PGLite on Vercel; return a setup screen + JSON error when `DATABASE_URL` is missing; keep a stable session secret across lambdas.

This preview was **not** behind a Vercel Authentication SSO wall (the login HTML loaded). If a later deploy shows a Vercel login gate instead of EventView, turn that off — see below.

### Env vars required on Vercel (Project → Settings → Environment Variables)

Set these for **Production and Preview**, then **redeploy**. Never put them in the repo.

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` or `POSTGRES_URL` | **Yes** | Postgres (Neon). Without it, Create account cannot work on Vercel. |
| `BETTER_AUTH_SECRET` | **Yes** (strongly) | Signs session cookies. Use a long random string. If omitted, the app derives a stable key from `DATABASE_URL` so lambdas still agree. |
| `BETTER_AUTH_URL` | Optional | Public origin fallback (e.g. `https://yoan-claire-live.vercel.app`) |
| `AUTH_ALLOWED_HOSTS` | Optional | Extra hosts |
| `AUTH_TRUSTED_ORIGINS` | Optional | Extra full origins |
| `GROK_AUTH_*` | Optional | Google/X via the Grok broker — not required for email accounts |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | For Go live | LiveKit Cloud |

`VITE_AUTH_ENABLED` must **not** be `"false"` (this app already leaves it unset so email auth is on).

### Vercel Deployment Protection

If guests or testers see a **Vercel** username/password or SSO page instead of EventView:

1. Vercel project → **Settings** → **Deployment Protection**.
2. For **Production**, set Vercel Authentication to **Disabled** (or Standard Protection off) so anyone with the link can open the site. The app has its own camera-account sign-in for hosts; guests should not need a Vercel login.
3. Preview protection can stay on if you only want GitHub collaborators opening draft URLs — but then the person testing login must be logged into Vercel, which is easy to confuse with app login.

Password Protection / Trusted IPs, if enabled, will also block testers.

### How to confirm accounts work after a deploy

1. Open `/register` on the preview. You should see the form (not a “accounts are not ready” setup card).
2. Create an account → you land on **Live**, signed in.
3. Sign out, open `/login`, sign in with the same email → Live again.
4. If you see the setup card, this Vercel environment has no Postgres URL (`DATABASE_URL` or `POSTGRES_URL`).

## Streamer, on the day

1. Charge the filming phone. Prefer hotspot over venue Wi-Fi. Disable auto-lock.
2. Sign in on Live (or create an account).
3. Copy the guest link and send it.
4. Tap **Go live**. Allow camera and mic. Keep that tab open.
5. If it drops, tap Go live again. Guests stay on the same link.

## Streaming (~200 viewers)

**Architecture: LiveKit Cloud SFU**, not a WebRTC mesh.

- The host publishes one camera/mic track into LiveKit room `eventview-live` (`maxParticipants` ≈ 224). Do not rename this room unless guests and the host are all on the new name.
- Each guest subscribes through LiveKit's SFU. Host uplink does not grow with viewer count.
- Guests use adaptive stream + dynacast; the host publishes simulcast (1080 / 720 / 360).
- New guests are refused with a clear “room is full” state at ~200, then retry as people leave.
- Chat and “can you see clearly?” ride LiveKit data messages in the same room.

This fits Vercel hosting: the site only mints short-lived room tokens (`LIVEKIT_API_KEY` / `SECRET` stay server-side). Media never transits Vercel.

### LiveKit env (server only)

- `LIVEKIT_URL` — `wss://your-project.livekit.cloud`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Host tokens (`POST /api/live` with `role: "host"`) require a verified Better Auth session — the same cookie or `Authorization: Bearer` used after register/login. A password in the JSON body is not enough. Guests still get viewer tokens with no account.

The old client-visible default (`vow` / `VITE_HOST_PASSWORD`) is removed. Do not set `VITE_HOST_PASSWORD`; it is no longer read.

Optional leftover: `HOST_PASSWORD` is server-only, has **no shipped default**, and is **not** a way to go live without signing in. If you set it on Vercel from an earlier deploy, you can delete it. It is ignored for token minting so it cannot bypass sign-in and cannot lock out a signed-in host.

Optional labels: `VITE_EVENT_NAME`, `VITE_EVENT_DATE`, `VITE_KICKER`. Override the product name with `VITE_PRODUCT_NAME` if needed. Preview environments can point at the production token API with `VITE_PRODUCTION_ORIGIN` for **guest** watch tokens only. Host publish must be minted on the deployment that has LiveKit keys **and** a signed-in session.

### Cost / ops (brief)

LiveKit Cloud bills on participant-minutes. A 1-hour event with 1 host + 200 guests is on the order of ~200 participant-hours. Use a LiveKit Cloud project with enough quota for the day; keep API keys only on Vercel. No extra CDN is required at this size. `VITE_PLAYBACK_URL` can still point at unlisted YouTube or HLS if you later want a CDN fallback.

## Optional backup

`VITE_PLAYBACK_URL` can still point at an unlisted YouTube or HLS URL if you later want a CDN instead of in-app live.
