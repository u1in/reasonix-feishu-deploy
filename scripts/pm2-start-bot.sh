#!/usr/bin/env bash
set -euo pipefail

# Reasonix 飞书 Bot — PM2 启动脚本
# 可放在任何位置运行，自动定位 ~/.config/vercel-ai-tools/ecosystem.config.js

CONFIG_DIR="$HOME/.config/vercel-ai-tools"
ECOSYSTEM="$CONFIG_DIR/ecosystem.config.js"

# ── 颜色 ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERR]${NC}   $*"; }

# ── 检查 pm2 ──
if ! command -v pm2 &>/dev/null; then
    err "未找到 pm2 命令，请先安装: npm install -g pm2"
    exit 1
fi

# ── 检查 ecosystem ──
if [ ! -f "$ECOSYSTEM" ]; then
    err "未找到 PM2 配置: $ECOSYSTEM"
    info "请先运行 install.sh 生成配置"
    exit 1
fi

# ── 检查是否已在运行 ──
if pm2 info reasonix-bot &>/dev/null; then
    warn "reasonix-bot 已在 PM2 中运行"
    echo -e "  ${YELLOW}▶ 重启:    pm2 restart reasonix-bot${NC}"
    echo -e "  ${YELLOW}▶ 查看日志: pm2 logs reasonix-bot${NC}"
    echo -e "  ${YELLOW}▶ 停止:    ${HOME}/.config/vercel-ai-tools/pm2-stop-bot.sh${NC}"
    exit 0
fi

# ── 启动 ──
info "启动 reasonix-bot (PM2)..."
REASONIX_BIN="$(which reasonix)" pm2 start "$ECOSYSTEM"
pm2 save

echo ""
ok "reasonix-bot 已启动!"
echo ""
echo -e "  ${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "  ${GREEN}║  现在用飞书给 Bot 发消息测试吧！       ║${NC}"
echo -e "  ${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
info "常用命令:"
echo "  pm2 status                    # 查看所有进程状态"
echo "  pm2 logs reasonix-bot         # 查看实时日志"
echo "  pm2 stop reasonix-bot          # 停止机器人"
echo "  pm2 restart reasonix-bot       # 重启机器人"
echo "  ${HOME}/.config/vercel-ai-tools/pm2-stop-bot.sh  # 停止机器人（含清理）"
echo ""
