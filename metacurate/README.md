# MetaCurate project page

Static project page served at https://furiosa-air.github.io/metacurate/ (no build step).
It lives as a subfolder of the `furiosa-air.github.io` hub; the header logo links back
to the hub (`../`).

## Deploy
This folder is deployed together with the hub. Commit changes to the
`furiosa-air/furiosa-air.github.io` repo on `main`; GitHub Pages publishes the
whole repo, so this page appears at `/metacurate/` within a few minutes.

## Before going public
- Replace every `href="#"` (Paper, arXiv, Code, Dataset, Hugging Face) with real links.
- Fill in the `[...]` placeholders (teaser figure, evolved filter, dataset card, arXiv ID).
- Add `static/images/social_preview.png` (1200x630) and uncomment the `og:image` tag.
- `static/fonts/` holds ABC Favorit (commercial, Dinamo). Confirm the web license allows
  public hosting; if not, delete the folder and the page falls back to Helvetica Neue / Arial.
