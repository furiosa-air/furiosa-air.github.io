# furiosa-air.github.io

Static site for FuriosaAI AI Research (AIR) project pages (no build step).

## Layout
- `index.html` — redirects to https://furiosa.ai/research (the official publication list)
- `_templates/project-page/` — starter template for new project pages (not published)
- `<project>/` — one self-contained project page per folder:
  - `metacurate/` → https://furiosa-air.github.io/metacurate/
  - `parallelbench/` → https://furiosa-air.github.io/parallelbench/ (imported from
    `parallelbench/parallelbench.github.io` at commit `7b93009`; root-absolute links and
    `<base href>` were rewritten to `/parallelbench/`)

## Adding a project
Start from the project page template (see `_templates/README.md`):

    ./_templates/new-project.sh my-project
    grep -n '{{' my-project/index.html

Each project folder is self-contained with its own `static/` assets, and its header logo
links to https://furiosa.ai/research.

## Restoring the hub page
The root used to be a hub listing project pages. To bring it back:

    git checkout d32fda5 -- index.html static

## Deploy
Push to `main`; GitHub Pages builds the repo root with Jekyll (Settings → Pages → `main` / root).
There is deliberately no `.nojekyll`: Jekyll skips `_`-prefixed folders such as `_templates/`.
Pages are plain HTML without front matter, so Jekyll copies them unchanged; do not add
front matter (`---`) to them.
