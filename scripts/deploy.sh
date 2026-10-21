#!/usr/bin/env bash
# Deploy Lawan Kabut Asap: Worker (web + API) ke Cloudflare, lalu Apps Script ke Google.
# Token dibaca dari /root/.cloudflare-token (CLOUDFLARE_API_TOKEN=..., opsional CLOUDFLARE_ACCOUNT_ID=...).
# Rahasia Apps Script opsional dari /root/.lawan-kabut-asap.env (APPS_SCRIPT_URL=..., APPS_SCRIPT_TOKEN=...).
# Bagian Apps Script berjalan bila clasp sudah login (/root/.clasprc.json) dan apps-script/.clasp.json ada.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/worker"

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

# ---------- Apps Script ----------

if [ ! -f /root/.clasprc.json ] || [ ! -f "$ROOT/apps-script/.clasp.json" ] || [ -z "${APPS_SCRIPT_URL:-}" ]; then
  echo "Apps Script dilewati: clasp belum login atau apps-script/.clasp.json belum ada (lihat docs/DEPLOY.md)."
  exit 0
fi

cd "$ROOT"
npm install --silent
# ID deployment web app adalah bagian URL /exec; memperbaruinya menjaga URL tetap sama.
id_deploy=$(printf '%s' "$APPS_SCRIPT_URL" | sed -E 's#.*/macros/s/([^/]+)/exec.*#\1#')
(cd apps-script && npx clasp push --force)
(cd apps-script && npx clasp deploy --deploymentId "$id_deploy" --description "deploy $(git rev-parse --short HEAD)")

# Panggil web app sekali: menjalankan migrasi skema dan memastikan data masih terkirim.
hasil=$(curl -sL "$APPS_SCRIPT_URL?token=$APPS_SCRIPT_TOKEN" || true)
if printf '%s' "$hasil" | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try { process.exit(Array.isArray(JSON.parse(s).ruang) ? 0 : 1); } catch (e) { process.exit(1); }
  });'; then
  echo "Apps Script: web app diperbarui dan mengirim data."
else
  echo "PERINGATAN: web app Apps Script tidak mengirim data. Bila Google meminta izin baru,"
  echo "buka editor Apps Script, jalankan siapkan() sekali, lalu setujui izinnya."
  exit 1
fi
