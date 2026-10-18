// 稿页写盘 —— 同时把读数浮层（lib/overlay.mjs）注入进去，免得每份稿各写一次 <script>。
//
// 用法（壳里唯一要改的一句）：
//   import { writePage } from './lib/page.mjs';
//   writePage(out, html);
//
// 为什么放在这里：读数浮层必须存在于**页面**里，而 渲染层 只产出片段、看不到文档；
// 写盘是每份稿都必经的一步，所以由它兜底 —— 新稿照模板复制也漏不了。
// 幂等：页面里已经有浮层（含 `eg-bar`）就不再重复注入。

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { overlayJs } from './overlay.mjs';

export function withOverlay(html) {
  if (html.indexOf('eg-bar') >= 0) return html;              // 幂等
  if (html.indexOf('</body>') < 0) return html;              // 不是完整页面，原样返回
  return html.replace('</body>', () => `<script>\n${overlayJs()}\n</script>\n</body>`);
}

export function writePage(out, html) {
  // 父目录不存在就建 —— `--out some/new/dir/x.html` 不该因为目录缺失就崩（外部试用测试抓到过）
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  writeFileSync(out, withOverlay(html));
  return out;
}
