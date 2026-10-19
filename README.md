# Egern 组件与工具

本仓有两部分，用途不同：

| 目录 | 是什么 | 怎么用 |
|---|---|---|
| **`Widget/`** | **成品组件** —— 能直接装进 Egern 的小组件 | Egern → 新建 `generic` 脚本指向该 JS → 添加小组件 |
| **`Skill/`** | **开发辅助工具** —— 写/改组件时把脚本渲染成可量的 HTML 预览页；另配 Egern 官方事实索引与静态体检 | 见 [`Skill/egern-widget-kit/SKILL.md`](Skill/egern-widget-kit/SKILL.md) |

## Widget/（成品）

| 文件 | 说明 |
|---|---|
| `IPPure-emoji.js` | 代理出口 IP 风险评分 + 去/回程延迟（Noto 单色图标版，Circular 用图标替代文本） |

安装：把文件放到一个可访问的 URL（或本地文件），在 Egern 里新建 **generic** 脚本指向它，
然后到组件画廊添加。环境变量用法写在文件头部注释里（`GROUP` / `STYLE` / `SOURCE` / `PROBE_URL` / `IP`）。

## Skill/（工具）

`egern-widget-kit` —— **Egern widget 开发辅助工具**（稿页 = 预览页）：

- **看**：写 / 改组件时，把 widget 脚本的 DSL 树按官方画布尺寸渲染成一页 HTML
- **量**：鼠标划过元素 → 名字 / 左边 / 尺寸；点一下钉住，再划别的元素给出差值
- **静态体检**：给一份脚本，报出它需要哪些 env、往哪发请求、用了哪些 Egern 不支持的字段（不跑代码）

⚠️ **它改不了「别人的脚本」**：脚本要的数据从哪来、env 怎么填、某个分支为什么那样写，都在**项目文档**里、
不在脚本里 —— 把现成脚本丢进来，等于把项目交给一个拿不到状态与决策记录的 agent：要数据的分支全空，
**元素比真机少**。它不是「打开一份现成组件看长相」的工具；要看长相只能上真机。

⚠️ 它是 CSS 近似，**不是真机**：预览页上的像素不作依据，字体也是替身（Inter ≈ SF Pro）。
细节与边界见 [SKILL.md](Skill/egern-widget-kit/SKILL.md) 与
[references/draft-discipline.md](Skill/egern-widget-kit/references/draft-discipline.md)。

## License

MIT —— 见 [`LICENSE`](LICENSE)。
