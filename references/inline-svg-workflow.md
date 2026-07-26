# 内联 SVG (non-base64) 嵌入工作流

## 原理

`data:image/svg+xml,<svg xmlns="...">...</svg>` — 直接将 SVG 源代码编码为 URI data URL，无需 base64 转换。

**优势：**
- 体积比 base64 小 ~33%（无编码膨胀）
- SVG 源码可读可编辑
- `fill="#fff"` 直接在 SVG 内控制颜色

**约束：**
- SVG 内不能有 `#` 字符（URL 的 fragment marker）。如果 SVG 内有 `#fff` 可使用 `%23fff` URL 编码替代，但 `fill="#fff"` 实际可行（浏览器自动处理）
- 推荐双引号包裹整个 data URI：`'data:image/svg+xml,<svg...>'`

## 内联 vs base64 对比

| 方案 | 6 个图标总大小 | 可读性 | 编辑方便度 |
|------|---------------|--------|-----------|
| PNG base64 | ~21KB | ❌ | 必须重渲染 |
| SVG base64 | ~15KB | ❌ | 必须解码→编辑→编码 |
| 内联 SVG  | ~11KB | ✅ | 可直接改 fill/viewBox/transform |

## 规范化步骤

```python
import re, math

def normalize_svg(svg: str) -> str:
    """将 SVG viewBox 归一化为 0 0 24 24，内容缩放居中"""
    m = re.search(r'viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"', svg)
    x0, y0, vw, vh = float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4))
    scale = min(24/vw, 24/vh)
    dx = (24 - vw*scale) / 2
    dy = (24 - vh*scale) / 2

    # 替换 viewBox
    svg = svg.replace(m.group(0), 'viewBox="0 0 24 24"')

    # 移除旧的 preserveAspectRatio
    svg = re.sub(r'\s*preserveAspectRatio="[^"]*"', '', svg)
    svg = svg.replace('>', ' preserveAspectRatio="xMidYMid meet">', 1)

    # 用 <g> 包裹内容
    svg = re.sub(r'>(<path|<circle|<rect|<g)', lambda m: f'><g transform="translate({dx:.2f},{dy:.2f}) scale({scale:.4f})">{m.group(1)}', svg)
    svg = svg.replace('</svg>', '</g></svg>')

    return svg
```

## 嵌入 JS 模板

```javascript
const riskIconMap = {
  risk0_house:    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"><g transform="translate(0.48,0.75) scale(0.9583)"><path d="..." fill="#fff"/></g></svg>',
  risk1_sparkles: 'data:image/svg+xml,...</svg>',
  // ...
};
```

## 常见陷阱

- **base64 中的 `color` 属性无效** — 内联 SVG 的颜色完全由 `fill` 控制，不要同时在 image 上写 `color`
- **单引号 vs 双引号** — JS 字符串用单引号包裹，SVG 属性用双引号，这样互不冲突
- **viewBox 必须正方形** — 非正方形 viewBox 在 widget 强制 22×22 渲染下偏位。归一化到 0 0 24 24
- **`resizeMode: 'cover'` 必加** — 否则图标可能不显示
