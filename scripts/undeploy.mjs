#!/usr/bin/env node
/**
 * Reasonix 飞书 Bot — 卸载还原脚本
 * 还原 deploy 所做的所有修改，支持选择性保留数据。
 *
 * 推荐用法: npx @u1in/reasonix-feishu-deploy --undeploy
 * 也可直接: node undeploy.mjs
 */
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

let prompts;
try {
  prompts = _require('prompts');
} catch {
  console.log('正在安装 prompts 依赖...');
  const { execSync } = await import('child_process');
  // 优先安装到包本地（npx 缓存可能只读，失败则装到全局）
  try {
    const { fileURLToPath } = await import('url');
    const { resolve, dirname } = await import('path');
    const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    execSync('npm install --no-save prompts 2>/dev/null', { cwd: pkgDir, stdio: 'inherit' });
  } catch {
    execSync('npm install -g prompts 2>/dev/null', { stdio: 'inherit' });
  }
  prompts = _require('prompts');
}

import { existsSync, readFileSync, writeFileSync, unlinkSync, rmSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';

const HOME = homedir();
const CONFIG_DIR = `${HOME}/.config/reasonix-bot`;

const ALIAS_MARKER_START = '# >>> reasonix-bot';
const ALIAS_MARKER_END   = '# <<< reasonix-bot';

// ── CLI 参数解析 ──
function parseArgs() {
  const args = process.argv.slice(2);
  const cli = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--remove-reasonix')    { cli.removeReasonix = true; continue; }
    if (arg === '--no-remove-reasonix') { cli.removeReasonix = false; continue; }
    if (arg === '--remove-pm2')    { cli.removePm2 = true; continue; }
    if (arg === '--no-remove-pm2') { cli.removePm2 = false; continue; }
    if (arg === '--force-remove-dir')    { cli.forceRemoveDir = true; continue; }
    if (arg === '--no-force-remove-dir') { cli.forceRemoveDir = false; continue; }

    if (arg.startsWith('--')) { console.warn(`  ${yellow('⚠')} 未知参数: ${arg}`); }
  }
  return cli;
}

function detectShellConfig() {
  const shell = (process.env.SHELL || '').toLowerCase();
  const zdotdir = process.env.ZDOTDIR || HOME;
  if (shell.includes('zsh')) return `${zdotdir}/.zshrc`;
  if (shell.includes('bash')) {
    const bashrc = `${HOME}/.bashrc`;
    const bashProfile = `${HOME}/.bash_profile`;
    if (existsSync(bashProfile) && !existsSync(bashrc)) return bashProfile;
    return bashrc;
  }
  return '';
}

function hasAliasesInFile(file) {
  try {
    return existsSync(file) && readFileSync(file, 'utf-8').includes(ALIAS_MARKER_START);
  } catch { return false; }
}

function removeAliasBlock(content) {
  const lines = content.split('\n');
  const result = [];
  let inBlock = false;
  for (const line of lines) {
    if (line.trim() === ALIAS_MARKER_START) { inBlock = true; continue; }
    if (line.trim() === ALIAS_MARKER_END)   { inBlock = false; continue; }
    if (!inBlock) result.push(line);
  }
  // 去掉块前后的多余空行
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function color(s, c) { return `\x1b[${c}m${s}\x1b[0m`; }
const green  = s => color(s, 32);
const yellow = s => color(s, 33);
const red    = s => color(s, 31);
const cyan   = s => color(s, 36);
const dim    = s => color(s, 2);
const bold   = s => color(s, 1);

function title(text) {
  console.log(`\n${bold(cyan('━━━ ' + text + ' ━━━'))}\n`);
}

function listDir(dir) {
  try {
    return readdirSync(dir).filter(f => !f.startsWith('.')).sort();
  } catch {
    return [];
  }
}

function stepBanner(current, total, label) {
  console.clear();
  const bar = Array.from({ length: total }, (_, i) => i < current ? green('■') : dim('□')).join(' ');
  console.log(`\n${bold(red('━━━'))} ${bold('🗑️ Reasonix 飞书 Bot — 卸载向导')}  ${dim(`[${current}/${total}]`)} ${bold(red('━━━'))}`);
  console.log(`  ${dim('步骤')} ${bar}`);
  console.log(`  ${bold(cyan(label))}`);
  console.log();
}

async function main() {
  const cli = parseArgs();

  stepBanner(1, 5, '检测安装状态');
  const onCancel = () => {
    console.log(`\n  ${yellow('⚠')} 卸载已取消`);
    process.exit(0);
  };

  // ─── 检测已安装的内容 ───
  title('检测安装状态');

  try {
    const status = execSync('pm2 status reasonix-bot 2>/dev/null || true', { encoding: 'utf-8' });
    if (status.includes('reasonix-bot') && (status.includes('online') || status.includes('stopped'))) {
      console.log(`  ${cyan('•')} PM2 进程 reasonix-bot: ${green('存在')}`);
    }
  } catch {}
  console.log(`  ${cyan('•')} ~/.config/reasonix-bot/ 目录: ${existsSync(CONFIG_DIR) ? green('存在') : dim('不存在')}`);
  if (existsSync(CONFIG_DIR)) {
    const files = listDir(CONFIG_DIR);
    files.forEach(f => console.log(`    ${dim('└──')} ${f}`));
  }

  try {
    execSync('which reasonix', { stdio: 'ignore' });
    const ver = execSync('reasonix version 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
    console.log(`  ${cyan('•')} reasonix CLI: ${green(ver || '已安装')}`);
  } catch {
    console.log(`  ${cyan('•')} reasonix CLI: ${dim('未安装')}`);
  }

  try {
    execSync('which pm2', { stdio: 'ignore' });
    const ver = execSync('pm2 --version 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
    console.log(`  ${cyan('•')} PM2: ${green(`v${ver}`)}`);
  } catch {
    console.log(`  ${cyan('•')} PM2: ${dim('未安装')}`);
  }

  // Shell 别名检测
  const aliasFile = detectShellConfig();
  const hasAliases = aliasFile && hasAliasesInFile(aliasFile);
  if (hasAliases) {
    console.log(`  ${cyan('•')} Shell 别名 (rb-*): ${green('存在')} (${aliasFile.replace(HOME, '~')})`);
  } else if (aliasFile) {
    console.log(`  ${cyan('•')} Shell 别名 (rb-*): ${dim('未安装')}`);
  }

  // ─── 确认卸载 ───
  stepBanner(2, 5, '确认卸载');
  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: '确认开始卸载？',
    initial: false,
  }, { onCancel });

  if (!confirmed) {
    console.log(`\n  ${yellow('⚠')} 卸载已取消`);
    process.exit(0);
  }

  // ── 停掉 PM2 进程（如有） ──
  stepBanner(3, 5, '清理配置与数据');
  title('停掉 Bot 进程');
  try {
    execSync('pm2 stop reasonix-bot 2>/dev/null && pm2 delete reasonix-bot 2>/dev/null', { stdio: 'ignore' });
    console.log(`  ${green('✓')} PM2 进程 reasonix-bot 已停止并删除`);
  } catch {
    console.log(`  ${dim('─')} 没有运行的 PM2 进程`);
  }

  // ── 删除 PM2 日志 ──
  title('PM2 日志');
  const PM2_LOG_DIR = `${HOME}/.pm2/logs`;
  const logFiles = ['reasonix-bot-out.log', 'reasonix-bot-error.log', 'reasonix-bot.log'];
  let hasLogs = false;
  for (const f of logFiles) {
    const fp = `${PM2_LOG_DIR}/${f}`;
    try { unlinkSync(fp); hasLogs = true; } catch { /* 不存在 */ }
  }
  if (hasLogs) {
    console.log(`  ${green('✓')} PM2 日志已删除`);
  } else {
    console.log(`  ${dim('─')} 未发现 PM2 日志`);
  }

  // ─── 配置文件 ───
  title('配置文件');

  const configFiles = [
    'ecosystem.config.js',
    'pm2-start-bot.sh',
    'pm2-stop-bot.sh',
    'undeploy.mjs',
  ];

  if (existsSync(CONFIG_DIR)) {
    for (const file of configFiles) {
      const fp = `${CONFIG_DIR}/${file}`;
      try { unlinkSync(fp); console.log(`  ${green('✓')} 已删除: ${file}`); } catch { /* 不存在 */ }
    }
    console.log(`  ${dim('─')} 配置文件已清理`);
  }

  // ─── Shell 别名 ───
  title('Shell 别名');

  if (hasAliases && aliasFile) {
    try {
      const content = readFileSync(aliasFile, 'utf-8');
      const cleaned = removeAliasBlock(content);
      writeFileSync(aliasFile, cleaned, 'utf-8');
      console.log(`  ${green('✓')} 别名已从 ${aliasFile.replace(HOME, '~')} 中移除`);
    } catch (e) {
      console.log(`  ${yellow('⚠')} 移除失败: ${e.message}`);
    }
  } else {
    console.log(`  ${dim('─')} 未发现别名，跳过`);
  }

  // ─── 全局 CLI ───
  stepBanner(4, 5, '全局 CLI');

  const cliActions = [];

  try {
    execSync('which reasonix', { stdio: 'ignore' });
    cliActions.push('reasonix');
  } catch {}

  try {
    execSync('which pm2', { stdio: 'ignore' });
    cliActions.push('pm2');
  } catch {}

  if (cliActions.length > 0) {
    let removeReasonix, removePm2;
    const { removeCLI } = await prompts({
      type: 'multiselect',
      name: 'removeCLI',
      message: '选择要卸载的全局 CLI（空格选择，回车确认）：',
      hint: '不选则保留',
      choices: cliActions.map(name => ({
        title: name === 'reasonix' ? 'reasonix CLI' : 'PM2 进程守护',
        value: name,
        selected: false,
      })),
    }, { onCancel });
    removeReasonix = removeCLI.includes('reasonix');
    removePm2 = removeCLI.includes('pm2');

    if (removeReasonix) {
      try {
        execSync('npm uninstall -g reasonix', { stdio: 'inherit' });
        console.log(`  ${green('✓')} reasonix 已卸载`);
      } catch {
        console.log(`  ${yellow('⚠')} reasonix 卸载失败，请手动执行: npm uninstall -g reasonix`);
      }
    } else {
      console.log(`  ${dim('─')} 保留 reasonix`);
    }

    if (removePm2) {
      try {
        execSync('npm uninstall -g pm2', { stdio: 'inherit' });
        console.log(`  ${green('✓')} PM2 已卸载`);
      } catch {
        console.log(`  ${yellow('⚠')} PM2 卸载失败，请手动执行: npm uninstall -g pm2`);
      }
    } else {
      console.log(`  ${dim('─')} 保留 PM2`);
    }
  } else {
    console.log(`  ${dim('─')} 无全局 CLI 需要卸载`);
  }

  // ── Reasonix 用户级配置还原 ──
  stepBanner(5, 5, '还原配置');
  const USER_REASONIX_CONFIG = `${HOME}/.reasonix/config.toml`;
  const USER_REASONIX_BAK = `${USER_REASONIX_CONFIG}.deploy-bak`;
  if (existsSync(USER_REASONIX_BAK)) {
    const { mtime } = statSync(USER_REASONIX_BAK);
    const ts = `${mtime.getFullYear()}年${mtime.getMonth() + 1}月${mtime.getDate()}日${mtime.getHours()}时${mtime.getMinutes()}分${mtime.getSeconds()}秒`;
    let restoreUserConfig;
    const r = await prompts({ type: 'confirm', name: 'v', message: `是否还原 ${ts} 备份的 ~/.reasonix/config.toml？`, hint: '选否则保留合并后的配置', initial: true }, { onCancel });
    restoreUserConfig = r.v;
    if (restoreUserConfig) {
      try {
        const bakContent = readFileSync(USER_REASONIX_BAK, 'utf-8');
        writeFileSync(USER_REASONIX_CONFIG, bakContent, 'utf-8');
        unlinkSync(USER_REASONIX_BAK);
        console.log(`  ${green('✓')} 已还原: ~/.reasonix/config.toml`);
        console.log(`  ${green('✓')} 已删除: ~/.reasonix/config.toml.deploy-bak`);
      } catch (e) {
        console.log(`  ${yellow('⚠')} 还原失败: ${e.message}`);
      }
    } else {
      console.log(`  ${dim('─')} 保留合并后的 ~/.reasonix/config.toml`);
    }
  } else {
    console.log(`  ${dim('─')} 未发现 ~/.reasonix/config.toml 备份，跳过还原`);
  }

  // ─── 清理空目录 ───
  if (existsSync(CONFIG_DIR)) {
    const remaining = listDir(CONFIG_DIR);
    if (remaining.length === 0) {
      try {
        rmSync(CONFIG_DIR, { recursive: true, force: true });
        console.log(`  ${green('✓')} 已删除空目录: ~/.config/reasonix-bot/`);
      } catch {}
    } else {
      console.log(`\n  ${dim('剩余文件:')} ${remaining.join(', ')}`);
      let removeDir;
      if (cli.forceRemoveDir !== undefined) {
        removeDir = cli.forceRemoveDir;
      } else {
        const r = await prompts({ type: 'confirm', name: 'v', message: `~/.config/reasonix-bot/ 还有 ${remaining.length} 个文件，是否强制删除整个目录？`, initial: false });
        removeDir = r.v;
      }
      if (removeDir) {
        try {
          rmSync(CONFIG_DIR, { recursive: true, force: true });
          console.log(`  ${green('✓')} 已强制删除: ~/.config/reasonix-bot/`);
        } catch (e) {
          console.log(`  ${red('✗')} 删除失败: ${e.message}`);
        }
      }
    }
  }

  // ─── 完成 ───
  console.clear();
  console.log(`\n${bold(red('━━━'))} ${bold('🗑️ 卸载完成！')} ${bold(red('━━━'))}`);
  console.log();
}

main().catch(e => {
  if (e.message !== 'canceled') {
    console.error(`\n  ${red('✗')} 发生错误:`, e.message);
    process.exit(1);
  }
});
