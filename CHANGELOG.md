# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.6](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.1.5...v0.1.6) (2026-07-06)


### 🐛 修复

* pm2-start-bot.sh 启动前加载 .env 文件使 API 密钥生效 ([281a3db](https://github.com/u1in/reasonix-feishu-deploy/commit/281a3db38f1c0ab367a208bb1a37fe2331b6d58d))


### 📝 文档

* 将常用命令提到快速开始板块，去重并精简章节结构 ([edb9037](https://github.com/u1in/reasonix-feishu-deploy/commit/edb9037705a4f3609c203e5a2d9a60234134f0ff))

## [0.1.5](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.1.4...v0.1.5) (2026-07-06)


### 🐛 修复

* 移除 ecosystem 文件的 existsSync 守卫，确保每次 setup 都重新生成正确的 cwd ([8961f24](https://github.com/u1in/reasonix-feishu-deploy/commit/8961f24529f0eea916ece5fa5dff23f45b67725a))

## [0.1.4](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.1.3...v0.1.4) (2026-07-06)


### 🐛 修复

* bot config not loaded due to wrong cwd in PM2 ecosystem ([f63138a](https://github.com/u1in/reasonix-feishu-deploy/commit/f63138a3965e2fd46773a789028c2b43a445a773))

## [0.1.3](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.1.2...v0.1.3) (2026-07-06)


### 📝 文档

* 在 README 中新增发布新版本指引，更新 release 脚本为完整自动化链 ([30f4a6c](https://github.com/u1in/reasonix-feishu-deploy/commit/30f4a6cd52cdea4f8326e23a6dcf82b12ae261fd))

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
