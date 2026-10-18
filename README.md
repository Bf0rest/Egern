# Egern 组件与工具

本仓有两部分，用途不同：

| 目录 | 是什么 | 怎么用 |
|---|---|---|
| **`Widget/`** | **成品组件** —— 能直接装进 Egern 的小组件 | Egern → 新建 `generic` 脚本指向该 JS → 添加小组件 |
| **`Skill/`** | **造组件的工具** —— 把脚本渲染成可量的 HTML 预览页、体检第三方脚本 | 见 [`Skill/egern-draft-kit/SKILL.md`](Skill/egern-draft-kit/SKILL.md) |

## Widget/（成品）

| 文件 | 说明 |
|---|---|
| `IPPure-emoji.js` | 代理出口 IP 风险评分 + 去/回程延迟（Noto 单色图标版，Circular 用图标替代文本） |

安装：把文件放到一个可访问的 URL（或本地文件），在 Egern 里新建 **generic** 脚本指向它，
然后到组件画廊添加。环境变量用法写在文件头部注释里（`GROUP` / `STYLE` / `SOURCE` / `PROBE_URL` / `IP`）。

## Skill/（工具）

`egern-draft-kit` —— 稿页（= 预览页）工具：

- **看**：把 widget 脚本的 DSL 树按官方画布尺寸渲染成一页 HTML
- **量**：鼠标划过元素 → 名字 / 左边 / 尺寸；点一下钉住，再划别的元素给出差值
- **体检**：给一份第三方脚本，报出它需要哪些 env、往哪发请求、用了哪些平台不支持的字段

⚠️ 它是 CSS 近似，**不是真机**：预览页上的像素不作依据，字体也是替身（Inter ≈ SF Pro）。
细节与边界见 [SKILL.md](Skill/egern-draft-kit/SKILL.md) 与
[references/稿子纪律.md](Skill/egern-draft-kit/references/稿子纪律.md)。

## License

MIT —— 见 [`LICENSE`](LICENSE)。
