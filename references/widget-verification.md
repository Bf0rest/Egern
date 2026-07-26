# Widget JS 结构验证脚本

每次对 Widget JS 做改动后，运行以下检查确保结构完整性。

## 核心检查清单

| 检查项 | 验证方法 |
|--------|----------|
| riskIconMap keys | 6 个 key: risk0～risk5，命名一致 |
| SVG 格式 | 所有 SVG 含 `viewBox="0 0 24 24"`, `</svg>`, `fill="#fff"` |
| SVG 非 base64（若用内联方案） | 不含 `;base64` |
| 风险分支覆盖 | risk0(≤15) / risk1(≤25) / risk2(≤40) / risk3(≤50) / risk4(≤70) / risk5(else) |
| Circular 布局 | 有 `spacer`、`stack row`、`image`、`resizeMode: 'cover'`、`22×22` |
| 无 `color` on image（内联 SVG 方案） | 不含 `color:` 在 image 元素上 |

## 验证脚本模板

```python
from pathlib import Path
import re

def verify_widget_js(path: str) -> dict:
    js = Path(path).read_text(encoding='utf-8')
    checks = {}

    # riskIconMap keys
    keys = re.findall(r'risk\d_\w+:', js)
    checks['riskIconMap keys (6)'] = len(keys) == 6

    # SVG integrity
    svg_uris = re.findall(r"risk\d_\w+:\s+'data:image/svg\+xml,([^']+)'", js)
    checks['riskIconMap entries match SVG URIs'] = len(svg_uris) == 6
    checks['SVG viewBox 24x24'] = all('viewBox="0 0 24 24"' in u for u in svg_uris)
    checks['SVG has </svg>'] = all('</svg>' in u for u in svg_uris)
    checks['SVG has fill=#fff'] = all('fill="#fff"' in u for u in svg_uris)
    checks['SVG has <g transform'] = all('<g transform=' in u for u in svg_uris)
    checks['SVG not base64'] = all(';base64' not in uri for uri in svg_uris)

    # Risk branches
    thresholds = [('risk0 <= 15', 'riskScore <= 15'), ('risk1 <= 25', 'riskScore <= 25'),
                  ('risk2 <= 40', 'riskScore <= 40'), ('risk3 <= 50', 'riskScore <= 50'),
                  ('risk4 <= 70', 'riskScore <= 70')]
    for name, pattern in thresholds:
        checks[name] = pattern in js

    # Circular layout
    circular_idx = js.find("accessoryCircular'")
    block = js[circular_idx:circular_idx+600] if circular_idx >= 0 else ''
    checks['circular has spacer(s)'] = 'spacer' in block
    checks['circular stack row'] = "direction: 'row'" in block
    checks['circular image 22x22'] = 'width: 22' in block and 'height: 22' in block
    checks['circular resizeMode cover'] = "resizeMode: 'cover'" in block
    checks['circular no color on image'] = "color: '#FFFFFF'" not in block

    return checks

# 使用
checks = verify_widget_js('Widget/IPPure-emoji.js')
all_pass = all(checks.values())
for k, v in checks.items():
    print(f"{'✓' if v else '✗'} {k}")
print(f"\n{'✓ ALL PASS' if all_pass else '✗ FAILS'}")
```

## 不可本地验证的项

- 视觉居中效果（需在 Egern 设备上验证）
- 锁屏 vibrant 模式下的渲染（需设备确认）
- 布局间距在真实 iOS widget 中的表现
