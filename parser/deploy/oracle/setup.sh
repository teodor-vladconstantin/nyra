#!/usr/bin/env bash
# Pregătește un VM Oracle Ubuntu pentru parser: Docker, swap, porturi 80/443 în firewall-ul VM-ului.
# Rulează o singură dată pe VM: `bash setup.sh`. Idempotent.
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# LibreOffice (previzualizarea DOCX) are nevoie de memorie; pe VM-uri mici adăugăm swap.
if ! swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# Imaginile Ubuntu de la Oracle vin cu iptables care blochează 80/443; le deschidem înaintea regulii REJECT.
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport "$p" -j ACCEPT
done
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent >/dev/null
sudo netfilter-persistent save >/dev/null

echo "Gata. Reconectează-te (grupul docker), apoi: cp .env.example .env && nano .env && docker compose up -d --build"
