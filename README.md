# LG Survey Pro

LG Survey Pro is an offline-first, tablet-focused solar and battery sales journey for The Little Green Energy Company. It is a static progressive web app designed to guide a customer conversation, capture a dependable technical handover and leave the customer with a polished indicative summary.

## Journey

1. Import Monday.com appointments from a CSV or an AI-wrapped CSV reply.
2. Confirm bill readiness and have a concise discovery conversation.
3. Capture the property, installation locations, cable routes, scaffolding, photos and video.
4. Build one primary solar, battery or combined recommendation. Add a second route only deliberately.
5. Present a calm customer view with one overall indicative installed price.
6. Record the customer's natural position and create the customer PDF, email draft, technical handover and CRM CSV.

The app does not create a formal quote. OpenSolar remains the detailed design tool and PandaDoc remains the formal signable quotation route.

## Reliability

- Each visit uses schema version 4 and a unique customer ID.
- Every meaningful edit autosaves to IndexedDB.
- Stage changes create rolling recovery snapshots.
- Media is stored separately and every read, update and deletion checks the active survey ID.
- Previous-version records remain read-only and can be downloaded as JSON.
- The full app shell, pricing rules and PDF engine are cached for offline startup.

## Pricing

`src/pricing-data.js` is the controlled browser asset compiled from `Residential_Pricing_V8.7.xlsx`.

- Source SHA-256: `1bb09b4e6c1f76e388a809a63d5c20efefa69fe5ec376c694e2b0cdc81a8f6bc`
- The raw workbook is not committed because it contains confidential costs, margins, commission rules and internal comments.
- Unmapped products or mounting types return **Price needs review**. The app does not silently guess.
- Customer screens and outputs show only the overall indicative price.
- Manual final adjustments require an enabled control, reason and authoriser.

When the workbook changes, compare the source hash, review changed source cells, update `src/pricing-data.js`, update its metadata and extend the pricing fixtures before release.

## Run locally

```bash
python3 -m http.server 4177
```

Open `http://127.0.0.1:4177/`.

## Test

```bash
node tests/v4-smoke.mjs
```

The end-to-end suite covers Monday import, solar-only, battery-only, solar plus battery, pricing and approved extras, scaffolding, long cable review, optional second option, finance on/off, customer PDF and email, technical and CRM outputs, tablet layout, reload recovery, offline boot and two-customer media isolation.

Generate generic visual-review assets with:

```bash
node tests/generate-previews.mjs
```

## Structure

- `app.js`: application orchestration and event handling.
- `src/schema.js`: versioned survey model and safe public projection.
- `src/import.js`: defensive Monday/Sidekick CSV extraction and parsing.
- `src/pricing-data.js`: controlled V8.7 pricing asset.
- `src/pricing.js`: deterministic price, savings, battery and finance calculations.
- `src/outputs.js`: customer PDF/email and internal/CRM outputs.
- `storage.js`: IndexedDB records, snapshots and media isolation.
- `styles.css`: Little Green Energy tablet and customer presentation design.
- `service-worker.js`: offline app shell.

## Tablet recovery

Open `/reset.html` and choose **Update app cache only** when a tablet is stuck on an older release. This keeps saved surveys and media. Use the full data-clear action only after exporting anything important.

## Current integration boundary

The customer email uses the device's default email application through `mailto:`. The surveyor downloads the named PDF and attaches it manually. Direct Microsoft Graph sending, automatic attachments, live Monday sync and PandaDoc API submission are deliberately outside this release.
