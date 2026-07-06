#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot — 引导安装脚本
# 支持 curl | bash 方式快速部署（无需克隆仓库），也支持本地运行。
# 确保 Node.js 环境就绪后，自动进入交互式向导 (setup.mjs)。
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}◇${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
err()   { echo -e "${RED}✗${NC}  $*"; }

# ── 尝试定位本地包目录 ──
# 在本地运行（git clone 后）时，$0 是脚本路径，可找到同级 setup.mjs。
# 在 curl | bash 运行时，$0 无意义，需要 clone 仓库。
find_package_dir() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" 2>/dev/null && pwd 2>/dev/null || echo '')"
  local pkg_dir="$script_dir"
  if [[ "$(basename "$pkg_dir" 2>/dev/null)" == "scripts" ]]; then
    pkg_dir="$(dirname "$pkg_dir")"
  fi
  if [[ -f "$pkg_dir/scripts/setup.mjs" && -f "$pkg_dir/config/reasonix.toml" ]]; then
    echo "$pkg_dir"
  else
    echo ""
  fi
}

# ── GitHub 代理（国内加速） ──
# 只在远程安装模式中使用，不影响本地运行。
GH_PROXY="https://ghproxy.net/"

# ── 克隆仓库到临时目录 ──
REPO_URL="https://github.com/u1in/reasonix-feishu-deploy.git"
TAR_URL="https://api.github.com/repos/u1in/reasonix-feishu-deploy/tarball/main"
clone_repo() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  info "检测到远程安装模式，正在克隆仓库..."

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
  download_and_extract "$tmp_dir" "${GH_PROXY}${TAR_URL}" && return
  download_and_extract "$tmp_dir" "$TAR_URL" && return

  err "下载失败，请检查网络连接后重试"
  rm -rf "$tmp_dir"
  exit 1
}

# ── 下载 tar 包并解压 ──
download_and_extract() {
  local tmp_dir="$1"
  local url="$2"
  local tar_file="$tmp_dir/repo.tar.gz"

  if command -v curl &>/dev/null; then
    curl -fsSL "$url" -o "$tar_file" 2>/dev/null || return 1
  elif command -v wget &>/dev/null; then
    wget -qO "$tar_file" "$url" 2>/dev/null || return 1
  else
    return 1
  fi

  mkdir -p "$tmp_dir/extracted"
  tar xzf "$tar_file" -C "$tmp_dir/extracted" --strip-components=1 2>/dev/null || {
    rm -rf "$tmp_dir"
    return 1
  }
  rm -f "$tar_file"
  echo "$tmp_dir/extracted"
  return 0
}

# ── 确定包目录 ──
PACKAGE_DIR="$(find_package_dir)"
if [[ -z "$PACKAGE_DIR" ]]; then
  # curl | bash 模式：克隆仓库
  CLONE_DIR="$(clone_repo)"
  PACKAGE_DIR="$CLONE_DIR"
  # 注册退出时清理临时目录
  cleanup() { rm -rf "$CLONE_DIR"; }
  trap cleanup EXIT
  ok "仓库已下载"
fi

SETUP_SCRIPT="$PACKAGE_DIR/scripts/setup.mjs"

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

# ── 主流程 ──
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
  # 如果全局安装失败，尝试本地安装
  if ! node -e "require('prompts')" 2>/dev/null; then
    cd "$PACKAGE_DIR" && npm install --ignore-scripts 2>/dev/null || true
  fi
fi
ok "依赖就绪"

# Step 3: 进入交互式向导
echo ""
info "启动交互式配置向导..."
echo ""

if [ -f "$SETUP_SCRIPT" ]; then
  node "$SETUP_SCRIPT"
else
  err "未找到向导脚本: $SETUP_SCRIPT"
  err "请确认仓库完整后再试"
  exit 1
fi
