#!/usr/bin/env node
// 第三方脚本「出稿」命令：load → 模拟 ctx 跑树 → 渲染 → 一页（含体检报告 + 读数浮层）。
//
// 用法：
//   node scripts/kit/draft.mjs https://example.com/xxx.js --family systemMedium
//   node scripts/kit/draft.mjs ./别人的.js --family systemLarge --env THEME=light --mock sample.json --out build/xxx.html
//
// 选项：
//   --family <fam>      要画哪一档（默认 systemMedium）
//   --env K=V,K2=V2     模拟 ctx 的 env
//   --mock <file.json>  任何 json() 请求返回该样本（最粗适配；更准的要写 adapter）
//   --out <path>        输出 html（默认写到系统临时目录）
//
// ⚠️ 红线：跑不起来就**不出稿**（只报体检结果）。占位数据画出来的稿必须显式标注"数据是占位"。

import path from 'node:path';
import os from 'node:os';
import { readFileSync } from 'node:fs';
import { load, genericCtx, simLine } from './lib/load.mjs';
import { staticReport, treeReport, widgetTreeCheck } from './lib/inspect.mjs';
import { render, takeIssues, esc } from './lib/render.mjs';
import { canvas, cssCanvas, provenanceHtml } from './lib/baseline.mjs';
import { FACTS } from './lib/nodes.mjs';
import { writePage } from './lib/page.mjs';

const argv = process.argv.slice(2);
const src = argv.find((a) => !a.startsWith('--'));
if (!src) { console.error('用法：node scripts/kit/draft.mjs <url|path> [--family fam] [--env K=V,...] [--mock file.json] [--out x.html]'); process.exit(2); }
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const family = flag('--family', 'systemMedium');
const env = Object.fromEntries((flag('--env', '') || '').split(',').filter(Boolean).map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; }));
const mockPath = flag('--mock', null);
const out = flag('--out', path.join(os.tmpdir(), 'egern-draft-kit', 'foreign-draft.html'));

// ── family：未知值报错，锁屏档拒稿 ─────────────────────────────────────────
// 为什么宁可 exit 2：静默兜底会画出一张**画布不对**的稿（比如把 accessoryInline 画成中号主屏），
// 而稿页抬头会照抄你输入的档名 ⇒ 读者会以为那就是锁屏上的样子。宁可不画。
const FAM_MAIN = ['systemSmall', 'systemMedium', 'systemLarge', 'systemExtraLarge'];
if (!FACTS.widgetFamilies.includes(family)) {
  console.error(`⛔ 未知 --family：${family}`);
  console.error(`   官方只有 7 档：${FACTS.widgetFamilies.join(' / ')}`);
  process.exit(2);
}
if (!FAM_MAIN.includes(family)) {
  console.error(`⛔ ${family} 是锁屏档，本工具不出稿。`);
  console.error('   渲染层只做了主屏画布；基座里的锁屏尺寸只印在抬头，没有对应画布可画。');
  console.error('   按纪律：宁可不画，也不画一张画布不对的稿。锁屏形状请上真机（截图量墨迹）。');
  process.exit(2);
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

const W = { ...cssCanvas(), xl: canvas('xl') };
const cls = { systemSmall: 'w-sm', systemMedium: 'w-md', systemLarge: 'w-lg', systemExtraLarge: 'w-xl' }[family];
const mock = mockPath ? JSON.parse(readFileSync(mockPath, 'utf8')) : null;
const { ctx, calls } = genericCtx({ family, env, mock });

let tree, dyn = null, err = null;
try {
  tree = await loaded.fn(ctx);
  // 限定：只处理 widget 脚本。不是 widget 树 ⇒ 当作结论报出来，**不画空稿**
  const chk = widgetTreeCheck(tree);
  if (!chk.ok) {
    console.error(`⛔ 这不是 widget 脚本：${chk.why}`);
    console.error('   按纪律：不出稿（空白稿比没有稿更容易被当成"画出来就这样"）。');
    process.exit(2);
  }
  dyn = treeReport(tree);
} catch (e) { err = e; }

const issues = tree ? takeIssues() : [];
const body = tree ? render(tree, cls) : '';
const rows = (obj) => Object.entries(obj).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`).join('');

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<title>第三方组件预览页 · ${esc(String(src).split('/').pop())}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
body{margin:0;padding:26px 30px 60px;background:#050607;color:#E2E8F0;font:14px/1.65 'Inter','Noto Sans SC',-apple-system,"Segoe UI",sans-serif}
h1{font-size:19px;margin:0 0 6px;word-break:break-all}.lede{color:#94A3B8;font-size:13px;margin:0 0 8px;max-width:960px}
.warn{border:1px solid rgba(251,146,60,.45);background:rgba(251,146,60,.07);border-radius:8px;padding:11px 14px;margin:14px 0;font-size:12.5px;color:#FDBA74;max-width:960px}
.err{border:1px solid rgba(248,113,113,.5);background:rgba(248,113,113,.08);border-radius:8px;padding:11px 14px;margin:14px 0;font-size:12.5px;color:#FCA5A5}
.widget{position:relative;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;border-radius:16px}
.widget.w-sm{width:${W.sm.w}px;height:${W.sm.h}px}.widget.w-md{width:${W.md.w}px;height:${W.md.h}px}.widget.w-lg{width:${W.lg.w}px;height:${W.lg.h}px}.widget.w-xl{width:${W.xl.w}px;height:${W.xl.h}px}
table{border-collapse:collapse;margin-top:12px;font-size:12.5px}th,td{padding:6px 12px;border:1px solid rgba(255,255,255,.09);text-align:left;vertical-align:top}
th{color:#94A3B8;background:rgba(255,255,255,.02)}code{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-size:12px}</style></head><body>
<h1>第三方组件预览页 · ${esc(String(src))}</h1>
<p class="lede">源码未改一行：load（规范化 ESM）→ 模拟 ctx（${family}）→ 真实 DSL 树 → 本页。读数浮层已挂。${family === 'systemExtraLarge' ? `本页画布 = iPad 档 ${W.xl.w}×${W.xl.h}（${W.xl.src}），官方只给区间，随 iPad 型号变。` : ''}</p>
${provenanceHtml()}
<div class="warn"><b>这不是什么</b>：不是渲染结果、不是真机预览、不作像素依据；字体是替身。<br>
<b>数据是占位</b>：所有请求返回空对象/空串${mockPath ? `（除 --mock ${esc(mockPath)}）` : ''} ⇒ <b>别拿这一页的内容下结论</b>，它只证明"渲染通路能跑通、画出来长什么样"。</div>
${dyn && Object.values(dyn.types).reduce((a, b) => a + b, 0) <= 2 ? `<div class="warn"><b>树只剩 ${Object.values(dyn.types).reduce((a, b) => a + b, 0)} 个节点</b> ⇒ 这大概率是「降级 / 取数失败」分支，**不是你想要的形状**：先补 <code>--env</code>（缺配置）或 <code>--mock</code>（缺数据形状）再出一次稿。</div>` : ''}
${err ? `<div class="err"><b>跑不起来</b>：${esc(err.message)}<br>按纪律：不出稿。</div>` : `<div class="widget ${cls}">${body}</div>`}
<h2 style="font-size:15px;margin:26px 0 4px;color:#CBD5E1">体检</h2>
<table>
<tr><th>项</th><th>值</th></tr>
${rows({ 请求端点: stat.endpoints.join(' ') || '未发现', 'env 键': stat.envLiteral.join(', ') + (stat.envDynamic ? ' (+动态取键)' : ''), 'ctx 字段': stat.ctxFields.join(', '), '官方未提供': stat.ctxUnknown.join(', ') || '无', '疑似无效属性': stat.propSuspect.join(', ') || '无', '实际请求': (dyn && dyn.requests ? dyn.requests.join(' ') : calls.join(' ')) || '无', '模拟 ctx': simLine() })}
${dyn ? rows({ 节点统计: Object.entries(dyn.types).map(([k, v]) => `${k}×${v}`).join(' '), 未支持节点: dyn.unsupported.join(', ') || '无', 树内非官方属性: dyn.badProps.join(', ') || '无', '渲染降级记录': issues.join(' | ') || '无', 文本条数: String(dyn.textCount) }) : ''}
</table>
</body></html>`;

writePage(out, html);
console.log(`已生成：${out}`);
console.log(`  静态：${stat.lines} 行；端点 ${stat.endpoints.length} 个；官方未提供的 ctx 字段 ${stat.ctxUnknown.length} 个`);
console.log(`  模拟 ctx：${simLine()}`);
if (err) console.log(`  ⛔ 跑不起来：${err.message}（未出稿）`);
else console.log(`  动态：节点 ${Object.entries(dyn.types).map(([k, v]) => `${k}×${v}`).join(' ')}${dyn.badProps.length ? `  非官方属性 ${dyn.badProps.join(',')}` : ''}`);
