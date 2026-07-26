/******************************
  脚本名称: ProxyPulse
  Version : v1.2.1
  更新时间: 2026-07-27
  平台: Egern（适配 TF 2.20.0 766+）
  功能: 代理延迟监控 — 柱形图 + IP 切换高亮
  作者: @langl
  使用说明:
  1. 添加到 Egern 脚本
  2. 主界面添加 systemMedium 小组件
  3. Env 说明：
   * - GROUP: 要监控的策略组名称（urltest/smart 组）
   * - ECHO_URL: 自定义 IP 检测 URL，逗号分隔多个 fallback
   *   （不填默认用 httpbin.org + ipify.org）
   * - IP_INTERVAL: IP 重新检测间隔（刷新次数，默认 3）
   *   延迟用 gstatic 每次测，IP 每 N 次刷新查一次
   * - LATENCY_SPIKE: 延迟突变阈值（0-1，默认 0.6）
   *   延迟变化 >60% 视为切换（应对同 IP 不同节点）
   *   前后两次刷新间隔 >20min 时跳过突变检测（避免把后台唤醒的开销当切换）
*******************************/

const LATENCY_URL = 'https://www.gstatic.com/generate_204';

const DEFAULT_IP_URLS = [
  'https://httpbin.org/ip',
  'https://api.ipify.org?format=json',
];

// ── Linear 色板 ──────────────────────────────
const C = {
  bg: '#1A1A1A',
  accent: '#5E6AD2',
  text: '#FFFFFF',
  textSecondary: '#828282',
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

// ── 柱形图 SVG ────────────────────────────────

function sparklineBarSVG(arr, switchBooleans, { normalColor, switchColor, width, height }) {
  const nums = (arr || []).map(Number).filter(Number.isFinite);
  if (nums.length < 1) return null;

  const n = nums.length;
  const slotW = width / n;
  const barW = Math.max(1.5, slotW * 0.55);
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const range = max - min || 1;

  const bars = nums.map((v, i) => {
    const isSwitch = switchBooleans[i];
    const color = isSwitch ? switchColor : normalColor;
    const barH = Math.max(2, ((v - min) / range) * (height - 2));
    const x = (i * slotW + (slotW - barW) / 2).toFixed(1);
    const y = (height - barH).toFixed(1);
    return `<rect x="${x}" y="${y}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="1.5" fill="${color}"/>`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
  return `data:image/svg+xml;base64,${b64(svg)}`;
}

// ── 数据获取 ──────────────────────────────────

async function measureLatency(ctx, group) {
  const t0 = Date.now();
  await ctx.http.get(LATENCY_URL, { policy: group, timeout: 8000 });
  return Date.now() - t0;
}

async function fetchExitIP(ctx, group) {
  const urlList = (ctx.env && ctx.env.ECHO_URL)
    ? ctx.env.ECHO_URL.split(',').map(s => s.trim()).filter(Boolean)
    : DEFAULT_IP_URLS;

  const ipOpts = { policy: group, timeout: 8000 };

  for (const url of urlList) {
    try {
      const ipResp = await ctx.http.get(url, ipOpts);
      const body = await ipResp.json();
      return body.origin || body.ip || 'unknown';
    } catch (_) {}
  }
  return null;
}

// ── IP 缓存管理 ───────────────────────────────

const IP_CACHE_KEY = 'proxypulse_ip';

function loadIPCache(ctx) {
  try {
    const c = ctx.storage.getJSON(IP_CACHE_KEY);
    return (c && typeof c.ip === 'string') ? c : { ip: null, counter: 0 };
  } catch (_) {
    return { ip: null, counter: 0 };
  }
}

function saveIPCache(ctx, cache) {
  try { ctx.storage.setJSON(IP_CACHE_KEY, cache); } catch (_) {}
}

async function getExitIP(ctx, group) {
  const interval = Math.max(1, parseInt((ctx.env || {}).IP_INTERVAL || '3', 10) || 3);
  const cache = loadIPCache(ctx);

  cache.counter = (cache.counter || 0) + 1;

  // 计数器未到且已有缓存 → 直接复用
  if (cache.counter <= interval && cache.ip) {
    saveIPCache(ctx, cache);
    return cache.ip;
  }

  // 需要重新检测
  const ip = await fetchExitIP(ctx, group);
  if (ip) {
    cache.ip = ip;
    cache.counter = 0;
  }
  // 即使 fetch 失败也保留旧 IP，重置计数器等下次重试
  saveIPCache(ctx, cache);
  return cache.ip || 'unknown';
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

// 超过此间隔认为是后台恢复，跳过延迟突变检测
const SPIKE_GAP_MS = 20 * 60 * 1000; // 20 分钟

function addPoint(history, point, spikeThreshold) {
  const prev = history.length ? history[history.length - 1] : null;
  if (!prev) {
    return [{ ...point, switched: false }];
  }
  const ipChanged = prev.exitIP !== point.exitIP;
  const gapMs = point.time - prev.time;
  // 间隔过长（后台恢复/冷启动），不检测延迟突变
  const spike = gapMs < SPIKE_GAP_MS
    && Math.abs(point.latency - prev.latency) / Math.max(prev.latency, 1) > spikeThreshold;
  const switched = ipChanged || spike;
  const updated = [...history, { ...point, switched }];
  return updated.slice(-24);
}

// ── Widget 渲染 ───────────────────────────────

function renderMedium(ctx, history, current) {
  const switchBooleans = history.map(p => p.switched);
  const latencies = history.map(p => p.latency);

  const chartSrc = sparklineBarSVG(latencies, switchBooleans, {
    normalColor: '#3A3A3D',
    switchColor: C.accent,
    width: 310,
    height: 90,
  });

  const switchCount = switchBooleans.filter(Boolean).length;

  return {
    type: 'widget',
    refreshAfter: nextRefresh(15),
    padding: [14, 16, 12, 16],
    gap: 8,
    backgroundColor: C.bg,
    children: [
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
  const env = ctx.env || {};
  const group = env.GROUP || 'Proxy';
  const spikeThreshold = parseFloat(env.LATENCY_SPIKE) || 0.6;

  try {
    const [latency, exitIP] = await Promise.all([
      measureLatency(ctx, group),
      getExitIP(ctx, group),
    ]);

    let history = loadHistory(ctx);
    history = addPoint(history, { time: Date.now(), latency, exitIP }, spikeThreshold);
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
