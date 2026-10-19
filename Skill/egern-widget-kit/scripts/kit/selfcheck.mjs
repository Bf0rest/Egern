#!/usr/bin/env node
// 一键自检：确认这套工具本身没坏（渲染分支 / 基座 / 接入 / 出稿）。
// 用法：node scripts/kit/selfcheck.mjs        全部通过时 exit 0
import { render, takeIssues } from './lib/render.mjs';
import { check as baselineCheck } from './lib/baseline.mjs';
import { load, genericCtx } from './lib/load.mjs';
import { staticReport, treeReport } from './lib/inspect.mjs';
import { writePage } from './lib/page.mjs';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kitRoot = fileURLToPath(new URL('../..', import.meta.url));   // kit 根（scripts/kit → ../../）

let bad = 0, warn = 0;
const ok = (name, cond, detail) => {
  if (!cond) bad++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
};
// 已知偏差（台账里"实测 vs 官方"的差）不是失败 —— 它按设计只作校验，不参与排版
const note = (name, detail) => { warn++; console.log(`  WARN  ${name}  → ${detail}`); };

// ── ① 渲染分支：每条官方默认值都要能被断言到 ─────────────────────────────
console.log('① 渲染分支（官方默认值）');
const one = (tree) => { const h = render(tree, 'w-md'); takeIssues(); return h; };

ok('stack 省略 direction ⇒ row', /flex-direction:row/.test(one({ type: 'widget', children: [{ type: 'stack', children: [] }] })));
ok('text 省略 textColor ⇒ 系统主色变量', /color:var\(--sys-label/.test(one({ type: 'widget', children: [{ type: 'text', text: 'x' }] })));
ok('image 省略 resizeMode ⇒ contain', /object-fit:contain/.test(one({ type: 'widget', children: [{ type: 'image', src: 'data:,x' }] })));
ok('image 显式 resizeMode:cover 生效', /object-fit:cover/.test(one({ type: 'widget', children: [{ type: 'image', src: 'data:,x', resizeMode: 'cover' }] })));
ok('date 节点渲染出模拟文案（≈ 前缀）', /≈/.test(one({ type: 'widget', children: [{ type: 'date', date: new Date().toISOString(), format: 'relative' }] })));
ok('未知节点画占位而不是消失', /unsupported: /.test(one({ type: 'widget', children: [{ type: 'progress' }] })));
ok('根容器 align-items:flex-start', /align-items:flex-start/.test(one({ type: 'widget', children: [] })));
ok('根下含裸 spacer 的行补 align-self:stretch',
  /align-self:stretch/.test(one({ type: 'widget', children: [{ type: 'stack', direction: 'row', children: [{ type: 'text', text: 'a' }, { type: 'spacer' }] }] })));
ok('渐变 stops 生效', /%/.test(one({ type: 'widget', backgroundGradient: { type: 'linear', colors: ['#000000', '#FFFFFF'], stops: [0, 1] }, children: [] })));
ok('backgroundImage 优先于渐变', /background-image:url\(/.test(one({ type: 'widget', backgroundImage: 'data:image/svg+xml,<svg/>', backgroundGradient: { colors: ['#000000', '#FFFFFF'] }, children: [] })));
ok('自适应色按一侧落色', /color:#FFFFFF/.test(one({ type: 'widget', children: [{ type: 'text', text: 'x', textColor: { light: '#000000', dark: '#FFFFFF' } }] })));

// ── ② 基座 ───────────────────────────────────────────────────────────────
console.log('\n② 基座（画布/圆角事实源）');
const bc = baselineCheck();
ok('每条值都有来源、无 assumed', bc.problems.length === 0, bc.problems.join('; ') || 'ok');
if (bc.deltas.length) note('台账里有"实测 vs 官方"的已知偏差（按设计只作校验）', bc.deltas.join('; '));
else console.log('  PASS  实测与官方无超差');

// ── ③ 接入 + 体检（拿自带的天气示例当样本）─────────────────────────────
console.log('\n③ 接入 / 体检 / 出稿（examples/weather）');
const example = fileURLToPath(new URL('../../examples/weather/weather.js', import.meta.url));
const { fn, code } = await load(example);
const stat = staticReport(code);
ok('load 拿到 export default 函数', typeof fn === 'function');
ok('静态体检发现两个端点', stat.endpoints.length === 2, stat.endpoints.join(' '));
const { ctx } = genericCtx({ family: 'systemMedium', env: { CITY: 'Shanghai' } });
const tree = await fn(ctx);
const dyn = treeReport(tree);
ok('模拟 ctx 能跑出树（走"取数失败"分支，不崩）', !!tree && Object.keys(dyn.types).length > 0, Object.entries(dyn.types).map(([k, v]) => k + '×' + v).join(' '));
ok('树里没有未支持节点', dyn.unsupported.length === 0, dyn.unsupported.join(',') || 'ok');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'egern-kit-')), 'selfcheck.html');
writePage(out, `<!DOCTYPE html><html><body><div class="widget w-md">${render(tree, 'w-md')}</div></body></html>`);
const html = readFileSync(out, 'utf8');
ok('出稿带读数浮层（writePage 幂等注入）', html.includes('eg-bar'));

// ── ④ 边界：模拟 ctx 的面 / family 拒稿 / 发布面不泄漏 ────────────────────
// 这三条对应过三个真实误判：缺 http 方法 → 脚本掉进 catch 被当成"它坏了"；
// 锁屏档静默画成中号主屏 → 交出一张画布不对的稿；内部路径印在稿页上 → 读者照抄 ENOENT。
console.log('\n④ 边界（模拟面 / family / 发布面）');
const { ctx: c2 } = genericCtx({ mock: { a: 1 } });
const METHODS = ['get', 'post', 'put', 'delete', 'head', 'options', 'patch'];
ok('模拟 ctx 有官方 7 个 http 方法', METHODS.every((m) => typeof c2.http[m] === 'function'),
  METHODS.filter((m) => typeof c2.http[m] !== 'function').join(',') || 'ok');
const resp = await c2.http.post('https://x/y', { body: '1' });
ok('post 也能拿到 --mock 的样本（不再掉进 catch）', (await resp.json()).a === 1);
ok('ctx.ssh 抛的是"模拟层未实现"而不是 TypeError',
  await c2.ssh.connect().then(() => false, (e) => /模拟 ctx 没有实现/.test(e.message)));
ok('ctx 面按官方表补齐（device/app/notify/lookupIP/compress）',
  !!(c2.device && c2.device.wifi && c2.app && typeof c2.notify === 'function'
     && typeof c2.lookupIP === 'function' && c2.compress && typeof c2.compress.gzip === 'function'));

const { execFileSync } = await import('node:child_process');
const draftCli = fileURLToPath(new URL('./draft.mjs', import.meta.url));
const rcOf = (args) => {
  try { execFileSync(process.execPath, [draftCli, ...args], { stdio: 'pipe' }); return 0; }
  catch (e) { return e.status; }
};
ok('锁屏档拒稿（accessoryCircular → exit 2）', rcOf([example, '--family', 'accessoryCircular']) === 2);
ok('拼错的 family 报错（→ exit 2）', rcOf([example, '--family', 'medium']) === 2);
ok('四档主屏都能出稿（exit 0）',
  ['systemSmall', 'systemMedium', 'systemLarge', 'systemExtraLarge']
    .every((f) => rcOf([example, '--family', f, '--out', path.join(tmpdir(), `kit-${f}.html`)]) === 0));

// 扫发布面：仓库路径 / 内部文件名 / 已删掉的旧渲染器名，一个都不许出现
// （needle 拆着写，免得这份自检自己的源码被自己扫出来）
const NEEDLES = ['build/' + 'tools', 'egern-' + 'official-facts', 'effect-' + 'draft-workflow', 'dsl-' + 'render'];
const leaks = [];
(function scan(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (/\.(mjs|js|md)$/.test(e.name)) {
      const lines = readFileSync(p, 'utf8').split('\n');
      if (e.name === 'CHANGELOG.md') continue;   // 它的职责就是记录旧名字
      lines.forEach((l, i) => { if (NEEDLES.some((n) => l.includes(n))) leaks.push(`${path.relative(kitRoot, p)}:${i + 1}`); });
    }
  }
})(kitRoot);
ok('发布面不含仓库叫法（仓库路径 / 内部文件名 / 旧渲染器名）', leaks.length === 0, leaks.slice(0, 6).join(' ') || 'ok');

console.log(bad ? `\n❌ ${bad} 项未通过` : `\n✅ 全部通过${warn ? `（${warn} 条已知偏差，见 WARN）` : ''}`);
if (bad) process.exitCode = 1;
