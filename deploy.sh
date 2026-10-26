#!/usr/bin/env bash
# Deploys the built site to Cloudflare Pages (project "zecpy", https://zecpy.pages.dev).
# Credentials come from ~/.zecpy-dev/deploy.env (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID),
# never from this repository. Only the public files below are uploaded.
set -euo pipefail
cd "$(dirname "$0")"
uv run --quiet --no-project --with markdown python build.py
dist=$(mktemp -d)
cp -r index.html 404.html _headers docs assets llms.txt llms-full.txt AGENTS.md LICENSE-MIT LICENSE-APACHE "$dist/"
. "$HOME/.zecpy-dev/deploy.env"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
# Run from the empty dist folder's parent-less temp dir so wrangler finds no config to adopt.
(cd "$(mktemp -d)" && npx --yes wrangler@4 pages deploy "$dist" --project-name zecpy --branch main --commit-dirty=true)
rm -rf "$dist"
