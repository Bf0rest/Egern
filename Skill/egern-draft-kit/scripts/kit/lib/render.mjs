// Egern widget DSL → HTML 近似渲染（供 build/ 下的稿页脚本使用）。
//
// 分层（2026-10-18 拆分，之前全在一个 `scripts/kit/渲染层` 里）：
//   · `nodes.mjs`    —— 平台事实与默认值（唯一来源，每条带官方出处）
//   · `symbols.mjs`  —— SF Symbol 近似形状
//   · `annotate.mjs` —— 读数标注 data-eg*（可 EG_ANNOTATE=off 关掉）
//   · 本文件          —— **只做** 节点 → HTML 映射
//
// 与真机的差异：真机是 Yoga/flex 布局，这里是 CSS flexbox 近似。
// ⚠️ 字体：本文件不给 text 设 font-family，Windows 上会继承到 Segoe UI（真机是 SF Pro）。
//   两套字形不同 ⇒ 字号 / 位置可信，字重 / 字型不可信。
//   要接近真机观感：稿页 <head> 引 Google Fonts 的 Inter + Noto Sans SC。
//
// 官方口径与本实现不一致的地方（如 image 默认 resizeMode）不在这里选边，
// 见 `references/官方事实索引.md` 的冲突表。

import {
  DEFAULT_TEXT_COLOR, FONT_SIZE, FONT_SIZE_DEFAULT, WEIGHTS, GAP_DEFAULT,
  STACK_DIRECTION_DEFAULT, WIDGET_ROOT_ALIGN, resolveColor, imgFit, DATE_FORMAT_DEFAULT
} from './nodes.mjs';
import { SF_SYMBOLS, SYMBOL_FALLBACK } from './symbols.mjs';
import { egAttrs } from './annotate.mjs';

// ── 渲染过程中记下的「不支持 / 降级」项（稿页可以取走打汇总）────────────────
export const issues = [];
export function takeIssues() { const a = issues.slice(); issues.length = 0; return a; }
function note(kind, detail) { issues.push(`${kind}：${detail}`); }

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}

const pxv = (v) => (typeof v === 'number' ? v + 'px' : v);
const round1 = (n) => Math.round(n * 10) / 10;
/** 圆角：官方支持数字或 "auto"（自动匹配组件容器圆角）[W#common-properties] */
const radius = (v) => (v === 'auto' ? 'inherit' : pxv(v));

// ── 渐变：官方 Gradient = {type: linear|radial|angular, colors[], stops[]?, startPoint?, endPoint?} ──
function linearAngle(g) {
  const s = g.startPoint, e = g.endPoint;
  if (!s || !e) return 180;                       // 未给 → 按自上而下（最常用）
  const dx = (e.x ?? 0) - (s.x ?? 0), dy = (e.y ?? 0) - (s.y ?? 0);
  if (!dx && !dy) return 180;
  // CSS 角度：0deg 朝上、顺时针为正；屏幕坐标 y 向下 ⇒ 用 atan2(dx, -dy)
  const a = Math.atan2(dx, -dy) * 180 / Math.PI;
  return Math.round((a % 360 + 360) % 360);
}
function gradientCss(g) {
  if (!g || !Array.isArray(g.colors) || !g.colors.length) return '';
  const colors = g.colors.map(resolveColor).filter(Boolean);
  if (!colors.length) return '';
  // stops 必须与 colors 数量一致（官方），否则视为未给、按均匀分布
  const parts = (Array.isArray(g.stops) && g.stops.length === g.colors.length)
    ? colors.map((c, i) => `${c} ${round1(g.stops[i] * 100)}%`)
    : colors;
  const type = g.type || 'linear';
  if (type === 'radial') return `radial-gradient(circle at 50% 50%,${parts.join(',')})`;
  if (type === 'angular') return `conic-gradient(from 0deg at 50% 50%,${parts.join(',')})`;
  if (type !== 'linear') note('unsupported', `gradient type=${type}`);
  return `linear-gradient(${linearAngle(g)}deg,${parts.join(',')})`;
}

/** widget / stack 的背景：backgroundImage（最高优先） > backgroundGradient > backgroundColor [W#common-properties] */
function bgCss(node) {
  if (node.backgroundImage) {
    return `background-image:url("${escAttr(node.backgroundImage)}");background-size:cover;background-position:center`;
  }
  const g = gradientCss(node.backgroundGradient);
  if (g) return `background:${g}`;
  const c = resolveColor(node.backgroundColor);
  return c ? `background:${c}` : '';
}

// ── date 节点的文案 ─────────────────────────────────────────────────────
// ⚠️ 真机的 date 由系统实时更新、按系统语言/时区排版；稿页只能"按当前时刻模拟"，
//   所以一律加 `≈` 前缀，并在标注里写明是模拟值。
function dateText(node) {
  const fmt = node.format || DATE_FORMAT_DEFAULT;
  const d = node.date ? new Date(node.date) : new Date();
  if (isNaN(d.getTime())) return `≈ [date]`;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const mins = Math.round((now - d) / 60000);
  switch (fmt) {
    case 'time': return `≈ ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    case 'relative': {
      const a = Math.abs(mins), unit = a < 60 ? `${a} 分钟` : a < 1440 ? `${Math.round(a / 60)} 小时` : `${Math.round(a / 1440)} 天`;
      return `≈ ${unit}${mins >= 0 ? '前' : '后'}`;
    }
    case 'offset': {
      const s = mins >= 0 ? '-' : '+';
      return `≈ ${s}${Math.abs(mins) < 60 ? Math.abs(mins) + ' 分钟' : round1(Math.abs(mins) / 60) + ' 小时'}`;
    }
    case 'timer': {
      const t = Math.max(0, Math.round((d - now) / 1000));
      return `≈ ${pad(Math.floor(t / 3600))}:${pad(Math.floor(t % 3600 / 60))}:${pad(t % 60)}`;
    }
    default: {
      if (!require_fmt_ok(fmt)) note('unsupported', `date format=${fmt}`);
      return `≈ ${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }
  }
}
function require_fmt_ok(fmt) { return ['date', 'time', 'relative', 'offset', 'timer'].includes(fmt); }

function textStyle(node, extra) {
  const f = node.font || {};
  const size = typeof f.size === 'number' ? f.size : (FONT_SIZE[f.size] || FONT_SIZE_DEFAULT);
  return [
    `font-size:${size}px`,
    `font-weight:${WEIGHTS[f.weight] || 400}`,
    `color:${resolveColor(node.textColor) || DEFAULT_TEXT_COLOR}`,
    'line-height:1.25',
    node.width ? `width:${pxv(node.width)}` : '',
    node.textAlign ? `text-align:${node.textAlign}` : '',
    node.maxLines ? 'white-space:nowrap;overflow:hidden' : '',
    node.opacity != null ? `opacity:${node.opacity}` : '',   // 官方：opacity 适用 text/image/date
    shadowCss(node),                                        // 官方：shadow* 适用 text/image/date/stack
    'flex:none',
    extra || ''
  ].filter(Boolean).join(';');
}

function render(node, ctxBox, path) {
  if (!node) return '';
  path = path || 'w';
  if (Array.isArray(node)) return node.map((n, i) => render(n, ctxBox, path + i + '/')).join('');

  switch (node.type) {
    case 'widget': {
      const pad = Array.isArray(node.padding)
        ? node.padding.map((v) => v + 'px').join(' ')
        : (node.padding || 0) + 'px';
      // 官方：根容器默认纵向、子元素左上对齐 [W#widget-root-container]
      // CSS flex-column 的默认 cross 轴是 stretch（与「左上对齐」的字面读法不同）——
      // 稿页按官方口径实现，见 nodes.mjs 的 WIDGET_ROOT_ALIGN。
      const bd = node.borderWidth
        ? `border:${node.borderWidth}px solid ${resolveColor(node.borderColor) || 'transparent'};`
        : '';
      const bg = bgCss(node);
      // 官方：根按内容宽度摆子节点（左上对齐）—— 实测见 nodes.mjs 的 WIDGET_ROOT_ALIGN
      return `<div class="widget ${ctxBox}"${egAttrs(node, path)} style="${bg ? bg + ';' : ''}${bd}align-items:${WIDGET_ROOT_ALIGN};padding:${pad};gap:${node.gap || GAP_DEFAULT}px">` +
        render(node.children, ctxBox, path) + '</div>';
    }
    case 'stack': {
      // 官方：direction 默认 `"row"`（不是 column）[W#stack-flex-container]
      const isRow = (node.direction || STACK_DIRECTION_DEFAULT) !== 'column';
      const align = { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch' }[node.alignItems || 'center'];
      const pad = Array.isArray(node.padding)
        ? node.padding.map((v) => v + 'px').join(' ')
        : (node.padding ? node.padding + 'px' : '');
      if (node.alignItems && !['start', 'end', 'center', 'stretch'].includes(node.alignItems)) {
        note('unsupported', `stack alignItems=${node.alignItems}`);
      }
      // 根下含裸 spacer 的行必须撑满宽度（真机实测：spacer 会把所在 row 撑到可用宽度）——
      // 根改成 flex-start 之后不补这条，这些行会缩成内容宽，"值靠右"的版式会塌。
      const isRootChild = /^w\d+\/$/.test(path);
      const hasBareSpacer = (node.children || []).some((k) => k.type === 'spacer' && !k.length);
      const style = [
        'display:flex',
        `flex-direction:${isRow ? 'row' : 'column'}`,
        (isRootChild && hasBareSpacer) ? 'align-self:stretch' : '',
        `align-items:${align}`,
        node.gap ? `gap:${node.gap}px` : '',
        node.width ? `width:${pxv(node.width)}` : '',
        node.height ? `height:${pxv(node.height)}` : '',
        node.flex ? 'flex:1;min-width:0' : '',
        pad ? `padding:${pad}` : '',
        node.borderRadius ? `border-radius:${radius(node.borderRadius)}` : '',
        node.borderWidth ? `border:${node.borderWidth}px solid ${resolveColor(node.borderColor) || 'transparent'}` : '',
        node.opacity != null ? `opacity:${node.opacity}` : '',
        typeof node.flex === 'number' && node.flex !== 1 ? `flex-grow:${node.flex}` : '',
        shadowCss(node),
        bgCss(node)
      ].filter(Boolean).join(';');
      return `<div${egAttrs(node, path)} style="${style}">${render(node.children, ctxBox, path)}</div>`;
    }
    case 'spacer': {
      // 官方：省略 length = 弹性填充剩余空间 [W#spacer]
      if (node.length) return `<div${egAttrs(node, path)} style="flex:none;width:${node.length}px;height:${node.length}px"></div>`;
      return `<div${egAttrs(node, path)} style="flex:1"></div>`;
    }
    case 'image': {
      const sf = /^sf-symbol:(.+)$/.exec(String(node.src || ''));
      if (sf) {
        const w = node.width || 16, h = node.height || 16;
        const body = SF_SYMBOLS[sf[1]] || SYMBOL_FALLBACK;
        if (!SF_SYMBOLS[sf[1]]) note('approx', `sf-symbol 形状未知：${sf[1]}（画了占位框）`);
        return `<svg${egAttrs(node, path)} style="width:${w}px;height:${h}px;flex:none" viewBox="0 0 16 16" fill="${resolveColor(node.color) || '#fff'}" color="${resolveColor(node.color) || '#fff'}">${body}</svg>`;
      }
      if (!node.src) note('approx', 'image 没有 src（真机会显示占位图标）');
      const style = [
        node.width ? `width:${pxv(node.width)}` : '',
        node.height ? `height:${pxv(node.height)}` : '',
        `object-fit:${imgFit(node)}`,                        // 官方 resizeMode；未写时用真机观察值
        node.borderRadius ? `border-radius:${radius(node.borderRadius)}` : '',
        node.opacity != null ? `opacity:${node.opacity}` : '',
        shadowCss(node),
        node.flex ? 'flex:1;min-width:0' : 'flex:none'
      ].filter(Boolean).join(';');
      return `<img${egAttrs(node, path)} style="${style}" src="${escAttr(node.src)}">`;
    }
    case 'text': {
      const extra = node.minScale != null
        ? `data-eg-note="${escAttr('minScale ' + node.minScale + '：真机可自适应缩小，稿里不能')}"` : '';
      return `<span${egAttrs(node, path, extra)} style="${textStyle(node)}">${esc(node.text)}</span>`;
    }
    case 'date': {
      const extra = `data-eg-note="${escAttr('date 文案由稿页按当前时刻模拟，真机由系统实时更新')}"`;
      return `<span${egAttrs(node, path, extra)} style="${textStyle(node)}">${esc(dateText(node))}</span>`;
    }
    default: {
      // 未知节点**不许静默消失**：画一个显眼的占位框，稿页一眼能看到
      note('unsupported', `节点 type=${node.type}`);
      return `<div${egAttrs(node, path, `data-eg-unsupported="${escAttr(node.type)}"`)} `
        + 'style="box-sizing:border-box;flex:none;padding:2px 6px;border:1px dashed #F87171;'
        + "color:#F87171;font:10px/1.5 'Noto Sans SC',sans-serif\">unsupported: " + esc(node.type) + '</div>';
    }
  }
}

/** 官方：shadowColor/shadowRadius/shadowOffset（text/image/date/stack）；radius 必须设才生效 */
function shadowCss(node) {
  if (!node.shadowRadius) return '';
  const o = node.shadowOffset || { x: 0, y: 0 };
  return `box-shadow:${o.x || 0}px ${o.y || 0}px ${node.shadowRadius}px ${resolveColor(node.shadowColor) || 'rgba(0,0,0,.35)'}`;
}

export { render };
export default render;
