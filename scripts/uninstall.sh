#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot — 一键卸载脚本
# 始终使用 ~/.config/reasonix-bot/uninstall.mjs 执行卸载。
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

CONFIG_DIR="$HOME/.config/reasonix-bot"
UNINSTALL_SCRIPT="$CONFIG_DIR/uninstall.mjs"

info()  { echo -e "${CYAN}◇${NC}  $*" >&2; }
ok()    { echo -e "${GREEN}✓${NC}  $*" >&2; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*" >&2; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }

# ── Banner ──
echo ""
echo -e "${RED}  ╭──────────────────────────────────────────────╮${NC}"
echo -e "${RED}  │                                              │${NC}"
echo -e "${RED}  │   🗑️   Reasonix 飞书 Bot — 一键卸载          │${NC}"
echo -e "${RED}  │                                              │${NC}"
echo -e "${RED}  ╰──────────────────────────────────────────────╯${NC}"
echo ""

# ── 检查卸载脚本是否存在 ──
if [ ! -f "$UNINSTALL_SCRIPT" ]; then
  err "未找到卸载脚本: $UNINSTALL_SCRIPT"
  err "请确认已通过 install.sh 安装了 Bot"
  exit 1
fi

# ── Node.js 检查 ──
if ! command -v node &>/dev/null; then
  err "未检测到 Node.js，请先安装 Node.js >= 18"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Node.js 版本过低 ($(node -v))，请升级到 >= 18"
  exit 1
fi
ok "Node.js $(node -v)"

# ── 确保 prompts 可用 ──
info "检查依赖..."
if node -e "require('prompts')" 2>/dev/null; then
  ok "依赖就绪"
else
  info "正在安装 prompts..."
  npm install -g prompts &>/dev/null || true
  if node -e "require('prompts')" 2>/dev/null; then
    ok "依赖就绪"
  else
    # 尝试本地安装到配置目录
    cd "$CONFIG_DIR" && npm install prompts &>/dev/null || true
    if node -e "require('prompts')" 2>/dev/null; then
      ok "依赖就绪"
    else
      err "prompts 安装失败，请手动执行: npm install -g prompts"
      exit 1
    fi
  fi
fi

# ── 执行卸载向导 ──
echo ""
info "启动交互式卸载向导..."
echo ""

node "$UNINSTALL_SCRIPT" "$@" </dev/tty
