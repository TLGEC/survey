# LG Survey v62 local

Stability/rescue build.

## Key fixes
- Stops the app rebuilding the full ChatGPT handover prompt on every field change.
- Makes save lighter so Tigo, battery, panel and Sigenergy fields do not trigger heavy redraw loops.
- Adds `reset.html` as an emergency rescue page for clearing old service-worker cache.
- Updates service worker cache to v62.

## Emergency update route
After uploading to GitHub Pages, open:

`/reset.html`

Then choose **Update app cache only**. If the current draft is corrupted or the first page still freezes, choose **Clear current draft only**.

Use **Clear all LG Survey data** only after exporting a backup.
