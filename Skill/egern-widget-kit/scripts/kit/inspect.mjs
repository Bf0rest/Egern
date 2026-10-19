#!/usr/bin/env node

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
    if (err && err.code === 'NOT_WIDGET') process.exitCode = 2;
  }
} catch (e) {
  console.error(`⛔ ${e.code || 'ERROR'}: ${e.message}`);
  if (e.file) console.error(`   规范化副本：${e.file}`);
  process.exit(1);
}
