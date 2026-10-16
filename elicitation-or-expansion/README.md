# Elicitation or Expansion? project page

Static project page served at https://furiosa-air.github.io/elicitation-or-expansion/ (no build step),
built from `_templates/project-page`. Preview from the repository root with
`python3 -m http.server 8000` and open http://localhost:8000/elicitation-or-expansion/.

## Structure

```text
index.html                      # Page text and layout
static/css/                     # project.css and colors_and_type.css match the template;
                                # elicitation-or-expansion.css styles the figures and widgets
static/js/explorer.js           # Interactive pass@k and task-outcome figures
static/js/page.js               # Math rendering
static/data/passk.{json,js}     # Aggregate pass@k curves and task-outcome counts (generated)
static/figures/                 # Paper figure panels, the no-JavaScript fallback (generated)
static/fonts/, static/images/   # Brand fonts and wordmark from the template; social preview (generated)
```

## Editing

Edit text, layout, styles, buttons, and links directly in this folder.

`static/data/`, `static/figures/`, and `static/images/social_preview.png` are a snapshot
generated from the paper's figures and evaluation results, with every value checked against
the manuscript of 2026-10-16. Treat them as final and do not edit them by hand. They are
regenerated with scripts kept alongside the paper's sources only if the paper's figures or
numbers change; after the arXiv release they stay fixed.

## Before going public

- Publish together with the arXiv release; nothing in this folder should be pushed before then.
- Replace every `href="#"` (arXiv, Code, Dataset) with a real link, or delete the button.
- Fill in the arXiv ID in the BibTeX: `grep -n 'arXiv:TODO\|href="#"' index.html`.
- After deploying, check that the `og:image` URL opens (the social preview is `static/images/social_preview.png`).
- `static/fonts/` holds ABC Favorit (commercial, Dinamo), as on the other project pages.
