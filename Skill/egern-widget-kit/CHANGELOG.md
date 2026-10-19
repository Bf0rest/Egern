# CHANGELOG

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
