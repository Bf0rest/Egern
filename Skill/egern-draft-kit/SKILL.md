---
name: egern-draft-kit
description: "Egern iOS widget 稿页工具：把 DSL 树渲染成可量的 HTML 稿、体检第三方 widget 脚本。仅限 Egern 小组件（不是通用 HTML/前端/设计工具）。用词触发：出稿 / 体检 / 量尺寸 / 接手别人的 widget。"
---

# Egern 稿页工具（看图器）

> 术语：**稿页** = 本工具渲染出来的**预览页**（一个 HTML 文件，下文简称「稿」）。

## 它是什么

给 **Egern iOS 小组件**用的「看图器」：把脚本产出的 DSL 树渲染成一页 HTML，让你**看到形状、量到相对尺寸**；
另外还能体检一份第三方 Egern 脚本（它需要什么 env、往哪发请求、用了哪些平台不支持的字段）。

## 什么时候**不要**用它（限定）

| 你的任务 | 该用什么 |
|---|---|
| 通用 HTML / 前端 / 设计稿 / 截图比对 | **别用这个** —— 它只认 Egern widget 的 DSL 树 |
| Egern 的 `http_request` / `http_response` / `schedule` / `network` 脚本 | 也别用 —— 它只处理 `generic` + `widget`（`inspect` 会告诉你"不是 widget 脚本"） |
| 判断真机上会不会裁切 / 对齐对不对 | 上真机（截图量墨迹），稿页回答不了 |
| 判断"好不好看、该怎么改" | 那是设计判断，工具不参与 |
| 改 widget 的源码 | 改源码，别想着"在稿页上改"（稿页是产物） |

工具会在两种情况下**主动拒绝**：① 返回值不是 `{ type: 'widget' }`（比如 panel 脚本的 `{title, content}`）
→ `draft` 直接 `exit 2`，不画空稿；② 脚本 import 失败 / 不是 ESM → 只出体检报告，不出稿。

## 它不是什么（三条边界，先说清）

1. **不是真机**。渲染是 CSS flexbox 近似 Yoga；**稿页上的像素不作依据**，只回答「形状大概什么样」。
2. **不是设计建议**。它不判断「好不好看、该怎么改」—— 那是你的活。
3. **字体是替身**（Inter ≈ SF Pro、Noto Sans SC ≈ 苹方）⇒ 字号/位置可信，**字重/字型不可信**。

## 装在哪（两分钟）

1. **要有 Node ≥ 18**。整套只 import `node:` 标准库，**零依赖、不用 `npm install`**（在 22 上测的）。
   先确认：`node -v`。
2. **整个 `egern-draft-kit/` 目录**放进你 agent 的技能目录，**目录结构要保住**（`scripts/kit/` 少了就跑不了）：
   - Claude Code → `~/.claude/skills/egern-draft-kit/`
   - Hermes → `$HERMES_HOME/skills/egern-draft-kit/`
   - 其它 agent → 任何"会读 `SKILL.md`"的地方都行；这份文件就是给 agent 看的说明书
3. **重开会话**（agent 只在启动时扫技能目录），然后直接说人话：
   「用 egern-draft-kit 体检一下这个 js：<路径或 URL>」

不想装成技能也行：下面五步直接在命令行跑，把输出贴给任何模型。

> 以下命令都在 **kit 根目录**（本文件所在目录）下执行。

## 只出主屏的四档

`--family` 只接受 `systemSmall / systemMedium / systemLarge / systemExtraLarge`
（最后一档是 iPad 画布，官方只给区间 ⇒ 基座里标 `derived`）。

- **锁屏三档**（`accessoryCircular / accessoryRectangular / accessoryInline`）**拒绝出稿（exit 2）**：
  渲染层没有锁屏画布，硬画只会画成中号主屏 —— 一张画布不对的稿比没有稿更糟。锁屏形状只能上真机。
- **拼错的档名同样 exit 2**，不会静默兜底成中号（兜底会让你以为画的就是你要的那档）。

## 模拟 ctx 的边界（决定你怎么读运行结果）

`inspect --run` 与 `draft` 跑的是**模拟 ctx**，两个命令都会把这行如实打出来：

- **真的做了**：`env`、`widgetFamily`、`storage`、`http.get/post/put/delete/head/options/patch`
  （`--mock` 对七个方法都生效）
- **空壳**：`device`（字段全 `null`）、`app`（空串）、`notify`（只记录不发送）、
  `lookupIP`（恒 `null`）、`compress`（原样返回，不真压缩）
- **没实现**：`ssh` —— 一调用就抛错，错误信息会写明「模拟 ctx 没有实现」，**不是脚本的错**

⇒ 「脚本走了失败分支」和「模拟层缺东西」是两件事。看到树很瘦（≤2 个节点）时报告会提示，
先补 `--env`（缺配置）/ `--mock`（缺数据形状）再下结论。

## 五步（拿到一份第三方脚本）

```bash
# ① 体检（不跑代码，先看它要什么）
node scripts/kit/inspect.mjs https://example.com/some-widget.js

# ② 动态普查（模拟 ctx 跑一遍，看真实 DSL 树）
node scripts/kit/inspect.mjs ./some-widget.js --run --family systemMedium --env CITY=Shanghai

# ③ 出稿（会同时把体检表放进同一页）
node scripts/kit/draft.mjs ./some-widget.js --family systemLarge --env CITY=Shanghai --out draft.html

# ④ 用浏览器打开 draft.html：鼠标划过任意元素 → 名字 / 左边 / 尺寸；点一下钉住；再划别的给 Δ
#    （左下角读数条给全量：x/y、w×h、层级路径、Δ左/上/右/下/中）

# ⑤ 自检（确认这套工具本身没坏）
node scripts/kit/selfcheck.mjs
```

## 三条红线

1. **跑不起来就只报事实，不许自己编一棵树出稿**。截断的、看起来像真的假稿比没有稿危险得多。
2. **假数据必须标注**。所有请求默认返回**空占位响应**；要真实形状，用 `--mock sample.json` 喂真实样本，
   并在结论里写清「数据来自样本，不是真机」。
3. **稿页数字不作证据**。要回答「真机上会不会裁切 / 对齐对不对」，只能上真机截图或探针。

## 出稿为什么需要「适配器」

`inspect` 完全通用；`draft` 需要知道「请求该返回什么」，而每个 widget 的数据形状都不同。
最小的适配器就是一条命令里的 `--mock`：

```bash
node scripts/kit/draft.mjs ./x.js --family systemMedium --mock ./sample.json
```

`--mock` 会把**任何** `json()` 请求都返回这份样本（最粗的适配）。更准的做法是写一个小适配器脚本
（`load()` + 自建 ctx，见 `lib/load.mjs` 的 `genericCtx`），逐端点给不同响应。

## 目录

```
SKILL.md                 ← 你在读的这份
KIT_VERSION / CHANGELOG / LICENSE
references/
  接手-checklist.md      ← 拿到第三方脚本的固定顺序
  官方事实索引.md        ← 官方文档可查证的事实（带出处）
  支持矩阵.md            ← 自动生成：元素/属性/默认值/ctx 全表
  稿子纪律.md            ← 什么时候可以信稿页，什么时候不能
scripts/kit/
  lib/                   ← 渲染器 / 基座 / 读数浮层 / 接入 / 体检（由仓库同步，勿手改）
  inspect.mjs  draft.mjs ← 两个命令
  selfcheck.mjs          ← 一键自检
examples/weather/        ← 最小类目示例（换类目零改动渲染层）
```

⚠️ `scripts/kit/lib/*` 与 `inspect.mjs` / `draft.mjs` 由上游仓库的同步脚本生成 —— 要改请改上游，
别在这里改（否则下次同步会被覆盖）。
