#!/usr/bin/env bash
# Tautkan ulang WhatsApp bot Lawan Kabut Asap (Baileys, lewat channel whatsapp OpenClaw) di VPS.
# Dipakai bila `openclaw channels status` menunjukkan WhatsApp "logged-out"/"disconnected".
#
# Jalankan dari terminal yang bisa menampilkan QR (Terminal Mac lewat SSH, wajib -t):
#   ssh -t root@100.93.217.125 'bash /root/siaga-asap-jambi/scripts/sambung-ulang-wa.sh'
#
#   --cek    hanya tampilkan status, tidak mengubah apa pun
#   --paksa  tautkan ulang walau WhatsApp masih tersambung
#
# Yang dilakukan: memastikan gateway hidup, mencadangkan sesi lama, logout, menampilkan QR,
# lalu menunggu sampai WhatsApp tersambung. Rute bot (binding whatsapp -> agen lawan-kabut-asap)
# tidak diubah.
set -euo pipefail

CEK=0
PAKSA=0
for arg in "$@"; do
  case "$arg" in
    --cek) CEK=1 ;;
    --paksa) PAKSA=1 ;;
    *) echo "Pilihan tidak dikenal: $arg (pakai --cek atau --paksa)"; exit 2 ;;
  esac
done

# SSH non-interaktif tidak memuat nvm; openclaw dipasang lewat nvm.
if ! command -v openclaw >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
command -v openclaw >/dev/null 2>&1 || { echo "openclaw tidak ditemukan di PATH."; exit 1; }
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

SESI=/root/.openclaw/credentials/whatsapp/default
CADANGAN=/root/.openclaw/backups

status_wa() { openclaw channels status 2>/dev/null | grep -m1 -- '- WhatsApp' || true; }
tersambung() { status_wa | grep -q 'running, connected'; }

tunggu_tersambung() {
  local batas=$1 i
  for ((i = 0; i < batas; i += 5)); do
    tersambung && return 0
    sleep 5
  done
  return 1
}

echo "== Gateway OpenClaw"
if ! openclaw channels status >/dev/null 2>&1; then
  [ "$CEK" = 1 ] && { echo "Gateway tidak bisa dihubungi."; exit 1; }
  echo "Gateway tidak menjawab; menyalakan ulang layanan..."
  systemctl --user restart openclaw-gateway
  sleep 10
fi
echo "Status: $(status_wa)"

if [ "$CEK" = 1 ]; then
  tersambung && echo "WhatsApp tersambung." || echo "WhatsApp TIDAK tersambung. Jalankan skrip ini tanpa --cek."
  exit 0
fi

if tersambung && [ "$PAKSA" = 0 ]; then
  echo "WhatsApp sudah tersambung. Tidak ada yang perlu dilakukan (pakai --paksa untuk menautkan ulang)."
  exit 0
fi

if [ ! -t 1 ]; then
  echo "Terminal ini tidak bisa menampilkan QR. Jalankan lewat: ssh -t root@<vps> 'bash $(readlink -f "$0")'"
  exit 1
fi

echo
echo "== Mencadangkan sesi WhatsApp lama"
mkdir -p "$CADANGAN"
chmod 700 "$CADANGAN"
if [ -d "$SESI" ]; then
  arsip="$CADANGAN/whatsapp-sesi-$(date +%Y%m%d-%H%M%S).tgz"
  (umask 077 && tar -czf "$arsip" -C "$(dirname "$SESI")" "$(basename "$SESI")")
  echo "Tersimpan: $arsip"
  # Cadangan lama cukup 3 terakhir; isinya kunci sesi WhatsApp.
  ls -1t "$CADANGAN"/whatsapp-sesi-*.tgz 2>/dev/null | tail -n +4 | xargs -r rm -f
fi

echo
echo "== Logout sesi lama"
openclaw channels logout --channel whatsapp || echo "(logout dilewati: sesi memang sudah keluar)"

cat <<'EOF'

== Tautkan WhatsApp
Di HP yang memegang NOMOR BOT:
  1. Buka WhatsApp > titik tiga (Android) atau Pengaturan (iPhone) > Perangkat tertaut
  2. Ketuk "Tautkan perangkat", lalu pindai QR yang muncul di bawah ini.
QR berganti tiap sekitar 20 detik; pindai yang terbaru. Bila terminal terlalu kecil, perkecil
ukuran huruf (Cmd -) supaya QR utuh.

EOF
openclaw channels login --channel whatsapp

echo
echo "== Menunggu WhatsApp tersambung"
if ! tunggu_tersambung 30; then
  echo "Belum tersambung; menyalakan ulang gateway supaya channel dimuat ulang..."
  openclaw gateway restart >/dev/null 2>&1 || systemctl --user restart openclaw-gateway
  tunggu_tersambung 90 || {
    echo "GAGAL: $(status_wa)"
    echo "Lihat log: openclaw channels logs --channel whatsapp"
    exit 1
  }
fi

echo "BERHASIL: $(status_wa)"
cat <<'EOF'

Uji: dari HP lain, kirim "halo" ke nomor bot. Balasan datang dari agen lawan-kabut-asap.
Log bila tidak dibalas: openclaw channels logs --channel whatsapp
EOF
