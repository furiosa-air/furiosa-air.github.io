# furiosa-air.github.io

Static site for FuriosaAI AI Research (AIR) project pages (no build step).

## Layout
- `index.html` — redirects to https://furiosa.ai/research (the official publication list)
- `<project>/` — one self-contained project page per folder (e.g. `metacurate/` →
  https://furiosa-air.github.io/metacurate/)

## Adding a project
Add the page as `<project>/index.html` with its own `static/` assets. Project pages link
their header logo to `../`, which lands on furiosa.ai/research via the root redirect.

## Restoring the hub page
The root used to be a hub listing project pages. To bring it back:

    git checkout d32fda5 -- index.html static

## Deploy
Push to `main`; GitHub Pages serves the repo root (Settings → Pages → `main` / root).
