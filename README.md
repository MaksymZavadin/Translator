# Translator

Translator is a static browser app for translating document text into English, German, or Ukrainian.

## How It Works

1. The user opens the static site in Chrome.
2. The browser extracts text from the uploaded file.
3. Chrome's built-in Translator API translates the text on the user's device.
4. The app shows the first 5 translated rows as a preview.
5. The translated result is generated as a `.txt` file in the browser.

The app preserves text structure where possible: line breaks, blank lines, page break markers for PDFs, numbered items, bullet items, and paragraph spacing. Numbered and bulleted continuation lines are translated as one larger unit, then re-wrapped into plain text. It does not recreate the original PDF or DOCX visual styling because the output format is plain text.

No app server receives the document text. The first use of a language pair may require Chrome to download language packs, but the document text stays in the browser.

## Supported Files

- PDF
- DOCX
- TXT, Markdown, CSV, TSV, JSON, XML, YAML, HTML, and log files

Old `.doc`, RTF, and ODT files are not supported in the static browser-only version. Scanned image-only PDFs are not supported yet because they require OCR.

## Browser Requirements

- Chrome 138 or newer on desktop
- Chrome built-in `Translator` API support
- Network access for initial language-pack download and CDN libraries

The app uses:

- Chrome built-in Translator API for local on-device translation
- PDF.js for browser-side PDF text extraction
- Mammoth.js for browser-side DOCX text extraction

## Language List

The source and target dropdowns use the same country-based list: Austria, Bulgaria, Croatia, Czech Rep., France, Germany, Hungary, Italy, Kazakhstan, Moldova, Netherlands, Pakistan, Poland, Portugal, Romania, Serbia, Slovakia, Spain, Turkey, Ukraine, Sweden, Finland, and UAE.

## Run Locally

```bash
npm start
```

Open:

```text
http://127.0.0.1:3000
```

## Deploy To GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`. It publishes the contents of `public/` to GitHub Pages.

Steps:

1. Create a new GitHub repository.
2. Push this project to the repository's `main` branch.
3. Open the repository on GitHub.
4. Go to `Settings` -> `Pages`.
5. Set `Source` to `GitHub Actions`.
6. Push to `main` or run the `Deploy GitHub Pages` workflow manually.
7. Open the published Pages URL after the workflow finishes.

The app does not need Node.js, Python, LibreTranslate, or any backend translation server when deployed. Node.js is only used locally to serve the static files during development.

If GitHub Pages opens this README instead of the app, the Pages source is probably set to deploy from the repository root. Either switch `Settings` -> `Pages` -> `Source` to `GitHub Actions`, or use the root `index.html` redirect included in this repo, which forwards visitors to `public/`.

Before pushing, you can run:

```bash
npm run check
```
