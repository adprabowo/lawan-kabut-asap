#!/usr/bin/env bash
# Pasang/perbarui persona bot WhatsApp Lawan Kabut Asap (agen OpenClaw `lawan-kabut-asap`) di VPS:
#  1. cadangkan berkas persona lama di workspace,
#  2. salin SOUL.md, IDENTITY.md, HEARTBEAT.md ke workspace,
#  3. susun AGENTS.md = bot/persona/AGENTS.md + data terkini (bot/data-bot.mjs), cron tiap 15 menit,
#  4. naikkan batas karakter bootstrap agen ini supaya AGENTS.md tidak terpotong.
# TOOLS.md tidak dipakai: OpenClaw tidak lagi menyisipkannya ke prompt.
# Aman dijalankan ulang. Rute WhatsApp -> agen dan kebijakan tools (deny *) tidak diubah.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WS=/root/.openclaw/workspace/lawan-kabut-asap
NODE="$(command -v node || echo /root/.nvm/versions/node/v24.18.1/bin/node)"
LOG=/root/.openclaw/logs/data-bot-lawan-kabut-asap.log
TANDA='# lawan-kabut-asap: data bot'

if ! command -v openclaw >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi

cadangan="/root/.openclaw/backups/persona-lawan-kabut-asap-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$cadangan"
cp -p "$WS"/*.md "$cadangan"/
echo "Persona lama dicadangkan di $cadangan"

for f in SOUL.md IDENTITY.md HEARTBEAT.md; do
  install -m 644 "$ROOT/bot/persona/$f" "$WS/$f"
done

rm -f "$WS/TOOLS.md" "$WS/TOOLS.md.baru"
"$NODE" "$ROOT/bot/data-bot.mjs" "$WS/AGENTS.md"

openclaw config set agents.entries.lawan-kabut-asap.bootstrapMaxChars 60000 --strict-json >/dev/null
openclaw config set agents.entries.lawan-kabut-asap.bootstrapTotalMaxChars 90000 --strict-json >/dev/null
openclaw config validate >/dev/null && echo "Konfigurasi OpenClaw valid."

baris="*/15 * * * * flock -n /tmp/data-bot-lawan-kabut-asap.lock $NODE $ROOT/bot/data-bot.mjs $WS/AGENTS.md >> $LOG 2>&1 $TANDA"
( crontab -l 2>/dev/null | grep -vF "$TANDA" || true; echo "$baris" ) | crontab -
echo "Cron terpasang: $(crontab -l | grep -F "$TANDA")"
echo "Selesai. Uji: kirim MENU ke nomor bot."
