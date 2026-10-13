# [ParallelBench](https://furiosa-air.github.io/parallelbench/)

Project page and interactive leaderboard for **"ParallelBench: Understanding the Trade-offs of Parallel Decoding in Diffusion LLMs"** (ICLR 2026).

## Development

No build step required. The site is served under `/parallelbench/`, so run a local
server from the repository root (one level up) and open
http://localhost:8000/parallelbench/:

```bash
python3 -m http.server 8000
```

## Structure

```text
index.html            # Main project page, built from _templates/project-page
leaderboard/          # Interactive leaderboard (max TPS at an accuracy threshold)
chart/                # Interactive accuracy vs. TPS charts (Plotly)
data/                 # Metadata, CSV figures, leaderboard JSON
js/                   # Leaderboard and chart logic (common.js is shared)
static/css/           # project.css and colors_and_type.css are kept identical to the template;
                      # parallelbench.css holds page additions, explorer.css the leaderboard/chart UI
static/fonts/, static/images/  # Brand fonts and wordmark from the template
assets/               # Paper figures, images, PDF
```

All pages are plain HTML and CSS with no Tailwind or build step. The header and footer are
repeated in each page, so keep them in sync when editing.
