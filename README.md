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

# 静默安装（跳过交互）
npx @u1in/reasonix-feishu-deploy \
  --app-id=cli_a5f8d2e1a3b4c0d0 \
  --app-secret=xxxxx \
  --api-key=sk-xxxxx \
  --yes
```

### 安装参数

| 参数 | 说明 |
|------|------|
| `--app-id <id>` | 飞书 App ID |
| `--app-secret <secret>` | 飞书 App Secret（自动写入 PM2 配置） |
| `--api-key <key>` | DeepSeek API Key（自动写入 PM2 配置） |
| `--allow-all` / `--no-allow-all` | 白名单策略（默认允许所有人） |
| `--require-mention` / `--no-require-mention` | 群聊是否需要 @Bot 回复 |
| `--users <id1,id2,...>` | 指定允许的飞书用户 Open ID |
| `--startup` / `--no-startup` | PM2 开机自启 |
| `--start` / `--no-start` | 安装后立即启动 Bot |
| `--add-aliases` / `--no-add-aliases` | 添加 rb-* 别名 |
| `--yes` / `-y` | 跳过所有确认提示 |

## 2. 卸载

```bash
# 交互式卸载
npx @u1in/reasonix-feishu-deploy --uninstall

# 静默卸载
npx @u1in/reasonix-feishu-deploy --uninstall --yes

# 静默卸载 + 全量清理
npx @u1in/reasonix-feishu-deploy --uninstall --yes \
  --remove-sessions --remove-env --force-remove-dir
```

### 卸载参数

| 参数 | 说明 |
|------|------|
| `--remove-config` / `--no-remove-config` | 删除配置文件（默认是） |
| `--remove-sessions` / `--no-remove-sessions` | 删除会话记忆（默认否） |
| `--remove-logs` / `--no-remove-logs` | 删除 PM2 日志（默认是） |
| `--remove-env` / `--no-remove-env` | 删除 .env 密钥（默认否） |
| `--remove-aliases` / `--no-remove-aliases` | 移除 Shell 别名（默认是） |
| `--remove-reasonix` / `--no-remove-reasonix` | 卸载 reasonix CLI（默认否） |
| `--remove-pm2` / `--no-remove-pm2` | 卸载 PM2（默认否） |
| `--force-remove-dir` / `--no-force-remove-dir` | 强制删除配置目录（默认否） |
| `--yes` / `-y` | 跳过所有确认提示 |

## 3. 日常管理

```bash
pm2 status                    # 状态
pm2 logs reasonix-bot         # 日志
pm2 restart reasonix-bot      # 重启
pm2 stop reasonix-bot         # 停止
pm2 start reasonix-bot        # 启动
```

> 看到 `feishu sdk websocket connected` 表示连接成功。

安装了 rb-* 别名后可简写：`rb-logs` / `rb-restart` / `rb-status`。

### 修改配置

```bash
vim ~/.config/reasonix-bot/reasonix.toml   # Bot 配置（白名单、通道、模型等）
vim ~/.config/reasonix-bot/ecosystem.config.js  # API 密钥（重启后生效）
# 改完后重启: pm2 restart reasonix-bot
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

> 想换其他大模型？安装后编辑 `~/.config/reasonix-bot/reasonix.toml`，修改 `[llm]` 下的 `provider` 和 `api_key` 即可切换任何兼容 OpenAI 接口的模型。

## 6. 前提条件

- Linux 操作系统（apt/yum 包管理）
- root 或 sudo 权限（安装 Node.js、配置开机自启时需要）

## 7. 发布新版本

```bash
npm run release        # 自动 Bump patch
npm run release:minor  # 次版本
npm run release:major  # 主版本
npm run release:dry    # 预览
```

## 8. 相关链接

- [Reasonix 官网](https://reasonix.ai)
- [飞书开放平台](https://open.feishu.cn/)
