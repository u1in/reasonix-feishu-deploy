#!/usr/bin/env node
/**
 * @u1in/create-reasonix-feishu-deploy
 * 轻量包装器，运行 npm create @u1in/reasonix-feishu-deploy 时
 * 自动调用 @u1in/reasonix-feishu-deploy 的安装向导。
 */
import { execSync } from 'child_process';

try {
  execSync('npx @u1in/reasonix-feishu-deploy', { stdio: 'inherit' });
} catch {
  process.exit(1);
}
