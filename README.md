# @u1in/reasonix-feishu-deploy

[![npm version](https://img.shields.io/npm/v/@u1in/reasonix-feishu-deploy?logo=npm&logoColor=fff)](https://www.npmjs.com/package/@u1in/reasonix-feishu-deploy)
[![npm downloads](https://img.shields.io/npm/dm/@u1in/reasonix-feishu-deploy?logo=npm&logoColor=fff)](https://www.npmjs.com/package/@u1in/reasonix-feishu-deploy)
[![License](https://img.shields.io/npm/l/@u1in/reasonix-feishu-deploy)](https://github.com/u1in/reasonix-feishu-deploy/blob/main/LICENSE)
[![Node version](https://img.shields.io/node/v/@u1in/reasonix-feishu-deploy?logo=node.js&logoColor=fff)](https://www.npmjs.com/package/@u1in/reasonix-feishu-deploy)
[![GitHub last commit](https://img.shields.io/github/last-commit/u1in/reasonix-feishu-deploy?logo=github&logoColor=fff)](https://github.com/u1in/reasonix-feishu-deploy/commits)
[![GitHub stars](https://img.shields.io/github/stars/u1in/reasonix-feishu-deploy?logo=github&logoColor=fff)](https://github.com/u1in/reasonix-feishu-deploy)

🤖 在 Linux 上**一键部署** Reasonix AI Bot，接入飞书即时通讯。

## 1. 安装

```bash
# 交互式安装
npx @u1in/reasonix-feishu-deploy

# 通过命令行参数预填
npx @u1in/reasonix-feishu-deploy \
  --app-id=cli_a5f8d2e1a3b4c0d0 \
  --app-secret=xxxxx \
  --api-key=sk-xxxxx
```

### 安装参数

| 参数 | 说明 |
|------|------|
| `--app-id <id>` | 飞书 App ID |
| `--app-secret <secret>` | 飞书 App Secret |
| `--api-key <key>` | DeepSeek API Key |
| `--add-aliases` / `--no-add-aliases` | 添加 rb-* 快捷命令 |

> 安装时如果检测到 `~/.reasonix/config.toml`（个人 Reasonix 配置），会自动备份并与其合并，保留你已有的 UI 主题、自定义 Provider、工具配置等非 Bot 设置。

## 2. 卸载

```bash
# 交互式卸载
npx @u1in/reasonix-feishu-deploy --undeploy

# 卸载并清理全部
npx @u1in/reasonix-feishu-deploy --undeploy \
  --force-remove-dir
```

### 卸载参数

| 参数 | 说明 |
|------|------|
| `--remove-reasonix` / `--no-remove-reasonix` | 卸载 reasonix CLI（默认否） |
| `--remove-pm2` / `--no-remove-pm2` | 卸载 PM2（默认否） |
| `--force-remove-dir` / `--no-force-remove-dir` | 强制删除配置目录（默认否） |

> 卸载时会询问是否还原 `~/.reasonix/config.toml` 到备份时的状态（安装时会自动备份 `config.toml.deploy-bak`）。

## 3. 日常管理

安装时选择添加 rb-* 别名后，可使用快捷命令：

```bash
rb-start              # 启动 Bot
rb-stop               # 停止 Bot
rb-restart            # 重启 Bot
rb-status             # 状态
rb-logs               # 查看日志
rb-undeploy           # 卸载
```

> 看到 `feishu sdk websocket connected` 表示连接成功。

未安装别名时，使用 PM2 原始命令：

```bash
pm2 start ~/.config/reasonix-bot/ecosystem.config.js   # 启动
pm2 stop reasonix-bot                                   # 停止
pm2 restart reasonix-bot                                # 重启
pm2 status                                              # 状态
pm2 logs reasonix-bot                                   # 日志
node ~/.config/reasonix-bot/undeploy.mjs                # 卸载
```

### 修改配置

```bash
vim ~/.reasonix/config.toml                                    # 用户级配置（白名单、通道、模型等）
vim ~/.config/reasonix-bot/ecosystem.config.js                 # DeepSeek Key / 飞书 Secret
# 改完后重启: rb-restart 或 pm2 restart reasonix-bot
```

## 4. 配置机器人

在[飞书开放平台](https://open.feishu.cn/)创建应用，完成以下配置：

1. **凭证与基础信息** → 获取 App ID 和 App Secret
2. **权限管理** → 添加 `im:message`、`im:message.p2p_msg:readonly` 权限
3. **事件与回调** → 订阅方式选「**通过长连接接收事件**」，添加 `im.message.receive_v1`
4. **发布** → 右上角发布新版本（不发布不生效）

## 5. LLM 配置

安装时需要填写 API Key，可在 [platform.deepseek.com](https://platform.deepseek.com/) 获取：

1. 注册/登录 → **API Keys** → 创建并复制 Key（只显示一次）
2. 新账号默认有 500 万 token 赠额；余额不足会返回 429

> 想换其他大模型？编辑 `~/.reasonix/config.toml`，修改 `[[providers]]` 下的模型配置即可切换任何兼容 OpenAI 接口的模型。

## 6. 前提条件

- Linux 操作系统（apt/yum 包管理）
- root 或 sudo 权限（安装 Node.js 时需要）

## 7. 配置结构

```
~/.config/reasonix-bot/
├── ecosystem.config.js      PM2 配置（含 DeepSeek Key / 飞书 Secret）
├── pm2-start-bot.sh         启动脚本
├── pm2-stop-bot.sh          停止脚本
└── undeploy.mjs             卸载脚本

~/.reasonix/
├── config.toml              用户级 Reasonix 配置（含 Bot 设置，安装时与个人配置合并）
└── config.toml.deploy-bak   安装前备份（卸载时可还原）
```

## 8. 发布新版本

```bash
npm run release        # 自动 Bump patch
npm run release:minor  # 次版本
npm run release:major  # 主版本
npm run release:dry    # 预览
```

## 9. 相关链接

- [Reasonix 官网](https://reasonix.ai)
- [飞书开放平台](https://open.feishu.cn/)
