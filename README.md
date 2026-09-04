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
2. Create a camera account: name, email, password (8+ characters). You are signed in immediately.
3. Next time, sign in at `/login`.
4. Google / X remain available when the Grok auth broker is configured for this deployment. They are optional. Email is the path that must work on production.

### What was broken

Production at `https://yoan-claire-live.vercel.app` rejected email sign-in and sign-up with `403 Invalid origin`. Better Auth only trusted `BETTER_AUTH_URL` (often a `*.grok.me` URL) or `*.grok-sandbox.com`, so the Vercel origin was not on the allowlist. OAuth init could 500 for the same host mismatch. Trusted origins now include `*.vercel.app`, `*.grok.me`, preview hosts, and `VERCEL_URL`.

### Env (server only — never `VITE_` for secrets)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres for accounts and sessions |
| `BETTER_AUTH_SECRET` | Signs local sessions |
| `BETTER_AUTH_URL` | Optional public origin fallback |
| `AUTH_ALLOWED_HOSTS` | Optional extra hosts (`example.com,www.example.com`) |
| `AUTH_TRUSTED_ORIGINS` | Optional extra full origins |
| `GROK_AUTH_*` | Optional Google/X via the Grok broker |

Never commit secrets. Set them on the Vercel project.

## Streamer, on the day

1. Charge the filming phone. Prefer hotspot over venue Wi-Fi. Disable auto-lock.
2. Sign in on Live (or create an account).
3. Copy the guest link and send it.
4. Tap **Go live**. Allow camera and mic. Keep that tab open.
5. If it drops, tap Go live again. Guests stay on the same link.

## Streaming (~200 viewers)

**Architecture: LiveKit Cloud SFU**, not a WebRTC mesh.

- The host publishes one camera/mic track into a LiveKit room (`maxParticipants` ≈ 224).
- Each guest subscribes through LiveKit's SFU. Host uplink does not grow with viewer count.
- Guests use adaptive stream + dynacast; the host publishes simulcast (1080 / 720 / 360).
- New guests are refused with a clear “room is full” state at ~200, then retry as people leave.
- Chat and “can you see clearly?” ride LiveKit data messages in the same room.

This fits Vercel hosting: the site only mints short-lived room tokens (`LIVEKIT_API_KEY` / `SECRET` stay server-side). Media never transits Vercel.

### LiveKit env (server only)

- `LIVEKIT_URL` — `wss://your-project.livekit.cloud`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- Optional: `HOST_PASSWORD` — fallback host gate if you want a secret that is not in the page

Optional labels: `VITE_EVENT_NAME`, `VITE_EVENT_DATE`, `VITE_KICKER`, `VITE_PRODUCT_NAME`.

### Cost / ops (brief)

LiveKit Cloud bills on participant-minutes. A 1-hour event with 1 host + 200 guests is on the order of ~200 participant-hours. Use a LiveKit Cloud project with enough quota for the day; keep API keys only on Vercel. No extra CDN is required at this size. `VITE_PLAYBACK_URL` can still point at unlisted YouTube or HLS if you later want a CDN fallback.

## Optional backup

`VITE_PLAYBACK_URL` can still point at an unlisted YouTube or HLS URL if you later want a CDN instead of in-app live.
