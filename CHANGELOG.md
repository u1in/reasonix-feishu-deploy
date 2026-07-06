# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.4.2](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.4.1...v0.4.2) (2026-07-06)


### 🚀 新功能

* add step progress banner, clear screen between steps ([fb4db4e](https://github.com/u1in/reasonix-feishu-deploy/commit/fb4db4e7e68e96f23b4123edd4c17bad11080e50))

## [0.4.1](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.4.0...v0.4.1) (2026-07-06)


### ♻️ 重构

* simplify prompts, remove --yes mode, fix bugs ([502fb06](https://github.com/u1in/reasonix-feishu-deploy/commit/502fb06f58a80f846837ac17d05926354d5a7964))


### 🔧 杂项

* rename setup.mjs→deploy.mjs, uninstall.mjs→undeploy.mjs ([c9f62dd](https://github.com/u1in/reasonix-feishu-deploy/commit/c9f62dd36d3941217feb40bdb7ba8828b91a0376))

## [0.4.0](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.3.2...v0.4.0) (2026-07-06)


### ♻️ 重构

* abandon REASONIX_HOME isolation, use config merge instead ([fe7905e](https://github.com/u1in/reasonix-feishu-deploy/commit/fe7905e425aa4b595fa595b7e6660482365b020a))

## [0.3.2](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.3.0...v0.3.2) (2026-07-06)


### 🐛 修复

* pre-create $REASONIX_HOME/config.toml with [bot] enabled = true ([6fabd06](https://github.com/u1in/reasonix-feishu-deploy/commit/6fabd061b3a837eabf12bc31190316f2b751b2c6))
* 预创建 REASONIX_HOME/config.toml 守卫文件，阻断用户本地配置泄漏 ([2285d58](https://github.com/u1in/reasonix-feishu-deploy/commit/2285d5863f6163539d217fc89e2f7b531ebec66c))


### ♻️ 重构

* 使用 REASONIX_HOME 守卫文件完全隔离用户本地配置 ([00b61b0](https://github.com/u1in/reasonix-feishu-deploy/commit/00b61b05083c265b8503abd28e42b0fddd7a6362))

## [0.3.1](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.3.0...v0.3.1) (2026-07-06)


### 🐛 修复

* pre-create $REASONIX_HOME/config.toml with [bot] enabled = true to prevent reasonix auto-creating disabled bot config ([b1349b8](https://github.com/u1in/reasonix-feishu-deploy/commit/b1349b80c3b248f69068d60ea0b4faffea286528))

## [0.3.0](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.2.1...v0.3.0) (2026-07-06)


### ⚠ BREAKING CHANGES

* .env file is no longer generated. API keys are now
directly embedded in PM2 ecosystem.config.js env block.

### ♻️ 重构

* remove .env file, pass API keys via PM2 ecosystem env ([303cccc](https://github.com/u1in/reasonix-feishu-deploy/commit/303cccca0a5f82cb97da6f17b2f61a23c2c37a7c))


### 📝 文档

* 在 README 标题下添加 npm/GitHub 徽章 ([3a71377](https://github.com/u1in/reasonix-feishu-deploy/commit/3a71377125d47692198e7482f6b7205940092a40))


### 🔧 杂项

* remove apikey.env.example — no longer needed ([845dfc7](https://github.com/u1in/reasonix-feishu-deploy/commit/845dfc7b0c565e636a87cdaabeabbc21cb207a17))

## [0.2.1](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.2.0...v0.2.1) (2026-07-06)


### 🐛 修复

* 设置 REASONIX_HOME 阻止用户级配置覆盖 bot 配置 ([8bf667c](https://github.com/u1in/reasonix-feishu-deploy/commit/8bf667c1fe720fdcd2bc9aedc77341c9a872bd74))

## [0.2.0](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.1.8...v0.2.0) (2026-07-06)


### 🚀 新功能

* 支持卸载静默模式，重构 README，修复 setup --yes 确认提示阻塞 ([5e447b2](https://github.com/u1in/reasonix-feishu-deploy/commit/5e447b23e7c143964af238be67804b09fb5800b5))

## [0.1.8](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.1.7...v0.1.8) (2026-07-06)


### 🐛 修复

* 默认关闭 memory_v5 执行编译器，会话间不共享上下文 ([9416402](https://github.com/u1in/reasonix-feishu-deploy/commit/941640212595429aa6d687e5d7bfba764c076f13))

## [0.1.7](https://github.com/u1in/reasonix-feishu-deploy/compare/v0.1.6...v0.1.7) (2026-07-06)


### 🐛 修复

* rb-uninstall 别名改为指向本地卸载脚本，与安装版本绑定 ([ce23410](https://github.com/u1in/reasonix-feishu-deploy/commit/ce23410f3fdba85ba521d9f49bfdb7e6f33a8ade))

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
