# EventView for Android

Native Kotlin + Jetpack Compose client for the EventView livestream. Guests watch without an account. Hosts sign in against the production Better Auth API, then publish camera + mic into the same LiveKit room the website uses (`eventview-live`).

This is a **native** app (not a WebView wrapper). Layouts adapt to phone and tablet, portrait and landscape. Touch targets stay at least 48–52 dp.

## What it talks to

No LiveKit API key lives in the app. Tokens are minted by the existing website, same as the web client.

| Call | Path | Who |
|---|---|---|
| Room ready? | `GET /api/live` | Anyone |
| Guest / host token | `POST /api/live` `{ role, identity?, password? }` | Guest identity `g-…`; host needs a session |
| Account status | `GET /api/auth/status` | Host screens |
| Register | `POST /api/auth/sign-up/email` | Host |
| Sign in | `POST /api/auth/sign-in/email` | Host |
| Google | Custom Tabs → `/android-auth` (production Better Auth Google) | Host |
| Session | `GET /api/auth/get-session` | Host |
| Sign out | `POST /api/auth/sign-out` | Host |

Default API / guest-link origin: `https://yoan-claire-live.vercel.app`

The app sends `Origin: <API base>` and, after sign-in, `Authorization: Bearer <session token>` so `/api/live` host mints match the web signed-in path. LiveKit `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` stay on Vercel. You do **not** put them in this project.

Chat and “can you see clearly?” use the same LiveKit data payloads as the web app: `{ "t": "chat"|"report", "v": "…" }`.

**No Android Studio?** Sideload the debug APK — see [INSTALL.md](INSTALL.md) (Windows steps included).

## Open in Android Studio

1. Install [Android Studio](https://developer.android.com/studio) (Ladybug / Narwhal or newer) with the Android SDK.
2. **File → Open** and choose the `android/` folder (not the repo root).
3. Let Gradle sync. JDK 17 is required (Studio’s embedded JBR is fine).
4. Create an emulator: **Device Manager → Create device**
   - Phone: Pixel 7 / Pixel 8, system image **API 34+**
   - Tablet: Pixel Tablet or a 10" AVD, same API
5. Run **app** on the emulator or a USB device (`android.permission.CAMERA` + `RECORD_AUDIO` needed for Go live).

Command line (from `android/`):

```bash
./gradlew :core:test          # protocol tests, no SDK
./gradlew :app:assembleDebug  # needs ANDROID_HOME / local.properties sdk.dir
```

If Studio did not write `local.properties`, copy `local.properties.example` and set `sdk.dir` to your SDK.

### Optional API override

In `local.properties` or `-PEVENTVIEW_API_BASE=…`:

```
EVENTVIEW_API_BASE=https://yoan-claire-live.vercel.app
EVENTVIEW_WATCH_URL=https://yoan-claire-live.vercel.app/
```

Point these at a preview deploy only if that deploy has LiveKit + Postgres configured. The production origin already does.

## Try it

**Guest (no account)**

1. Open the app. Watch is the first tab.
2. You should see Waiting (or Offline if the API is unreachable).
3. When a host is live, the picture appears. Tap **Tap for sound**.
4. Send a canned note. Rotate the phone — video grows, chat sits beside it on tablets.
5. Home while live enters picture-in-picture on Android 8+ (auto-enter on 12+).

**Host**

1. Live tab → **Continue with Google** or **Sign in** / **Create camera account** (email + password, 8+ characters).
2. Same account as the website. Google uses Chrome Custom Tabs into the production Better Auth Google flow — no Apple or X.
3. **Share EventView invite** uses the Android share sheet (`Watch live on EventView` plus `https://yoan-claire-live.vercel.app/`).
4. **Go live** asks for camera + microphone. Allow both.
5. Full-screen preview, Flip, Light (back camera), Share, Stop.
6. A foreground notification keeps the camera up if the screen locks. Disable auto-lock and prefer a hotspot, same as the filming-phone notes on the website.
7. Stop writes a session card to **Archive** (time, duration, peak viewers) on this device.

**Errors you should see clearly**

- Camera / mic denied → “Allow camera and microphone…”
- Not signed in as host → sign-in, or 401 “Sign in again”
- Room at ~200 → Waiting pane “The room is full” and a retry
- Missing LiveKit on the server → Offline / setup banner
- Network drop → Reconnecting; guests stay on the same room

## Layout / performance

- Phone: bottom tabs. Tablet or wide landscape: navigation rail.
- Watch landscape / tablet: video + notes side by side.
- Host live is immersive (edge-to-edge) with large Stop / Flip targets.
- LiveKit work and HTTP run off the main thread. Compose state is `StateFlow` so video frames are not stored in the UI tree.
- Guest uses adaptive stream + dynacast. Host publishes camera + mic through the LiveKit Android capturer.

## Secrets

| Secret | Where |
|---|---|
| LiveKit URL / API key / secret | Vercel project env only |
| `DATABASE_URL`, `BETTER_AUTH_SECRET` | Vercel (accounts) |
| Google web client | Vercel `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — already live |
| None required in the APK | Default production API is public. Custom Tabs reuse the web Google app. |

### Google Sign-In on Android (no SHA-1)

The debug APK opens Chrome Custom Tabs to `https://yoan-claire-live.vercel.app/android-auth`. That page starts the **existing web** Better Auth Google flow (`/api/auth/callback/google`) and, after Google returns, redirects into the app with a session token (`eventview-debug://oauth?token=…`).

You do **not** need an Android OAuth client or a debug keystore SHA-1 for this path. Those would only be required if we added the native Google SDK / Credential Manager.

The `/android-auth` handoff must be on production. Email/password works without it.

Do not commit `local.properties` or keystores.

## Project layout

```
android/
  core/     JVM module — room name, auth validation, chat IDs (unit tested)
  app/      Compose UI, LiveKit, OkHttp, DataStore
```

`core` is the shared contract with `src/lib/live-config.ts`, `auth-form.ts`, and `crowd.ts`. Change those together if you rename the LiveKit room.
