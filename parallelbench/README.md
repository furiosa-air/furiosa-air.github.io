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
index.html            # Main project page
leaderboard/          # Interactive leaderboard (TPS vs Accuracy charts)
components/           # HTML fragments loaded at runtime
data/                 # Metadata, CSV figures, leaderboard JSON
js/                   # JavaScript (leaderboard logic, main page interactions)
assets/               # Images and static assets
assets/theme/         # FuriosaAI brand theme (Tailwind config, base CSS, fonts, wordmark)
```
