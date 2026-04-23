#!/usr/bin/env bash
# Bootstrap inicial del VPS Hostinger. Se corre UNA sola vez desde la terminal
# web del hPanel (Browser Terminal) como root.
#
# Qué hace:
#   1. Crea usuario `deploy` con sudo (no usaremos root directo para el worker).
#   2. Abre puertos 22 (SSH), 3000 (si se expone dashboard aquí), mantiene 80/443.
#   3. Instala Node.js 24 LTS, pnpm, pm2, git, y claude-code CLI (necesario para el Agent SDK).
#   4. Configura authorized_keys para ti y para Claude (pubkey que pegas abajo).
#   5. Activa el arranque automático de pm2 al reboot.
#
# DESPUÉS de correrlo: prueba SSH desde tu Mac:  ssh deploy@srv1608739.hstgr.cloud
# Si entra sin password → continuamos con scripts/deploy-vps.sh

set -euo pipefail

# ============================================================
# CONFIG — edita estas 2 líneas antes de pegar
# ============================================================
# Pega aquí tu pubkey local. Obtenla con:   cat ~/.ssh/id_ed25519.pub
MY_SSH_PUBKEY="ssh-ed25519 AAAA...REPLACE_WITH_YOUR_KEY...xyz tu-nombre@mac"

# Timezone deseado (para logs, cron, DailyReport)
TZ_NAME="America/Santiago"

# ============================================================
# 1. Usuario deploy con sudo sin password
# ============================================================
if ! id deploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash deploy
  usermod -aG sudo deploy
  echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
  chmod 440 /etc/sudoers.d/deploy
fi

# ============================================================
# 2. SSH keys
# ============================================================
mkdir -p /home/deploy/.ssh /root/.ssh
chmod 700 /home/deploy/.ssh /root/.ssh

# Evita duplicar
grep -qxF "$MY_SSH_PUBKEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || \
  echo "$MY_SSH_PUBKEY" >> /home/deploy/.ssh/authorized_keys
grep -qxF "$MY_SSH_PUBKEY" /root/.ssh/authorized_keys 2>/dev/null || \
  echo "$MY_SSH_PUBKEY" >> /root/.ssh/authorized_keys

chown -R deploy:deploy /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys /root/.ssh/authorized_keys

# ============================================================
# 3. Firewall (UFW) — abre SSH, mantiene outbound libre
# ============================================================
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # reservado (health checks)
ufw allow 443/tcp   # outbound https ya permitido, pero lo dejamos inbound por si se usa
ufw --force enable
ufw status verbose

# ============================================================
# 4. Sistema base
# ============================================================
apt-get update
apt-get install -y curl git ca-certificates build-essential tzdata
timedatectl set-timezone "$TZ_NAME" || true

# Node.js 24 LTS
if ! command -v node >/dev/null 2>&1 || [[ "$(node --version)" != v24.* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

# pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@latest
fi

# pm2
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2@latest
fi

# Claude Code CLI (requerido por @anthropic-ai/claude-agent-sdk)
if ! command -v claude >/dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code@latest
fi

# ============================================================
# 5. Prepara directorio del proyecto
# ============================================================
mkdir -p /home/deploy/CryptoPilot
chown -R deploy:deploy /home/deploy/CryptoPilot

# ============================================================
# 6. pm2 startup (arranca pm2 al reboot con el usuario deploy)
# ============================================================
env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
# (pm2 save lo haremos después de arrancar el worker)

echo ""
echo "========================================="
echo "✓ Bootstrap completo."
echo ""
echo "Versiones:"
node --version
pnpm --version
pm2 --version
claude --version
echo ""
echo "Próximo paso (desde tu Mac):"
echo "  ssh deploy@srv1608739.hstgr.cloud"
echo ""
echo "Si entra sin password, corre scripts/deploy-vps.sh"
echo "========================================="
