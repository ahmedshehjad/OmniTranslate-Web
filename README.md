# Omni Translate Web

A public, installable web preview of the **OmniTranslate** Android app UI.

> This is a hand-written HTML/CSS/JS replica of the app's screens and flows. It is **not** generated from the Kotlin/Compose source, so changes to the native app do not sync here automatically.

## Live site

Once GitHub Pages is enabled for this repository, the site is served from:

- `https://ahmedshehjad.github.io/OmniTranslate-Web/`

## Install as a phone shortcut (Add to Home screen)

1. Open the live site in Chrome/Edge/Android browser.
2. Tap the browser menu → **Add to Home screen** / **Install app**.
3. Confirm — a shortcut icon appears on your home screen and opens the site in a standalone window.

The included `manifest.webmanifest` and `sw.js` make the app shell installable and cacheable for quick repeat access.

## Run locally

```sh
python3 -m http.server 8000 --bind 0.0.0.0 --directory .
```

Then open `http://127.0.0.1:8000/`.

## What works

- 6 tabs: Dashboard, Translator, Clipboard, Vision OCR, Offline Models, Bubble Settings
- Online translation via the public MyMemory API; small offline demo dictionary fallback
- Browser text-to-speech, copy, search, and simulated model downloads
- Floating bubble: draggable, click to open a mini translate card
- `localStorage` persistence for history, settings, models, bubble position
- Developer credit card with the original `developer_profile.png` asset

## Simulated (browser limitations)

- Android `SYSTEM_ALERT_WINDOW` overlay, Accessibility service, foreground service
- ML Kit on-device models, AdMob ads, Android TTS engine

## Credits

- Developed by **Md Jubair** · GETMODDEVICE Official · Android & AI Engineering
- Source app: [`ahmedshehjad/OmniTranslate`](https://github.com/ahmedshehjad/OmniTranslate) (current `main`)

## License note

The source Android project is distributed under a **Personal Use Only License**. This public repository is a non-commercial, personal UI preview derived from that project; all credit remains with the original copyright holder. Do not redistribute or use commercially without prior written permission.
