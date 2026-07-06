#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot 部署套件 — 版本号管理 + Changelog + 发布
# 用法: bash scripts/bump-version.sh <patch|minor|major>
# 示例: bash scripts/bump-version.sh patch   # bump + changelog + tag + push + publish
#       bash scripts/bump-version.sh minor
#       bash scripts/bump-version.sh major
#
# 等价于: npm run release[:minor|:major]
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}◇${NC}  $*" >&2; }
ok()    { echo -e "${GREEN}✓${NC}  $*" >&2; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }

if [ $# -ne 1 ]; then
  echo "用法: bash scripts/bump-version.sh <patch|minor|major>"
  exit 1
fi

TYPE="$1"
if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  err "版本类型必须是 patch、minor 或 major"
  exit 1
fi

# 检查工作区是否干净
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  err "工作区有未提交的更改，请先提交"
  exit 1
fi

OLD_VERSION="$(node -p "require('./package.json').version")"
info "当前版本: v$OLD_VERSION"
info "升级类型: $TYPE"
echo ""

# ── Step 1: bump + changelog + commit + tag ──
info "Step 1/3 — 更新版本号、CHANGELOG、commit、tag..."
RELEASE_ARGS=()
if [ "$TYPE" != "patch" ]; then
  RELEASE_ARGS+=(--release-as "$TYPE")
fi
npx commit-and-tag-version "${RELEASE_ARGS[@]}"

NEW_VERSION="$(node -p "require('./package.json').version")"
ok "v${OLD_VERSION} → v${NEW_VERSION}"

# ── Step 2: push to remote ──
echo ""
info "Step 2/3 — 推送到远程..."
git push --follow-tags
ok "推送完成"

# ── Step 3: publish to npm ──
echo ""
info "Step 3/3 — 发布到 npm..."
npm publish --registry=https://registry.npmjs.org
ok "v${NEW_VERSION} 已发布到 npm"

echo ""
echo -e "${GREEN}  ✓  发布完成: v${OLD_VERSION} → v${NEW_VERSION}${NC}"
