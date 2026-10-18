#!/usr/bin/env node
// 接手第三方 Egern 组件的**入口命令**：体检一份第三方脚本（URL 或本地路径）。
//
// 用法：
//   node scripts/kit/inspect.mjs https://example.com/xxx.js
//   node scripts/kit/inspect.mjs ./别人的.js --run
//   node scripts/kit/inspect.mjs ./别人的.js --run --family systemMedium --env LEAGUES=lpl,DEBUG=1
//   node scripts/kit/inspect.mjs ./别人的.js --run --mock sample.json      # 给一份真实样本喂 JSON 接口
//
// 选项：
//   --run              跑一遍（模拟 ctx）把真实 DSL 树普查出来；不加只做静态体检
//   --family <fam>     模拟 ctx 的 ctx.widgetFamily（默认 systemMedium）
//   --env K=V,K2=V2    模拟 ctx 的 env
//   --mock <file.json> 任何 `.json()` 请求都返回这个文件的内容（最粗的适配；更准的适配要写 adapter）
//
// ⚠️ 红线：跑不起来就只报事实，**不许自己编一棵树出稿**（截断/空白的稿比没有稿更危险）。

import { readFileSync } from 'node:fs';
import { inspect } from './lib/inspect.mjs';
import { load, genericCtx } from './lib/load.mjs';
import { FACTS } from './lib/nodes.mjs';

const argv = process.argv.slice(2);
const src = argv.find((a) => !a.startsWith('--'));
if (!src) {
  console.error('用法：node scripts/kit/inspect.mjs <url|path> [--run] [--family fam] [--env K=V,...] [--mock file.json]');
  process.exit(2);
}
const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const has = (name) => argv.includes(name);
const parseEnv = (s) => s ? Object.fromEntries(s.split(',').map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; })) : {};

const family = flag('--family', 'systemMedium');
// 体检只往 ctx.widgetFamily 里塞值、不画图 ⇒ 官方 7 档全收；但拼错的值必须报错（别静默当成 systemMedium）
if (!FACTS.widgetFamilies.includes(family)) {
  console.error(`⛔ 未知 --family：${family}`);
  console.error(`   官方只有 7 档：${FACTS.widgetFamilies.join(' / ')}`);
  process.exit(2);
}
const env = parseEnv(flag('--env', ''));
const mockPath = flag('--mock', null);
const run = has('--run');

try {
  if (!run) {
    const { text } = await inspect(src, { run: false });
    console.log(text);
  } else {
    // --run：自己接模拟 ctx（这样能挂 --mock）
    const loaded = await load(src);
    const { staticReport, treeReport, formatReport, widgetTreeCheck } = await import('./lib/inspect.mjs');
    const stat = staticReport(loaded.code);
    const mock = mockPath ? JSON.parse(readFileSync(mockPath, 'utf8')) : null;
    const { ctx, calls } = genericCtx({ family, env, mock });
    let dyn = null, err = null;
    try {
      const tree = await loaded.fn(ctx);
      const chk = widgetTreeCheck(tree);
      if (!chk.ok) err = Object.assign(new Error(chk.why), { code: 'NOT_WIDGET' });
      else { dyn = treeReport(tree); dyn.requests = calls; }
    } catch (e) { err = Object.assign(new Error(`执行抛错：${e.message}`), { code: 'RUN_FAILED' }); }
    console.log(formatReport({ src, stat, dyn, err, ran: true }));
    if (dyn && dyn.requests.length) console.log(`\n实际请求过：\n  ${dyn.requests.join('\n  ')}`);
    if (err && err.code === 'NOT_WIDGET') process.exitCode = 2;   // 输入不是这类脚本，便于脚本分支
  }
} catch (e) {
  console.error(`⛔ ${e.code || 'ERROR'}: ${e.message}`);
  if (e.file) console.error(`   规范化副本：${e.file}`);
  process.exit(1);
}
