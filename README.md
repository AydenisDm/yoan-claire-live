# Eventstream

Private live event watch page. The streamer taps **Go live** on `/host`. Guests open the homepage and only watch. The picture stays on this site.

The filming phone publishes **once** into LiveKit Cloud. Guests subscribe from the SFU. This website stays on Vercel.

## Two links

| Who | Where | What they do |
|---|---|---|
| Guests | `/` | Watch. No account. No camera. |
| Streamer | `/host` (password `vow`) | Copy the guest link, tap Go live |

## Streamer, on the day

1. Charge the filming phone. Prefer hotspot over venue Wi-Fi. Disable auto-lock.
2. Open Streamer, password `vow`.
3. Copy the guest link and send it.
4. Tap **Go live**. Allow camera and mic. Keep that tab open.
5. If it drops, tap Go live again. Guests stay on the same link.

## Server settings (LiveKit Cloud)

Add these on the Vercel project (server only — not `VITE_`):

- `LIVEKIT_URL` — `wss://your-project.livekit.cloud`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- Optional: `HOST_PASSWORD` — overrides the client host gate if you want a secret that is not in the page

Optional labels: `VITE_EVENT_NAME`, `VITE_EVENT_DATE`, `VITE_KICKER`.

## Optional backup

`VITE_PLAYBACK_URL` can still point at an unlisted YouTube or HLS URL if you later want a CDN instead of in-app live.
