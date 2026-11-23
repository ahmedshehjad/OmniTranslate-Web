# Omni Translate Web

A fast, installable, premium-feel translation workspace for the web — inspired by **OmniTranslate**.

**Live:** https://ahmedshehjad.github.io/OmniTranslate-Web/

## Install on phone (Desktop shortcut / Add to Home screen)

1. Open the live site in Chrome / Edge / Android browser.
2. Tap menu (⋮) → **Add to Home screen** or **Install app**.
3. Launch it from your home screen like a native app.

## Features

- **Translator** — auto-detect, 17 languages, swap, copy, share, text-to-speech, voice input, keyboard shortcuts (`Ctrl+Enter` translate, `Ctrl+K` focus, `Ctrl+L` swap)
- **Quick Translate** — dashboard widget for fast one-off translations
- **Quick Bubble** — draggable floating mini-translator, remembers position
- **History** — local, searchable, export/import JSON backup, reuse/delete/favorite
- **Favorites / Phrasebook** — star translations for quick reuse
- **Image OCR** — extract text from images/screenshots in-browser (Tesseract.js), send directly to translator
- **PWA** — installable, standalone, service-worker cached app shell
- **Theme & layout** — dark/light mode, compact layout
- **Privacy-first** — history/favorites/settings stay in browser local storage; text is sent to translation API only when you request online translation

## Run locally

```sh
python3 -m http.server 8000 --bind 0.0.0.0 --directory .
```

Open `http://127.0.0.1:8000/`.

## Credits

- Developed by **Md Jubair** · GETMODDEVICE Official · Android & AI Engineering
- Source inspiration: [ahmedshehjad/OmniTranslate](https://github.com/ahmedshehjad/OmniTranslate)
