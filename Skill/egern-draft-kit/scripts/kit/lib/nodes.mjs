// Egern DSL 的**平台事实与默认值** —— 唯一事实源。
// 每条都在注释里标出处；完整索引（含 URL 与锚点）见 `references/官方事实索引.md`。
//
// ⚠️ 本文件只放"官方文档能指到位置"的事实。量出来的、推测的、踩过问题得来的经验**不进这里**
//   （有出处的写 [W#…]，没有出处的宁可留空）。

const W = 'W#'; // 出处：https://egernapp.com/docs/configuration/widgets

// ── 颜色 ────────────────────────────────────────────────────────────────
// 官方：Color 支持固定色（#RRGGBB / #RRGGBBAA / rgba()）与**自适应色 `{light, dark}`**。[W#color]
// 官方 ctx **没有** appearance / colorScheme [J]，所以"稿页模拟哪一侧"只能由稿页指定。
export const COLOR_SIDES = ['dark', 'light'];
let colorSide = COLOR_SIDES.includes(process.env.EG_COLOR_SIDE) ? process.env.EG_COLOR_SIDE : 'dark';
export function getColorSide() { return colorSide; }
export function setColorSide(s) { if (COLOR_SIDES.includes(s)) colorSide = s; }

/** 把 DSL 里的颜色值落成 CSS 能用的字符串；自适应色按当前稿页侧取。 */
export function resolveColor(c) {
  if (c == null) return null;
  if (typeof c === 'string') return c;
  if (typeof c === 'object') return c[colorSide] || c.dark || c.light || null;
  return null;
}

// 官方：`text.textColor` **默认系统主色**（未指定 ≠ 白色）。[W#text]
// 预览页用 CSS 变量表达：页面可覆盖 --sys-label；默认白字（本工具的页面都是深底）。
export const DEFAULT_TEXT_COLOR = 'var(--sys-label, #FFFFFF)';

// ── 布局默认值 ──────────────────────────────────────────────────────────
// 官方：`stack.direction` 默认 `"row"`。[W#stack-flex-container]
export const STACK_DIRECTION_DEFAULT = 'row';
// 官方：`stack.alignItems` 默认 `"center"`。[W#stack-flex-container]
export const STACK_ALIGN_DEFAULT = 'center';
// 官方：`gap` 默认 0（widget / stack 范围）。[W#common-properties]
export const GAP_DEFAULT = 0;
// 官方：`widget` 根容器默认纵向、子元素自上而下**左上对齐**（按内容宽度摆子节点）。[W#widget-root-container]
//   实现规则：根 `align-items:flex-start`；**根下含裸 `spacer` 的行补 `align-self:stretch`**
//   （不补的话「值靠右」的版式会塌）—— 见 render.mjs。
export const WIDGET_ROOT_ALIGN = 'flex-start';

// ── 属性适用范围（官方原文的 Applies to 列）[W#common-properties] ─────────
export const TYPES = {
  widthHeight: ['stack', 'image'],
  border: ['stack', 'image'],
  borderRadius: ['stack', 'image'],
  opacity: ['text', 'image', 'date'],
  background: ['widget', 'stack'],
  padding: ['widget', 'stack'],
  gap: ['widget', 'stack']
};
export const ELEMENT_TYPES = ['widget', 'stack', 'text', 'image', 'spacer', 'date']; // [W#element-types-type]

// ── 字体 ────────────────────────────────────────────────────────────────
// 官方：`font` 整个省略 = 默认 `body`；`size` 可用语义名或数字；语义名 → 默认点值：[W#font]
export const FONT_SIZE = {
  largeTitle: 34, title: 28, title2: 22, title3: 20, headline: 17,
  body: 17, callout: 16, subheadline: 15, footnote: 13, caption1: 12, caption2: 11
};
export const FONT_SIZE_DEFAULT = FONT_SIZE.body;
// 官方 9 档（现有成品只用其中 6 档，但第三方组件可能用全部）。[W#font]
export const WEIGHTS = {
  ultraLight: 100, thin: 200, light: 300, regular: 400, medium: 500,
  semibold: 600, bold: 700, heavy: 800, black: 900
};

// ── 日期节点 ────────────────────────────────────────────────────────────
// 官方：`format` 取值 `date`(默认) / `time` / `relative` / `offset` / `timer`。[W#date]
export const DATE_FORMATS = ['date', 'time', 'relative', 'offset', 'timer'];
export const DATE_FORMAT_DEFAULT = 'date';

// ── 图片 ────────────────────────────────────────────────────────────────
// 官方：`resizeMode` 取 `"contain"`（**默认**）或 `"cover"`；`resizable` 默认 true；
//      内联 SVG 上限 **512 KB**，超了改用占位图标。[W#image]
export const IMAGE_RESIZE_MODES = ['contain', 'cover'];
export const MAX_SVG_BYTES = 512 * 1024;
// 官方默认是 `contain`（不是拉伸）—— 稿页按它画；给图片写 `resizeMode` 只会在 `contain`/`cover` 之间切换。
export const IMAGE_DEFAULT_FIT = 'contain';

/** DSL 的 resizeMode → CSS object-fit（未写则用官方默认值，见 IMAGE_DEFAULT_FIT） */
export function imgFit(node) {
  const m = node && node.resizeMode;
  if (m === 'contain') return 'contain';
  if (m === 'cover') return 'cover';
  return IMAGE_DEFAULT_FIT;
}

// ── 其他官方口径（工具/文档用，渲染不必读）────────────────────────────
export const FACTS = {
  envPriority: 'Module > Widget > Script',           // [E#priority-and-merging]
  updateIntervalDefault: 86400,                      // 秒 [S]
  timeoutDefault: 10,                                // 秒，上限 600 [S]
  maxSizeDefault: 1048576,                           // 字节 [S]
  widgetFamilies: ['systemSmall', 'systemMedium', 'systemLarge', 'systemExtraLarge',
    'accessoryCircular', 'accessoryRectangular', 'accessoryInline'], // [W#script-context]
  ctxFields: ['script', 'env', 'app', 'device', 'cron', 'widgetFamily', 'request', 'response',
    'http', 'storage', 'notify', 'lookupIP', 'compress', 'ssh', 'respond', 'abort'] // [J]
};
