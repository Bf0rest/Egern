import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { overlayJs } from './overlay.mjs';

export function withOverlay(html) {
  if (html.indexOf('eg-bar') >= 0) return html;
  if (html.indexOf('</body>') < 0) return html;
  return html.replace('</body>', () => `<script>\n${overlayJs()}\n</script>\n</body>`);
}

export function writePage(out, html) {
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  writeFileSync(out, withOverlay(html));
  return out;
}
