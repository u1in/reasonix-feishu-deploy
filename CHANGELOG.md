# Changelog

## [0.1.1] — 2026-07-06

### Fixed

- **cli.sh 路径解析** — 修复通过 npx 运行时 `dirname "$0"` 获取到 `.bin/` 软链接路径的 bug，改用 `readlink -f` 解析真实路径。

## [0.1.0] — 2026-07-06

### Changed

- **统一 npx 入口** — 移除 `curl | bash` 远程下载模式，唯一安装方式为 `npx @u1in/reasonix-feishu-deploy`
- **cli.sh** — 新增 `--uninstall` 标志路由，`npx @u1in/reasonix-feishu-deploy --uninstall` 调用卸载流程
- **精简依赖处理** — 移除所有冗余的 `npm install prompts` 逻辑，依赖由 npx 自动安装
- **移除 `uninstall.sh`** — 卸载统一走 `npx --uninstall`
- **README 文档同步** — 更新安装/卸载说明
- **package.json** — 精简 description，补充 author.email

### Removed

- `install.sh` 中 git clone / tarball 下载 / trap cleanup 等远程获取逻辑
- `setup.mjs` 中冗余的 Node.js 版本检查
- 安装时不再复制卸载脚本到 `~/.config/reasonix-bot/`
