import { ELEMENT_TYPES, FACTS, FONT_SIZE, WEIGHTS, DATE_FORMATS, IMAGE_RESIZE_MODES } from './nodes.mjs';
import { genericCtx, simLine } from './load.mjs';

export const OFFICIAL_PROPS = new Set([
  'type', 'children',
  'url', 'width', 'height', 'flex', 'padding', 'gap',
  'backgroundColor', 'backgroundGradient', 'backgroundImage',
  'borderRadius', 'borderWidth', 'borderColor',
  'shadowColor', 'shadowRadius', 'shadowOffset', 'opacity',
  'direction', 'alignItems',
  'text', 'font', 'textColor', 'textAlign', 'maxLines', 'minScale',
  'date', 'format',
  'src', 'color', 'resizeMode', 'resizable',
  'length',
  'refreshAfter',
  'size', 'weight', 'family',
  'colors', 'stops', 'startPoint', 'endPoint',
  'light', 'dark', 'x', 'y'
]);

export function staticReport(code) {
  const endpoints = [...new Set([...code.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((m) => m[0].split('?')[0]))];
  const envLiteral = [...new Set([...code.matchAll(/ctx\.env\s*\??\.\s*([A-Za-z_]\w*)/g)].map((m) => m[1]))];
  const envDynamic = /ctx\.env\s*\??\.\s*\[/.test(code);
  const ctxFields = [...new Set([...code.matchAll(/ctx\.(\w+)/g)].map((m) => m[1]))];
  const ctxUnknown = ctxFields.filter((f) => !FACTS.ctxFields.includes(f));
  const dslObjs = [...code.matchAll(/\{([^{}]*\btype:\s*['"][^'"]+['"][^{}]*)\}/g)].map((m) => m[1]);
  const propNames = [...new Set(dslObjs.flatMap((o) => [...o.matchAll(/(?:^|,)\s*([A-Za-z_]\w*)\s*:/g)].map((m) => m[1])))];
  const propSuspect = propNames.filter((x) => !OFFICIAL_PROPS.has(x));
  const hasDefault = /export\s+default/.test(code);
  const writes = /(ctx\.storage\.(set|setJSON)|\bPUSH\b|fetch\(|XMLHttpRequest)/.test(code);
  return {
    lines: code.split('\n').length,
    bytes: Buffer.byteLength(code),
    hasDefault,
    endpoints,
    envLiteral, envDynamic,
    ctxFields, ctxUnknown,
    propSuspect,
    storageOrUpload: writes
  };
}

export function treeReport(tree) {
  const types = {}, propHist = {}, unsupported = new Set(), texts = [];
  (function walk(n, path) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach((c, i) => walk(c, `${path}.${i}`));
    if (n.type) {
      types[n.type] = (types[n.type] || 0) + 1;
      if (!ELEMENT_TYPES.includes(n.type)) unsupported.add(n.type);
    }
    for (const k of Object.keys(n)) propHist[k] = (propHist[k] || 0) + 1;
    if (typeof n.text === 'string' && n.text) texts.push(n.text);
    if (n.children) walk(n.children, n.type || path);
  })(tree, 'w');
  const badProps = Object.keys(propHist).filter((p) => !OFFICIAL_PROPS.has(p));
  return { types, propHist, unsupported: [...unsupported], badProps, texts: texts.slice(0, 24), textCount: texts.length };
}


export function widgetTreeCheck(tree) {
  if (tree === undefined || tree === null) return { ok: false, why: '没有返回值（undefined / null）' };
  if (Array.isArray(tree)) return { ok: false, why: '返回了数组；widget 脚本应返回单个 { type: "widget" } 对象' };
  if (typeof tree !== 'object') return { ok: false, why: `返回的不是对象（${typeof tree}）` };
  if (tree.type === undefined && (tree.title !== undefined || tree.content !== undefined)) {
    return { ok: false, why: '看起来是 **panel 脚本**（返回 { title, content }），不是 widget 脚本' };
  }
  if (tree.type !== 'widget') {
    return { ok: false, why: `根节点的 type 是 ${JSON.stringify(tree.type)}；widget 脚本的根必须是 "widget"` };
  }
  return { ok: true };
}

export function formatReport({ src, stat, dyn, err, ran = false }) {
  const L = [];
  L.push(`# 脚本体检：${src}`);
  L.push('');
  if (stat) {
    L.push(`静态：${stat.lines} 行 / ${(stat.bytes / 1024).toFixed(1)} KB，export default=${stat.hasDefault}`);
    L.push(stat.endpoints.length ? `  请求端点（静态）: ${stat.endpoints.join('  ')}` : '  请求端点（静态）: 未发现硬编码端点');
    L.push(`  env 键（静态）  : ${stat.envLiteral.length ? stat.envLiteral.join(', ') : '无'}` +
      (stat.envDynamic ? '  ⚠️ 另有**动态取键**（ctx.env[expr]），静态无法枚举' : ''));
    L.push(`  ctx 字段        : ${stat.ctxFields.join(', ') || '无'}`);
    if (stat.ctxUnknown.length) L.push(`  ⚠️ 官方未提供   : ${stat.ctxUnknown.join(', ')}（这些读出来恒为 undefined）`);
    if (stat.propSuspect.length) L.push(`  ⚠️ 疑似无效属性 : ${stat.propSuspect.join(', ')}（官方属性表里没有）`);
    if (stat.storageOrUpload) L.push('  ⚠️ 含存储写入 / 网络上报（自己核对是否为回传）');
    L.push('  ⚠️ 静态计数会低估：节点常由辅助函数拼出 ⇒ 见下面的动态普查');
  }
  if (err) {
    L.push('');
    const label = err.code === 'NOT_WIDGET' ? '**不是 widget 脚本**' : '**跑不起来**';
    L.push(`动态：${label} —— ${err.code || 'ERROR'}: ${err.message}`);
    if (err.file) L.push(`  规范化后的副本：${err.file}`);
    L.push('  ⛔ 到此为止：只报事实，**不许自己编一棵树来出稿**。');
  }
  if (dyn) {
    L.push('');
    L.push('动态（模拟 ctx 跑出的真实树）：');
    L.push(`  节点统计: ${Object.entries(dyn.types).map(([k, v]) => `${k}×${v}`).join('  ')}`);
    if (dyn.unsupported.length) L.push(`  ⚠️ 未支持节点: ${dyn.unsupported.join(', ')}（稿页画占位框）`);
    if (dyn.badProps.length) L.push(`  ⚠️ 树里出现非官方属性: ${dyn.badProps.join(', ')}`);
    L.push(`  文本片段: ${dyn.texts.slice(0, 8).map((t) => JSON.stringify(t.slice(0, 14))).join(' ')}${dyn.textCount > 8 ? ` …共 ${dyn.textCount} 条` : ''}`);
    const nodeCount = Object.values(dyn.types).reduce((a, b) => a + b, 0);
    if (nodeCount <= 2) {
      L.push(`  ⚠️ 树只剩 ${nodeCount} 个节点 ⇒ **大概率是"降级 / 取数失败"分支**，` +
        '先补 `--env`（缺配置）或 `--mock`（缺数据形状）再看；否则别拿这个形状下结论。');
    }
  }
  if (ran) {
    L.push('');
    L.push(`模拟 ctx：${simLine()}`);
    L.push('⚠️ 提醒：上面的"数据"全是**占位响应**（空对象/空串），只为把渲染通路跑通；');
    L.push('   形状是否与真机一致，要拿真实样本（--mock）或从回传日志里取，**别拿占位数据下结论**。');
  }
  return L.join('\n');
}

export async function inspect(src, { run = false, family = 'systemMedium', env = {}, mock = null, tmpDir } = {}) {
  const { load } = await import('./load.mjs');
  let stat = null, dyn = null, err = null, loaded = null;
  try {
    loaded = await load(src, { tmpDir });
    stat = staticReport(loaded.code);
  } catch (e) {
    err = e;
    return { text: formatReport({ src, stat: null, dyn: null, err }), stat, dyn, err };
  }
  stat = staticReport(loaded.code);
  if (run) {
    const { ctx, calls } = genericCtx({ family, env, mock });
    try {
      const tree = await loaded.fn(ctx);
      dyn = treeReport(tree);
      dyn.requests = calls;
    } catch (e) {
      err = Object.assign(new Error(`执行抛错：${e.message}`), { code: 'RUN_FAILED' });
    }
  }
  return { text: formatReport({ src, stat, dyn, err, ran: run }), stat, dyn, err, loaded };
}
