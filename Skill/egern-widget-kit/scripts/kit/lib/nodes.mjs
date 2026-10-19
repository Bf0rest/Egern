const W = 'W#';

export const COLOR_SIDES = ['dark', 'light'];
let colorSide = COLOR_SIDES.includes(process.env.EG_COLOR_SIDE) ? process.env.EG_COLOR_SIDE : 'dark';
export function getColorSide() { return colorSide; }
export function setColorSide(s) { if (COLOR_SIDES.includes(s)) colorSide = s; }

export function resolveColor(c) {
  if (c == null) return null;
  if (typeof c === 'string') return c;
  if (typeof c === 'object') return c[colorSide] || c.dark || c.light || null;
  return null;
}

export const DEFAULT_TEXT_COLOR = 'var(--sys-label, #FFFFFF)';

export const STACK_DIRECTION_DEFAULT = 'row';
export const STACK_ALIGN_DEFAULT = 'center';
export const GAP_DEFAULT = 0;
export const WIDGET_ROOT_ALIGN = 'flex-start';

export const TYPES = {
  widthHeight: ['stack', 'image'],
  border: ['stack', 'image'],
  borderRadius: ['stack', 'image'],
  opacity: ['text', 'image', 'date'],
  background: ['widget', 'stack'],
  padding: ['widget', 'stack'],
  gap: ['widget', 'stack']
};
export const ELEMENT_TYPES = ['widget', 'stack', 'text', 'image', 'spacer', 'date'];

export const FONT_SIZE = {
  largeTitle: 34, title: 28, title2: 22, title3: 20, headline: 17,
  body: 17, callout: 16, subheadline: 15, footnote: 13, caption1: 12, caption2: 11
};
export const FONT_SIZE_DEFAULT = FONT_SIZE.body;
export const WEIGHTS = {
  ultraLight: 100, thin: 200, light: 300, regular: 400, medium: 500,
  semibold: 600, bold: 700, heavy: 800, black: 900
};

export const DATE_FORMATS = ['date', 'time', 'relative', 'offset', 'timer'];
export const DATE_FORMAT_DEFAULT = 'date';

export const IMAGE_RESIZE_MODES = ['contain', 'cover'];
export const MAX_SVG_BYTES = 512 * 1024;
export const IMAGE_DEFAULT_FIT = 'contain';

export function imgFit(node) {
  const m = node && node.resizeMode;
  if (m === 'contain') return 'contain';
  if (m === 'cover') return 'cover';
  return IMAGE_DEFAULT_FIT;
}

export const FACTS = {
  envPriority: 'Module > Widget > Script',
  updateIntervalDefault: 86400,
  timeoutDefault: 10,
  maxSizeDefault: 1048576,
  widgetFamilies: ['systemSmall', 'systemMedium', 'systemLarge', 'systemExtraLarge',
    'accessoryCircular', 'accessoryRectangular', 'accessoryInline'],
  ctxFields: ['script', 'env', 'app', 'device', 'cron', 'widgetFamily', 'request', 'response',
    'http', 'storage', 'notify', 'lookupIP', 'compress', 'ssh', 'respond', 'abort']
};
