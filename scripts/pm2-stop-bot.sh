#!/usr/bin/env bash
set -euo pipefail

# Reasonix 飞书 Bot — PM2 停止脚本

# ── 颜色 ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERR]${NC}   $*"; }

# ── 检查 pm2 ──
if ! command -v pm2 &>/dev/null; then
    err "未找到 pm2 命令"
    exit 1
fi

# ── 停止 ──
if pm2 info reasonix-bot &>/dev/null; then
    info "正在停止 reasonix-bot..."
    pm2 stop reasonix-bot
    pm2 delete reasonix-bot
    pm2 save
    ok "reasonix-bot 已停止"
else
    warn "reasonix-bot 未在 PM2 中运行"
fi

echo ""
info "如需重新启动: ${HOME}/.config/vercel-ai-tools/pm2-start-bot.sh"
echo ""
