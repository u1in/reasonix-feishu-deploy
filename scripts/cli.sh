#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot — 一键部署/卸载脚本
# 唯一推荐方式: npx @u1in/reasonix-feishu-deploy [--undeploy]
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}◇${NC}  $*" >&2; }
ok()    { echo -e "${GREEN}✓${NC}  $*" >&2; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*" >&2; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }

# ── 确定包目录（解析软链接，兼容 npx 方式运行） ──
SCRIPT_PATH="$(readlink -f "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

# ── 处理 --undeploy 标志 ──
# 提取非 --undeploy 参数透传给子脚本
FILTERED_ARGS=()
IS_QUIET=0
for arg in "$@"; do
  if [ "$arg" = "--undeploy" ] || [ "$arg" = "--uninstall" ]; then
    UNDEPLOY=1
  elif [ "$arg" = "--yes" ] || [ "$arg" = "-y" ]; then
    IS_QUIET=1
    FILTERED_ARGS+=("$arg")
  else
    FILTERED_ARGS+=("$arg")
  fi
done

# 静默模式：无需终端交互，跳过 </dev/tty
TTY_REDIR="</dev/tty"
if [ "$IS_QUIET" = "1" ]; then
  TTY_REDIR=""
fi

if [ "${UNDEPLOY:-0}" = "1" ]; then
  UNDEPLOY_SCRIPT="$PACKAGE_DIR/scripts/undeploy.mjs"
  if [ ! -f "$UNDEPLOY_SCRIPT" ]; then
    err "未找到卸载脚本: $UNDEPLOY_SCRIPT"
    exit 1
  fi
  exec node "$UNDEPLOY_SCRIPT" "${FILTERED_ARGS[@]}" $TTY_REDIR
fi

# ── 确认本地文件完整（npx 模式下应有全部文件） ──
if [ ! -f "$SCRIPT_DIR/deploy.mjs" ] || [ ! -f "$PACKAGE_DIR/config/reasonix.toml" ]; then
  err "未找到安装文件，请通过 npx @u1in/reasonix-feishu-deploy 运行"
  exit 1
fi
ok "安装包已就绪"

DEPLOY_SCRIPT="$PACKAGE_DIR/scripts/deploy.mjs"

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

if [ -f "$DEPLOY_SCRIPT" ]; then
  node "$DEPLOY_SCRIPT" "${FILTERED_ARGS[@]}" $TTY_REDIR
else
  err "未找到向导脚本: $DEPLOY_SCRIPT"
  err "请确认仓库完整后再试"
  exit 1
fi
