# אתר עו"ד ונוטריון יריב רשף

Static Hebrew (RTL) landing page. No build step.

| Path | What |
|---|---|
| `index.html` | All page content, SEO meta tags and structured data |
| `css/style.css`, `js/site.js` | Design and behaviour (form, accessibility menu) |
| `css/editor.css`, `js/editor.js` | Client edit mode, loaded only with `?edit` |
| `images/` | Placeholders; uploaded photos go to `images/uploads/` |

## Run locally
```bash
python -m http.server 4173
```
Then open http://localhost:4173

## Editing content (for the client)
1. Open the site with `?edit` at the end of the address (or "כניסת מנהל" in the footer).
2. Click any text to change it; click a photo to replace it. Changing the phone number once updates every call / WhatsApp link.
3. **פרסום לאתר** saves the changes into `index.html` in this GitHub repository (asks once for the repository name and a GitHub fine-grained token with *Contents: read & write* on this repo only). **הורדת קובץ** downloads the updated `index.html` instead.

Edits stay as a draft in the browser until published.

## Before going live
- Replace placeholder photos, confirm phone / addresses / hours / roles.
- Add the final domain: `<link rel="canonical">`, `og:url`, absolute `og:image` (PNG/JPG), `sitemap.xml`, and the `Sitemap:` line in `robots.txt`.
- Register the site in Google Search Console and create a Google Business Profile.
