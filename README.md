# @u1in/reasonix-feishu-deploy

> **[中文文档](README.zh.md)** | English

[![npm version](https://img.shields.io/npm/v/@u1in/reasonix-feishu-deploy?logo=npm&logoColor=fff)](https://www.npmjs.com/package/@u1in/reasonix-feishu-deploy)
[![npm downloads](https://img.shields.io/npm/dm/@u1in/reasonix-feishu-deploy?logo=npm&logoColor=fff)](https://www.npmjs.com/package/@u1in/reasonix-feishu-deploy)
[![License](https://img.shields.io/npm/l/@u1in/reasonix-feishu-deploy)](https://github.com/u1in/reasonix-feishu-deploy/blob/main/LICENSE)
[![Node version](https://img.shields.io/node/v/@u1in/reasonix-feishu-deploy?logo=node.js&logoColor=fff)](https://www.npmjs.com/package/@u1in/reasonix-feishu-deploy)
[![GitHub last commit](https://img.shields.io/github/last-commit/u1in/reasonix-feishu-deploy?logo=github&logoColor=fff)](https://github.com/u1in/reasonix-feishu-deploy/commits)
[![GitHub stars](https://img.shields.io/github/stars/u1in/reasonix-feishu-deploy?logo=github&logoColor=fff)](https://github.com/u1in/reasonix-feishu-deploy)

🤖 **One-click deploy** Reasonix AI Bot on Linux, integrated with Feishu (Lark) instant messaging.

## 1. Installation

```bash
# Interactive installation
npx @u1in/reasonix-feishu-deploy

# Pre-fill via command-line arguments
npx @u1in/reasonix-feishu-deploy \
  --app-id=cli_a5f8d2e1a3b4c0d0 \
  --app-secret=xxxxx \
  --api-key=sk-xxxxx
```

### Installation Options

| Option | Description |
|--------|-------------|
| `--app-id <id>` | Feishu App ID |
| `--app-secret <secret>` | Feishu App Secret |
| `--api-key <key>` | DeepSeek API Key |
| `--add-aliases` / `--no-add-aliases` | Add rb-* shortcut commands |

> During installation, if `~/.reasonix/config.toml` (your personal Reasonix config) is detected, it will be automatically backed up and merged with the new settings, preserving your existing UI theme, custom providers, tool configurations, and other non-Bot settings.

## 2. Uninstall

```bash
# Interactive uninstall
npx @u1in/reasonix-feishu-deploy --undeploy
```

### Uninstall Options

| Option | Description |
|--------|-------------|
| `--remove-reasonix` / `--no-remove-reasonix` | Uninstall reasonix CLI (default: no) |
| `--remove-pm2` / `--no-remove-pm2` | Uninstall PM2 (default: no) |

> During uninstall, you will be asked whether to restore `~/.reasonix/config.toml` to its backup state (a `config.toml.deploy-bak` backup is automatically created during installation).

## 3. Daily Management

If you chose to add rb-* aliases during installation, you can use these shortcut commands:

```bash
rb-start              # Start Bot
rb-stop               # Stop Bot
rb-restart            # Restart Bot
rb-status             # Status
rb-logs               # View logs
rb-undeploy           # Uninstall
```

> Seeing `feishu sdk websocket connected` indicates a successful connection.

Without aliases, use PM2 native commands:

```bash
pm2 start ~/.config/reasonix-bot/ecosystem.config.js   # Start
pm2 stop reasonix-bot                                   # Stop
pm2 restart reasonix-bot                                # Restart
pm2 status                                              # Status
pm2 logs reasonix-bot                                   # Logs
node ~/.config/reasonix-bot/undeploy.mjs                # Uninstall
```

### Modify Configuration

```bash
vim ~/.reasonix/config.toml                                    # User-level config (whitelist, channels, models, etc.)
vim ~/.config/reasonix-bot/ecosystem.config.js                 # DeepSeek Key / Feishu Secret
# After changes, restart: rb-restart or pm2 restart reasonix-bot
```

## 4. Configure the Bot

Create an app on the [Feishu Open Platform](https://open.feishu.cn/) and complete the following configuration:

1. **Credentials & Basic Info** → Get App ID and App Secret
2. **Permissions Management** → Add `im:message` and `im:message.p2p_msg:readonly` permissions
3. **Events & Callbacks** → Subscribe via "**Receive events via long-lived connection**", add `im.message.receive_v1`
4. **Publish** → Click "Publish" in the top-right corner (changes take effect only after publishing)

## 5. LLM Configuration

You need to provide an API Key during installation. Get one at [platform.deepseek.com](https://platform.deepseek.com/):

1. Register/Login → **API Keys** → Create and copy the Key (shown only once)
2. New accounts get 5 million free tokens; insufficient balance returns a 429 error

> Want to use a different LLM? Edit `~/.reasonix/config.toml` and modify the provider config under `[[providers]]` to switch to any model compatible with the OpenAI API.

## 6. Prerequisites

- Linux OS (apt/yum package manager)
- root or sudo privileges (required for Node.js installation)

## 7. Configuration Structure

```
~/.config/reasonix-bot/
├── ecosystem.config.js      PM2 config (contains DeepSeek Key / Feishu Secret)
├── pm2-start-bot.sh         Start script
├── pm2-stop-bot.sh          Stop script
└── undeploy.mjs             Uninstall script

~/.reasonix/
├── config.toml              User-level Reasonix config (includes Bot settings, merged with personal config during install)
└── config.toml.deploy-bak   Pre-install backup (can be restored during uninstall)
```

## 8. Publishing a New Version

```bash
npm run release        # Auto bump patch version
npm run release:minor  # Minor version
npm run release:major  # Major version
npm run release:dry    # Dry run (preview)
```

## 9. Related Links

- [Reasonix Official Website](https://reasonix.ai)
- [Feishu Open Platform](https://open.feishu.cn/)
