import {
  DEFAULT_TEXT_COLOR, FONT_SIZE, FONT_SIZE_DEFAULT, WEIGHTS, GAP_DEFAULT,
  STACK_DIRECTION_DEFAULT, WIDGET_ROOT_ALIGN, resolveColor, imgFit, DATE_FORMAT_DEFAULT
} from './nodes.mjs';
import { SF_SYMBOLS, SYMBOL_FALLBACK } from './symbols.mjs';
import { egAttrs } from './annotate.mjs';

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
const radius = (v) => (v === 'auto' ? 'inherit' : pxv(v));

function linearAngle(g) {
  const s = g.startPoint, e = g.endPoint;
  if (!s || !e) return 180;
  const dx = (e.x ?? 0) - (s.x ?? 0), dy = (e.y ?? 0) - (s.y ?? 0);
  if (!dx && !dy) return 180;
  const a = Math.atan2(dx, -dy) * 180 / Math.PI;
  return Math.round((a % 360 + 360) % 360);
}
function gradientCss(g) {
  if (!g || !Array.isArray(g.colors) || !g.colors.length) return '';
  const colors = g.colors.map(resolveColor).filter(Boolean);
  if (!colors.length) return '';
  const parts = (Array.isArray(g.stops) && g.stops.length === g.colors.length)
    ? colors.map((c, i) => `${c} ${round1(g.stops[i] * 100)}%`)
    : colors;
  const type = g.type || 'linear';
  if (type === 'radial') return `radial-gradient(circle at 50% 50%,${parts.join(',')})`;
  if (type === 'angular') return `conic-gradient(from 0deg at 50% 50%,${parts.join(',')})`;
  if (type !== 'linear') note('unsupported', `gradient type=${type}`);
  return `linear-gradient(${linearAngle(g)}deg,${parts.join(',')})`;
}

function bgCss(node) {
  if (node.backgroundImage) {
    return `background-image:url("${escAttr(node.backgroundImage)}");background-size:cover;background-position:center`;
  }
  const g = gradientCss(node.backgroundGradient);
  if (g) return `background:${g}`;
  const c = resolveColor(node.backgroundColor);
  return c ? `background:${c}` : '';
}

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
    node.opacity != null ? `opacity:${node.opacity}` : '',
    shadowCss(node),
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
      const bd = node.borderWidth
        ? `border:${node.borderWidth}px solid ${resolveColor(node.borderColor) || 'transparent'};`
        : '';
      const bg = bgCss(node);
      return `<div class="widget ${ctxBox}"${egAttrs(node, path)} style="${bg ? bg + ';' : ''}${bd}align-items:${WIDGET_ROOT_ALIGN};padding:${pad};gap:${node.gap || GAP_DEFAULT}px">` +
        render(node.children, ctxBox, path) + '</div>';
    }
    case 'stack': {
      const isRow = (node.direction || STACK_DIRECTION_DEFAULT) !== 'column';
      const align = { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch' }[node.alignItems || 'center'];
      const pad = Array.isArray(node.padding)
        ? node.padding.map((v) => v + 'px').join(' ')
        : (node.padding ? node.padding + 'px' : '');
      if (node.alignItems && !['start', 'end', 'center', 'stretch'].includes(node.alignItems)) {
        note('unsupported', `stack alignItems=${node.alignItems}`);
      }
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
        `object-fit:${imgFit(node)}`,
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
      note('unsupported', `节点 type=${node.type}`);
      return `<div${egAttrs(node, path, `data-eg-unsupported="${escAttr(node.type)}"`)} `
        + 'style="box-sizing:border-box;flex:none;padding:2px 6px;border:1px dashed #F87171;'
        + "color:#F87171;font:10px/1.5 'Noto Sans SC',sans-serif\">unsupported: " + esc(node.type) + '</div>';
    }
  }
}

function shadowCss(node) {
  if (!node.shadowRadius) return '';
  const o = node.shadowOffset || { x: 0, y: 0 };
  return `box-shadow:${o.x || 0}px ${o.y || 0}px ${node.shadowRadius}px ${resolveColor(node.shadowColor) || 'rgba(0,0,0,.35)'}`;
}

export { render };
export default render;
