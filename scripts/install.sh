#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot — 一键安装脚本
# 推荐方式: npx @u1in/reasonix-feishu-deploy
# 也支持:   bash scripts/install.sh（本地仓库）或 curl ... | bash（备选）
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

if [ -f "$SCRIPT_DIR/setup.mjs" ] && [ -f "$PACKAGE_DIR/config/reasonix.toml" ]; then
  # 从 npm 包或 git 仓库运行 — 本地文件可用
  :  # PACKAGE_DIR 已经正确
elif [ -f "$PACKAGE_DIR/scripts/setup.mjs" ] && [ -f "$PACKAGE_DIR/config/reasonix.toml" ]; then
  # $0 是 scripts/install.sh，dirname 得到 scripts/，再 dirname 得到包根目录
  :  # PACKAGE_DIR 已经正确
else
  # curl | bash 模式，或本地文件不完整—从 GitHub 克隆
  warn "未找到本地安装文件，正在从 GitHub 获取..."
  TMP_DIR="$(mktemp -d)"
  PACKAGE_DIR="$TMP_DIR"
  cleanup() { rm -rf "$TMP_DIR"; }
  trap cleanup EXIT

  if git clone --depth 1 --single-branch "https://github.com/u1in/reasonix-feishu-deploy.git" "$TMP_DIR" 2>/dev/null; then
    :  # clone 成功
  elif command -v curl &>/dev/null; then
    info "git 不可用，尝试下载压缩包..."
    curl -fsSL "https://api.github.com/repos/u1in/reasonix-feishu-deploy/tarball/main" -o "$TMP_DIR/repo.tar.gz" && \
      tar xzf "$TMP_DIR/repo.tar.gz" -C "$TMP_DIR" --strip-components=1 && \
      rm -f "$TMP_DIR/repo.tar.gz"
  elif command -v wget &>/dev/null; then
    info "git 不可用，尝试下载压缩包..."
    wget -qO "$TMP_DIR/repo.tar.gz" "https://api.github.com/repos/u1in/reasonix-feishu-deploy/tarball/main" && \
      tar xzf "$TMP_DIR/repo.tar.gz" -C "$TMP_DIR" --strip-components=1 && \
      rm -f "$TMP_DIR/repo.tar.gz"
  else
    err "下载失败，请检查网络连接后重试"
    exit 1
  fi
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

# Step 1: Node.js
if ! command -v node &>/dev/null; then
  warn "未找到 Node.js，请先安装 Node.js >= 18"
  warn "推荐使用 nvm: curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Node.js 版本过低 ($(node -v))，请升级到 >= 18"
  exit 1
fi
ok "Node.js $(node -v)"

# Step 2: 安装依赖（ESM import 不查找全局包，需在本地 node_modules 安装）
info "检查依赖..."
cd "$PACKAGE_DIR"
if [ -d node_modules/prompts ]; then
  ok "依赖就绪"
else
  info "正在安装 prompts..."
  npm install prompts 2>/dev/null && ok "依赖就绪" || warn "prompts 安装失败，请手动执行: npm install prompts"
fi

# Step 3: 进入交互式向导
echo ""
info "启动交互式配置向导..."
echo ""

if [ -f "$SETUP_SCRIPT" ]; then
  node "$SETUP_SCRIPT" "$@" </dev/tty
else
  err "未找到向导脚本: $SETUP_SCRIPT"
  err "请确认仓库完整后再试"
  exit 1
fi
