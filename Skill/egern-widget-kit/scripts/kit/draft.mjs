#!/usr/bin/env node

import path from 'node:path';
import os from 'node:os';
import { readFileSync } from 'node:fs';
import { load, genericCtx, simLine } from './lib/load.mjs';
import { staticReport, treeReport, widgetTreeCheck } from './lib/inspect.mjs';
import { render, takeIssues, esc } from './lib/render.mjs';
import { canvas, cssCanvas, IPAD, RADIUS, screenTable, BASE, SCREENS, provenanceHtml } from './lib/baseline.mjs';
import { FACTS } from './lib/nodes.mjs';
import { writePage } from './lib/page.mjs';

const argv = process.argv.slice(2);
const src = argv.find((a) => !a.startsWith('--'));
if (!src) { console.error('用法：node scripts/kit/draft.mjs <url|path> [--family fam|all] [--screen 402] [--env K=V,...] [--mock file.json] [--out x.html]'); process.exit(2); }
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const family = flag('--family', 'systemMedium');
const screenKey = String(flag('--screen', BASE));
const env = Object.fromEntries((flag('--env', '') || '').split(',').filter(Boolean).map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; }));
const mockPath = flag('--mock', null);
const out = flag('--out', path.join(os.tmpdir(), 'egern-widget-kit', 'foreign-draft.html'));

const SLOT = {
  systemSmall: 'sm', systemMedium: 'md', systemLarge: 'lg', systemExtraLarge: 'xl',
  accessoryRectangular: 'lock.rect', accessoryCircular: 'lock.circular', accessoryInline: 'lock.inline'
};
const CLS = {
  systemSmall: 'w-sm', systemMedium: 'w-md', systemLarge: 'w-lg', systemExtraLarge: 'w-xl',
  accessoryRectangular: 'w-rect', accessoryCircular: 'w-circ', accessoryInline: 'w-inl'
};
const isLock = (f) => SLOT[f].indexOf('lock.') === 0;
if (!SCREENS.includes(screenKey)) {
  console.error(`⛔ 未知 --screen：${screenKey}`);
  console.error(`   官方表里可用的档：${SCREENS.join(' / ')}（402 是按相邻档插值的本机档）`);
  process.exit(2);
}
if (!FACTS.widgetFamilies.includes(family)) {
  console.error(`⛔ 未知 --family：${family}`);
  console.error(`   官方只有 7 档：${FACTS.widgetFamilies.join(' / ')}`);
  process.exit(2);
}
const families = [family];

const sizeMap = {};
for (const r of screenTable()) {
  const e = { sm: r.sm, md: r.md, lg: r.lg };
  if (r.lock) e.lock = r.lock;
  sizeMap[r.key] = e;
}
sizeMap.ipad = (() => {
  const r = IPAD.rows.find((x) => x.device.indexOf(IPAD.base) === 0).canvas;
  return { sm: [r.sm, r.sm], md: r.md, lg: r.lg, xl: r.xl };
})();

function boxOf(fam, scr) {
  const e = sizeMap[scr];
  if (!e) return null;
  const s = SLOT[fam];
  if (s === 'xl') return e.xl || null;
  if (s === 'lock.rect' || s === 'lock.circular' || s === 'lock.inline') {
    return e.lock ? (e.lock[s.slice(5)] || null) : null;
  }
  return e[s] || null;
}

let loaded, stat;
try {
  loaded = await load(src);
  stat = staticReport(loaded.code);
} catch (e) {
  console.error(`⛔ ${e.code || 'ERROR'}: ${e.message}`);
  if (e.file) console.error(`   规范化副本：${e.file}`);
  console.error('   按纪律：跑不起来就只报事实，不出稿。');
  process.exit(1);
}

const mock = mockPath ? JSON.parse(readFileSync(mockPath, 'utf8')) : null;
const trees = {}, errs = {}, issuesByFam = {}, calls = [];
for (const f of families) {
  const { ctx, calls: c } = genericCtx({ family: f, env, mock });
  calls.push(...c);
  try {
    const t = await loaded.fn(ctx);
    const chk = widgetTreeCheck(t);
    if (!chk.ok) {
      console.error(`⛔ ${f} 这不是 widget 脚本：${chk.why}`);
      console.error('   按纪律：不出稿（空白稿比没有稿更容易被当成"画出来就这样"）。');
      process.exit(2);
    }
    trees[f] = t;
  } catch (e) {
    trees[f] = null;
    errs[f] = e.message;
  }
  const list = takeIssues();
  if (list.length) issuesByFam[f] = list;
}
const primary = families.find((f) => trees[f]) || families[0];
const tree = trees[primary];
const dyn = tree ? treeReport(tree) : null;
const issues = Object.entries(issuesByFam).map(([f, l]) => `${f}: ${l.join(' | ')}`);
const rows = (obj) => Object.entries(obj).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`).join('');

const cell = (f) => {
  const body = trees[f]
    ? render(trees[f], CLS[f])
    : `<div class="err" style="max-width:360px"><b>${esc(f)} 跑不起来</b>：${esc(errs[f] || '未知错误')}</div>`;
  const box = `<div class="widget ${CLS[f]}${isLock(f) ? ' plate' : ''}">${body}</div>`;
  const inner = isLock(f) ? `<div class="stage">${box}</div>` : box;
  return `<div class="cell">${inner}</div>`;
};

const W = cssCanvas(screenKey);
const SIZEOF = {};
for (const f of FACTS.widgetFamilies) {
  SIZEOF[f] = f === 'systemExtraLarge'
    ? [canvas('xl').w, canvas('xl').h]
    : (boxOf(f, screenKey) || [0, 0]);
}
const RADIUS_OF = (f) => (f === 'accessoryCircular' ? '50%' : (f === 'accessoryInline' ? 0 : RADIUS.lock.value + 'px'));
if (isLock(family) && SIZEOF[family][0] === 0) {
  console.error(`⛔ 屏宽档 ${screenKey} 官方表里没有锁屏组件（N/A），画不出 ${family}`);
  console.error('   换一个屏宽档（375 / 390 / 393 / 402 / 414 / 430 等），或者换主屏档。');
  process.exit(2);
}
const ruleOf = (f) => `.widget.${CLS[f]}{width:${SIZEOF[f][0]}px;height:${SIZEOF[f][1]}px`;
const RULES = FACTS.widgetFamilies.map((f) => {
  const base = ruleOf(f);
  return isLock(f) ? `${base};border-radius:${RADIUS_OF(f)}}` : `${base}}`;
}).join('\n');
const OPTIONS = screenTable().map((r) => `<option value="${r.key}"${r.key === screenKey ? ' selected' : ''}>${r.screen}${r.src === 'derived' ? '（插值）' : ''}</option>`).join('') + `<option value="ipad"${screenKey === 'ipad' ? ' selected' : ''}>iPad 820×1180（Canvas 715.5×342）</option>`;

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<title>组件预览页 · ${esc(String(src).split('/').pop())}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
body{margin:0;padding:26px 30px 60px;background:#050607;color:#E2E8F0;font:14px/1.65 'Inter','Noto Sans SC',-apple-system,"Segoe UI",sans-serif}
h1{font-size:19px;margin:0 0 6px;word-break:break-all}.lede{color:#94A3B8;font-size:13px;margin:0 0 8px;max-width:960px}
.warn{border:1px solid rgba(251,146,60,.45);background:rgba(251,146,60,.07);border-radius:8px;padding:11px 14px;margin:14px 0;font-size:12.5px;color:#FDBA74;max-width:960px}
.err{border:1px solid rgba(248,113,113,.5);background:rgba(248,113,113,.08);border-radius:8px;padding:11px 14px;margin:14px 0;font-size:12.5px;color:#FCA5A5}
.bar{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:14px 0 18px;font-size:12.5px;color:#CBD5E1}
.bar select{background:#111827;color:#E2E8F0;border:1px solid rgba(255,255,255,.16);border-radius:7px;padding:5px 8px;font:inherit}
.bar b{color:#93C5FD;font-weight:600}
.widget{position:relative;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;border-radius:16px}
${RULES}
.stage{display:inline-block;padding:14px;border-radius:18px;background:linear-gradient(135deg,#3b4657,#8b98a9 48%,#222a35)}
.widget.plate{background:rgba(0,0,0,.45)}
table{border-collapse:collapse;margin-top:12px;font-size:12.5px}th,td{padding:6px 12px;border:1px solid rgba(255,255,255,.09);text-align:left;vertical-align:top}
th{color:#94A3B8;background:rgba(255,255,255,.02)}code{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-size:12px}</style></head><body>
<h1>组件预览页 · ${esc(String(src))}</h1>
<p class="lede">源码未改一行：load（规范化 ESM）→ 模拟 ctx → 真实 DSL 树 → 本页。读数浮层已挂。
切换尺寸只换<b>画布</b>（官方表里那一档的 pt 值，1:1），<b>不做任何按比例缩放</b> —— 内容按 flex 在该尺寸里重排。</p>
${provenanceHtml(screenKey)}
<div class="warn"><b>这不是什么</b>：不是渲染结果、不是真机预览、不作像素依据；字体是替身。<br>
<b>数据是占位</b>：所有请求返回空对象/空串${mockPath ? `（除 --mock ${esc(mockPath)}）` : ''} ⇒ <b>别拿这一页的内容下结论</b>，它只证明"渲染通路能跑通、画出来长什么样"。</div>
${families.some(isLock) ? `<div class="warn"><b>锁屏档</b>：画布按 Apple HIG 槽位（矩形 / 圆形 / inline，随屏宽档变）。
真机上锁屏组件<b>不画底、透明</b>，脚本设的 <code>textColor</code> 还会被系统压成单色 ⇒ <b>别在这页评颜色</b>，
能看的是字号层次、深浅、内容区边界。<b>灰黑块是辅助底</b>（rgba(0,0,0,.45) + 壁纸替身），不是设计的一部分。</div>` : ''}
<div class="bar">
  <span>组件尺寸 <b>${family}</b></span>
  <label>屏宽档 <select id="eg-scr">${OPTIONS}</select></label>
  <span>当前画布 <b id="eg-dim">-</b></span>
</div>
${families.map(cell).join('\n')}
<h2 style="font-size:15px;margin:26px 0 4px;color:#CBD5E1">体检</h2>
<table>
<tr><th>项</th><th>值</th></tr>
${rows({ 请求端点: stat.endpoints.join(' ') || '未发现', 'env 键': stat.envLiteral.join(', ') + (stat.envDynamic ? ' (+动态取键)' : ''), 'ctx 字段': stat.ctxFields.join(', '), '官方未提供': stat.ctxUnknown.join(', ') || '无', '疑似无效属性': stat.propSuspect.join(', ') || '无', '实际请求': (dyn && dyn.requests ? dyn.requests.join(' ') : [...new Set(calls)].join(' ')) || '无', '模拟 ctx': simLine() })}
${dyn ? rows({ 节点统计: Object.entries(dyn.types).map(([k, v]) => `${k}×${v}`).join(' '), 未支持节点: dyn.unsupported.join(', ') || '无', 树内非官方属性: dyn.badProps.join(', ') || '无', '渲染降级记录': issues.join(' | ') || '无', 文本条数: String(dyn.textCount) }) : ''}
</table>
<script>
const SIZES = ${JSON.stringify(sizeMap)};
const SLOT = ${JSON.stringify(SLOT)};
const FAM = ${JSON.stringify(family)};
function boxOf(fam, scr) {
  const t = SIZES[scr]; if (!t) return null;
  const s = SLOT[fam];
  if (s === 'xl') return t.xl || null;
  if (s === 'lock.rect' || s === 'lock.circular' || s === 'lock.inline') return t.lock ? (t.lock[s.slice(5)] || null) : null;
  return t[s] || null;
}
function apply() {
  const scr = document.getElementById('eg-scr').value;
  const box = document.querySelector('.cell .widget');
  const dim = boxOf(FAM, scr);
  if (box && dim) { box.style.width = dim[0] + 'px'; box.style.height = dim[1] + 'px'; }
  const outEl = document.getElementById('eg-dim');
  if (outEl) outEl.textContent = dim ? dim[0] + '×' + dim[1] + ' pt' : '该屏宽不支持这一档';
}
document.getElementById('eg-scr').addEventListener('change', apply);
apply();
</script>
</body></html>`;

const badSize = families
  .filter((f) => SIZEOF[f][0] > 0 && SIZEOF[f][1] > 0)
  .filter((f) => html.indexOf(ruleOf(f)) < 0)
  .map((f) => `${f}（缺 ${ruleOf(f)}…）`);
if (badSize.length) {
  console.error(`⛔ 画布规则缺失：${badSize.join('，')}`);
  console.error('   每个渲染出来的档位都必须在稿页里有一条写死宽高的规则；');
  console.error('   缺了它 .widget 会退化成一列按内容撑开的盒子（成对对比时高度会差出一个 gap）。');
  process.exit(3);
}

writePage(out, html);
console.log(`已生成：${out}`);
console.log(`  静态：${stat.lines} 行；端点 ${stat.endpoints.length} 个；官方未提供的 ctx 字段 ${stat.ctxUnknown.length} 个`);
console.log(`  模拟 ctx：${simLine()}`);
if (errs[primary]) console.log(`  ⛔ ${primary} 跑不起来：${errs[primary]}（该档不出稿）`);
if (dyn) console.log(`  动态：节点 ${Object.entries(dyn.types).map(([k, v]) => `${k}×${v}`).join(' ')}${dyn.badProps.length ? `  非官方属性 ${dyn.badProps.join(',')}` : ''}`);
for (const f of families) {
  const b = boxOf(f, screenKey);
  const why = SLOT[f] === 'xl' && screenKey !== 'ipad' ? '（iPhone 不支持 XL，选 iPad 档）' : '';
  console.log(`  ${f.padEnd(20)} ${b ? b.join('×') : 'N/A'}${why}${errs[f] ? '  ⛔ ' + errs[f] : ''}`);
}
console.log(`  屏宽档 ${screenKey}（画布来自官方表；402 为按相邻档插值）`);
