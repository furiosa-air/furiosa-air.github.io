# Project page template

Static, no-build project page in the FuriosaAI brand, based on the MetaCurate page.
Not published: Jekyll (the GitHub Pages builder) skips folders starting with `_`.
Preview locally with `python3 -m http.server` from the repo root and open
http://localhost:8000/_templates/project-page/.

## Create a page

```bash
./_templates/new-project.sh my-project      # copies the template to /my-project/
grep -n '{{' my-project/index.html          # every placeholder still to fill
```

The script fills `{{SLUG}}`. Everything else is a
`{{PLACEHOLDER}}` you replace by hand. The page is served at
`https://furiosa-air.github.io/my-project/` once pushed to `main`.

## Sections

| Section | Required | Notes |
|---|---|---|
| Header | yes | Logo links to furiosa.ai/research. Keep the nav in sync with the sections you keep. |
| Hero | yes | Venue · year, title, authors with affiliation superscripts, link buttons. |
| Teaser figure | yes | Replace the dashed placeholder with `<img src="static/images/teaser.png">`. |
| Key numbers | optional | 2–4 headline results. |
| Abstract | yes | |
| Method | yes | Step cards plus an optional equation callout. |
| Code excerpts | optional | For methods that produce an artifact worth showing (filter, prompt, config). |
| Results | yes | Table (mark your row with `class="is-ours"`) plus finding cards. |
| Dataset | optional | Release card with a facts list. |
| BibTeX | yes | Includes a copy button. |
| Footer | yes | Collaboration line and contact email. |

## Styling

- `static/css/colors_and_type.css` — brand tokens and the ABC Favorit font faces.
- `static/css/project.css` — page layout and components (buttons, cards, table, etc.).
  Prefer reusing these classes over inline styles so pages stay consistent.
- Brand colors: red `#E21500` (hover `#B01500`), text `#151515` / `#444444`,
  rules `#D4D4D4`, muted surface `#F4F4F4`. Use red sparingly: primary buttons,
  step labels, and your method's numbers.

## Before publishing

- [ ] No `{{` left in `index.html`
- [ ] All button links point somewhere real (delete the ones that do not apply)
- [ ] Teaser figure added; optional `static/images/social_preview.png` (1200×630) and `og:image` uncommented
- [ ] Unused OPTIONAL sections and their nav links removed
