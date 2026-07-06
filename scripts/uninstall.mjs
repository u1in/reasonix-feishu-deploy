#!/usr/bin/env node
/**
 * Reasonix 飞书 Bot — 卸载还原脚本
 * 还原 deploy 所做的所有修改，支持选择性保留数据。
 *
 * 用法: node uninstall.mjs
 *       或者: npm run uninstall (在 reasonix-deploy 包中)
 */
import prompts from 'prompts';
import { existsSync, unlinkSync, rmSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';

const HOME = homedir();
const CONFIG_DIR = `${HOME}/.config/reasonix-bot`;

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

async function main() {
  console.clear();
  console.log(`\n${red('  ╭──────────────────────────────────────────────╮')}`);
  console.log(`${red('  │')}                                              ${red('│')}`);
  console.log(`${red('  │')}   🗑️   Reasonix 飞书 Bot — 卸载向导          ${red('│')}`);
  console.log(`${red('  │')}                                              ${red('│')}`);
  console.log(`${red('  │')}   将还原 deploy 所做的修改                    ${red('│')}`);
  console.log(`${red('  │')}                                              ${red('│')}`);
  console.log(`${red('  ╰──────────────────────────────────────────────╯')}`);
  console.log();

  const onCancel = () => {
    console.log(`\n  ${yellow('⚠')} 卸载已取消`);
    process.exit(0);
  };

  // ─── 检测已安装的内容 ───
  title('检测安装状态');

  const pm2Running = false;
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

  console.log();

  // ─── 确认卸载 ───
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

  // ─── 1. 停掉 PM2 进程 ───
  title('1/5 — 停掉 Bot 进程');

  try {
    execSync('pm2 stop reasonix-bot 2>/dev/null && pm2 delete reasonix-bot 2>/dev/null', { stdio: 'ignore' });
    console.log(`  ${green('✓')} PM2 进程 reasonix-bot 已停止并删除`);
  } catch {
    console.log(`  ${dim('─')} 没有运行的进程`);
  }

  // ─── 2. 配置文件 ───
  title('2/5 — 配置文件');

  const configFiles = [
    'config.toml',
    'ecosystem.config.js',
    'pm2-start-bot.sh',
    'pm2-stop-bot.sh',
    'config.json',
  ];

  const { removeConfig } = await prompts({
    type: 'confirm',
    name: 'removeConfig',
    message: '是否删除 ~/.config/reasonix-bot/ 下的配置文件？',
    hint: 'config.toml / ecosystem.config.js / 启动脚本 等',
    initial: true,
  }, { onCancel });

  const { removeSessions } = await prompts({
    type: 'confirm',
    name: 'removeSessions',
    message: '是否删除会话记录和记忆数据？（聊天历史将丢失）',
    hint: 'sessions/ / memory/ 等',
    initial: false,
  }, { onCancel });

  if (removeConfig && existsSync(CONFIG_DIR)) {
    for (const file of configFiles) {
      const fp = `${CONFIG_DIR}/${file}`;
      try { unlinkSync(fp); console.log(`  ${green('✓')} 已删除: ${file}`); } catch { /* 不存在 */ }
    }
    console.log(`  ${dim('─')} 配置文件已清理`);
  } else {
    console.log(`  ${dim('─')} 保留配置文件`);
  }

  // ─── 3. 会话和记忆数据 ───
  title('3/5 — 会话与记忆');

  if (removeSessions && existsSync(CONFIG_DIR)) {
    const dirsToRemove = [
      'sessions', 'projects', 'memory',
    ];
    for (const dir of dirsToRemove) {
      const fp = `${REASONIX_DIR}/${dir}`;
      try {
        rmSync(fp, { recursive: true, force: true });
        console.log(`  ${green('✓')} 已删除: ${dir}/`);
      } catch { /* 不存在 */ }
    }
    // 删除其他杂项文件
    for (const f of ['slash-usage.json', 'version-cache.json', 'usage.jsonl']) {
      try { unlinkSync(`${CONFIG_DIR}/${f}`); } catch {}
    }
  } else {
    console.log(`  ${dim('─')} 保留会话与记忆数据`);
  }

  // ─── 4. API 密钥 ───
  title('4/5 — API 密钥');

  const envFile = `${CONFIG_DIR}/.env`;
  if (existsSync(envFile)) {
    const { removeEnv } = await prompts({
      type: 'confirm',
      name: 'removeEnv',
      message: '是否删除 ~/.config/reasonix-bot/.env（API 密钥文件）？',
      hint: '注意: 删除后需重新录入',
      initial: false,
    }, { onCancel });
    if (removeEnv) {
      unlinkSync(envFile);
      console.log(`  ${green('✓')} 已删除: .env`);
    } else {
      console.log(`  ${dim('─')} 保留 .env`);
    }
  } else {
    console.log(`  ${dim('─')} .env 不存在，跳过`);
  }

  // ─── 5. 全局 CLI ───
  title('5/5 — 全局 CLI');

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

    if (removeCLI.includes('reasonix')) {
      try {
        execSync('npm uninstall -g reasonix', { stdio: 'inherit' });
        console.log(`  ${green('✓')} reasonix 已卸载`);
      } catch {
        console.log(`  ${yellow('⚠')} reasonix 卸载失败，请手动执行: npm uninstall -g reasonix`);
      }
    } else {
      console.log(`  ${dim('─')} 保留 reasonix`);
    }

    if (removeCLI.includes('pm2')) {
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
      const { removeDir } = await prompts({
        type: 'confirm',
        name: 'removeDir',
        message: `~/.config/reasonix-bot/ 还有 ${remaining.length} 个文件，是否强制删除整个目录？`,
        initial: false,
      });
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
  console.log(`\n${red('  ╭──────────────────────────────────────────────╮')}`);
  console.log(`${red('  │')}                                              ${red('│')}`);
  console.log(`${red('  │')}   🗑️   卸载完成！                            ${red('│')}`);
  console.log(`${red('  │')}                                              ${red('│')}`);
  console.log(`${red('  ╰──────────────────────────────────────────────╯')}`);
  console.log();
  console.log(`  需要手动检查的残留:`);
  console.log(`    ${dim('•')} PM2 开机自启: pm2 unstartup systemd`);
  console.log(`    ${dim('•')} nvm 安装的 Node: nvm uninstall 22`);
  console.log();
}

main().catch(e => {
  if (e.message !== 'canceled') {
    console.error(`\n  ${red('✗')} 发生错误:`, e.message);
    process.exit(1);
  }
});
