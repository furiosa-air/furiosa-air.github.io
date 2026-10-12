# furiosa-air.github.io

Static hub for FuriosaAI AI Research (AIR) project pages (no build step).
The full publication list lives at https://furiosa.ai/research; this site only hosts
per-project pages, code, and data links.

## Layout
- `index.html` — hub page (research areas, project cards, link to furiosa.ai/research)
- `static/` — shared brand CSS, wordmark, and fonts
- `<project>/` — one self-contained folder per project page (e.g. `metacurate/`)

## Adding a project
1. Add the page as `<project>/index.html`.
2. In `index.html`, copy an `<article class="project">` block and update the fields.

## Deploy
Push to `main` of the `furiosa-air/furiosa-air.github.io` repo and enable
Settings → Pages → "Deploy from a branch" (`main` / root).

## Notes
- `static/fonts/` holds ABC Favorit (commercial). Confirm the web license allows public
  hosting; otherwise delete it and pages fall back to Helvetica Neue / Arial.
