# @u1in/reasonix-feishu-deploy — 一键部署套件

🤖 在任何 Linux 机器上 **一键部署** Reasonix AI Bot，接入飞书即时通讯。

## 快速开始

```bash
npx @u1in/reasonix-feishu-deploy
```

安装向导会自动完成：环境检查 → 密钥录入 → 配置文件生成 → PM2 启动。

安装过程中会提示输入以下密钥（也可安装后修改 `~/.config/reasonix-bot/.env`）：

| 密钥 | 必填 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek 平台 [申请](https://platform.deepseek.com/) |
| `FEISHU_BOT_APP_SECRET` | ✅ | 飞书开放平台 → 应用 → 凭证与基础信息 |

## 文件结构

```
reasonix-feishu-deploy/
├── package.json              # npm 包元信息
├── README.md                 # 本文件
├── scripts/
│   ├── cli.sh               # 🚀 CLI 入口（npx 执行，安装/卸载路由）
│   ├── setup.mjs             # 交互式 Node.js 配置向导
│   ├── uninstall.mjs         # 交互式卸载向导
│   ├── pm2-start-bot.sh      # PM2 启动脚本
│   └── pm2-stop-bot.sh       # PM2 停止脚本
└── config/
    ├── reasonix.toml         # Reasonix 配置文件模板
    └── apikey.env.example    # API 密钥示例文件
```

## 安装流程

只需运行 `npx @u1in/reasonix-feishu-deploy`，安装脚本会自动完成以下步骤：

| 步骤 | 说明 |
|------|------|
| 1. 检查/安装 Node.js | 如果未安装则通过 nvm 安装 Node 22 LTS |
| 2. 安装 reasonix CLI | `npm i -g reasonix@next` |
| 3. 配置 reasonix | 生成 `~/.config/reasonix-bot/reasonix.toml` + 交互式录入 API 密钥 |
| 4. 配置 PM2 守护进程 | 安装 PM2、生成 ecosystem 配置、可选开机自启 |
| 5. Shell 别名 | 可选添加 rb-* 快捷命令到 Shell 配置 |
| 6. 启动 Bot | 通过 PM2 启动 reasonix-bot |

安装脚本自动调用 `setup.mjs` 交互式向导完成所有配置。

CLI 参数也可直接传给 `npx`，会自动透传给安装向导：

```bash
npx @u1in/reasonix-feishu-deploy --app-id=cli_a5f8d2e1 --yes
```

## setup.mjs CLI 参数

`setup.mjs` 支持命令行参数传递配置值，无需交互输入，适合自动化安装：

```bash
# 全自动安装（无交互）
node scripts/setup.mjs \
  --app-id=cli_a5f8d2e1a3b4c0d0 \
  --app-secret=xxxxx \
  --api-key=sk-xxxxx \
  --start \
  --yes
```

| 参数 | 说明 |
|------|------|
| `--app-id <id>` | 飞书 App ID |
| `--app-secret <secret>` | 飞书 App Secret（自动保存到 .env） |
| `--api-key <key>` | DeepSeek API Key（自动保存到 .env） |
| `--allow-all` / `--no-allow-all` | 白名单策略（默认允许所有用户） |
| `--require-mention` / `--no-require-mention` | 群聊是否需要 @Bot 才回复 |
| `--users <id1,id2,...>` | 指定允许的飞书用户 Open ID |
| `--startup` / `--no-startup` | PM2 开机自启 |
| `--start` / `--no-start` | 安装后是否立即启动 Bot |
| `--add-aliases` / `--no-add-aliases` | 是否添加 rb-* 别名 |
| `--uninstall` | 调用卸载流程，删除配置、PM2 进程、Shell 别名等 |
| `--yes` / `-y` | 跳过所有确认提示和飞书配置检查 |

## 卸载

```bash
npx @u1in/reasonix-feishu-deploy --uninstall
```

交互式卸载向导会逐步引导你删除 PM2 进程、配置文件、Shell 别名和全局 CLI。

## 安装后的目录结构

安装后，所有运行时配置和脚本位于 `~/.config/reasonix-bot/`：

```
~/.config/reasonix-bot/
├── .env                  # API 密钥（已生成）
├── reasonix.toml         # Reasonix 配置（已生成）
├── ecosystem.config.js   # PM2 进程配置
├── pm2-start-bot.sh      # 启动脚本
└── pm2-stop-bot.sh       # 停止脚本
```

安装时还可选择添加 `rb-*` 快捷别名到 Shell 配置（`~/.zshrc` / `~/.bashrc`）：

```bash
rb-start        # 启动 Bot
rb-stop         # 停止 Bot
rb-restart      # 重启 Bot
rb-logs         # 查看日志
rb-status       # 查看状态
rb-uninstall    # 一键卸载
```

## 日常管理

### 通过 npm scripts

```bash
# 从项目根目录
npm run start   # 启动
npm run stop    # 停止
```

### 通过 PM2 命令

```bash
pm2 status                  # 查看所有进程状态
pm2 logs reasonix-bot       # 查看实时日志
pm2 stop reasonix-bot       # 停止
pm2 restart reasonix-bot    # 重启
pm2 delete reasonix-bot     # 删除进程
```

### 通过安装脚本

```bash
~/.config/reasonix-bot/pm2-start-bot.sh    # 启动
~/.config/reasonix-bot/pm2-stop-bot.sh     # 停止
```

### 通过 rb-* 别名（安装时可选择添加）

```bash
rb-start        # 启动
rb-stop         # 停止
rb-restart      # 重启
rb-logs         # 查看日志
rb-status       # 查看状态
rb-uninstall    # 卸载
```

### 修改配置

```bash
vim ~/.config/reasonix-bot/reasonix.toml   # 修改 Reasonix 配置
vim ~/.config/reasonix-bot/.env            # 修改 API 密钥
```

修改后重启 Bot 生效：

```bash
pm2 restart reasonix-bot
```

## 卸载

```bash
npx @u1in/reasonix-feishu-deploy --uninstall

# 或通过安装时配置的别名
rb-uninstall
```

卸载脚本会清理：PM2 进程、`~/.config/reasonix-bot/` 目录、Shell 别名、可选的 reasonix CLI 和 PM2 全局包。

## 前提条件

- Linux 操作系统（支持 apt/yum 包管理）
- root 或 sudo 权限（安装 Node.js、配置开机自启时需要）
- 可选的飞书应用凭证（已注册并获取 App ID + App Secret）

## 相关链接

- [Reasonix](https://reasonix.ai) — Reasonix 官网
- [飞书开放平台](https://open.feishu.cn/) — 创建飞书应用
