#!/usr/bin/env node
/**
 * Reasonix 飞书 Bot — 交互式配置向导
 * 使用 prompts 库实现方向键选择、实时校验的交互体验。
 *
 * 用法: node deploy.mjs
 *       或者: npm run wizard (在 reasonix-deploy 包中)
 */
import prompts from 'prompts';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, appendFileSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();
const CONFIG_DIR = `${HOME}/.config/reasonix-bot`;
const CONFIG_FILE = `${CONFIG_DIR}/config.toml`;
const TEMPLATE_FILE = resolve(__dirname, '../config/config.toml');
const PACKAGE_SCRIPTS_DIR = resolve(__dirname, '../scripts');

// ── CLI 参数解析 ──
function parseArgs() {
  const args = process.argv.slice(2);
  const cli = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--allow-all')  { cli.allowAll = true; continue; }
    if (arg === '--no-allow-all') { cli.allowAll = false; continue; }
    if (arg === '--require-mention') { cli.requireMention = true; continue; }
    if (arg === '--no-require-mention') { cli.requireMention = false; continue; }
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

function stepBanner(current, total, label) {
  console.clear();
  const bar = Array.from({ length: total }, (_, i) => i < current ? green('●') : dim('○')).join(' ');
  console.log(`\n${green('  ╭──────────────────────────────────────────────╮')}`);
  console.log(`${green('  │')}  ${bold('🤖  Reasonix 飞书 Bot — 部署向导')}      ${green('│')}`);
  console.log(`${green('  │')}                                               ${green('│')}`);
  console.log(`${green('  │')}  ${dim('步骤')} ${bar}  ${cyan(`${current}/${total}`)}      ${green('│')}`);
  console.log(`${green('  │')}  ${bold(cyan(label))}${' '.repeat(40 - label.length)}${green('│')}`);
  console.log(`${green('  ╰──────────────────────────────────────────────╯')}`);
  console.log();
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
  title('飞书 Bot 配置');
  console.log(`  ${dim('用方向键 ↑↓ 选择，回车确认，Ctrl+C 随时取消')}\n`);

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
  let feishuSecret = cli.appSecret || '';
  if (!feishuSecret) {
    const r = await prompts({ type: 'password', name: 'v', message: '请输入飞书 App Secret', hint: 'https://open.feishu.cn/app → 选择你的应用 → 凭证与基础信息' }, { onCancel });
    if (r.v) { feishuSecret = r.v; console.log(`  ${green('✓')} FEISHU_BOT_APP_SECRET 已设置`); }
  } else {
    console.log(`  ${green('✓')} 飞书 App Secret ${dim('(已配置)')}`);
  }

  // ─── 3. 飞书配置检查（一次性确认） ───
  await prompts({ type: 'confirm', name: 'v', message: '请确认飞书机器人已完成以下三项配置:\n\n  📋 ① 权限已添加:\n     • im:message:readonly\n     • im:message.p2p_msg:readonly\n\n  📋 ② 事件订阅方式选择了「长连接(WebSocket)」:\n     • 请确认订阅方式为「通过长连接接收事件」\n\n  📋 ③ 事件已添加:\n     • im.message.receive_v1\n\n  👉 https://open.feishu.cn/app → 选择你的应用 检查\n  确认以上三项均已配置完成？', initial: true }, { onCancel });

  // ─── 4. 安全风险提示 ───
  let allowAll = cli.allowAll !== undefined ? cli.allowAll : true;
  let feishuUsers = cli.feishuUsers && cli.feishuUsers.length > 0 ? cli.feishuUsers : ['ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'];
  let requireMention = cli.requireMention !== undefined ? cli.requireMention : false;

  await prompts({ type: 'confirm', name: 'v', message: '⚠️  安全设置说明\n\n本 Bot 默认允许所有飞书用户使用。\n\n  • 建议在飞书开放平台 → 应用 → 权限管理 中设置「应用使用范围」\n    来控制谁能使用此 Bot，而非在此处配置白名单。\n\n  • 若确实需要使用 Reasonix 内置白名单限制用户（Open ID）\n    或调整群聊 @Bot 回复行为，请安装后手动编辑:\n    ~/.reasonix/config.toml 的 [bot.allowlist] 和 [bot.feishu] 节\n\n  我已了解上述安全建议', initial: true }, { onCancel });
  console.log(`  ${green('✓')} 安全策略: 允许所有用户（如有白名单需求请安装后修改 ~/.reasonix/config.toml）`);

  // ─── 5. DeepSeek API Key ───
  let deepseekKey = cli.apiKey || '';
  if (!deepseekKey) {
    const r = await prompts({ type: 'password', name: 'v', message: '请输入 DeepSeek API Key', hint: 'https://platform.deepseek.com → API Keys' }, { onCancel });
    if (r.v) { deepseekKey = r.v; console.log(`  ${green('✓')} DeepSeek API Key 已设置`); }
  } else {
    console.log(`  ${green('✓')} DeepSeek API Key ${dim('(已配置)')}`);
  }

  return { appId, mode: 'websocket', allowAll, feishuUsers, requireMention, feishuSecret, deepseekKey };
}

// ── 合并用户级 Reasonix 配置（保留用户非 Bot 设置） ──
function mergeWithUserConfig(templateText) {
  const userConfigPath = `${HOME}/.reasonix/config.toml`;
  const userConfigBakPath = `${userConfigPath}.deploy-bak`;

  if (!existsSync(userConfigPath)) {
    return templateText;
  }

  console.log(`  ${cyan('•')} 发现用户配置 ~/.reasonix/config.toml，备份中...`);
  const userText = readFileSync(userConfigPath, 'utf-8');
  // 如果上次备份存在则先删除（避免残留旧备份）
  if (existsSync(userConfigBakPath)) {
    try { unlinkSync(userConfigBakPath); } catch {}
  }
  writeFileSync(userConfigBakPath, userText, 'utf-8');
  console.log(`  ${green('✓')} 已备份: ~/.reasonix/config.toml → ~/.reasonix/config.toml.deploy-bak`);

  // 按节(section)拆分 TOML 文本
  function splitSections(text) {
    const blocks = [];
    const lines = text.split('\n');
    let i = 0;
    // 前导内容（第一个 [section] 之前的顶层键）
    while (i < lines.length && !lines[i].startsWith('[')) i++;
    if (i > 0) blocks.push({ key: '__preamble__', content: lines.slice(0, i).join('\n') });
    // 各节
    while (i < lines.length) {
      const header = lines[i];
      i++;
      const contentLines = [];
      while (i < lines.length && !lines[i].startsWith('[')) {
        contentLines.push(lines[i]);
        i++;
      }
      blocks.push({ key: header, content: contentLines.join('\n') });
    }
    return blocks;
  }

  const isBot = k => k === '[bot]' || k.startsWith('[bot.');
  const tBlocks = splitSections(templateText);
  const uBlocks = splitSections(userText);

  const userBlockMap = new Map(uBlocks.filter(b => b.key !== '__preamble__').map(b => [b.key, b]));
  const tNonBotBlocks = tBlocks.filter(b => b.key !== '__preamble__' && !isBot(b.key));
  const tBotBlocks = tBlocks.filter(b => b.key !== '__preamble__' && isBot(b.key));
  const result = [];

  // 1. 顶层键：以模板为基础，用用户的值覆盖同名键
  const tPreamble = tBlocks.find(b => b.key === '__preamble__');
  const uPreamble = uBlocks.find(b => b.key === '__preamble__');
  if (tPreamble) {
    const userKV = {};
    if (uPreamble) {
      for (const line of uPreamble.content.split('\n')) {
        const m = line.match(/^(\w[\w._]*)\s*=/);
        if (m) userKV[m[1]] = line;
      }
    }
    const merged = tPreamble.content.split('\n').map(line => {
      const m = line.match(/^(\w[\w._]*)\s*=/);
      return (m && userKV[m[1]]) ? userKV[m[1]] : line;
    });
    result.push(merged.join('\n'));
  }

  // 2. 非 Bot 节：优先用用户的
  for (const block of tNonBotBlocks) {
    const ub = userBlockMap.get(block.key);
    if (ub) {
      result.push(block.key + '\n' + ub.content);
    } else {
      result.push(block.key + '\n' + block.content);
    }
  }

  // 3. Bot 节：始终用模板的（后续会做 bot 专用覆写）
  for (const block of tBotBlocks) {
    result.push(block.key + '\n' + block.content);
  }

  // 4. 用户独有的节（模板没有的）追加到末尾
  for (const block of uBlocks) {
    if (block.key === '__preamble__') continue;
    if (!tBlocks.some(tb => tb.key === block.key)) {
      result.push(block.key + '\n' + block.content);
    }
  }

  return result.join('\n\n') + '\n';
}

// ── 步骤 3: 配置摘要 + 确认 ──
async function confirmConfig(config, cli = {}) {
  title('配置摘要');

  console.log(`  ${cyan('飞书 App ID')}    ${config.appId || dim('(未设置)')}`);
  console.log(`  ${cyan('飞书 App Secret')} ${config.feishuSecret ? dim('(已配置)') : red('(未设置)')}`);
  console.log(`  ${cyan('安全策略')}       允许所有用户 ${dim('(白名单/@提及 可在安装后修改 ~/.reasonix/config.toml)')}`);
  console.log(`  ${cyan('DeepSeek Key')}   ${config.deepseekKey ? dim('(已配置)') : red('(未设置)')}`);
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
async function generateConfig(config, cli = {}) {
  title('生成配置');

  mkdirSync(CONFIG_DIR, { recursive: true });

  if (!existsSync(TEMPLATE_FILE)) {
    console.log(`  ${red('✗')} 未找到配置模板: ${TEMPLATE_FILE}`);
    process.exit(1);
  }

  // ── 合并用户级配置 ──
  // 放弃 REASONIX_HOME 隔离方案，改为在安装时 merge 用户自定义设置到配置中
  // 先读取模板，然后与用户 ~/.reasonix/config.toml 合并
  let configContent = readFileSync(TEMPLATE_FILE, 'utf-8');
  configContent = mergeWithUserConfig(configContent);

  // ── 写入用户级 Reasonix 配置（~/.reasonix/config.toml） ──
  const REASONIX_USER_DIR = `${HOME}/.reasonix`;
  mkdirSync(REASONIX_USER_DIR, { recursive: true });

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

  writeFileSync(`${REASONIX_USER_DIR}/config.toml`, configContent, 'utf-8');
  console.log(`  ${green('✓')} 配置已合并并写入: ~/.reasonix/config.toml`);

  // 同时写入项目级配置（保持兼容，方便查看）
  writeFileSync(CONFIG_FILE, configContent, 'utf-8');
  console.log(`  ${green('✓')} 配置已同步到: ~/.config/reasonix-bot/config.toml`);

  // PM2 ecosystem — 每次都重新生成，确保路径等始终正确
  const ecosystemFile = `${CONFIG_DIR}/ecosystem.config.js`;
  const REASONIX_BIN = execSync('which reasonix', { encoding: 'utf-8' }).trim();
  const ecosystem = `module.exports = {
  apps: [{
    name: 'reasonix-bot',
    script: '${REASONIX_BIN}',
    args: 'bot start --channels feishu --dir ${CONFIG_DIR}',
    cwd: '${CONFIG_DIR}',
    env: {
      DEEPSEEK_API_KEY: '${config.deepseekKey}',
      FEISHU_BOT_APP_SECRET: '${config.feishuSecret}'
    },
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
  const undeployMjs = `${PACKAGE_SCRIPTS_DIR}/undeploy.mjs`;
  const undeploySh = `${CONFIG_DIR}/undeploy.sh`;
  const undeployMjsDest = `${CONFIG_DIR}/undeploy.mjs`;
  try {
    copyFileSync(undeployMjs, undeployMjsDest);
    writeFileSync(undeploySh, `#!/usr/bin/env bash
set -euo pipefail
CONFIG_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
exec node "\$CONFIG_DIR/undeploy.mjs" "\$@" <\$(tty)
`, 'utf-8');
    chmodSync(undeploySh, 0o755);
    console.log(`  ${green('✓')} 卸载脚本已复制: undeploy.sh`);
  } catch (e) {
    console.log(`  ${yellow('⚠')} 卸载脚本复制失败: ${e.message}`);
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
alias rb-undeploy='bash ${CONFIG_DIR}/undeploy.sh'
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
    return false;
  }

  const configFile = detectShellConfig();
  if (!configFile) {
    console.log(`  ${yellow('⚠')} 未能识别的 Shell（$SHELL=${process.env.SHELL || '未设置'}），请手动添加别名`);
    console.log(`     编辑 ~/.zshrc 或 ~/.bashrc，加入:${getAliasBlock()}`);
    return false;
  }

  let content = '';
  if (existsSync(configFile)) {
    content = readFileSync(configFile, 'utf-8');
    if (content.includes(ALIAS_MARKER_START)) {
      console.log(`  ${green('✓')} 别名已存在: ${configFile.replace(HOME, '~')}`);
      return true;
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
    return false;
  }
  return true;
}

// ── 完成 ──
function printSummary(hasAliases) {
  console.log(`\n${green('  ╭──────────────────────────────────────────────╮')}`);
  console.log(`${green('  │')}                                              ${green('│')}`);
  console.log(`${green('  │')}   🎉  部署完成！                              ${green('│')}`);
  console.log(`${green('  │')}                                              ${green('│')}`);
  console.log(`${green('  ╰──────────────────────────────────────────────╯')}`);
  console.log();
  console.log(`  ${cyan('📁')}  ~/.config/reasonix-bot/`);
  console.log(`     ${dim('├──')} config.toml         项目配置`);
  console.log(`     ${dim('├──')} ecosystem.config.js   PM2 配置（含 API 密钥）`);
  console.log(`     ${dim('├──')} pm2-start-bot.sh     启动脚本`);
  console.log(`     ${dim('├──')} pm2-stop-bot.sh      停止脚本`);
  console.log(`     ${dim('├──')} undeploy.sh         卸载脚本`);
  console.log(`     ${dim('└──')} undeploy.mjs        卸载程序`);
  console.log();
  console.log(`  ${cyan('📁')}  ~/.reasonix/`);
  console.log(`     ${dim('├──')} config.toml          用户级配置（含 Bot 设置）`);
  console.log(`     ${dim('└──')} config.toml.deploy-bak 安装前备份（卸载时可还原）`);
  console.log();
  console.log(`  ${yellow('═══ ⚠️  安装后不要忘记 ═══')}`);
  console.log();
  console.log(`   ① 去飞书开放平台 → 你的应用:`);
  console.log(`      ${dim('-')} 确认订阅方式选了「长连接(WebSocket)」`);
  console.log(`      ${dim('-')} 右上角点「发布」— ${yellow('不发布配置不生效!')}`);
  console.log();
  console.log(`   ② 启动 Bot:`);
  if (hasAliases) {
    console.log(`      ${dim('$')} rb-start`);
    console.log(`      ${dim('# 或')} pm2 start ~/.config/reasonix-bot/ecosystem.config.js`);
  } else {
    console.log(`      ${dim('$')} pm2 start ~/.config/reasonix-bot/ecosystem.config.js`);
  }
  console.log();
  console.log(`   ③ 查看日志确认连接成功:`);
  if (hasAliases) {
    console.log(`      ${dim('$')} rb-logs`);
  } else {
    console.log(`      ${dim('$')} pm2 logs reasonix-bot`);
  }
  console.log(`      看到 ${green('feishu sdk websocket connected')} 即为成功`);
  console.log();
  console.log(`   ④ 常用命令:`);
  if (hasAliases) {
    console.log(`      rb-status          ${dim('# 状态')}`);
    console.log(`      rb-logs            ${dim('# 日志')}`);
    console.log(`      rb-restart         ${dim('# 重启')}`);
    console.log(`      rb-stop            ${dim('# 停止')}`);
    console.log(`      rb-undeploy        ${dim('# 卸载')}`);
  } else {
    console.log(`      pm2 status               ${dim('# 状态')}`);
    console.log(`      pm2 logs reasonix-bot     ${dim('# 日志')}`);
    console.log(`      pm2 restart reasonix-bot  ${dim('# 重启')}`);
    console.log(`      pm2 stop reasonix-bot     ${dim('# 停止')}`);
    console.log(`      bash ~/.config/reasonix-bot/undeploy.sh  ${dim('# 卸载')}`);
  }
  console.log();
}

// ═══════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════

async function main() {
  const cli = parseArgs();

  stepBanner(1, 6, '环境准备');
  await ensureEnvironment();

  stepBanner(2, 6, '飞书 Bot 配置');
  const config = await collectConfig(cli);

  stepBanner(3, 6, '配置确认');
  await confirmConfig(config, cli);

  stepBanner(4, 6, '生成配置');
  await generateConfig(config, cli);

  stepBanner(5, 6, 'Shell 别名');
  const hasAliases = await setupShellAliases(cli);

  stepBanner(6, 6, '部署完成');
  printSummary(hasAliases);
}

main().catch(e => {
  if (e.message !== 'canceled') {
    console.error(`\n  ${red('✗')} 发生错误:`, e.message);
    process.exit(1);
  }
});
