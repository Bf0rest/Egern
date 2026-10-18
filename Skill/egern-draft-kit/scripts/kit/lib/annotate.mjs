// 读数标注（`data-eg*`）—— 给 `lib/overlay.mjs` 的浮层用。
// 与渲染逻辑分开：它是**调试/沟通用的横切关注点**，不是渲染的一部分；
// 出"纯净稿"（给别人看、或对比渲染差异）时设 `EG_ANNOTATE=off` 即可整套关掉。
//
// Egern DSL 的节点**没有 name 字段**，所以标签是合成的：类型 + 识别串。

const ON = process.env.EG_ANNOTATE !== 'off';

/** 合成可读标签：stack(row) / text「文案」/ image sf-symbol:airplane / spacer(flex) / widget */
export function egTag(node, path) {
  const t = node.type;
  if (t === 'stack') return `stack(${node.direction === 'column' ? 'col' : 'row'})`;
  if (t === 'spacer') return node.length ? `spacer(${node.length})` : 'spacer(flex)';
  if (t === 'image') return `image ${String(node.src || '').slice(0, 26)}`;
  if (t === 'text' || t === 'date') {
    const raw = t === 'date' ? `date(${node.format || 'date'})` : String(node.text == null ? '' : node.text).replace(/\s+/g, ' ');
    const s = raw.length > 18 ? raw.slice(0, 18) + '…' : raw;
    return t === 'date' ? s : `text 「${s}」`;
  }
  return t;
}

/** 生成元素上的 `data-eg*`（关掉标注时返回空串）；`extra` 可再挂别的 data 属性 */
export function egAttrs(node, path, extra) {
  if (!ON) return '';
  const size = (node.width || node.height)
    ? ` data-eg-decl="${escAttr((node.width || 'auto') + '×' + (node.height || 'auto'))}"`
    : '';
  return ` data-eg="${escAttr(node.type)}" data-eg-label="${escAttr(egTag(node, path))}"`
    + ` data-eg-path="${escAttr(path)}"${size}${extra ? ' ' + extra : ''}`;
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 标注是否开启（供稿页决定要不要访问读数浮层） */
export function annotateOn() { return ON; }
