/******************************
  脚本名称: ProxyPulse
  Version : v1.0.0
  更新时间: 2026-07-27
  平台: Egern（适配 TF 2.20.0 766+）
  功能: 代理延迟监控 — sparkline + IP 切换标记
  作者: @langl
  使用说明:
  1. 添加到 Egern 脚本
  2. 主界面添加 systemMedium 小组件
  3. Env 说明：
   * - GROUP: 要监控的策略组名称（urltest/smart 组）
*******************************/

const ECHO_URLS = [
  'https://httpbin.org/ip',
  'https://api.ipify.org?format=json',
];

// ── Linear 色板 ──────────────────────────────
const C = {
  bg: '#1A1A1A',
  accent: '#5E6AD2',
  text: '#FFFFFF',
  textSecondary: '#828282',
  accentFill: '#5E6AD2',
};

// ── 工具函数 ──────────────────────────────────

const text = (value, opts = {}) => ({ type: 'text', text: String(value ?? ''), ...opts });
const spacer = (length) => length == null ? { type: 'spacer' } : { type: 'spacer', length };

const nextRefresh = (minutes = 15) =>
  new Date(Date.now() + minutes * 60 * 1000).toISOString();

function b64(str) {
  if (typeof btoa !== 'undefined') return btoa(str);
  const encoded = encodeURIComponent(str).replace(
    /%([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  return btoa(encoded);
}

// ── Sparkline SVG 生成 ────────────────────────

function sparklineSVG(arr, switchIndices, { color, fillColor, width, height, lineWidth }) {
  const nums = (arr || []).map(Number).filter(Number.isFinite);
  if (nums.length < 2) return null;

  const pad = Math.ceil(lineWidth) + 2;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const points = nums.map((n, i) => {
    const x = pad + plotW * (i / (nums.length - 1));
    const y = pad + plotH * (1 - (n - min) / range);
    return { x: +x.toFixed(2), y: +y.toFixed(2) };
  });

  // 渐变填充区
  const bottom = height - pad;
  const areaPts = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${areaPts} ${width - pad},${bottom} ${pad},${bottom}`;

  // 折线
  const line = points.map(p => `${p.x},${p.y}`).join(' ');

  // IP 切换标记
  const circles = (switchIndices || [])
    .filter(i => i < points.length)
    .map(i => {
      const p = points[i];
      return `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${fillColor}" stroke="${color}" stroke-width="1"/>`;
    })
    .join('\n');

  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <polygon points="${area}" fill="url(#pulseFill)"/>
  <polyline points="${line}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  ${circles}
</svg>`;

  return `data:image/svg+xml;base64,${b64(svg)}`;
}

// ── 数据获取 ──────────────────────────────────

async function fetchData(ctx, group) {
  const ipOpts = { policy: group, timeout: 8000 };
  let lastError = null;

  for (const url of ECHO_URLS) {
    try {
      const t0 = Date.now();
      const ipResp = await ctx.http.get(url, ipOpts);
      const latency = Date.now() - t0;

      let textBody;
      if (typeof ipResp === 'string') {
        textBody = ipResp;
      } else if (ipResp && typeof ipResp.text === 'function') {
        textBody = await ipResp.text();
      } else if (ipResp && ipResp.body != null) {
        textBody = ipResp.body;
      } else {
        continue;
      }

      if (!textBody || !textBody.trim()) continue;

      const body = JSON.parse(textBody);
      const exitIP = body.origin || body.ip || 'unknown';

      return { exitIP, latency };
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('所有 IP 检测服务均不可用');
}

// ── 历史管理 ──────────────────────────────────

const STORAGE_KEY = 'proxypulse_history';

function loadHistory(ctx) {
  try {
    const raw = ctx.storage.getJSON(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function saveHistory(ctx, history) {
  try {
    ctx.storage.setJSON(STORAGE_KEY, history);
  } catch (_) {}
}

function addPoint(history, point) {
  const prev = history.length ? history[history.length - 1] : null;
  const switched = prev && prev.exitIP !== point.exitIP;
  const updated = [...history, { ...point, switched }];
  return updated.slice(-24); // 保留最近 24 条
}

// ── Widget 渲染 ───────────────────────────────

function renderMedium(ctx, history, current) {
  const switchIndices = history
    .map((p, i) => (p.switched ? i : -1))
    .filter(i => i >= 0);
  const latencies = history.map(p => p.latency);

  const chartSrc = sparklineSVG(latencies, switchIndices, {
    color: C.accent,
    fillColor: C.accentFill,
    width: 310,
    height: 90,
    lineWidth: 2,
  });

  const switchCount = switchIndices.length;
  const lastSwitch = switchCount > 0
    ? history[switchIndices[switchIndices.length - 1]]
    : null;

  return {
    type: 'widget',
    refreshAfter: nextRefresh(15),
    padding: [14, 16, 12, 16],
    gap: 8,
    backgroundColor: C.bg,
    children: [
      // Header row: title + current latency
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          text('ProxyPulse', {
            font: { size: 13, weight: 'semibold' },
            textColor: C.textSecondary,
          }),
          spacer(),
          text(`${current.latency}ms`, {
            font: { size: 20, weight: 'bold', design: 'monospaced' },
            textColor: C.text,
          }),
        ],
      },
      // Sparkline chart
      chartSrc
        ? {
            type: 'image',
            src: chartSrc,
            width: 310,
            height: 90,
            resizable: true,
            resizeMode: 'contain',
          }
        : text('数据收集中…', {
            font: { size: 14 },
            textColor: C.textSecondary,
          }),
      // Footer: switch count + window
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          text(
            switchCount > 0 ? `${switchCount} 次切换` : '无切换',
            {
              font: { size: 11 },
              textColor: C.textSecondary,
            }
          ),
          spacer(),
          text(
            `~${Math.round(history.length * 15 / 60)}h`,
            {
              font: { size: 11 },
              textColor: C.textSecondary,
            }
          ),
        ],
      },
    ],
  };
}

// ── 入口 ──────────────────────────────────────

export default async function (ctx) {
  const group = (ctx.env || {}).GROUP || 'Proxy';

  try {
    const { exitIP, latency } = await fetchData(ctx, group);

    let history = loadHistory(ctx);
    history = addPoint(history, { time: Date.now(), latency, exitIP });
    saveHistory(ctx, history);

    const current = history[history.length - 1];
    return renderMedium(ctx, history, current);
  } catch (e) {
    return {
      type: 'widget',
      refreshAfter: nextRefresh(5),
      padding: 16,
      backgroundColor: C.bg,
      children: [
        text('ProxyPulse', {
          font: { size: 'headline', weight: 'bold' },
          textColor: C.text,
        }),
        spacer(8),
        text(`加载失败：${e && e.message ? e.message : e}`,
          { font: { size: 'footnote' }, textColor: '#F87171', maxLines: 4 }
        ),
      ],
    };
  }
}
