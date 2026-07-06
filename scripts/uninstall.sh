#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot — 一键卸载脚本
# 支持 curl | bash 方式快速卸载（无需克隆仓库），也支持本地运行。
# 确保 Node.js 环境就绪后，自动进入交互式卸载向导 (uninstall.mjs)。
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}◇${NC}  $*" >&2; }
ok()    { echo -e "${GREEN}✓${NC}  $*" >&2; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*" >&2; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }

# ── 尝试定位本地包目录 ──
find_package_dir() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" 2>/dev/null && pwd 2>/dev/null || echo '')"
  local pkg_dir="$script_dir"
  # 从 git 仓库运行时（scripts/ 子目录）
  if [[ "$(basename "$pkg_dir" 2>/dev/null)" == "scripts" ]]; then
    pkg_dir="$(dirname "$pkg_dir")"
  fi
  if [[ -f "$pkg_dir/scripts/uninstall.mjs" && -f "$pkg_dir/config/reasonix.toml" ]]; then
    echo "$pkg_dir"
    return
  fi
  # 从 ~/.config/reasonix-bot/ 运行时（uninstall.mjs 在脚本同目录）
  if [[ -f "$script_dir/uninstall.mjs" ]]; then
    echo "$script_dir"
    return
  fi
  echo ""
}

# ── GitHub 代理（国内加速） ──
GH_PROXY="https://ghproxy.net/"

# ── 克隆仓库到临时目录 ──
REPO_URL="https://github.com/u1in/reasonix-feishu-deploy.git"
TAR_URL="https://api.github.com/repos/u1in/reasonix-feishu-deploy/tarball/main"
clone_repo() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  info "检测到远程模式，正在克隆仓库..."

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

UNINSTALL_SCRIPT="$PACKAGE_DIR/scripts/uninstall.mjs"

# ── 主流程 ──
echo ""
echo -e "${RED}  ╭──────────────────────────────────────────────╮${NC}"
echo -e "${RED}  │                                              │${NC}"
echo -e "${RED}  │   🗑️   Reasonix 飞书 Bot — 一键卸载          │${NC}"
echo -e "${RED}  │                                              │${NC}"
echo -e "${RED}  ╰──────────────────────────────────────────────╯${NC}"
echo ""

# Step 1: Node.js
if ! command -v node &>/dev/null; then
  err "未检测到 Node.js，卸载向导需要 Node.js 环境"
  err "请先安装 Node.js >= 18 后再试"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Node.js 版本过低 ($(node -v))，请升级到 >= 18"
  exit 1
fi
ok "Node.js $(node -v)"

# Step 2: 检查依赖（prompts）
info "检查依赖..."
if ! node -e "require('prompts')" 2>/dev/null; then
  info "正在安装 prompts..."
  npm install -g prompts 2>/dev/null || true
  if ! node -e "require('prompts')" 2>/dev/null; then
    cd "$PACKAGE_DIR" && npm install --ignore-scripts 2>/dev/null || true
  fi
fi
ok "依赖就绪"

# Step 3: 进入交互式卸载向导
echo ""
info "启动交互式卸载向导..."
echo ""

if [ -f "$UNINSTALL_SCRIPT" ]; then
  node "$UNINSTALL_SCRIPT" </dev/tty
else
  err "未找到卸载脚本: $UNINSTALL_SCRIPT"
  err "请确认仓库完整后再试"
  exit 1
fi
