#!/usr/bin/env bash
# Create a new project page from the template.
# Usage: ./_templates/new-project.sh <slug>     (e.g. parallelbench -> /parallelbench/)
set -euo pipefail

slug="${1:-}"
if [[ ! "$slug" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Usage: $0 <slug>  (lowercase letters, digits, hyphens)" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
template_dir="$repo_root/_templates/project-page"
target_dir="$repo_root/$slug"

if [[ -e "$target_dir" ]]; then
  echo "Refusing to overwrite existing $slug/" >&2
  exit 1
fi

cp -R "$template_dir" "$target_dir"

# Fill in the slug.
sed -i.bak -e "s/{{SLUG}}/$slug/g" "$target_dir/index.html"
rm "$target_dir/index.html.bak"

remaining="$(grep -o '{{[A-Z0-9_]*}}' "$target_dir/index.html" | sort -u | wc -l | tr -d ' ')"
echo "Created $slug/ -> https://furiosa-air.github.io/$slug/"
echo "$remaining distinct placeholders left. List them with:"
echo "  grep -n '{{' $slug/index.html"
