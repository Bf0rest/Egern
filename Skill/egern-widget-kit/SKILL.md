---
name: egern-widget-kit
description: "Egern iOS 小组件开发辅助工具：把 widget 脚本的 DSL 树按官方画布尺寸渲染成可量尺寸的 HTML 稿页，并配官方事实索引与静态体检。只认 Egern 小组件（不是通用 HTML / 前端 / 设计工具）。触发词：写 widget / 改版式 / 出稿 / 量尺寸。"
---

# egern-widget-kit

Egern iOS 小组件（主屏 + 锁屏）的命令行工具，Node ≥ 18、零依赖。三件事：**出稿**、**量尺寸**、**静态体检**。
只处理 `generic` 类型、返回 `{ type: 'widget' }` 的脚本。

## 能做什么、不能做什么

| 任务 | 结论 |
|---|---|
| 改完脚本看形状、量间距、查对齐 | `draft` 出稿 → 稿页读数浮层 |
| 拿一份现成的成品脚本，还原它在手机上的样子 | **不要用**（原因见下） |
| Egern 的 `http_request` / `http_response` / `schedule` / `network` 脚本 | 不要用 —— `inspect` 会报「不是 widget 脚本」 |
| 通用 HTML / 前端 / 设计稿 / 截图比对 | 不要用 —— 只认 Egern widget 的 DSL 树 |
| 真机上会不会裁切 | 上真机（截图量墨迹）；稿页答不了 |
| 好不好看、该怎么改 | 设计判断，工具不参与 |

`draft` 会真跑脚本。脚本要的数据从哪来、env 怎么填、某个分支为什么那样写，都在项目文档里、不在脚本里。
工具默认对**所有**请求返回空占位 ⇒ 跑成品出的是**降级分支**那一版，元素比真机少。
对成品只能给静态事实：要哪些 env、往哪发请求、有没有写了不生效的字段。

## 三步

```bash
# ① 出稿（同页附带静态体检表）
node scripts/kit/draft.mjs ./my-widget.js --family systemLarge --env CITY=Shanghai --out draft.html

# ② 浏览器打开 draft.html：划过元素 → 名字 / 左边 / 尺寸；点一下钉住；再划别的给 Δ 左/上/右/下/中
#    左下角读数条给全量：x/y、w×h、层级路径

# ③ 改完重跑；工具本身可不可信，用自检确认
node scripts/kit/selfcheck.mjs
```

`--family` 接受全部 7 档（一页只渲这一档）：`systemSmall` / `systemMedium` / `systemLarge` /
`systemExtraLarge`（iPad 画布）/ `accessoryRectangular` / `accessoryCircular` / `accessoryInline`（锁屏槽位）。

**`--screen <档>`** 选屏宽档（默认 `402`，即 iPhone 17 那只插值档）；稿页顶部也有同一个「屏宽档」下拉，
换档只换画布，用来看**同一棵树在不同档位里的排布**。档位全部来自 Apple HIG
《Widgets → iOS dimensions》原表：`320` / `360` / `375` / `375667` / `390` / `393` / `402` /
`414` / `414736` / `428` / `430`，另加页面下拉里的 `iPad 820×1180`。

切尺寸只换**画布**（官方表里那一档的 pt 值，1:1），**不做任何按比例缩放** ——
官方没有「按屏宽等比缩」这回事，每个屏宽是一档独立数值；表里没有的屏宽（402）是插值出来的，页面上标「（插值）」。

锁屏三档按 Apple HIG 槽位尺寸出稿，并垫一块**半透明黑底 + 壁纸替身** —— 真机上的锁屏组件是透明的，
没有底就看不出内容区在哪。稿页的深浅可以看层次，**颜色不算数**（锁屏上 `textColor` 由系统压成单色）。

稿页里每个档位的 `.widget` 都带**写死宽高**的规则（缺了它盒子会按内容撑开，成对对比时高度会差出一个 gap）。
`draft` 出稿前会自检这条，缺规则直接 `exit 3`。

**会 `exit 2` 的三种情况，不要绕过：**

- `--family` / `--screen` 拼错 —— 不会静默兜底成中号或 402。
- `--screen` 选的档位官方没有锁屏组件（如 `320`），却要求出锁屏档 —— 官方表里就是 N/A，画不出来。
- 返回值不是 `{ type: 'widget' }`（例如 panel 脚本的 `{title, content}`）—— 不画空稿。

脚本 import 失败或不是 ESM 时：只出体检报告，不出稿。

## 模拟 ctx：哪部分是真的

`inspect --run` 与 `draft` 跑的都是模拟 ctx，两个命令都会如实标出：

- **真的做了**：`env`、`widgetFamily`、`storage`、`http.get/post/put/delete/head/options/patch`
  （`--mock` 对七个方法都生效）
- **空壳**：`device`（字段全 `null`）、`app`（空串）、`notify`（只记录不发送）、
  `lookupIP`（恒 `null`）、`compress`（原样返回，不真压缩）
- **没实现**：`ssh` —— 一调用就抛错，错误信息写明「模拟 ctx 没有实现」，**不是脚本的错**

「脚本走了失败分支」和「模拟层缺东西」是两件事。树很瘦（≤2 个节点）时报告会提示：
先补 `--env`（缺配置）或 `--mock`（缺数据形状）再下结论。

## 红线

1. 跑不起来就只报事实，**不许自己编一棵树出稿** —— 截断的、看起来像真的假稿比没有稿危险得多。
2. 假数据必须标注。所有请求默认返回**空占位响应**；要真实形状用 `--mock sample.json` 喂真实样本，
   并在结论里写清「数据来自样本，不是真机」。
3. 稿页数字不作证据。真机裁切 / 对齐只能上真机截图确认。字体也是替身
   （Inter ≈ SF Pro、Noto Sans SC ≈ 苹方）⇒ 字号与位置可信，字重与字型不可信。

## 数据从哪来：`--mock` 与适配器

`inspect` 完全通用；`draft` 需要知道「请求该返回什么」，而每个 widget 的数据形状都不同。最粗的适配是一条命令：

```bash
node scripts/kit/draft.mjs ./x.js --family systemMedium --mock ./sample.json
```

`--mock` 会把**任何** `json()` 请求都返回这份样本。更准的做法是写一个小适配器脚本
（`load()` + 自建 ctx，见 `scripts/kit/lib/load.mjs` 的 `genericCtx`），逐端点给不同响应。

## 装在哪

1. **要有 Node ≥ 18**（`node -v` 确认）。整套只 import `node:` 标准库，**零依赖、不用 `npm install`**。
2. **整个 `egern-widget-kit/` 目录**放进 agent 的技能目录，**目录结构要保住**（少了 `scripts/kit/` 就跑不了）：
   - Claude Code → `~/.claude/skills/egern-widget-kit/`
   - Hermes → `$HERMES_HOME/skills/egern-widget-kit/`
   - 其它 agent → 任何会读 `SKILL.md` 的位置，这份文件就是给 agent 看的说明书
3. **重开会话**（agent 只在启动时扫技能目录），然后直接说人话：
   「用 egern-widget-kit 给这个 widget 出张稿：<路径>」

不想装成技能也行：下面的命令直接在命令行跑，把输出贴给任何模型。

> 以下命令都在 **kit 根目录**（本文件所在目录）下执行。

## 参考文件

| 文件 | 内容 |
|---|---|
| `references/official-facts.md` | Egern 官方文档里能指到位置的事实，每条带出处与核对日期；附「稿页与官方的差异」对账表 |
| `references/support-matrix.md` | 元素 / 属性 / 默认值 / `ctx` 全表（脚本生成） |
| `references/draft-discipline.md` | 稿页什么时候可以信，什么时候不能 |

## 目录

```
SKILL.md                 ← 你在读的这份
KIT_VERSION / CHANGELOG / LICENSE
references/
  official-facts.md      ← Egern 官方文档可查证的事实（带出处）
  support-matrix.md      ← 自动生成：元素/属性/默认值/ctx 全表
  draft-discipline.md    ← 稿页可信边界
scripts/kit/
  lib/                   ← 渲染器 / 基座 / 读数浮层 / 接入 / 体检（由仓库同步，勿手改）
  inspect.mjs  draft.mjs ← 两个命令
  selfcheck.mjs          ← 一键自检
examples/weather/        ← 最小类目示例（换类目零改动渲染层）
```

⚠️ `scripts/kit/lib/*` 与 `inspect.mjs` / `draft.mjs` 由上游仓库的同步脚本生成 —— 要改请改上游，
别在这里改（否则下次同步会被覆盖）。
