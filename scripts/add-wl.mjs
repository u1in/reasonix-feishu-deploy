#!/usr/bin/env node
/**
 * Reasonix Bot — 快速添加目录到沙箱白名单
 *
 * 用法:
 *   rb-add-wl <目录路径>
 *   rb-add-wl --help
 *
 * 将指定目录添加到 ~/.reasonix/config.toml 的 [sandbox] allow_write 中，
 * 使 Bot 可以读取和写入该目录下的文件。添加后请重启 Bot 生效 (rb-restart)。
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

const HOME = homedir();
const CONFIG_PATH = `${HOME}/.reasonix/config.toml`;

// ── 工具函数 ──
function color(s, c) { return `\x1b[${c}m${s}\x1b[0m`; }
const bold   = s => color(s, 1);
const green  = s => color(s, 32);
const yellow = s => color(s, 33);
const cyan   = s => color(s, 36);
const red    = s => color(s, 31);
const dim    = s => color(s, 2);

function error(msg) {
  console.error(`\n  ${red('✗')} ${msg}\n`);
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);

  // ── 帮助 ──
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`\n  ${bold('用法')}: rb-add-wl ${dim('<目录路径>')}`);
    console.log(`  ${dim('将目录添加到 Bot 沙箱白名单，允许 Bot 读写该目录。')}`);
    console.log(`  ${dim('添加后执行 rb-restart 重启 Bot 生效。')}\n`);
    process.exit(0);
  }

  // ── 解析路径 ──
  const targetPath = resolve(args[0]);

  if (!existsSync(targetPath)) {
    error(`目录不存在: ${targetPath}`);
  }

  if (!existsSync(CONFIG_PATH)) {
    error(`未找到配置文件: ~/.reasonix/config.toml\n   请先部署 Bot（npm run wizard）。`);
  }

  // ── 读取配置 ──
  let config = readFileSync(CONFIG_PATH, 'utf-8');
  const lines = config.split('\n');

  // 定位 [sandbox] 节
  let sandboxStart = -1;
  let sandboxEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '[sandbox]') {
      sandboxStart = i;
      continue;
    }
    if (sandboxStart !== -1 && sandboxEnd === -1 && t.startsWith('[')) {
      sandboxEnd = i;
      break;
    }
  }
  if (sandboxEnd === -1) sandboxEnd = lines.length;

  if (sandboxStart === -1) {
    error(`配置文件中未找到 [sandbox] 节。\n   请检查 ${CONFIG_PATH.replace(HOME, '~')} 或重新部署。`);
  }

  // 在 [sandbox] 节中搜索 allow_write
  let allowWriteLine = -1;
  let isCommented = false;
  for (let i = sandboxStart; i < sandboxEnd; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('allow_write')) {
      allowWriteLine = i;
      isCommented = false;
      break;
    }
    const afterHash = trimmed.replace(/^#\s*/, '');
    if (afterHash.startsWith('allow_write')) {
      allowWriteLine = i;
      isCommented = true;
      break;
    }
  }

  const escapedPath = targetPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  if (allowWriteLine !== -1) {
    // ── 已有 allow_write 行 ──
    const rawLine = isCommented
      ? lines[allowWriteLine].replace(/^\s*#\s*/, '')
      : lines[allowWriteLine];
    const match = rawLine.match(/allow_write\s*=\s*\[([^\]]*)\]/);
    if (!match) {
      error(`解析 allow_write 行失败:\n  ${rawLine}`);
    }

    const existingItems = match[1]
      .split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);

    // 检查是否已在白名单中
    const resolvedExisting = existingItems.map(p => {
      try { return resolve(p.replace(/^~/, HOME)); } catch { return p; }
    });
    if (resolvedExisting.includes(targetPath)) {
      console.log(`\n  ${yellow('⚠')} ${targetPath} 已在白名单中\n`);
      process.exit(0);
    }

    existingItems.push(targetPath);
    const newLine = `allow_write = [${existingItems.map(p => `"${p}"`).join(', ')}]`;
    lines[allowWriteLine] = newLine;
    console.log(`\n  ${green('✓')} 已将 ${targetPath} 添加到沙箱白名单\n`);
  } else {
    // ── 没有 allow_write 行，在 [sandbox] 节末尾插入 ──
    // 跳过空行和注释，找到节内最后一个有效行
    let insertAt = sandboxEnd;
    for (let i = sandboxEnd - 1; i > sandboxStart; i--) {
      if (lines[i].trim() !== '' && !lines[i].trim().startsWith('#')) {
        insertAt = i + 1;
        break;
      }
    }
    const indent = '    ';
    lines.splice(insertAt, 0, `${indent}allow_write = ["${escapedPath}"]`);
    console.log(`\n  ${green('✓')} 已将 ${targetPath} 添加到沙箱白名单\n`);
  }

  // ── 写入 ──
  writeFileSync(CONFIG_PATH, lines.join('\n'), 'utf-8');
  console.log(`  ${dim('📄')} 已保存: ${CONFIG_PATH.replace(HOME, '~')}`);
  console.log(`  ${dim('⟳')}  重启 Bot 生效: rb-restart\n`);
}

main();
