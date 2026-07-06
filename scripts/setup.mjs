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
const CONFIG_FILE = `${CONFIG_DIR}/reasonix.toml`;
const ENV_FILE = `${CONFIG_DIR}/.env`;
const TEMPLATE_FILE = resolve(__dirname, '../config/reasonix.toml');
const PACKAGE_SCRIPTS_DIR = resolve(__dirname, '../scripts');

// ── CLI 参数解析 ──
function parseArgs() {
  const args = process.argv.slice(2);
  const cli = { yes: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--yes' || arg === '-y') { cli.yes = true; continue; }
    if (arg === '--allow-all')  { cli.allowAll = true; continue; }
    if (arg === '--no-allow-all') { cli.allowAll = false; continue; }
    if (arg === '--require-mention') { cli.requireMention = true; continue; }
    if (arg === '--no-require-mention') { cli.requireMention = false; continue; }
    if (arg === '--startup') { cli.startup = true; continue; }
    if (arg === '--no-startup') { cli.startup = false; continue; }
    if (arg === '--start') { cli.start = true; continue; }
    if (arg === '--no-start') { cli.start = false; continue; }
    if (arg === '--add-aliases') { cli.addAliases = true; continue; }
    if (arg === '--no-add-aliases') { cli.addAliases = false; continue; }

    const eqIdx = arg.indexOf('=');
    const key = eqIdx !== -1 ? arg.slice(0, eqIdx) : arg;
    const val = eqIdx !== -1 ? arg.slice(eqIdx + 1) : (i + 1 < args.length ? args[++i] : '');
    if (key === '--app-id')     { cli.appId = val; }
    else if (key === '--app-secret') { cli.appSecret = val; }
    else if (key === '--api-key')    { cli.apiKey = val; }
    else if (key === '--users')      { cli.feishuUsers = val.split(',').map(s => s.trim()).filter(Boolean); }
    else if (key.startsWith('--'))   { console.warn(`  ${yellow('⚠')} 未知参数: ${key}`); }
  }
  return cli;
}

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
async function collectConfig(cli = {}) {
  const isQuiet = cli.yes;
  if (!isQuiet) {
    title('飞书 Bot 配置');
    console.log(`  ${dim('用方向键 ↑↓ 选择，回车确认，Ctrl+C 随时取消')}\n`);
  }

  const onCancel = () => {
    console.log(`\n  ${yellow('⚠')} 向导已取消`);
    process.exit(0);
  };

  // ─── 1. 飞书 App ID ───
  let appId = cli.appId || '';
  if (!appId) {
    const r = await prompts({ type: 'text', name: 'v', message: '请输入飞书 App ID', hint: 'https://open.feishu.cn/app → 选择你的应用 → 凭证与基础信息' }, { onCancel });
    appId = r.v || '';
  }
  if (appId) console.log(`  ${green('✓')} 已设置`);

  // ─── 2. 飞书 App Secret ───
  let feishuSecret = loadEnv('FEISHU_BOT_APP_SECRET');
  if (!feishuSecret && cli.appSecret) {
    feishuSecret = cli.appSecret;
    saveEnv('FEISHU_BOT_APP_SECRET', feishuSecret);
  }
  if (feishuSecret) {
    console.log(`  ${green('✓')} 飞书 App Secret ${dim('(已配置)')}`);
  } else {
    const r = await prompts({ type: 'password', name: 'v', message: '请输入飞书 App Secret', hint: 'https://open.feishu.cn/app → 选择你的应用 → 凭证与基础信息' }, { onCancel });
    if (r.v) { feishuSecret = r.v; saveEnv('FEISHU_BOT_APP_SECRET', feishuSecret); console.log(`  ${green('✓')} FEISHU_BOT_APP_SECRET 已保存`); }
  }

  // ─── 3-5. 飞书配置确认（安静模式跳过） ───
  if (!isQuiet) {
    await prompts({ type: 'confirm', name: 'v', message: '请确认飞书机器人已拥有以下权限:\n  • im:message:readonly\n  • im:message.p2p_msg:readonly\n  \n  👉 https://open.feishu.cn/app → 权限管理 检查\n  确认已添加？', initial: true }, { onCancel });
    await prompts({ type: 'confirm', name: 'v', message: '请确认飞书机器人的事件订阅方式选择了「长连接(WebSocket)」:\n  \n  👉 https://open.feishu.cn/app → 事件与回调 → 订阅方式 检查\n  确认已选择「通过长连接接收事件」？', initial: true }, { onCancel });
    await prompts({ type: 'confirm', name: 'v', message: '请确认飞书机器人已添加以下事件:\n  • im.message.receive_v1\n  \n  👉 https://open.feishu.cn/app → 事件与回调 检查\n  确认已添加？', initial: true }, { onCancel });
  }

  // ─── 6. 白名单策略 ───
  let allowAll = true;
  if (cli.allowAll !== undefined) {
    allowAll = cli.allowAll;
  } else {
    const r = await prompts({ type: 'select', name: 'v', message: '请选择白名单策略', choices: [{ title: '允许所有用户', description: '任何人都可与 Bot 对话，推荐', value: true }, { title: '仅允许指定用户', description: '需要输入飞书用户 Open ID', value: false }], initial: 0 }, { onCancel });
    allowAll = r.v;
  }
  console.log(`  ${green('✓')} 白名单: ${allowAll ? '允许所有用户' : '仅限指定用户'}`);

  // ─── 7. 飞书用户 Open ID ───
  let feishuUsers = ['ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'];
  if (!allowAll) {
    if (cli.feishuUsers && cli.feishuUsers.length > 0) {
      feishuUsers = cli.feishuUsers;
    } else {
      const r = await prompts({ type: 'list', name: 'v', message: '请输入允许的飞书用户 Open ID（多个用逗号分隔）', hint: '格式: ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx', separator: ',' }, { onCancel });
      feishuUsers = r.v.map(u => u.trim()).filter(Boolean);
    }
    console.log(`  ${green('✓')} 已记录 ${feishuUsers.length} 个用户`);
  }

  // ─── 8. @提及回复 ───
  let requireMention = true;
  if (cli.requireMention !== undefined) {
    requireMention = cli.requireMention;
  } else {
    const r = await prompts({ type: 'toggle', name: 'v', message: '群聊中是否需要 @Bot 才回复？', initial: true, active: '需要 @', inactive: '不需要' }, { onCancel });
    requireMention = r.v;
  }
  console.log(`  ${green('✓')} 群聊 @Bot 回复: ${requireMention ? '需要 @' : '不需要'}`);

  // ─── 9. DeepSeek API Key ───
  let deepseekKey = loadEnv('DEEPSEEK_API_KEY');
  if (!deepseekKey && cli.apiKey) {
    deepseekKey = cli.apiKey;
    saveEnv('DEEPSEEK_API_KEY', deepseekKey);
  }
  if (deepseekKey) {
    console.log(`  ${green('✓')} DeepSeek API Key ${dim('(已配置)')}`);
  } else {
    const r = await prompts({ type: 'password', name: 'v', message: '请输入 DeepSeek API Key', hint: 'https://platform.deepseek.com → API Keys' }, { onCancel });
    if (r.v) { deepseekKey = r.v; saveEnv('DEEPSEEK_API_KEY', deepseekKey); console.log(`  ${green('✓')} DEEPSEEK_API_KEY 已保存`); }
  }

  return { appId, mode: 'websocket', allowAll, feishuUsers, requireMention, feishuSecret, deepseekKey };
}

// ── 步骤 3: 配置摘要 + 确认 ──
async function confirmConfig(config, cli = {}) {
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

  if (cli.yes) {
    console.log(`  ${green('✓')} 自动确认`);
    return;
  }

  if (!confirmed) {
    console.log(`\n  ${yellow('⚠')} 安装已取消`);
    process.exit(0);
  }
}

// ── 步骤 4: 生成配置 ──
async function generateConfig(config, cli = {}) {
  title('生成配置');

  mkdirSync(CONFIG_DIR, { recursive: true });

  if (existsSync(CONFIG_FILE)) {
    if (cli.yes) {
      console.log(`  ${green('✓')} 覆盖现有配置`);
    } else {
      const r = await prompts({ type: 'confirm', name: 'v', message: `~/.config/reasonix-bot/reasonix.toml 已存在，是否覆盖？`, initial: false });
      if (!r.v) { console.log(`  ${green('✓')} 保留现有配置`); return; }
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

  // 确保 Bot 网关主开关已启用（必需，否则 reasonix bot start 拒绝启动）
  configContent = configContent.replace(
    /(\[bot\]\s*\n(?:#.*\n)*)enabled\s*=\s*false/m,
    '$1enabled = true',
  );

  writeFileSync(CONFIG_FILE, configContent, 'utf-8');
  console.log(`  ${green('✓')} 配置文件已生成: ~/.config/reasonix-bot/reasonix.toml`);

  // ── 将 PM2 进程的 cwd 设为 CONFIG_DIR，使 reasonix 的 config.Load()
  // ── (LoadForRoot(".")) 能加载 ~/.config/reasonix-bot/reasonix.toml
  // ── 作为项目级配置，从而 [bot] enabled = true 覆盖用户级配置中的 false ──

  // PM2 ecosystem — 每次都重新生成，确保 cwd/reasonix 路径等始终正确
  const ecosystemFile = `${CONFIG_DIR}/ecosystem.config.js`;
  const REASONIX_BIN = execSync('which reasonix', { encoding: 'utf-8' }).trim();
  const ecosystem = `module.exports = {
  apps: [{
    name: 'reasonix-bot',
    script: '${REASONIX_BIN}',
    args: 'bot start --channels feishu --dir ${CONFIG_DIR}',
    cwd: '${CONFIG_DIR}',
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

  try {
    copyFileSync(`${PACKAGE_SCRIPTS_DIR}/pm2-start-bot.sh`, `${CONFIG_DIR}/pm2-start-bot.sh`);
    copyFileSync(`${PACKAGE_SCRIPTS_DIR}/pm2-stop-bot.sh`, `${CONFIG_DIR}/pm2-stop-bot.sh`);
    chmodSync(`${CONFIG_DIR}/pm2-start-bot.sh`, 0o755);
    chmodSync(`${CONFIG_DIR}/pm2-stop-bot.sh`, 0o755);
    console.log(`  ${green('✓')} 启动/停止脚本已复制`);
  } catch {
    console.log(`  ${yellow('⚠')} 启动/停止脚本复制失败（可忽略）`);
  }

  // ── 卸载脚本（本地副本，与安装版本绑定） ──
  const uninstallMjs = `${PACKAGE_SCRIPTS_DIR}/uninstall.mjs`;
  const uninstallSh = `${CONFIG_DIR}/uninstall.sh`;
  const uninstallMjsDest = `${CONFIG_DIR}/uninstall.mjs`;
  try {
    copyFileSync(uninstallMjs, uninstallMjsDest);
    writeFileSync(uninstallSh, `#!/usr/bin/env bash
set -euo pipefail
CONFIG_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
exec node "\$CONFIG_DIR/uninstall.mjs" "\$@" <\$(tty)
`, 'utf-8');
    chmodSync(uninstallSh, 0o755);
    console.log(`  ${green('✓')} 卸载脚本已复制: uninstall.sh`);
  } catch (e) {
    console.log(`  ${yellow('⚠')} 卸载脚本复制失败: ${e.message}`);
  }

  // PM2 开机自启
  let startup = false;
  if (cli.startup !== undefined) {
    startup = cli.startup;
  } else {
    const r = await prompts({ type: 'confirm', name: 'v', message: '是否配置 PM2 开机自启？', initial: false });
    startup = r.v;
  }

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
async function startBot(cli = {}) {
  title('启动 Bot');

  let start;
  if (cli.start !== undefined) {
    start = cli.start;
  } else {
    const r = await prompts({
      type: 'confirm',
      name: 'v',
      message: '是否现在启动 Bot？',
      initial: true,
    });
    start = r.v;
  }

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

// ── Shell 别名 ──
function detectShellConfig() {
  const shell = (process.env.SHELL || '').toLowerCase();
  const zdotdir = process.env.ZDOTDIR || HOME;

  if (shell.includes('zsh')) {
    return `${zdotdir}/.zshrc`;
  }
  if (shell.includes('bash')) {
    // bash 优先使用 .bashrc，如果不存在且 .bash_profile 存在则用后者
    const bashrc = `${HOME}/.bashrc`;
    const bashProfile = `${HOME}/.bash_profile`;
    if (existsSync(bashProfile) && !existsSync(bashrc)) {
      return bashProfile;
    }
    return bashrc;
  }
  return '';
}

const ALIAS_MARKER_START = '# >>> reasonix-bot';
const ALIAS_MARKER_END   = '# <<< reasonix-bot';

function getAliasBlock() {
  return `
${ALIAS_MARKER_START}
alias rb-start='bash ${CONFIG_DIR}/pm2-start-bot.sh'
alias rb-stop='bash ${CONFIG_DIR}/pm2-stop-bot.sh'
alias rb-restart='pm2 restart reasonix-bot'
alias rb-logs='pm2 logs reasonix-bot'
alias rb-status='pm2 status'
alias rb-uninstall='bash ${CONFIG_DIR}/uninstall.sh'
${ALIAS_MARKER_END}
`;
}

async function setupShellAliases(cli = {}) {
  title('Shell 别名');

  let addAliases;
  if (cli.addAliases !== undefined) {
    addAliases = cli.addAliases;
  } else {
    const r = await prompts({
      type: 'confirm',
      name: 'v',
      message: '是否添加 rb-* 快捷命令到 Shell 配置？（rb-start / rb-stop / rb-logs 等）',
      hint: '添加后重开终端或 source 即可使用',
      initial: true,
    });
    addAliases = r.v;
  }

  if (!addAliases) {
    console.log(`  ${dim('─')} 跳过`);
    return;
  }

  const configFile = detectShellConfig();
  if (!configFile) {
    console.log(`  ${yellow('⚠')} 未能识别的 Shell（$SHELL=${process.env.SHELL || '未设置'}），请手动添加别名`);
    console.log(`     编辑 ~/.zshrc 或 ~/.bashrc，加入:${getAliasBlock()}`);
    return;
  }

  let content = '';
  if (existsSync(configFile)) {
    content = readFileSync(configFile, 'utf-8');
    if (content.includes(ALIAS_MARKER_START)) {
      console.log(`  ${green('✓')} 别名已存在: ${configFile.replace(HOME, '~')}`);
      return;
    }
  }

  const block = getAliasBlock();
  try {
    mkdirSync(dirname(configFile), { recursive: true });
    appendFileSync(configFile, block, 'utf-8');
    console.log(`  ${green('✓')} 别名已添加到: ${configFile.replace(HOME, '~')}`);
    console.log(`     ${dim('生效请执行:')} source ${configFile.replace(HOME, '~')}`);
  } catch (e) {
    console.log(`  ${yellow('⚠')} 写入失败: ${e.message}`);
    console.log(`     请手动加入以下内容到 ${configFile.replace(HOME, '~')}:${block}`);
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
  console.log(`     ${dim('├──')} reasonix.toml        配置文件`);
  console.log(`     ${dim('├──')} .env                 API 密钥`);
  console.log(`     ${dim('├──')} ecosystem.config.js   PM2 配置`);
  console.log(`     ${dim('├──')} pm2-start-bot.sh     启动脚本`);
  console.log(`     ${dim('├──')} pm2-stop-bot.sh      停止脚本`);
  console.log(`     ${dim('├──')} uninstall.sh         卸载脚本`);
  console.log(`     ${dim('└──')} uninstall.mjs        卸载程序`);
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
  console.log(`   ④ 卸载: bash ~/.config/reasonix-bot/uninstall.sh 或 rb-uninstall`);
  console.log();
}

// ═══════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════

async function main() {
  const cli = parseArgs();
  const isQuiet = cli.yes;

  if (!isQuiet) {
    console.clear();
    console.log(`\n${green('  ╭──────────────────────────────────────────────╮')}`);
    console.log(`${green('  │')}                                              ${green('│')}`);
    console.log(`${green('  │')}   🤖  Reasonix 飞书 Bot — 部署向导          ${green('│')}`);
    console.log(`${green('  │')}                                              ${green('│')}`);
    console.log(`${green('  │')}   用方向键 ↑↓ 选择，回车确认                 ${green('│')}`);
    console.log(`${green('  │')}                                              ${green('│')}`);
    console.log(`${green('  ╰──────────────────────────────────────────────╯')}`);
    console.log();
  }

  // 1. 环境准备
  await ensureEnvironment();

  // 2. 收集配置（含密钥）
  const config = await collectConfig(cli);

  // 3. 确认
  await confirmConfig(config, cli);

  // 4. 生成配置
  await generateConfig(config, cli);

  // 5. Shell 别名
  await setupShellAliases(cli);

  // 6. 启动
  await startBot(cli);

  // 7. 完成
  printSummary();
}

main().catch(e => {
  if (e.message !== 'canceled') {
    console.error(`\n  ${red('✗')} 发生错误:`, e.message);
    process.exit(1);
  }
});
