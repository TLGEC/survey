# LG Survey Pro V3

LG Survey Pro V3 is an offline-first customer journey and technical solar survey app for The Little Green Energy Company. It runs as a static progressive web app on GitHub Pages.

## What V3 does

- Imports one or more Monday.com appointments from an original CSV or an AI-wrapped CSV response.
- Keeps imported values for traceability and avoids overwriting unrelated local survey work.
- Separates a practical Surveyor View from a polished Customer View.
- Saves every meaningful change to IndexedDB and restores an interrupted visit.
- Stores each customer's photos and videos against that survey ID.
- Calculates portrait and landscape roof fit using the selected panel dimensions and preferred 400 mm edge margins.
- Prevents a solar price from appearing before roof-fit validation.
- Allows explicit surveyor overrides with recorded reasons and warnings.
- Generates separate customer, technical survey and CRM outputs.
- Prepares a plain-text customer email for the device's default email application.
- Queues formal-quote handoffs when the device is offline.
- Stores privacy-conscious visit metrics locally on the device.

## Pricing authority

`Residential_Pricing_V8.6.xlsx` is the required residential pricing authority, but it is not currently present in this repository. V3 therefore disables automatic residential pricing instead of using V2's hard-coded component-cost and margin calculation.

Until the approved workbook is supplied and its pricing adapter is implemented, a customer total can only be presented when both conditions are met:

1. An authorised total is entered.
2. The surveyor records who supplied or approved that total.

Current Powerwall customer prices from the V3 brief are configured in `catalog.js`, with no rebate logic.

## Run locally

From the repository folder:

```bash
python3 -m http.server 4190
```

Open `http://127.0.0.1:4190/`.

## Test

Set `PLAYWRIGHT_MODULE` to a Playwright module path if Playwright is not installed in the repository, then run:

```bash
APP_URL=http://127.0.0.1:4190 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/v3-smoke.mjs
```

## Updating V3

- Product specifications and commercial guardrails live in `catalog.js`.
- IndexedDB persistence and media isolation live in `storage.js`.
- Journey logic, validation and outputs live in `app.js`.
- Interface structure is in `index.html` and presentation is in `styles.css`.
- Increment the cache name in `service-worker.js` whenever published assets change.

## Tablet recovery

Open `/reset.html` and choose **Update app cache only** when a tablet is stuck on an older release. This keeps saved surveys and media. Only use the full data-clear action after exporting important customer packs and backups.

## External dependencies still required

- The approved `Residential_Pricing_V8.6.xlsx` source and an agreed mapping from workbook outputs to the app.
- An approved e-signing provider or PandaDoc integration. V3 prepares a handoff but does not pretend that recommendation confirmation is a signed contract.
