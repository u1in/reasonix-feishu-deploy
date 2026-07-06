# reasonix-feishu-deploy — 一键部署套件

🤖 在任何 Linux 机器上 **一键部署** Reasonix AI Bot，接入飞书即时通讯。

## 快速开始

```bash
# 方式一：本地运行（克隆仓库后）
bash scripts/install.sh

# 方式二：远程一键安装（无需克隆仓库）
curl -fsSL https://raw.githubusercontent.com/u1in/reasonix-feishu-deploy/main/scripts/install.sh | bash

# 方式三：国内加速安装（ghproxy 代理）
curl -fsSL https://ghproxy.net/https://raw.githubusercontent.com/u1in/reasonix-feishu-deploy/main/scripts/install.sh | bash
```

安装过程中会提示输入以下密钥（也可安装后修改 `~/.config/vercel-ai-tools/.env`）：

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
│   ├── install.sh            # 🚀 一键安装脚本（入口）
│   ├── setup.mjs             # 交互式 Node.js 配置向导
│   ├── uninstall.mjs         # 卸载脚本
│   ├── pm2-start-bot.sh      # PM2 启动脚本
│   └── pm2-stop-bot.sh       # PM2 停止脚本
└── config/
    ├── reasonix.toml         # Reasonix 配置文件模板
    └── apikey.env.example    # API 密钥示例文件
```

## install.sh 做了什么

远程模式下（`curl | bash`）会自动 git clone 仓库到临时目录，退出后自动清理，无需手动克隆。

安装流程：

| 步骤 | 说明 |
|------|------|
| 1. 检查/安装 Node.js | 如果未安装则通过 nvm 安装 Node 22 LTS |
| 2. 安装 reasonix CLI | `npm i -g reasonix@next` |
| 3. 配置 reasonix | 生成 `~/.config/vercel-ai-tools/config.toml` + 交互式录入 API 密钥 |
| 4. 配置 PM2 守护进程 | 安装 PM2、生成 ecosystem 配置、可选开机自启 |
| 5. 启动 Bot | 通过 PM2 启动 reasonix-bot |

安装脚本自动调用 `setup.mjs` 交互式向导完成所有配置。

## 安装后的目录结构

安装后，所有运行时配置和脚本位于 `~/.config/vercel-ai-tools/`：

```
~/.config/vercel-ai-tools/
├── .env                  # API 密钥（已生成）
├── config.toml           # Reasonix 配置（已生成）
├── ecosystem.config.js   # PM2 进程配置
├── pm2-start-bot.sh      # 启动脚本
└── pm2-stop-bot.sh       # 停止脚本
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
~/.config/vercel-ai-tools/pm2-start-bot.sh    # 启动
~/.config/vercel-ai-tools/pm2-stop-bot.sh     # 停止
```

### 修改配置

```bash
vim ~/.config/vercel-ai-tools/config.toml     # 修改 Reasonix 配置
vim ~/.config/vercel-ai-tools/.env            # 修改 API 密钥
```

修改后重启 Bot 生效：

```bash
pm2 restart reasonix-bot
```

## 卸载

```bash
# 从项目目录运行
node scripts/uninstall.mjs

# 或通过 npm script
npm run uninstall
```

卸载脚本会清理：PM2 进程、`~/.config/vercel-ai-tools/` 目录、可选的 reasonix CLI 和 PM2 全局包。

## 前提条件

- Linux 操作系统（支持 apt/yum 包管理）
- root 或 sudo 权限（安装 Node.js、配置开机自启时需要）
- 可选的飞书应用凭证（已注册并获取 App ID + App Secret）

## 相关链接

- [Reasonix](https://reasonix.ai) — Reasonix 官网
- [飞书开放平台](https://open.feishu.cn/) — 创建飞书应用
