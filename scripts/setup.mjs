#!/usr/bin/env node
/**
 * Reasonix 飞书 Bot — 交互式配置向导
 * 使用 prompts 库实现方向键选择、实时校验的交互体验。
 *
 * 用法: node setup.mjs
 *       或者: npm run setup (在 reasonix-deploy 包中)
 */
import prompts from 'prompts';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();
const CONFIG_DIR = `${HOME}/.config/reasonix-bot`;
const CONFIG_FILE = `${CONFIG_DIR}/config.toml`;
const ENV_FILE = `${CONFIG_DIR}/.env`;
const TEMPLATE_FILE = resolve(__dirname, '../config/reasonix.toml');
const PACKAGE_SCRIPTS_DIR = resolve(__dirname, '../scripts');

// ── 工具函数 ──

function color(s, c) { return `\x1b[${c}m${s}\x1b[0m`; }
const bold   = s => color(s, 1);
const green  = s => color(s, 32);
const yellow = s => color(s, 33);
const cyan   = s => color(s, 36);
const red    = s => color(s, 31);
const dim    = s => color(s, 2);

function title(text) {
  console.log(`\n${bold(cyan('━━━ ' + text + ' ━━━'))}\n`);
}

function loadEnv(varName) {
  if (!existsSync(ENV_FILE)) return '';
  try {
    const content = readFileSync(ENV_FILE, 'utf-8');
    const match = content.match(new RegExp(`^${varName}=(.*)`, 'm'));
    return match ? match[1].trim() : '';
  } catch { return ''; }
}

function saveEnv(varName, value) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  if (existsSync(ENV_FILE)) {
    const content = readFileSync(ENV_FILE, 'utf-8');
    if (new RegExp(`^${varName}=`).test(content)) {
      const updated = content.replace(new RegExp(`^${varName}=.*`, 'm'), `${varName}=${value}`);
      writeFileSync(ENV_FILE, updated, 'utf-8');
      return;
    }
  } else {
    const header = '# Reasonix API Keys — 由 setup.mjs 自动生成\n# 警告: 此文件包含密钥，请勿提交到版本控制\n\n';
    writeFileSync(ENV_FILE, header, 'utf-8');
  }
  appendFileSync(ENV_FILE, `${varName}=${value}\n`, 'utf-8');
  chmodSync(ENV_FILE, 0o600);
}

// ── 步骤 1: 环境准备 ──
async function ensureEnvironment() {
  title('环境准备');

  if (!process.version) {
    console.log(`  ${yellow('⚠')} 未检测到 Node.js，请先安装 Node.js >= 18`);
    console.log('    推荐使用 nvm: curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash');
    process.exit(1);
  }
  console.log(`  ${green('✓')} Node.js ${process.version}`);

  try {
    execSync('which reasonix', { stdio: 'ignore' });
    const ver = execSync('reasonix version 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
    console.log(`  ${green('✓')} reasonix ${ver || ''}`);
  } catch {
    console.log(`  ${cyan('⟳')} 正在安装 reasonix...`);
    execSync('npm i -g reasonix@next', { stdio: 'inherit' });
    console.log(`  ${green('✓')} reasonix 安装完成`);
  }

  try {
    execSync('which pm2', { stdio: 'ignore' });
    console.log(`  ${green('✓')} PM2 已就绪`);
  } catch {
    console.log(`  ${cyan('⟳')} 正在安装 PM2...`);
    execSync('npm install -g pm2', { stdio: 'inherit' });
    console.log(`  ${green('✓')} PM2 安装完成`);
  }
}

// ── 步骤 2: 交互式配置收集 ──
async function collectConfig() {
  title('飞书 Bot 配置');
  console.log(`  ${dim('用方向键 ↑↓ 选择，回车确认，Ctrl+C 随时取消')}\n`);

  const onCancel = () => {
    console.log(`\n  ${yellow('⚠')} 向导已取消`);
    process.exit(0);
  };

  // ─── 1. 飞书 App ID ───
  const { appId } = await prompts({
    type: 'text',
    name: 'appId',
    message: '请输入飞书 App ID',
    hint: 'https://open.feishu.cn/app → 选择你的应用 → 凭证与基础信息',
    validate: v => v.length > 0 || 'App ID 不能为空，可在安装后手动编辑 config.toml',
  }, { onCancel });
  if (appId) console.log(`  ${green('✓')} 已设置`);

  // ─── 2. 飞书 App Secret ───
  const currentSecret = loadEnv('FEISHU_BOT_APP_SECRET');
  let feishuSecret = currentSecret;
  if (currentSecret) {
    console.log(`  ${green('✓')} 飞书 App Secret ${dim('(已配置)')}`);
  } else {
    const { secret } = await prompts({
      type: 'password',
      name: 'secret',
      message: '请输入飞书 App Secret',
      hint: 'https://open.feishu.cn/app → 选择你的应用 → 凭证与基础信息',
      validate: v => v.length > 0 || 'App Secret 不能为空',
    }, { onCancel });
    if (secret) {
      feishuSecret = secret;
      saveEnv('FEISHU_BOT_APP_SECRET', feishuSecret);
      console.log(`  ${green('✓')} FEISHU_BOT_APP_SECRET 已保存`);
    }
  }

  // ─── 3. 权限确认 ───
  await prompts({
    type: 'confirm',
    name: 'permChecked',
    message: '请确认飞书机器人已拥有以下权限:\n  • im:message:readonly\n  • im:message.p2p_msg:readonly\n  \n  👉 https://open.feishu.cn/app → 权限管理 检查\n  确认已添加？',
    initial: true,
  }, { onCancel });

  // ─── 4. 订阅方式确认 ───
  await prompts({
    type: 'confirm',
    name: 'modeChecked',
    message: '请确认飞书机器人的事件订阅方式选择了「长连接(WebSocket)」:\n  \n  👉 https://open.feishu.cn/app → 事件与回调 → 订阅方式 检查\n  确认已选择「通过长连接接收事件」？',
    initial: true,
  }, { onCancel });

  // ─── 5. 事件回调确认 ───
  await prompts({
    type: 'confirm',
    name: 'eventChecked',
    message: '请确认飞书机器人已添加以下事件:\n  • im.message.receive_v1\n  \n  👉 https://open.feishu.cn/app → 事件与回调 检查\n  确认已添加？',
    initial: true,
  }, { onCancel });

  // ─── 6. 白名单策略 ───
  const { allowAll } = await prompts({
    type: 'select',
    name: 'allowAll',
    message: '请选择白名单策略',
    choices: [
      { title: '允许所有用户', description: '任何人都可与 Bot 对话，推荐', value: true },
      { title: '仅允许指定用户', description: '需要输入飞书用户 Open ID', value: false },
    ],
    initial: 0,
  }, { onCancel });

  // ─── 7. 飞书用户 Open ID（条件） ───
  let feishuUsers = ['ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'];
  if (!allowAll) {
    const { users } = await prompts({
      type: 'list',
      name: 'users',
      message: '请输入允许的飞书用户 Open ID（多个用逗号分隔）',
      hint: '格式: ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      separator: ',',
      validate: list => list.length > 0 || '至少输入一个用户 ID',
    }, { onCancel });
    feishuUsers = users.map(u => u.trim()).filter(Boolean);
    console.log(`  ${green('✓')} 已记录 ${feishuUsers.length} 个用户`);
  }

  // ─── 7. @提及回复 ───
  const { requireMention } = await prompts({
    type: 'toggle',
    name: 'requireMention',
    message: '群聊中是否需要 @Bot 才回复？',
    initial: true,
    active: '需要 @',
    inactive: '不需要',
  }, { onCancel });
  console.log(`  ${green('✓')} 群聊 @Bot 回复: ${requireMention ? '需要 @' : '不需要'}`);

  // ─── 8. DeepSeek API Key ───
  const currentKey = loadEnv('DEEPSEEK_API_KEY');
  let deepseekKey = currentKey;
  if (currentKey) {
    console.log(`  ${green('✓')} DeepSeek API Key ${dim('(已配置)')}`);
  } else {
    const { apiKey } = await prompts({
      type: 'password',
      name: 'apiKey',
      message: '请输入 DeepSeek API Key',
      hint: 'https://platform.deepseek.com → API Keys',
      validate: v => v.length > 0 || 'API Key 不能为空',
    }, { onCancel });
    if (apiKey) {
      deepseekKey = apiKey;
      saveEnv('DEEPSEEK_API_KEY', deepseekKey);
      console.log(`  ${green('✓')} DEEPSEEK_API_KEY 已保存`);
    }
  }

  return {
    appId: appId || '',
    mode: 'websocket',
    allowAll,
    feishuUsers,
    requireMention,
    feishuSecret,
    deepseekKey,
  };
}

// ── 步骤 3: 配置摘要 + 确认 ──
async function confirmConfig(config) {
  title('配置摘要');

  console.log(`  ${cyan('飞书 App ID')}    ${config.appId || dim('(未设置)')}`);
  console.log(`  ${cyan('飞书 App Secret')} ${config.feishuSecret ? dim('(已保存)') : red('(未设置)')}`);
  console.log(`  ${cyan('白名单')}         ${config.allowAll ? '允许所有用户' : `仅允许 ${config.feishuUsers.length} 个用户`}`);
  console.log(`  ${cyan('@提及回复')}      ${config.requireMention ? '需要 @Bot' : '不需要'}`);
  console.log(`  ${cyan('DeepSeek Key')}   ${config.deepseekKey ? dim('(已保存)') : red('(未设置)')}`);
  console.log();

  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: '确认以上配置并开始安装？',
    initial: true,
  });

  if (!confirmed) {
    console.log(`\n  ${yellow('⚠')} 安装已取消`);
    process.exit(0);
  }
}

// ── 步骤 4: 生成配置 ──
async function generateConfig(config) {
  title('生成配置');

  mkdirSync(CONFIG_DIR, { recursive: true });

  if (existsSync(CONFIG_FILE)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `~/.config/reasonix-bot/config.toml 已存在，是否覆盖？`,
      initial: false,
    });
    if (!overwrite) {
      console.log(`  ${green('✓')} 保留现有配置`);
      return;
    }
  }

  if (!existsSync(TEMPLATE_FILE)) {
    console.log(`  ${red('✗')} 未找到配置模板: ${TEMPLATE_FILE}`);
    process.exit(1);
  }

  copyFileSync(TEMPLATE_FILE, CONFIG_FILE);
  let configContent = readFileSync(CONFIG_FILE, 'utf-8');

  if (config.appId) {
    configContent = configContent.replace(/app_id = "your-feishu-app-id"/, `app_id = "${config.appId}"`);
  }

  configContent = configContent.replace(/^allow_all = .*/m, `allow_all = ${config.allowAll}`);

  const usersArray = config.feishuUsers.map(u => `"${u}"`).join(', ');
  configContent = configContent.replace(/^feishu_users = .*/m, `feishu_users = [${usersArray}]`);

  // 固定使用 websocket
  configContent = configContent.replace(/^mode = .*/m, `mode = "websocket"`);

  configContent = configContent.replace(/^require_mention = .*/m, `require_mention = ${config.requireMention}`);

  configContent = configContent.replace(/^(\[bot\.qq\]\n?)enabled = true/m, `$1enabled = false`);
  configContent = configContent.replace(/^(\[bot\.weixin\]\n?)enabled = true/m, `$1enabled = false`);

  writeFileSync(CONFIG_FILE, configContent, 'utf-8');
  console.log(`  ${green('✓')} 配置文件已生成: ~/.config/reasonix-bot/config.toml`);

  // PM2 ecosystem
  const ecosystemFile = `${CONFIG_DIR}/ecosystem.config.js`;
  if (!existsSync(ecosystemFile)) {
    const REASONIX_BIN = execSync('which reasonix', { encoding: 'utf-8' }).trim();
    const ecosystem = `module.exports = {
  apps: [{
    name: 'reasonix-bot',
    script: '${REASONIX_BIN}',
    args: 'bot start --channels feishu',
    cwd: process.env.HOME,
    interpreter: 'none',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    watch: false,
  }]
};
`;
    writeFileSync(ecosystemFile, ecosystem, 'utf-8');
    console.log(`  ${green('✓')} PM2 配置已生成: ~/.config/reasonix-bot/ecosystem.config.js`);
  } else {
    console.log(`  ${green('✓')} PM2 配置已存在，跳过`);
  }

  try {
    copyFileSync(`${PACKAGE_SCRIPTS_DIR}/pm2-start-bot.sh`, `${CONFIG_DIR}/pm2-start-bot.sh`);
    copyFileSync(`${PACKAGE_SCRIPTS_DIR}/pm2-stop-bot.sh`, `${CONFIG_DIR}/pm2-stop-bot.sh`);
    chmodSync(`${CONFIG_DIR}/pm2-start-bot.sh`, 0o755);
    chmodSync(`${CONFIG_DIR}/pm2-stop-bot.sh`, 0o755);
    console.log(`  ${green('✓')} 启动/停止脚本已复制`);
  } catch {
    console.log(`  ${yellow('⚠')} 启动/停止脚本复制失败（可忽略）`);
  }

  try {
    copyFileSync(`${PACKAGE_SCRIPTS_DIR}/uninstall.sh`, `${CONFIG_DIR}/uninstall.sh`);
    copyFileSync(`${PACKAGE_SCRIPTS_DIR}/uninstall.mjs`, `${CONFIG_DIR}/uninstall.mjs`);
    chmodSync(`${CONFIG_DIR}/uninstall.sh`, 0o755);
    console.log(`  ${green('✓')} 卸载脚本已复制`);
  } catch {
    console.log(`  ${yellow('⚠')} 卸载脚本复制失败（可忽略）`);
  }

  // PM2 开机自启
  const { startup } = await prompts({
    type: 'confirm',
    name: 'startup',
    message: '是否配置 PM2 开机自启？',
    initial: false,
  });

  if (startup) {
    try {
      execSync(`pm2 startup systemd -u "${process.env.USER}" --hp "${HOME}" 2>/dev/null || pm2 startup 2>/dev/null || true`, { stdio: 'ignore' });
      console.log(`  ${green('✓')} PM2 开机自启已配置`);
    } catch {
      console.log(`  ${yellow('⚠')} PM2 开机自启配置失败`);
    }
  }
}

// ── 步骤 5: 启动 ──
async function startBot() {
  title('启动 Bot');

  const { start } = await prompts({
    type: 'confirm',
    name: 'start',
    message: '是否现在启动 Bot？',
    initial: true,
  });

  if (start) {
    try {
      execSync(`bash ${CONFIG_DIR}/pm2-start-bot.sh`, { stdio: 'inherit' });
      console.log(`\n  ${green('✓')} Bot 已启动！`);
    } catch {
      console.log(`\n  ${red('✗')} 启动失败，请检查日志: pm2 logs reasonix-bot`);
    }
  } else {
    console.log(`  ${dim('你可以稍后通过以下命令启动:')}`);
    console.log(`    pm2 start ${CONFIG_DIR}/ecosystem.config.js`);
  }
}

// ── 完成 ──
function printSummary() {
  console.log(`\n${green('  ╭──────────────────────────────────────────────╮')}`);
  console.log(`${green('  │')}                                              ${green('│')}`);
  console.log(`${green('  │')}   🎉  部署完成！                              ${green('│')}`);
  console.log(`${green('  │')}                                              ${green('│')}`);
  console.log(`${green('  ╰──────────────────────────────────────────────╯')}`);
  console.log();
  console.log(`  ${cyan('📁')}  ~/.config/reasonix-bot/`);
  console.log(`     ${dim('├──')} config.toml          配置文件`);
  console.log(`     ${dim('├──')} .env                 API 密钥`);
  console.log(`     ${dim('├──')} ecosystem.config.js   PM2 配置`);
  console.log(`     ${dim('├──')} pm2-start-bot.sh     启动脚本`);
  console.log(`     ${dim('├──')} pm2-stop-bot.sh      停止脚本`);
  console.log(`     ${dim('└──')} uninstall.sh         卸载脚本`);
  console.log();
  console.log(`  ${yellow('═══ ⚠️  安装后不要忘记 ═══')}`);
  console.log();
  console.log(`   ① 去飞书开放平台 → 你的应用:`);
  console.log(`      ${dim('-')} 确认订阅方式选了「长连接(WebSocket)」`);
  console.log(`      ${dim('-')} 右上角点「发布」— ${yellow('不发布配置不生效!')}`);
  console.log();
  console.log(`   ② 查看日志确认连接成功:`);
  console.log(`      ${dim('$')} pm2 logs reasonix-bot`);
  console.log(`      看到 ${green('feishu sdk websocket connected')} 即为成功`);
  console.log();
  console.log(`   ③ 常用命令:`);
  console.log(`      pm2 status               ${dim('# 状态')}`);
  console.log(`      pm2 logs reasonix-bot     ${dim('# 日志')}`);
  console.log(`      pm2 restart reasonix-bot  ${dim('# 重启')}`);
  console.log();
}

// ═══════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════

async function main() {
  console.clear();
  console.log(`\n${green('  ╭──────────────────────────────────────────────╮')}`);
  console.log(`${green('  │')}                                              ${green('│')}`);
  console.log(`${green('  │')}   🤖  Reasonix 飞书 Bot — 部署向导          ${green('│')}`);
  console.log(`${green('  │')}                                              ${green('│')}`);
  console.log(`${green('  │')}   用方向键 ↑↓ 选择，回车确认                 ${green('│')}`);
  console.log(`${green('  │')}                                              ${green('│')}`);
  console.log(`${green('  ╰──────────────────────────────────────────────╯')}`);
  console.log();

  // 1. 环境准备
  await ensureEnvironment();

  // 2. 收集配置（含密钥）
  const config = await collectConfig();

  // 3. 确认
  await confirmConfig(config);

  // 4. 生成配置
  await generateConfig(config);

  // 5. 启动
  await startBot();

  // 6. 完成
  printSummary();
}

main().catch(e => {
  if (e.message !== 'canceled') {
    console.error(`\n  ${red('✗')} 发生错误:`, e.message);
    process.exit(1);
  }
});
