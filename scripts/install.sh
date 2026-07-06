#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot — 一键安装脚本
# 始终从 GitHub 拉取最新代码到临时目录执行安装。
# 支持 curl | bash 和本地 bash scripts/install.sh 两种方式。
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}◇${NC}  $*" >&2; }
ok()    { echo -e "${GREEN}✓${NC}  $*" >&2; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*" >&2; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }

# ── GitHub 代理（国内加速） ──
GH_PROXY="https://ghproxy.net/"
REPO_URL="https://github.com/u1in/reasonix-feishu-deploy.git"
TAR_URL="https://api.github.com/repos/u1in/reasonix-feishu-deploy/tarball/main"

# ── 克隆仓库到临时目录 ──
clone_repo() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  info "正在获取最新安装包..."

  # 尝试 1: git clone 走代理（国内加速）
  if git clone --depth 1 --single-branch "${GH_PROXY}${REPO_URL}" "$tmp_dir" 2>/dev/null; then
    echo "$tmp_dir"
    return
  fi

  # 尝试 2: git clone 直连
  if git clone --depth 1 --single-branch "$REPO_URL" "$tmp_dir" 2>/dev/null; then
    echo "$tmp_dir"
    return
  fi

  # 回退：下载 tar 包
  info "git 克隆失败，尝试下载压缩包..."
  if command -v curl &>/dev/null; then
    curl -fsSL "${GH_PROXY}${TAR_URL}" -o "$tmp_dir/repo.tar.gz" && download_extract "$tmp_dir" && return
    curl -fsSL "$TAR_URL" -o "$tmp_dir/repo.tar.gz" && download_extract "$tmp_dir" && return
  elif command -v wget &>/dev/null; then
    wget -qO "$tmp_dir/repo.tar.gz" "${GH_PROXY}${TAR_URL}" && download_extract "$tmp_dir" && return
    wget -qO "$tmp_dir/repo.tar.gz" "$TAR_URL" && download_extract "$tmp_dir" && return
  fi

  err "下载失败，请检查网络连接后重试"
  rm -rf "$tmp_dir"
  exit 1
}

download_extract() {
  local tmp_dir="$1"
  local extract_dir="$tmp_dir/extracted"
  mkdir -p "$extract_dir"
  tar xzf "$tmp_dir/repo.tar.gz" -C "$extract_dir" --strip-components=1 2>/dev/null || return 1
  rm -f "$tmp_dir/repo.tar.gz"
  # 把内容移到 tmp_dir 根目录
  mv "$extract_dir"/* "$tmp_dir" 2>/dev/null || true
  rm -rf "$extract_dir"
}

# ── 安装 Node.js（如果缺失） ──
install_node() {
  warn "未找到 Node.js，正在通过 nvm 安装 Node 22 LTS..."
  local nvm_url="${GH_PROXY}https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh"
  if command -v curl &>/dev/null; then
    curl -fsSL "$nvm_url" | bash
  elif command -v wget &>/dev/null; then
    wget -qO- "$nvm_url" | bash
  else
    err "需要 curl 或 wget 来安装 nvm"
    exit 1
  fi
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 22
  nvm use 22
  nvm alias default 22
}

# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

# 克隆最新代码到临时目录
CLONE_DIR="$(clone_repo)"
PACKAGE_DIR="$CLONE_DIR"
cleanup() { rm -rf "$CLONE_DIR"; }
trap cleanup EXIT
ok "安装包已就绪"

SETUP_SCRIPT="$PACKAGE_DIR/scripts/setup.mjs"

# ── Banner ──
echo ""
echo -e "${GREEN}  ╭──────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}  │                                              │${NC}"
echo -e "${GREEN}  │   🤖  Reasonix 飞书 Bot — 一键部署          │${NC}"
echo -e "${GREEN}  │                                              │${NC}"
echo -e "${GREEN}  ╰──────────────────────────────────────────────╯${NC}"
echo ""

# Step 1: Node.js
if ! command -v node &>/dev/null; then
  install_node
else
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    warn "Node.js 版本过低 ($(node -v))，准备升级..."
    install_node
  else
    ok "Node.js $(node -v)"
  fi
fi

# Step 2: 安装依赖（prompts）
info "检查依赖..."
if ! node -e "require('prompts')" 2>/dev/null; then
  info "正在安装 prompts..."
  npm install -g prompts 2>/dev/null || true
  if ! node -e "require('prompts')" 2>/dev/null; then
    warn "prompts 全局安装失败，setup.mjs 将尝试自动安装"
  fi
fi
ok "依赖就绪"

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
