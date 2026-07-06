#!/usr/bin/env bash
# =============================================================================
# Reasonix 飞书 Bot 部署套件 — 版本号管理
# 用法: bash scripts/bump-version.sh <patch|minor|major>
# 示例: bash scripts/bump-version.sh patch   # 1.0.0 → 1.0.1
#       bash scripts/bump-version.sh minor   # 1.0.0 → 1.1.0
#       bash scripts/bump-version.sh major   # 1.0.0 → 2.0.0
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -ne 1 ]; then
  echo "用法: bash scripts/bump-version.sh <patch|minor|major>"
  exit 1
fi

TYPE="$1"
if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "错误: 版本类型必须是 patch、minor 或 major"
  exit 1
fi

# 检查工作区是否干净
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "错误: 工作区有未提交的更改，请先提交"
  exit 1
fi

OLD_VERSION="$(node -p "require('./package.json').version")"
echo "当前版本: v$OLD_VERSION"
echo "升级类型: $TYPE"
echo ""

# 使用 npm version 更新 package.json、创建 git commit 和 tag
npm version "$TYPE" --no-git-tag-version

NEW_VERSION="$(node -p "require('./package.json').version")"

# 创建 git commit 和 tag
git add package.json
git commit -m "chore: bump version to v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

echo ""
echo "  ✓ v${OLD_VERSION} → v${NEW_VERSION}"
echo ""
echo "  推送: git push origin main v${NEW_VERSION}"
