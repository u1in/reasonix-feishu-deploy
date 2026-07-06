#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot — 一键安装/卸载脚本
# 唯一推荐方式: npx @u1in/reasonix-feishu-deploy [--uninstall]
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}◇${NC}  $*" >&2; }
ok()    { echo -e "${GREEN}✓${NC}  $*" >&2; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*" >&2; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }

# ── 确定包目录 ──
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

# ── 处理 --uninstall 标志 ──
# 提取非 --uninstall 参数透传给子脚本
FILTERED_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--uninstall" ]; then
    UNINSTALL=1
  else
    FILTERED_ARGS+=("$arg")
  fi
done

if [ "${UNINSTALL:-0}" = "1" ]; then
  UNINSTALL_SCRIPT="$PACKAGE_DIR/scripts/uninstall.mjs"
  if [ ! -f "$UNINSTALL_SCRIPT" ]; then
    err "未找到卸载脚本: $UNINSTALL_SCRIPT"
    exit 1
  fi
  exec node "$UNINSTALL_SCRIPT" "${FILTERED_ARGS[@]}" </dev/tty
fi

# ── 确认本地文件完整（npx 模式下应有全部文件） ──
if [ ! -f "$SCRIPT_DIR/setup.mjs" ] || [ ! -f "$PACKAGE_DIR/config/reasonix.toml" ]; then
  err "未找到安装文件，请通过 npx @u1in/reasonix-feishu-deploy 运行"
  exit 1
fi
ok "安装包已就绪"

SETUP_SCRIPT="$PACKAGE_DIR/scripts/setup.mjs"

# ── 读取版本号 ──
DEPLOY_VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$PACKAGE_DIR/package.json" 2>/dev/null || echo '?')"

# ── Banner ──
echo ""
echo -e "${GREEN}  ╭──────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}  │                                              │${NC}"
echo -e "${GREEN}  │   🤖  Reasonix 飞书 Bot — 一键部署          │${NC}"
echo -e "${GREEN}  │          v${DEPLOY_VERSION}                          │${NC}"
echo -e "${GREEN}  │                                              │${NC}"
echo -e "${GREEN}  ╰──────────────────────────────────────────────╯${NC}"
echo ""

# Step 1: Node.js 版本检查
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Node.js 版本过低 ($(node -v))，请升级到 >= 18"
  exit 1
fi
ok "Node.js $(node -v)"

# Step 2: 进入交互式向导
echo ""
info "启动交互式配置向导..."
echo ""

if [ -f "$SETUP_SCRIPT" ]; then
  node "$SETUP_SCRIPT" "${FILTERED_ARGS[@]}" </dev/tty
else
  err "未找到向导脚本: $SETUP_SCRIPT"
  err "请确认仓库完整后再试"
  exit 1
fi
