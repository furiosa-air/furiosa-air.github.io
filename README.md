# furiosa-air.github.io

Static site for FuriosaAI AI Research (AIR) project pages (no build step).

## Layout
- `index.html` — redirects to https://furiosa.ai/research (the official publication list)
- `<project>/` — one self-contained project page per folder:
  - `parallelbench/` → https://furiosa-air.github.io/parallelbench/ (imported from
    `parallelbench/parallelbench.github.io` at commit `7b93009`; root-absolute links and
    `<base href>` were rewritten to `/parallelbench/`)

## Adding a project
Add the page as `<project>/index.html` with its own `static/` assets. Project pages link
their header logo directly to https://furiosa.ai/research.

## Restoring the hub page
The root used to be a hub listing project pages. To bring it back:

    git checkout 4bb1c8e -- index.html static

## Deploy
Push to `main`; GitHub Pages serves the repo root (Settings → Pages → `main` / root).
