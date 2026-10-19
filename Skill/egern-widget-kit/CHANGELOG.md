# CHANGELOG

## 0.3.0 — 2026-10-19

- **references 全部改成英文文件名**（不同 agent 对中文文件名的处理不一致）：
  `官方事实索引.md` → `official-facts.md`、`支持矩阵.md` → `support-matrix.md`、`稿子纪律.md` → `draft-discipline.md`；
  `陌生脚本-checklist.md` **删除**。
- **不再把「直接读脚本」当能力宣传**：`draft` 会真跑脚本，而数据拿不到时走降级分支 —— 元素比真机少、
  形状不作数。SKILL.md 换成「它改不了『别人的脚本』（先看这条）」一节（缺的是**上下文**，不只是数据），
  并写明它不是「打开成品看长相」的工具。
- **用语统一**：不再区分「陌生脚本 / 第三方脚本」，统称**脚本**；「平台」一律写成 **Egern**。
- `references/` 里的固定顺序清单随上面那条一并去掉（`inspect` 的静态体检仍在，但不跑代码）。
- **差异对账表按现渲染器重核**：12 行里 10 行已对齐（默认 row / 系统主色 / contain / `borderRadius:auto` /
  `backgroundImage` / `shadow*` / `date` / 自适应色 / 渐变 stops / 字号键名），只剩 2 行**仍有差异**
  （`minScale` 稿页不缩；`width`/`height` 对 `text` 也生效），并写清照稿改版式时的影响。
- `selfcheck.mjs` 把这张表能断言的部分都断言上（`borderRadius:auto`、`shadow*`、非官方字号键、以及
  「`shadowRadius` 没写不画阴影」），两条仍与真机不同的行为改成 `WARN` 标注 —— 表与自检不再各说各话。

## 0.2.0 — 2026-10-19

- **包名 `egern-draft-kit` → `egern-widget-kit`**：名字直接对上 Egern widget，一眼能看出是给谁用的。
- **定位重写为「开发辅助工具」**：主线是「写 / 改一个 widget 时出稿看图、量尺寸、自检」；
  它**不是解包器**，不负责把一份现成脚本还原成等价的新组件。
- 新增一节说清**为什么拿成品出稿看不出什么**：成品形状来自真实请求与真实 env，而工具默认返回空占位，
  于是出的是降级分支那一版；对成品能给的只有静态事实。
- `references/接手-checklist.md` → `references/陌生脚本-checklist.md`：同一份固定顺序，
  去掉了"接手一份成品"的暗示，并写明它回答不了「成品长什么样」。

## 0.1.1 — 2026-10-18

- **模拟 ctx 补齐官方 ctx 面**：`ctx.http` 七个方法齐（`--mock` 对七个都生效），
  另补 `device / app / script / notify / lookupIP / compress` 空壳；`ssh` 调用会明确报「模拟层未实现」。
  报告与稿页都会打出「模拟 ctx：已实现 / 空壳 / 未实现」一行 —— 免得把「模拟层缺东西」读成「脚本坏了」。
- **`--family` 不再静默兜底**：只出主屏四档；锁屏三档与拼错的档名**报错退出（exit 2）**，
  不会悄悄画成中号主屏。`systemExtraLarge` 补上 iPad 画布（此前没有对应尺寸）。
- **命令与稿页里不会出现内部路径**：`node scripts/kit/draft.mjs …` 这类写法可以直接照抄执行。
- **树过瘦给提示**：≤2 个节点时提示「大概率是降级 / 取数失败分支，先补 `--env` / `--mock`」。
- SKILL.md 新增「装在哪」：Node ≥ 18、零依赖、三个技能目录、改完重开会话。
- 文档措辞：去掉口语用词与 `按用户要求` 这类内部引用（发布件只讲怎么用）。

## 0.1.0 — 2026-10-18

首次发布。核心是「能看、能量、能体检」，不含任何设计建议。

- **渲染器**：`lib/nodes|render|symbols|annotate`，平台默认值对齐官方文档
  （`stack.direction=row`、`alignItems=center`、`text.textColor=系统主色`、`image.resizeMode=contain`、
  根容器 flex-start + 含裸 `spacer` 的行撑宽）；支持 `date`、自适应色、`backgroundImage`、
  渐变 type/stops、`shadow*`；未知节点画**显眼占位框**而不是静默消失
- **基座**：`lib/baseline.mjs` —— 画布/圆角唯一事实源，值带 `official / derived / measured` 三级，
  `measured` 只作校验；`node lib/baseline.mjs` 自检
- **读数浮层**：`lib/overlay.mjs` + `lib/page.mjs` —— 划过出「名字·左边·尺寸」，点击钉住，
  再划给 Δ左/上/右/下/中
- **接入与体检**：`lib/load.mjs`（URL/路径 → ESM 规范化 → import，带降级阶梯）、
  `lib/inspect.mjs`（静态 + 动态两段）、`inspect.mjs` / `draft.mjs` 两个命令
- **文档**：官方事实索引（带出处与核对日期）、支持矩阵（自动生成）、接手 checklist、稿子纪律
- **示例**：`examples/weather/`（最小类目，证明换类目零改动渲染层）
