const ON = process.env.EG_ANNOTATE !== 'off';

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

export function annotateOn() { return ON; }
