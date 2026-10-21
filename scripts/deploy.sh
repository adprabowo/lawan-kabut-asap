#!/usr/bin/env bash
# Deploy Worker Lawan Kabut Asap (web + API) ke Cloudflare.
# Token dibaca dari /root/.cloudflare-token (CLOUDFLARE_API_TOKEN=..., opsional CLOUDFLARE_ACCOUNT_ID=...).
# Rahasia Apps Script opsional dari /root/.lawan-kabut-asap.env (APPS_SCRIPT_URL=..., APPS_SCRIPT_TOKEN=...).
set -euo pipefail
cd "$(dirname "$0")/../worker"

set -a
source /root/.cloudflare-token
[ -f /root/.lawan-kabut-asap.env ] && source /root/.lawan-kabut-asap.env
set +a

npm install --silent
npx wrangler whoami

# KV namespace dibuat sekali; id-nya ditulis ke wrangler.toml.
if grep -q 'ISI_SETELAH_MEMBUAT_NAMESPACE' wrangler.toml; then
  id=$(npx wrangler kv namespace list | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const ns = JSON.parse(s).find((n) => n.title === "lawan-kabut-asap-DATA" || n.title === "DATA");
      process.stdout.write(ns ? ns.id : "");
    });')
  if [ -z "$id" ]; then
    id=$(npx wrangler kv namespace create DATA 2>&1 | grep -oE '[0-9a-f]{32}' | head -1)
  fi
  [ -n "$id" ] || { echo "Gagal membuat KV namespace"; exit 1; }
  sed -i "s/ISI_SETELAH_MEMBUAT_NAMESPACE/$id/" wrangler.toml
  echo "KV namespace: $id"
fi

npx wrangler deploy

# Rahasia hanya dikirim kalau tersedia; Worker tetap jalan dengan data contoh tanpa rahasia ini.
for nama in APPS_SCRIPT_URL APPS_SCRIPT_TOKEN BOT_TOKEN; do
  if [ -n "${!nama:-}" ]; then printf '%s' "${!nama}" | npx wrangler secret put "$nama"; fi
done
