# Install EventView on a phone or tablet (Windows, no Android Studio)

You do not need Android Studio. Use the debug APK from this pull request (or the cloud-agent artifacts folder) and sideload it.

**Min Android:** 8.0 (API 26)  
**This build:** debug, application id `com.eventview.app.debug`, version `1.0.2-debug`

The debug APK built for this run is named:

`eventview_1_0_2_debug.apk`

## 1. Get the APK onto Windows

1. Download `eventview_1_0_2_debug.apk` from the GitHub prerelease, or from whoever sent you the file.
2. Put it somewhere easy to find, for example `Downloads`.

Do not unzip it. An APK is already the installer.

## 2. Allow installs from this source

On the Android phone or tablet:

1. Settings → **Security** (or **Apps** → **Special app access**).
2. Turn on **Install unknown apps** / **Install unknown sources** for the app you will use to open the file (Files, Chrome, or Drive).
3. On newer Android: when you tap the APK, the system asks **Allow from this source** — accept it.

This is a debug build (not from Play Store). That warning is expected.

## 3. Install without a USB cable

1. Copy the APK to the device: email it to yourself, use Google Drive, Nearby Share, or a USB stick / SD card.
2. On the device, open **Files** (or Drive) and tap `eventview_1_0_2_debug.apk`.
3. Tap **Install**. Open EventView when it finishes.

## 4. Install with a USB cable (optional)

If you have USB debugging on (Developer options → USB debugging):

1. On Windows, install [Google USB driver](https://developer.android.com/studio/run/win-usb) if the phone is not already recognized.
2. Download [platform-tools](https://developer.android.com/tools/releases/platform-tools) and unzip them.
3. In Command Prompt:

```bat
cd %USERPROFILE%\Downloads\platform-tools
adb devices
adb install -r eventview_1_0_2_debug.apk
```

Use the full path to the APK if it is not in that folder.

## Permissions you will see

| Permission | When | Why |
|---|---|---|
| **Camera** | Host taps Go live | Film the event |
| **Microphone** | Host taps Go live | Sound for guests |
| **Notifications** | Host goes live (Android 13+) | Keeps the camera up if the screen locks |

Guests do not need camera or mic. They only watch.

If you deny camera/mic, Go live shows a clear error. Allow both in Settings → Apps → EventView → Permissions, then try again.

## First launch

1. **Watch** — no account. Leave it open; the picture appears when a host is live. Tap for sound.
2. **Live** — **Continue with Google** or create a camera account / sign in with email (same as the website). Guests never need an account. Share the EventView invite, then Go live.
3. Prefer a charged phone and a hotspot over packed venue Wi‑Fi. Disable auto-lock while filming.

Guest invite this build shares:

```
Watch live on EventView
https://yoan-claire-live.vercel.app/
```

## Uninstall

Settings → Apps → EventView → Uninstall.  
Or: `adb uninstall com.eventview.app.debug`
