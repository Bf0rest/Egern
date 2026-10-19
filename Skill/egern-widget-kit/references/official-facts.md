> 本文件由工具仓库的同步脚本生成，事实本身都带官方出处。
> 官方页面更新（或 iOS / Egern 升级）后需要重核。

# Egern 官方事实索引（可查证）

> **本文件只收「能在官方文档里指到位置」的事实**。每条带出处与核对日期。
> 查不到出处的一律不进这里 —— 证据、量出来的数字、推测另放（不随本文件公开）。
> 目的：给稿页工具当辅助资料，也当「实现 vs 官方」的对账基准。
>
> 核对日期：**2026-10-18**（以当日页面为准；iOS / Egern 升级后需重核）
> 覆盖说明：`widgets` 页的 Point / flex / Padding / Full Example 四节未核对，标 ⚠️未核对。

出处缩写：
- **W** = <https://egernapp.com/docs/configuration/widgets>
- **E** = <https://egernapp.com/docs/configuration/env>
- **S** = <https://egernapp.com/docs/configuration/scriptings>
- **J** = <https://egernapp.com/docs/javascript-api>

---

## 1. 元素类型（W / #element-types-type）

| `type` | 官方描述 |
|---|---|
| `widget` | 根容器，必须是最外层；内部纵向布局 |
| `stack` | Flex 容器，支持横向 / 纵向 |
| `text` | 文本 |
| `image` | 图片（SF Symbol / Base64 位图 / SVG） |
| `spacer` | 弹性或固定间距 |
| `date` | 实时日期时间显示（系统自动更新，不需要组件刷新） |

## 2. 通用属性（W / #common-properties）——「Applies to」是官方原文的适用范围

| 属性 | 适用 | 要点 |
|---|---|---|
| `url` | widget, stack, text, image, date | 点击打开 |
| `opacity` | **text, image, date** | 0–1，默认 1.0 |
| `width` / `height` | **stack, image** | 0 或不设 = 不约束 |
| `flex` | 全部 | 剩余空间按比例分配 |
| `padding` | widget, stack | 单值或 `[top,right,bottom,left]`（CSS 顺时针） |
| `gap` | widget, stack | 子元素间距，默认 `0` |
| `backgroundColor` | widget, stack | — |
| `backgroundGradient` | widget, stack | **优先于** `backgroundColor` |
| `backgroundImage` | widget, stack | data URI（Base64 位图或内联 SVG），**aspect-filled 铺满，优先级最高** |
| `borderRadius` | **stack, image** | 支持 `"auto"`（自动匹配组件容器圆角） |
| `borderWidth` / `borderColor` | **stack, image** | — |
| `shadowColor` / `shadowRadius` / `shadowOffset` | text, image, date, stack | `shadowRadius` 必须设才生效；`shadowOffset` 默认 `{x:0,y:0}` |

## 3. 各元素专有属性与默认值

### widget（W / #widget-root-container）
- 根容器**默认纵向布局**，子元素自上而下、**左上对齐**。
- `refreshAfter`：ISO 8601 时间，表示组件应刷新的时刻。

### stack（W / #stack-flex-container）
- `direction`：`"row"` / `"column"`，**默认 `"row"`**。
- `alignItems`：`"start"` / `"end"` / `"center"`，**默认 `"center"`**（行内=垂直居中，列内=水平居中）。
- `children`：子元素数组。

### text（W / #text）
- `text`：支持 `\n` 换行。
- `font`：见 §4。
- `textColor`：**默认系统主色**（未指定时不等于白色）。
- `textAlign`：`"left"`（默认）/ `"center"` / `"right"`。
- `maxLines`：最大行数。
- `minScale`：最小缩放系数 0.0–1.0，用于自适应缩小。

### image（W / #image）
- `src` 三种方案：`sf-symbol:<name>` / `data:<mime>;base64,…` / 内联或 Base64 的 `data:image/svg+xml,…`。
- `color`：**只对 SF Symbol 生效**（着色）。
- `resizeMode`：`"contain"`（**默认**）/ `"cover"`。
- `resizable`：默认 `true`；设 `false` 用原始尺寸（设了 `width`/`height` 会自动启用）。
- `src` 缺失或 URI 解析失败 → 显示占位图标。
- 内联 SVG：必须带 `xmlns` 与 `viewBox`；**上限 512 KB**，超了回退占位图标。

### spacer（W / #spacer）
- `length`：固定长度；**省略 = 弹性填充剩余空间**。

### date（W / #date）
- `date`：ISO 8601 字符串。
- `format`：`"date"`（默认）/ `"time"` / `"relative"` / `"offset"` / `"timer"`。
- 另支持 `font` / `textColor` / `textAlign` / `maxLines` / `minScale`。

## 4. 字体（W / #font）

- `font` 整个省略 → **默认 `body`**。
- `size` 可给语义名（随系统字号缩放）或数字（精确点值）。
- 语义字号 → 官方默认点值：

| 语义 | 点值 | | 语义 | 点值 |
|---|---|---|---|---|
| `largeTitle` | 34 | | `subheadline` | 15 |
| `title` | 28 | | `footnote` | 13 |
| `title2` | 22 | | `caption1` | 12 |
| `title3` | 20 | | `caption2` | 11 |
| `headline` | 17 | | | |
| `body` | 17 | | | |
| `callout` | 16 | | | |

- `weight`：`ultraLight` / `thin` / `light` / `regular` / `medium` / `semibold` / `bold` / `heavy` / `black`（共 9 档）。
- `family`：自定义字体名，**必须同时给 `size`**。

## 5. 颜色与渐变（W / #color、#gradient）

- 固定色：`#RRGGBB`、`#RRGGBBAA`、`rgba(R,G,B,A)`（RGB 0–255，A 0.0–1.0）。
- **自适应色**：`{"light": "#000000", "dark": "#FFFFFF"}`。
- 渐变：`type` = `"linear"`（默认）/ `"radial"` / `"angular"`；`colors` 必填；`stops` 数量必须与 `colors` 一致（0.0–1.0）。
- ⚠️未核对：linear 专有的 `startPoint` / `endPoint` 默认值（在截断的中段）。

## 6. `ctx` 字段全表（J）

| 字段 | 说明 |
|---|---|
| `ctx.script.name` | 脚本名 |
| `ctx.env` | 环境变量 key-value |
| `ctx.app.version` / `ctx.app.language` | App 版本 / 系统语言 |
| `ctx.device.{cellular,wifi,ipv4,ipv6,dnsServers}` | 网络环境信息 |
| `ctx.cron` | **仅 schedule** 脚本有 |
| `ctx.widgetFamily` | **仅 generic** 脚本有；7 档：`systemSmall/Medium/Large/ExtraLarge`、`accessoryCircular/Rectangular/Inline` |
| `ctx.request` / `ctx.response` | 仅 request / response 脚本 |
| `ctx.http.{get,post,put,delete,head,options,patch}` | HTTP |
| `ctx.storage.{get,set,getJSON,setJSON,delete}` | 持久化 key-value |
| `ctx.notify(options)` / `ctx.lookupIP(ip)` / `ctx.compress` / `ctx.ssh` | 见 J 对应节 |
| `ctx.respond(response)` / `ctx.abort()` | 仅 request/response 脚本 |

**全表里没有 `appearance`、没有 `colorScheme`** —— 即"跟随系统深浅"在脚本侧拿不到。

## 7. 环境变量（E / #priority-and-merging）

- 优先级（高→低）：**Module > Widget > Script**。
- 同键合并：高优先级覆盖低优先级，未冲突的键各自保留。

## 8. 脚本条目（S）

- 五类：`http_request` / `http_response` / `schedule` / `generic` / `network`。
- `update_interval`：脚本文件缓存秒数，**默认 86400**。
- `timeout`：执行超时秒数，**默认 10**，上限 600。
- `max_size`：请求/响应体处理上限，默认 1048576（1MB）——仅 request/response 脚本。
- `body_required` / `binary_body`：默认 `false`。
- `disabled`：是否禁用。

---

## 附：稿页与官方的差异（逐条核过现渲染器）

> 每条都用渲染器跑过一遍（`scripts/kit/selfcheck.mjs` 的断言 + 直接渲染取样式）。**「已对齐」= 稿页按官方实现**，
> 照稿页读没问题；**「仍有差异」= 稿页画得跟真机不一样**，改版式时得绕开或显式覆盖。官方口径为准。

| # | 项 | 官方口径 | 稿页现状 | 影响 |
|---|---|---|---|---|
| 1 | `stack.direction` 默认 | `"row"` | **已对齐**（省略 `direction` 就按 row 画） | — |
| 2 | `text.textColor` 默认 | 系统主色 | **已对齐**（落 `var(--sys-label)`） | — |
| 3 | `image.resizeMode` 默认 | `"contain"` | **已对齐**（显式 `cover` 也生效） | — |
| 4 | `borderRadius: "auto"` | 支持 | **已对齐**（`inherit`，跟着容器圆角） | — |
| 5 | `backgroundImage` | widget / stack 支持，优先级最高 | **已对齐**（高于渐变与纯色） | — |
| 6 | `shadow*` 三属性 | text / image / date / stack 支持 | **已对齐**（`shadowRadius` 没写就不画） | — |
| 7 | `minScale` | 文本按需缩小 | **仍有差异**：稿页不缩，超长只会被裁 | 长文本在稿里比真机更早截断，别照稿判断会不会溢出 |
| 8 | `date` 元素 | 官方元素，5 种 `format` | **已对齐**（文案按当前时刻**模拟**，带 `≈` 前缀） | 值不是真机值，只能用来判位置与行宽 |
| 9 | 自适应色 `{dark, light}` | 官方支持 | **已对齐**（按一侧落色） | — |
| 10 | `Gradient.type/stops` | linear / radial / angular + `stops` | **已对齐**（角度按 `startPoint` / `endPoint` 推算） | — |
| 11 | 语义字号命名 | `largeTitle`=34 / `title`=28 … | **已对齐**（表里没有 `title1` 这类非官方键） | — |
| 12 | `width` / `height` 适用范围 | 仅 `stack` / `image` | **仍有差异**：稿页对 `text` 也生效 | 给 text 写了宽高时，稿里的换行位置与真机不同 |

---

