# Omni Translate Web

A local, dependency-free web preview of the **OmniTranslate** Android app UI.

> This is a hand-written HTML/CSS/JS replica of the app's screens and flows. It is **not** generated from the Kotlin/Compose source, so changes to the native app do not sync here automatically.

## Run locally

```sh
python3 -m http.server 8000 --bind 0.0.0.0 --directory .
```

Then open `http://127.0.0.1:8000/` in a browser. A server is recommended because the translation API call needs an HTTP origin.

## What works

- 6 tabs: Dashboard, Translator, Clipboard, Vision OCR, Offline Models, Bubble Settings
- Online translation via the public MyMemory API; small offline demo dictionary fallback
- Browser text-to-speech, copy, search, and simulated model downloads
- Floating bubble: draggable, click to open a mini translate card
- `localStorage` persistence for history, settings, models, bubble count and positions
- Developer credit card with the original `developer_profile.png` asset

## Simulated (browser limitations)

- Android `SYSTEM_ALERT_WINDOW` overlay, Accessibility service, foreground service
- ML Kit on-device models, AdMob ads, Android TTS engine

## Credits

- Developed by **Md Jubair** · GETMODDEVICE Official · Android & AI Engineering
- Source app: [`ahmedshehjad/OmniTranslate`](https://github.com/ahmedshehjad/OmniTranslate) (current `main`)

## License note

The source Android project is distributed under a **Personal Use Only License**. This private repository is a non-commercial, personal UI preview derived from that project; all credit remains with the original copyright holder. Do not redistribute or use commercially without prior written permission.
