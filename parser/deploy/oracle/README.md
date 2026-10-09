# Parser pe Oracle Cloud (Always Free)

Recomandat: instanță **VM.Standard.A1.Flex** (Ampere, 1 OCPU / 6 GB RAM sau mai mult), imagine **Ubuntu 22.04/24.04**.
Merge și pe AMD Micro (1 GB), dar LibreOffice va folosi swap-ul și e lent.

## 1. Rețeaua (consola Oracle)
VCN → Subnet → Security List → **Add Ingress Rules**: sursa `0.0.0.0/0`, TCP, porturile `80` și `443`.
Portul 22 e deschis deja pentru SSH.

## 2. Domeniu
Cel mai simplu: un subdomeniu gratuit pe [duckdns.org](https://www.duckdns.org) care arată spre **IP-ul public** al VM-ului
(ex. `nyra-parser.duckdns.org`). Caddy ia certificatul HTTPS singur.

## 3. Pe VM
```bash
git clone https://github.com/teodor-vladconstantin/nyra.git   # repo privat: folosește un deploy key sau gh auth
cd nyra/parser/deploy/oracle
bash setup.sh                  # Docker, swap, firewall; reconectează-te după
cp .env.example .env && chmod 600 .env && nano .env
docker compose up -d --build
curl https://nyra-parser.duckdns.org/health     # {"ok":true,...}
```

## 4. Vercel
Variabilele proiectului `nyra`: `PARSER_URL=https://nyra-parser.duckdns.org` (fără slash final) și `PARSER_TOKEN` (aceeași valoare ca în `.env`),
apoi redeploy. După asta CV-urile încărcate trec din „În așteptare" în „Procesat".

## Operare
- Loguri: `docker compose logs -f parser`
- Actualizare: `git pull && docker compose up -d --build`
- Sweeper-ul din parser reia automat CV-urile blocate; nu e nevoie de cron.
