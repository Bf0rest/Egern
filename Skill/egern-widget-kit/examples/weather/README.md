# 天气示例（最小类目）

目的只有一个：**证明换类目不用碰渲染层** —— 这里没有任何 IP / 风控 / 代理相关的东西，
但 `inspect` / `draft` / 读数浮层全都照常工作。

```bash
# 体检（静态）
node scripts/kit/inspect.mjs examples/weather/weather.js

# 出稿（模拟 ctx：所有请求返回空占位 ⇒ 会走"取数失败"分支，这正是纪律要求的行为）
node scripts/kit/draft.mjs examples/weather/weather.js --family systemMedium --env CITY=Shanghai --out weather.html

# 想看真实形状：喂一份真实响应
#   node scripts/kit/draft.mjs examples/weather/weather.js --family systemMedium --mock sample.json
```

注意：`--mock` 会把**所有** `json()` 请求都返回同一份样本，而这个示例有两个端点
（geocoding + forecast）—— 真要看真实形状，得写适配器（`lib/load.mjs` 的 `genericCtx` 起步，逐端点给响应）。
