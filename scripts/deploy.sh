#!/usr/bin/env bash
# Deploy Apps Script Lawan Kabut Asap ke Google lewat clasp.
# Worker (web + API) TIDAK dideploy dari sini: Cloudflare Workers Builds men-deploy-nya otomatis
# tiap push ke main (build "cd worker && npm install", deploy "cd worker && npx wrangler deploy").
#
#   --rahasia  kirim juga APPS_SCRIPT_URL/APPS_SCRIPT_TOKEN/BOT_TOKEN ke Worker (hanya saat nilainya
#              berubah). Token Cloudflare dibaca dari /root/.cloudflare-token.
#
# Rahasia Apps Script dari /root/.lawan-kabut-asap.env (APPS_SCRIPT_URL=..., APPS_SCRIPT_TOKEN=...).
# Butuh clasp sudah login (/root/.clasprc.json) dan apps-script/.clasp.json (docs/DEPLOY.md bagian C).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RAHASIA=0
for arg in "$@"; do
  case "$arg" in
    --rahasia) RAHASIA=1 ;;
    *) echo "Pilihan tidak dikenal: $arg (pakai --rahasia)"; exit 2 ;;
  esac
done

set -a
[ -f /root/.lawan-kabut-asap.env ] && source /root/.lawan-kabut-asap.env
set +a

# ---------- Rahasia Worker (opsional) ----------

if [ "$RAHASIA" = 1 ]; then
  set -a
  source /root/.cloudflare-token
  set +a
  cd "$ROOT/worker"
  npm install --silent
  for nama in APPS_SCRIPT_URL APPS_SCRIPT_TOKEN BOT_TOKEN; do
    if [ -n "${!nama:-}" ]; then printf '%s' "${!nama}" | npx wrangler secret put "$nama"; fi
  done
fi

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
