// IPPure — 代理 IP 风险评分小组件（Noto 单色图标版）
//
// 环境变量（在 Widget 配置里填，全部可留空）：
//   GROUP     默认 DIRECT                                  —— 策略组名称
//   STYLE     默认 留空                                    —— glass = 透明背景
//   SOURCE    默认 留空                                    —— local = 用本地 GeoLite2 库查 ASN
//   PROBE_URL 默认 https://cloudflare.com/cdn-cgi/trace    —— 自定义出口 IP 探测地址
//   IP        默认 留空 = 不脱敏                            —— HIDE / 隐藏 / 脱敏
//                 IPv4 104.28.213.57 → 104.*.*.57；IPv6 2400:cb00:2048:1::681c:d55 → 2400:****:d55
//                 （只改显示；探测、缓存键、请求口径一律不动）

const __ISP_MAX = { large: 42, rect: 24 };            // 按本组件版式算得

const __ASN_URL = 'https://stat.ripe.net/data/as-overview/data.json?resource=AS';
const __ASN_TTL = 30 * 24 * 3600000;                  // 按 ASN 缓存 30 天

function __asnFromHolder(holder) {
  let t = String(holder || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const i = t.indexOf(' - ');
  if (i >= 0) return t.slice(i + 3).trim();
  const sp = t.indexOf(' ');
  if (sp > 0) {
    const head = t.slice(0, sp).replace(/-[A-Z0-9]+$/, '');
    const rest = t.slice(sp + 1);
    if (head && rest.toLowerCase().indexOf(head.toLowerCase()) >= 0) return rest;
  }
  return t;
}

async function __fetchAsnName(ctx, asn, policy) {
  const num = String(asn === undefined || asn === null ? '' : asn).trim().replace(/^as\s*/i, '');
  if (!/^\d+$/.test(num)) return undefined;
  try {
    const r = await ctx.http.get(__ASN_URL + num, { policy: policy, timeout: 4000 });
    if (!r || r.status !== 200) return undefined;
    const j = await r.json();
    const holder = j && j.data && j.data.holder ? String(j.data.holder) : '';
    return holder ? __asnFromHolder(holder) : '';
  } catch (_) {
    return undefined;
  }
}

function __ispText(asn, org, slot) {
  const num = String(asn === undefined || asn === null ? '' : asn).trim().replace(/^as\s*/i, '');
  const name = String(org || '').replace(/\s+/g, ' ').trim();
  const t = num ? ('AS' + num + (name ? ' - ' + name : '')) : name;
  if (!t) return null;
  const max = __ISP_MAX[slot] || __ISP_MAX.large;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  const head = sp > max * 0.6 ? cut.slice(0, sp) : cut;
  return head.replace(/[\s,.;:(\-]+$/, '') + '…';
}

function __wantHideIp(v) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  return /^hide$/i.test(s) || s === '隐藏' || s === '脱敏';
}

function __maskIp(ip) {
  const s = String(ip === undefined || ip === null ? '' : ip).trim();
  if (!s) return '';
  if (s.indexOf(':') >= 0) {
    const g = s.split(':');
    if (g.length < 3) return s;
    return g[0] + ':****:' + g[g.length - 1];
  }
  const p = s.split('.');
  if (p.length === 4) return p[0] + '.*.*.' + p[3];
  return s;
}

async function __probeEgressIp(c, group, url) {
  try {
    const resp = await c.http.get(url, { policy: group, timeout: 5000 });
    if (resp.status !== 200) return null;
    const text = await resp.text();
    const m = /(?:^|\n)ip=([^\s\r\n]+)/.exec(text);
    if (m) return m[1];
    try {
      const j = JSON.parse(text);
      if (j && (j.ip || j.origin)) return String(j.ip || j.origin);
    } catch (_) {}
    return null;
  } catch (_) {
    return null;
  }
}

async function __render(ctx) {

  const strategyGroup =
    ctx.env.GROUP || 'DIRECT';

  const widgetFamily =
    ctx.widgetFamily || 'systemLarge';

  const isGlass =
    (ctx.env.STYLE || '').toLowerCase() === 'glass';

  const ispSource = (ctx.env.SOURCE || '').toLowerCase();

  const hideIp = __wantHideIp(ctx.env.IP);

  const C = {
    bgTop: '#0C0D0F',
    bgBottom: '#141619',

    borderColor: 'rgba(255, 255, 255, 0.06)',

    text: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',

    blue: '#60A5FA',

    risk0: '#22C55E',
    risk1: '#84CC16',
    risk2: '#EAB308',
    risk3: '#F59E0B',
    risk4: '#F97316',
    risk5: '#DC2626',

    green: '#34D399',
    yellow: '#FACC15',
  };

  const premiumGradient = {
    type: 'linear',
    colors: [C.bgTop, C.bgBottom],
    startPoint: { x: 0.5, y: 0 },
    endPoint: { x: 0.5, y: 1 }
  };

  const bg = isGlass ? {} : { backgroundGradient: premiumGradient };

  const probeUrl   = ctx.env.PROBE_URL || 'https://cloudflare.com/cdn-cgi/trace';

  let data = null;

  async function fetchScore() {
    const resp = await ctx.http.get(
      'https://my.ippure.com/v1/info',
      { policy: strategyGroup, timeout: 8000 }
    );
    if (resp.status !== 200) throw new Error('HTTP ' + resp.status);
    const body = await resp.json();
    if (!body || typeof body !== 'object') throw new Error('bad body');
    return body;
  }

  function lookupLocalASN(ip) {
    try {
      const org = $utils.ipaso(ip);
      if (org) return String(org);
    } catch(_) {}
    try {
      const num = $utils.ipasn(ip);
      if (num) return 'AS' + String(num);
    } catch(_) {}
    try {
      const lookup = ctx.lookupIP(ip);
      if (lookup && lookup.asOrganization) return String(lookup.asOrganization);
      if (lookup && lookup.asn) return String(lookup.asn);
    } catch(_) {}
    return null;
  }

  const egressIp = await __probeEgressIp(ctx, strategyGroup, probeUrl);

  if (egressIp) {
    try {
      const body = await fetchScore();
      const raw = body ? body.fraudScore : undefined;
      const n = (typeof raw === 'number') ? raw
              : (typeof raw === 'string' && raw.trim() !== '') ? Number(raw)
              : NaN;

      if (Number.isFinite(n)) {
        body.fraudScore = Math.max(0, Math.min(100, n));
        data = body;
      }
    } catch(e) {}
  }

  if (data && ispSource === 'local' && data.ip) {
    const org = lookupLocalASN(data.ip);
    if (org) data.asOrganization = org;
  }

  const asnKey = (n) => 'ippure_asn_' + String(n).trim().replace(/^as\s*/i, '');
  const asnGet = (k) => { try { return ctx.storage.getJSON(k); } catch (_) { return null; } };
  const asnSet = (k, v) => { try { ctx.storage.setJSON(k, v); } catch (_) {} };

  let asnName = null;
  if (data && data.asn !== undefined && data.asn !== null) {
    const k = asnKey(data.asn);
    const hit = asnGet(k);
    if (hit && typeof hit === 'object' && (Date.now() - (hit.ts || 0)) < __ASN_TTL) {
      asnName = hit.n || null;
    } else {
      const got = await __fetchAsnName(ctx, data.asn, strategyGroup);
      if (got !== undefined) {
        asnName = got || null;
        asnSet(k, { n: got, ts: Date.now() });
      }
    }
  }

  const DASH = '--';
  const gray = C.muted;
  const metaDead = !data;

  const riskScore =
    metaDead ? 0 : Math.max(0, Math.min(100, data.fraudScore));

  let riskText = '高危';
  let riskColor = C.risk5;

  if (riskScore <= 15) {
    riskText = '优质';
    riskColor = C.risk0;
  } else if (riskScore <= 25) {
    riskText = '良好';
    riskColor = C.risk1;
  } else if (riskScore <= 40) {
    riskText = '普通';
    riskColor = C.risk2;
  } else if (riskScore <= 50) {
    riskText = '低危';
    riskColor = C.risk3;
  } else if (riskScore <= 70) {
    riskText = '中危';
    riskColor = C.risk4;
  }

  if (metaDead) {
    riskText = DASH;
    riskColor = gray;
  }

  const riskIconMap = {
    risk0_house: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+CiAgPHBhdGggZD0iTTEuNzksMjIuNjlBMi42NSwyLjY1LDAsMCwxLC41NCwyMi40YTEsMSwwLDAsMS0uNTQtMSwxLjgsMS44LDAsMCwxLC42NS0xLjMyTDE4Ljk0LDJBNy43NCw3Ljc0LDAsMCwxLDIwLjUxLjcyYTMsMywwLDAsMSwzLDBBNy43NCw3Ljc0LDAsMCwxLDI1LjA2LDJMNDMuMzUsMjAuMDhBMS44LDEuOCwwLDAsMSw0NCwyMS40YTEuMDYsMS4wNiwwLDAsMS0uNTMsMSwyLjY2LDIuNjYsMCwwLDEtMS4yNi4yOUgzOC4wNkwyMiw2Ljg1LDUuOTQsMjIuNjlabS43My0xLjYzSDUuMjVMMjIsNC41LDM4Ljc1LDIxLjA2aDIuNzNhLjE3LjE3LDAsMCwwLC4xOS0uMTQuMzQuMzQsMCwwLDAtLjEzLS4yOUwyMy45LDMuMTlhOCw4LDAsMCwwLTEuMTItMSwxLjM0LDEuMzQsMCwwLDAtMS41NiwwLDgsOCwwLDAsMC0xLjEyLDFMMi40NiwyMC42M2EuMzQuMzQsMCwwLDAtLjEzLjI5QS4xNy4xNywwLDAsMCwyLjUyLDIxLjA2Wk05LjgzLDQwLjQ0Yy0uNCwwLS43OSwwLTEuMTYsMGwtMS4wNywwQTguMiw4LjIsMCwwLDEsNC42OCw0MCwxLjI2LDEuMjYsMCwwLDEsNCwzOC43N2E0LjU1LDQuNTUsMCwwLDEsMS0zLjA2LDMsMywwLDAsMSwyLjQyLTEuMTUsMy4xOCwzLjE4LDAsMCwxLDEuMzIuMjRBMi43LDIuNywwLDAsMCw5LjgzLDM1LDIuNjMsMi42MywwLDAsMCwxMSwzNC44MWEzLjIxLDMuMjEsMCwwLDEsMS4zMS0uMjMsNS4xOSw1LjE5LDAsMCwxLDEuOS40LDYsNiwwLDAsMSwxLjY2LDEsMS40OCwxLjQ4LDAsMCwxLC42OSwxdjMuNDZabTUsMy4yM1Y0MC4zOGguMzJWMzguNUg0LjQ2VjIxLjc1bDEuNjYtMS4yN3YxNi40SDM3Ljg3VjIwLjQ4bDEuNjcsMS4yN1YzOC41SDI4LjgxdjEuODhoLjMydjMuMjlaTTYuODEsMTUuMjdWNi43N0g2LjE5VjIuNjNsNS4yMSwwVjYuNzdoLS42M3Y0LjM4Wk04LjU2LDI3LjM1VjI1YS44Mi44MiwwLDAsMSwuODEtLjgxaDIuMzJ2My4xMlptLjgxLDQuNTlhLjgyLjgyLDAsMCwxLS44MS0uODFWMjguODFoMy4xM3YzLjEzWm0zLjczLTQuNTlWMjQuMjNoMi4zMmEuODIuODIsMCwwLDEsLjgxLjgxdjIuMzFabTAsNC41OVYyOC44MWgzLjEzdjIuMzJhLjgyLjgyLDAsMCwxLS44MS44MVpNMTYuNTQsNDJIMjcuNDZWNDAuODVIMTYuNTRabS4zMS0yLjM5aDEwLjNWMzguNUgxNi44NVptMS4yNS0yLjM2VjI2YTMuMjYsMy4yNiwwLDAsMSwxLjE5LTIuNTMsNCw0LDAsMCwxLDUuNDMsMEEzLjI5LDMuMjksMCwwLDEsMjUuOSwyNlYzNy4yOVptNi4xMS02LjQ2YS43MS43MSwwLDAsMCwuNTMtLjIyLjczLjczLDAsMCwwLC4yMi0uNTMuNzcuNzcsMCwwLDAtLjIyLS41My43NS43NSwwLDAsMC0uNTMtLjIyLjc1Ljc1LDAsMCwwLS43NS43NS43NS43NSwwLDAsMCwuNzUuNzVabTMuMjUsOS42MVYzN2ExLjQ4LDEuNDgsMCwwLDEsLjY5LTEsNiw2LDAsMCwxLDEuNjctMSw1LjE4LDUuMTgsMCwwLDEsMS44OS0uNCwzLjIxLDMuMjEsMCwwLDEsMS4zMS4yMywyLjYzLDIuNjMsMCwwLDAsMS4xNS4yMywyLjcyLDIuNzIsMCwwLDAsMS4xNy0uMjQsMy4wOCwzLjA4LDAsMCwxLDEuMy0uMjQsMywzLDAsMCwxLDIuNDQsMS4xNSw0LjYsNC42LDAsMCwxLDEsMy4wNkExLjI1LDEuMjUsMCwwLDEsMzkuMzMsNDBhOC4yMiw4LjIyLDAsMCwxLTIuOTQuMzRsLTEuMDYsMGMtLjM3LDAtLjc2LDAtMS4xNiwwWm0uMzEtMTMuMDlWMjVhLjgyLjgyLDAsMCwxLC44MS0uODFIMzAuOXYzLjEyWm0uODEsNC41OWEuODIuODIsMCwwLDEtLjgxLS44MVYyOC44MUgzMC45djMuMTNabTMuNzMtNC41OVYyNC4yM2gyLjMyYS44Mi44MiwwLDAsMSwuODEuODF2Mi4zMVptMCw0LjU5VjI4LjgxaDMuMTN2Mi4zMmEuODIuODIsMCwwLDEtLjgxLjgxWiIgZmlsbD0iI2ZmZiIvPgo8L3N2Zz4K',
    risk1_sparkles: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+CiAgPHBhdGggZD0iTTcuMzUsNDEuMDdsLS42LTNBMjAuODcsMjAuODcsMCwwLDAsNiwzNS4yMiwzLjcxLDMuNzEsMCwwLDAsNC45LDMzLjZhNS40LDUuNCwwLDAsMC0yLS45MUwwLDMxLjkyVjMwLjIxbDIuOS0uNzhhNS45Miw1LjkyLDAsMCwwLDItLjkzQTMuNzMsMy43MywwLDAsMCw2LDI2Ljg5LDE5LjkxLDE5LjkxLDAsMCwwLDYuNzUsMjRsLjYtM0g5LjJsLjU5LDNhMTguNjcsMTguNjcsMCwwLDAsLjc2LDIuODcsMy41OCwzLjU4LDAsMCwwLDEuMSwxLjYxLDUuODksNS44OSwwLDAsMCwyLC45M2wyLjg4Ljc4djEuNzFsLTIuODguNzdhNS4zOCw1LjM4LDAsMCwwLTIsLjkxLDMuNTYsMy41NiwwLDAsMC0xLjEsMS42MiwxOS41NCwxOS41NCwwLDAsMC0uNzYsMi45bC0uNTksM1pNOC4yMSwzOUEyNy40LDI3LjQsMCwwLDEsOSwzNS40NGE2LjQsNi40LDAsMCwxLDEuMDktMi4yNyw0LjQyLDQuNDIsMCwwLDEsMS44LTEuMzVBMTMuNDQsMTMuNDQsMCwwLDEsMTQuNzYsMzF2LjExYTE0LjA5LDE0LjA5LDAsMCwxLTIuOTEtLjgxQTQuNTgsNC41OCwwLDAsMSwxMC4wNSwyOSw2LjMyLDYuMzIsMCwwLDEsOSwyNi42OWEyNy4yLDI3LjIsMCwwLDEtLjc1LTMuNTVoLjExYTI5LjQsMjkuNCwwLDAsMS0uNzMsMy41NUE2LjQ5LDYuNDksMCwwLDEsNi41MSwyOSw0LjYyLDQuNjIsMCwwLDEsNC43LDMwLjNhMTQuMTYsMTQuMTYsMCwwLDEtMi45LjgxVjMxYTEzLjUsMTMuNSwwLDAsMSwyLjkuODIsNC40NSw0LjQ1LDAsMCwxLDEuODEsMS4zNSw2LjU3LDYuNTcsMCwwLDEsMS4wOCwyLjI3QTI5LjYxLDI5LjYxLDAsMCwxLDguMzIsMzlabTIuMTEtMjAuNDUtLjQ0LTIuMzJhOS41LDkuNSwwLDAsMC0uNjktMi4zN0EyLjY2LDIuNjYsMCwwLDAsOCwxMi42MmE5LjI1LDkuMjUsMCwwLDAtMi4yMy0uNzJsLTEuNDMtLjMxVjkuOWwxLjQzLS4zM0E5LjYsOS42LDAsMCwwLDgsOC44MywyLjY4LDIuNjgsMCwwLDAsOS4xOSw3LjZhOS4yMSw5LjIxLDAsMCwwLC42OS0yLjM0bC40NC0yLjMzaDEuNzZsLjQ2LDIuMzNhMTAuNTYsMTAuNTYsMCwwLDAsLjcsMi4zNEEyLjU1LDIuNTUsMCwwLDAsMTQuNCw4LjgyYTEwLDEwLDAsMCwwLDIuMjMuNzVMMTgsOS45djEuNjlsLTEuNDEuMzFhOC43OCw4Ljc4LDAsMCwwLTIuMjMuNzMsMi42MywyLjYzLDAsMCwwLTEuMTYsMS4yNCwxMC42MSwxMC42MSwwLDAsMC0uNywyLjM2bC0uNDYsMi4zMlptLjgxLTEuODNhMTkuNTIsMTkuNTIsMCwwLDEsLjY0LTIuOCw0LjQ0LDQuNDQsMCwwLDEsLjktMS42NSwzLjgsMy44LDAsMCwxLDEuNDUtLjk0LDE0LjY4LDE0LjY4LDAsMCwxLDIuMjktLjY0di4xMWExOC43NywxOC43NywwLDAsMS0yLjI5LS42NSwzLjYsMy42LDAsMCwxLTEuNDUtMSw0LjQxLDQuNDEsMCwwLDEtLjktMS42NiwxOSwxOSwwLDAsMS0uNjQtMi43OWguMTVhMTguODYsMTguODYsMCwwLDEtLjY1LDIuNzlBNC41NSw0LjU1LDAsMCwxLDkuNzQsOS4yYTMuNTYsMy41NiwwLDAsMS0xLjQ0LDFBMTguMjYsMTguMjYsMCwwLDEsNiwxMC44di0uMTFhMTQuMzcsMTQuMzcsMCwwLDEsMi4yOS42NCwzLjc2LDMuNzYsMCwwLDEsMS40NC45NCw0LjU4LDQuNTgsMCwwLDEsLjg5LDEuNjUsMTkuMzUsMTkuMzUsMCwwLDEsLjY1LDIuOFpNMjcuNTcsNDEuMDdsLS43My01Yy0uMjktMi0uNi0zLjYzLS45My01YTEyLjQsMTIuNCwwLDAsMC0xLjIxLTMuMjcsNi4xMSw2LjExLDAsMCwwLTEuODUtMi4wNSwxMCwxMCwwLDAsMC0yLjgtMS4yOWMtMS4xMi0uMzUtMi40OS0uNjgtNC4xLTFsLTMtLjYzdi0xLjdsMy0uNjJjMS42MS0uMzMsMy0uNjcsNC4xLTFhMTAuMjYsMTAuMjYsMCwwLDAsMi44LTEuMyw2LjE3LDYuMTcsMCwwLDAsMS44NS0yLDEyLjE5LDEyLjE5LDAsMCwwLDEuMjEtMy4yNmMuMzMtMS4zNC42NC0zLC45My01bC43My01aDEuOGwuNzEsNWMuMjksMiwuNTksMy42My45MSw1YTEyLjc1LDEyLjc1LDAsMCwwLDEuMjIsMy4yNyw2LjI0LDYuMjQsMCwwLDAsMS44NiwyLjA1LDEwLDEwLDAsMCwwLDIuODEsMS4yOWMxLjEyLjMzLDIuNDguNjcsNC4xLDFsMywuNjJ2MS43bC0zLC42M2MtMS42Mi4zMy0zLC42Ni00LjEsMWExMCwxMCwwLDAsMC0yLjgxLDEuMjksNi4yNCw2LjI0LDAsMCwwLTEuODYsMi4wNUExMi43NSwxMi43NSwwLDAsMCwzMSwzMS4wOWMtLjMyLDEuMzQtLjYyLDMtLjkxLDVsLS43MSw1Wm0uODMtMy41MnEuNDItMy4xMi44NS01LjM2YTIzLjUsMjMuNSwwLDAsMSwxLTMuNzgsOC41Miw4LjUyLDAsMCwxLDEuNDUtMi41Nyw3LjI5LDcuMjksMCwwLDEsMi4xMi0xLjdBMTYuMywxNi4zLDAsMCwxLDM2LjksMjNjMS4xOS0uMzQsMi42LS42OCw0LjI0LTF2LjE0Yy0xLjY0LS4zNS0zLS43LTQuMjQtMWExNS42NiwxNS42NiwwLDAsMS0zLjA2LTEuMTgsNy4yOSw3LjI5LDAsMCwxLTIuMTItMS43LDguNTIsOC41MiwwLDAsMS0xLjQ1LTIuNTcsMjMuNSwyMy41LDAsMCwxLTEtMy43OHEtLjQzLTIuMjQtLjg1LTUuMzZoLjEzcS0uNDIsMy4xMi0uODYsNS4zNmEyMi41OCwyMi41OCwwLDAsMS0xLDMuNzgsOC43Myw4LjczLDAsMCwxLTEuNDUsMi41Nyw3LjQyLDcuNDIsMCwwLDEtMi4xMiwxLjcsMTUuNDQsMTUuNDQsMCwwLDEtMywxLjE4Yy0xLjE5LjMzLTIuNjEuNjgtNC4yNSwxdi0uMTRjMS42NC4zNCwzLjA2LjY4LDQuMjUsMWExNC44MywxNC44MywwLDAsMSwzLDEuMTksNy4yMyw3LjIzLDAsMCwxLDIuMTIsMS42OSw4Ljg2LDguODYsMCwwLDEsMS40NSwyLjU3LDIyLjU4LDIyLjU4LDAsMCwxLDEsMy43OHEuNDMsMi4yNS44Niw1LjM4WiIgZmlsbD0iI2ZmZiIvPgo8L3N2Zz4K',
    risk2_neutral: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+CiAgPHBhdGggZD0iTTIyLDQ0YTIxLjY1LDIxLjY1LDAsMCwxLTguNTYtMS43QTIyLjE4LDIyLjE4LDAsMCwxLDEuNywzMC41NiwyMS42NSwyMS42NSwwLDAsMSwwLDIyYTIxLjY1LDIxLjY1LDAsMCwxLDEuNy04LjU2QTIyLjE4LDIyLjE4LDAsMCwxLDEzLjQ0LDEuNywyMS42NSwyMS42NSwwLDAsMSwyMiwwYTIxLjYzLDIxLjYzLDAsMCwxLDguNTQsMS43LDIyLjI0LDIyLjI0LDAsMCwxLDcsNC43MywyMi42MSwyMi42MSwwLDAsMSw0Ljc0LDdBMjEuNDksMjEuNDksMCwwLDEsNDQsMjJhMjEuNDksMjEuNDksMCwwLDEtMS43MSw4LjU2LDIyLjQ5LDIyLjQ5LDAsMCwxLTQuNzQsNywyMi4yNCwyMi4yNCwwLDAsMS03LDQuNzNBMjEuNjMsMjEuNjMsMCwwLDEsMjIsNDRabTAtMS42OWExOS44MiwxOS44MiwwLDAsMCw3Ljg5LTEuNThBMjAuNTMsMjAuNTMsMCwwLDAsNDAuNzMsMjkuODksMTkuODIsMTkuODIsMCwwLDAsNDIuMzEsMjJhMTkuODIsMTkuODIsMCwwLDAtMS41OC03Ljg5QTIwLjUzLDIwLjUzLDAsMCwwLDI5Ljg5LDMuMjcsMTkuODIsMTkuODIsMCwwLDAsMjIsMS42OWExOS44MiwxOS44MiwwLDAsMC03Ljg5LDEuNThBMjAuNTMsMjAuNTMsMCwwLDAsMy4yNywxNC4xMSwxOS44MiwxOS44MiwwLDAsMCwxLjY5LDIyYTE5LjgyLDE5LjgyLDAsMCwwLDEuNTgsNy44OUEyMC41MywyMC41MywwLDAsMCwxNC4xMSw0MC43MywxOS44MiwxOS44MiwwLDAsMCwyMiw0Mi4zMVpNMTQuNTUsMjIuNDJhMi4zNSwyLjM1LDAsMCwxLTEuODYtLjk0LDMuNTksMy41OSwwLDAsMSwwLTQuNDcsMi4zNCwyLjM0LDAsMCwxLDMuNzMsMCwzLjU5LDMuNTksMCwwLDEsMCw0LjQ3QTIuMzcsMi4zNywwLDAsMSwxNC41NSwyMi40MlptLTIuMzcsOC40NlYyOS4xOUgzMS44MnYxLjY5Wm0xNy4yNy04LjQ2YTIuMzcsMi4zNywwLDAsMS0xLjg3LS45NCwzLjU5LDMuNTksMCwwLDEsMC00LjQ3LDIuMzksMi4zOSwwLDAsMSwxLjg3LS45MywyLjM2LDIuMzYsMCwwLDEsMS44Ni45MywzLjU5LDMuNTksMCwwLDEsMCw0LjQ3QTIuMzQsMi4zNCwwLDAsMSwyOS40NSwyMi40MloiIGZpbGw9IiNmZmYiLz4KPC9zdmc+Cg==',
    risk3_thinking: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+CiAgPHBhdGggZD0iTTkuNDgsNDRhOCw4LDAsMCwxLTYtMi4xLDcuODIsNy44MiwwLDAsMS0yLTUuNzEsOS4yMSw5LjIxLDAsMCwxLC4xOC0xLjg1LDcuMjgsNy4yOCwwLDAsMCwuMTktMS41OCw0LjY3LDQuNjcsMCwwLDAtLjI5LTEuNjZjLS4xOS0uNS0uNC0xLS42Mi0xLjQ0YTEzLjc4LDEzLjc4LDAsMCwxLS41Ny0xLjM0QTMuOTEsMy45MSwwLDAsMSwuMTIsMjdhMi40NiwyLjQ2LDAsMCwxLC43MS0xLjgyLDIuNTksMi41OSwwLDAsMSwxLjk0LS43LDQsNCwwLDAsMSwyLjMzLjc0LDUsNSwwLDAsMSwxLjYzLDJsLjE3LjM2YTcuNDcsNy40NywwLDAsMCwuNjcsMS4yMy44My44MywwLDAsMCwuNjkuMzQsMi40NCwyLjQ0LDAsMCwwLC44My0uMTksOC44Niw4Ljg2LDAsMCwwLDEuMTYtLjU4LDIyLjk0LDIyLjk0LDAsMCwxLDIuMjMtMS4wNiwxNy42MiwxNy42MiwwLDAsMSwzLjExLTEsMTcuODMsMTcuODMsMCwwLDEsMy44Ny0uNCw1LjI0LDUuMjQsMCwwLDEsMi42Ny41NywxLjg2LDEuODYsMCwwLDEsMSwxLjcxLDIuMDYsMi4wNiwwLDAsMS0uMzUsMS4yLDMuMjYsMy4yNiwwLDAsMS0xLjMyLDEsMjIuMjgsMjIuMjgsMCwwLDEtMi44MywxbC0uNDkuMTRhMTUuODEsMTUuODEsMCwwLDAtMi41NCwxLDE0LjQ0LDE0LjQ0LDAsMCwwLTIuNzksMS45M2wtLjg1LTFBMTUuNTMsMTUuNTMsMCwwLDEsMTUsMzEuMTlhMTMuNTgsMTMuNTgsMCwwLDEsMi43LTEuMDVsLjQtLjFhMTksMTksMCwwLDAsMi43LS44NnEuODEtLjM2LjgxLS44NGEuNzcuNzcsMCwwLDAtLjU1LS43Myw0LjI2LDQuMjYsMCwwLDAtMS42NC0uMjQsMTUuNiwxNS42LDAsMCwwLTQuODUuNzEsMjQuODYsMjQuODYsMCwwLDAtMy42OCwxLjUyLDEzLjg3LDEzLjg3LDAsMCwxLTEuNjQuNzUsMy43MywzLjczLDAsMCwxLTEuMTkuMjIsMS44NCwxLjg0LDAsMCwxLTEuMy0uNSw2LjU5LDYuNTksMCwwLDEtMS4yLTEuOTNsLS4xNy0uMzZBMy41MiwzLjUyLDAsMCwwLDQuMzcsMjYuNGEyLjM2LDIuMzYsMCwwLDAtMS40NC0uNTIsMS40NiwxLjQ2LDAsMCwwLTEsLjMzLDEuMjIsMS4yMiwwLDAsMC0uMzksMSwyLjYzLDIuNjMsMCwwLDAsLjIsMSwxMC42MywxMC42MywwLDAsMCwuNDYsMS4wNmMuMjUuNTEuNDksMS4wNi43MSwxLjY1YTUuMjEsNS4yMSwwLDAsMSwuMzQsMS45QTcuODIsNy44MiwwLDAsMSwzLjEsMzQuNWE3LjE2LDcuMTYsMCwwLDAtLjE5LDEuNzMsNi4yOCw2LjI4LDAsMCwwLDEuNyw0LjYsNi41Miw2LjUyLDAsMCwwLDQuODcsMS43MiwxMy44NCwxMy44NCwwLDAsMCwzLS4zM0ExMC42NywxMC42NywwLDAsMCwxNSw0MS4zNmMuNjgtLjM2LDEtLjc1LDEtMS4xNmEyLjUyLDIuNTIsMCwwLDAsMC0uNDMsMS40MywxLjQzLDAsMCwwLS4yMS0uNDRsLjkzLTEuMDlhMi42OCwyLjY4LDAsMCwxLC43NiwyLDIuMTQsMi4xNCwwLDAsMS0uNjgsMS41NkE1Ljc1LDUuNzUsMCwwLDEsMTQuOTEsNDNhMTIuMzksMTIuMzksMCwwLDEtMi41Ni43N0ExNS4xLDE1LjEsMCwwLDEsOS40OCw0NFptMTIuOTEtMWEyMSwyMSwwLDAsMS02LjcxLTEuMDhsLjkzLTEuNDJhMjAsMjAsMCwwLDAsNS43OC44NSwxOS41MSwxOS41MSwwLDAsMCw3LjcxLTEuNTQsMjAuMSwyMC4xLDAsMCwwLDYuMzItNC4yNywxOS43OSwxOS43OSwwLDAsMCw0LjI2LTYuMzIsMTkuMzQsMTkuMzQsMCwwLDAsMS41NC03LjcxLDE5LjI5LDE5LjI5LDAsMCwwLTEuNTQtNy43LDE5Ljc5LDE5Ljc5LDAsMCwwLTQuMjYtNi4zMkEyMC4xLDIwLjEsMCwwLDAsMzAuMSwzLjE5YTE5LjUxLDE5LjUxLDAsMCwwLTcuNzEtMS41NCwxOS40MywxOS40MywwLDAsMC03LjcsMS41NEEyMC4wNywyMC4wNywwLDAsMCw0LjEsMTMuNzhhMTkuMjksMTkuMjksMCwwLDAtMS41NCw3LjdBMjAuNzgsMjAuNzgsMCwwLDAsMywyNS41N0wxLjM4LDI2Yy0uMTUtLjczLS4yNy0xLjQ3LS4zNS0yLjIyYTIxLjUzLDIxLjUzLDAsMCwxLS4xMi0yLjI5LDIxLDIxLDAsMCwxLDEuNjYtOC4zNUEyMS42NSwyMS42NSwwLDAsMSwxNCwxLjY2LDIxLDIxLDAsMCwxLDIyLjM5LDBhMjEsMjEsMCwwLDEsOC4zNCwxLjY2QTIxLjY1LDIxLjY1LDAsMCwxLDQyLjIsMTMuMTNhMjAuODMsMjAuODMsMCwwLDEsMS42OCw4LjM1LDIwLjg4LDIwLjg4LDAsMCwxLTEuNjgsOC4zNiwyMS43MywyMS43MywwLDAsMS00LjYyLDYuODUsMjEuNDgsMjEuNDgsMCwwLDEtNi44NSw0LjYxQTIxLDIxLDAsMCwxLDIyLjM5LDQzWk0xNS44MiwxMi44MUEyLjMzLDIuMzMsMCwwLDEsMTQsMTEuOWEzLjMsMy4zLDAsMCwxLS43Ni0yLjE5QTMuMzMsMy4zMywwLDAsMSwxNCw3LjUxYTIuMywyLjMsMCwwLDEsMy42OCwwLDMuMzMsMy4zMywwLDAsMSwuNzcsMi4yLDMuMzQsMy4zNCwwLDAsMS0uNzYsMi4xOEEyLjMxLDIuMzEsMCwwLDEsMTUuODIsMTIuODFaTTIwLjksNS4yM2ExMC40MSwxMC40MSwwLDAsMC0zLjQ2LTIuNDIsMTAuOSwxMC45LDAsMCwwLTQuMS0uN1YuNDVhMTIuNTksMTIuNTksMCwwLDEsNC43Ni44NCwxMiwxMiwwLDAsMSw0LDIuNzhaTTEzLjYxLDM3LjQ5bC0uMi0xLjI0YTMuOCwzLjgsMCwwLDAsMS43OC0uNjUsMS4zLDEuMywwLDAsMCwuNTktMSwxLjI3LDEuMjcsMCwwLDAtLjM4LS45MywyLjE3LDIuMTcsMCwwLDAtMS4xMS0uNTJsLjMxLTEuMjRhMi45LDIuOSwwLDAsMSwxLjc5Ljg5LDIuNTEsMi41MSwwLDAsMSwuNzMsMS44LDIuNDIsMi40MiwwLDAsMS0uOSwxLjkxQTUsNSwwLDAsMSwxMy42MSwzNy40OVpNMjcuNDMsMjQuMzFBMTAuNDYsMTAuNDYsMCwwLDAsMjAsMjFhMTMuNTQsMTMuNTQsMCwwLDAtNS42OCwxLjM4bC0uNy0xLjQ4QTE1LjE0LDE1LjE0LDAsMCwxLDIwLDE5LjM2YTEyLjA4LDEyLjA4LDAsMCwxLDguNjIsMy43NlpNMTQuMDcsNDAuMiwxMy44OCwzOWMxLjQ3LS4yOSwyLjIxLS44NCwyLjIxLTEuNjVhMS40MywxLjQzLDAsMCwwLS4zOS0xbC43LTEuMTdhMi40NCwyLjQ0LDAsMCwxLC43NS45NSwzLDMsMCwwLDEsLjI4LDEuMjYsMi4zOCwyLjM4LDAsMCwxLS44NCwxLjg3QTUuMTYsNS4xNiwwLDAsMSwxNC4wNyw0MC4yWk0zMy4zNCw4LjkyYTEwLjg1LDEwLjg1LDAsMCwwLTUuNDUtMS41LDEyLjEzLDEyLjEzLDAsMCwwLTEuMzguMDcsOS44Nyw5Ljg3LDAsMCwwLTEuMjUuMjJsLS4zNy0xLjYyYTEyLjgzLDEyLjgzLDAsMCwxLDEuNDktLjI0LDEyLjYyLDEyLjYyLDAsMCwxLDEuNTEtLjA5QTEyLjI4LDEyLjI4LDAsMCwxLDM0LjE3LDcuNVptLTQuNSw3LjRBMi4zMSwyLjMxLDAsMCwxLDI3LDE1LjQxYTMuMjksMy4yOSwwLDAsMS0uNzctMi4xOUEzLjMzLDMuMzMsMCwwLDEsMjcsMTFhMi4zLDIuMywwLDAsMSwzLjY4LDAsMy4zMywzLjMzLDAsMCwxLC43NiwyLjIsMy4zNCwzLjM0LDAsMCwxLS43NSwyLjE4QTIuMzMsMi4zMywwLDAsMSwyOC44NCwxNi4zMloiIGZpbGw9IiNmZmYiLz4KPC9zdmc+Cg==',
    risk4_warning: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+CiAgPHBhdGggZD0iTTMuNzksNDRBMy40OSwzLjQ5LDAsMCwxLC4yMSw0MC40MmE0LjkyLDQuOTIsMCwwLDEsLjUzLTIuMTNMMTguNDksMi40M2EzLjc1LDMuNzUsMCwwLDEsNywwTDQzLjI2LDM4LjI5YTQuOTIsNC45MiwwLDAsMSwuNTMsMi4xMywzLjQ4LDMuNDgsMCwwLDEtMSwyLjU2LDMuNDQsMy40NCwwLDAsMS0yLjU3LDFabTAtMS42OUg0MC4yMWExLjksMS45LDAsMCwwLDEuMzgtLjUsMS43OSwxLjc5LDAsMCwwLC41MS0xLjM0LDMsMywwLDAsMC0uMzYtMS40MkwyNCwzLjE3YTIuMjEsMi4yMSwwLDAsMC0yLTEuNDgsMi4yNCwyLjI0LDAsMCwwLTIsMS41TDIuMjYsMzlhMy4yLDMuMiwwLDAsMC0uMzYsMS40NCwxLjgsMS44LDAsMCwwLC41MiwxLjMzQTEuODcsMS44NywwLDAsMCwzLjc5LDQyLjMxWk0yMiwzMmExLDEsMCwwLDEtLjcyLS4yNywxLDEsMCwwLDEtLjM0LS42NkwxOS42MywxNC45MWEyLjksMi45LDAsMCwxLC41Ny0yLjE0LDIuMzUsMi4zNSwwLDAsMSwzLjYxLDAsMi45NCwyLjk0LDAsMCwxLC41NiwyLjEzTDIzLjA2LDMxLjFhLjk0Ljk0LDAsMCwxLS4zMy42NkExLjA2LDEuMDYsMCwwLDEsMjIsMzJabTAsNS43N2ExLjc3LDEuNzcsMCwwLDEtMS4zLS41NCwxLjg0LDEuODQsMCwxLDEsMi42LDBBMS43NywxLjc3LDAsMCwxLDIyLDM3LjhaIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPgo=',
    risk5_poop: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+CiAgPHBhdGggZD0iTTIyLDQ0YTMzLjA5LDMzLjA5LDAsMCwxLTguNjQtMS4wNiwyMywyMywwLDAsMS02Ljg0LTNBMTQuNDksMTQuNDksMCwwLDEsMiwzNS40NGExMC44LDEwLjgsMCwwLDEtMS42LTUuNzIsNy42Myw3LjYzLDAsMCwxLDEuNzQtNS4xM0ExMC43MywxMC43MywwLDAsMSw3LDIxLjQ5YTEyLjMsMTIuMywwLDAsMS0uMTUtMS44OCw4LjM3LDguMzcsMCwwLDEsMS41MS01LjA5LDguMDcsOC4wNywwLDAsMSw0LjM1LTIuODl2LS40YTEzLjExLDEzLjExLDAsMCwxLC44NC01LDguMTIsOC4xMiwwLDAsMSwyLjg2LTMuNDlBMjIuNzEsMjIuNzEsMCwwLDEsMjIsMGExNi42OSwxNi42OSwwLDAsMCwuMzMsMy43MywzLjY0LDMuNjQsMCwwLDAsMS4xOCwyLjA4LDUuNTksNS41OSwwLDAsMCwyLjQyLDFMMjcsN0ExMS4yMywxMS4yMywwLDAsMSwzMi40LDkuMjRhNS4yOCw1LjI4LDAsMCwxLDEuNjYsNC4wOSw2LDYsMCwwLDEtLjEsMS4wNSwxMC4xNywxMC4xNywwLDAsMS0uMjQsMS4xNSw3LDcsMCwwLDEsMy4yLDIuMzgsNy4xLDcuMSwwLDAsMSwxLjI2LDMuOTQsMTAsMTAsMCwwLDEsNCwzLjI4LDcuODgsNy44OCwwLDAsMSwxLjQzLDQuNTlBMTAuOCwxMC44LDAsMCwxLDQyLDM1LjQ0LDE0LjYzLDE0LjYzLDAsMCwxLDM3LjQ3LDQwYTIzLDIzLDAsMCwxLTYuODUsM0EzMywzMywwLDAsMSwyMiw0NFpNMTYsMjguNzVhNC41LDQuNSwwLDAsMCwyLjM4LS42NSw0Ljk0LDQuOTQsMCwwLDAsMS43MS0xLjcyLDQuNjYsNC42NiwwLDAsMCwwLTQuNzUsNSw1LDAsMCwwLTEuNzEtMS43MSw0LjY2LDQuNjYsMCwwLDAtNC43NSwwLDQuOTQsNC45NCwwLDAsMC0xLjcyLDEuNzEsNC42Niw0LjY2LDAsMCwwLDAsNC43NUE0Ljg5LDQuODksMCwwLDAsMTMuNiwyOC4xLDQuNTQsNC41NCwwLDAsMCwxNiwyOC43NVptMC0yLjU0YTIuMiwyLjIsMCwwLDEsMC00LjQsMi4xNiwyLjE2LDAsMCwxLDEuNTYuNjQsMi4yMSwyLjIxLDAsMCwxLDAsMy4xMkEyLjE5LDIuMTksMCwwLDEsMTYsMjYuMjFabTYsMTIuMzVBOC44NSw4Ljg1LDAsMCwwLDI1LDM4LjA1YTkuODcsOS44NywwLDAsMCwyLjYxLTEuMzksNy4yLDcuMiwwLDAsMCwxLjg1LTEuOTQsMy45LDMuOSwwLDAsMCwuNjktMi4xNCwxLjQ3LDEuNDcsMCwwLDAtLjI2LS45MS44OS44OSwwLDAsMC0uODgtLjI2Yy0xLjQ1LjE5LTIuNjkuMzItMy43Mi40MXMtMi4xMS4xMi0zLjI0LjEyLTIuMTksMC0zLjIzLS4xMi0yLjI4LS4yMi0zLjczLS40MWEuODkuODksMCwwLDAtLjg4LjI2LDEuNDcsMS40NywwLDAsMC0uMjYuOTEsMy45LDMuOSwwLDAsMCwuNjksMi4xNCw3LjIsNy4yLDAsMCwwLDEuODUsMS45NCw5Ljg3LDkuODcsMCwwLDAsMi42MSwxLjM5QTguODUsOC44NSwwLDAsMCwyMiwzOC41NlptNi05LjgxYTQuNTMsNC41MywwLDAsMCwyLjM4LS42NSw0Ljk0LDQuOTQsMCwwLDAsMS43MS0xLjcyLDQuNjYsNC42NiwwLDAsMCwwLTQuNzUsNSw1LDAsMCwwLTEuNzEtMS43MSw0LjY2LDQuNjYsMCwwLDAtNC43NSwwLDQuOTQsNC45NCwwLDAsMC0xLjcyLDEuNzEsNC42Niw0LjY2LDAsMCwwLDAsNC43NSw0Ljg5LDQuODksMCwwLDAsMS43MiwxLjcyQTQuNTQsNC41NCwwLDAsMCwyOCwyOC43NVptMC0yLjU0YTIuMTksMi4xOSwwLDAsMS0xLjU1LS42NCwyLjIsMi4yLDAsMSwxLDEuNTUuNjRaIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPgo='
  };

  let riskIcon = riskIconMap.risk5_poop;
  if      (riskScore <= 15) riskIcon = riskIconMap.risk0_house;
  else if (riskScore <= 25) riskIcon = riskIconMap.risk1_sparkles;
  else if (riskScore <= 40) riskIcon = riskIconMap.risk2_neutral;
  else if (riskScore <= 50) riskIcon = riskIconMap.risk3_thinking;
  else if (riskScore <= 70) riskIcon = riskIconMap.risk4_warning;

  if (metaDead) riskIcon = 'sf-symbol:questionmark';

  const networkText =
    metaDead
      ? DASH
      : (data.isResidential === true ? '住宅原生' : '机房网络');

  const networkColor =
    metaDead
      ? gray
      : (data.isResidential === true ? C.green : C.yellow);

  const locationText = [
    data && data.country,
    data && data.region,
    data && data.city
  ]
  .filter(Boolean)
  .join(' · ');

  const shortLocation = [
    data && data.country,
    data && data.city
  ]
  .filter(Boolean)
  .join(' · ');

  const shownIp   = data ? (hideIp ? __maskIp(data.ip) : data.ip) : null;
  const tIp       = metaDead ? DASH : (shownIp || DASH);
  const tIpSmall  = metaDead ? DASH : (data.ip && data.ip.includes(':') ? 'IPV6 NETWORK' : (shownIp || DASH));
  const tCountry  = metaDead ? DASH : (data.country || DASH);
  const ispFor    = (slot) => metaDead ? DASH : (__ispText(data.asn, asnName || data.asOrganization, slot) || DASH);
  const tBcast    = metaDead ? DASH : (data.isBroadcast === true ? '是' : '否');
  const tLoc      = metaDead ? DASH : (locationText || DASH);
  const tLocShort = metaDead ? DASH : (shortLocation || DASH);
  const tScore    = metaDead ? DASH : String(riskScore);
  const cScore    = metaDead ? gray : riskColor;
  const tRect     = metaDead ? DASH
    : ((data.countryCode || data.country || DASH) + (data.city ? ' · ' + data.city : ''));
  const tInline   = metaDead ? DASH
    : ((data.countryCode || data.country || DASH) + ' · ' + networkText);

  function row(label, value, valueColor) {

    return {
      type: 'stack',
      direction: 'row',
      children: [

        {
          type: 'text',
          text: label,
          font: {
            size: 'caption1',
            weight: 'medium'
          },
          textColor: C.muted
        },

        {
          type: 'spacer'
        },

        {
          type: 'text',
          text: value,
          font: {
            size: 'caption1',
            weight: 'medium'
          },
          textColor: valueColor || C.secondary,
          textAlign: 'right',
          maxLines: 1,
          minScale: 0.75
        }

      ]
    };

  }

  function badge(text, color) {

    return {
      type: 'stack',
      direction: 'row',
      gap: 5,
      children: [

        {
          type: 'image',
          src: 'sf-symbol:circle.fill',
          width: 7,
          height: 7,
          color: color
        },

        {
          type: 'text',
          text: text,
          font: {
            size: 'caption2',
            weight: 'bold'
          },
          textColor: color
        }

      ]
    };

  }

  if (widgetFamily === 'accessoryCircular') {

    const node = {
      type: 'image',
      src: riskIcon,
      width: 40,
      height: 40
    };

    if (metaDead) node.color = gray;

    return node;

  }

  if (widgetFamily === 'accessoryRectangular') {

    return {

      type: 'widget',
      padding: [6, 10],
      gap: 2,

      children: [

        {
          type: 'text',
          text: tRect,
          font: {
            size: 14,
            weight: 'semibold'
          },
          textColor: metaDead ? gray : C.text,
          maxLines: 1,
          minScale: 0.75
        },

        {
          type: 'text',
          text: ispFor('rect'),
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: metaDead ? gray : C.secondary,
          maxLines: 1,
          minScale: 0.7
        },

        {
          type: 'text',
          text: networkText,
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: networkColor,
          maxLines: 1,
          minScale: 0.7
        }

      ]
    };

  }

  if (widgetFamily === 'accessoryInline') {

    return {

      type: 'widget',

      children: [

        {
          type: 'text',
          text: tInline,
          font: {
            size: 14,
            weight: 'semibold'
          },
          textColor: metaDead ? gray : C.text,
          maxLines: 1,
          minScale: 0.7
        }

      ]

    };

  }

  if (widgetFamily === 'systemSmall') {

    return {

      type: 'widget',
      ...bg,
      padding: [16, 16, 8, 16],
      gap: 6,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'stack',
              direction: 'row',
              gap: 6,
              children: [

                {
                  type: 'image',
                  src: 'sf-symbol:leaf.fill',
                  width: 14,
                  height: 14,
                  color: C.green
                },

                {
                  type: 'text',
                  text: strategyGroup,
                  font: {
                    size: 'caption1',
                    weight: 'bold'
                  },
                  textColor: C.blue,
                  maxLines: 1,
                  minScale: 0.75
                }

              ]
            }

          ]
        },

        {
          type: 'spacer',
          length: 1
        },

        {
          type: 'stack',
          direction: 'column',
          alignItems: 'start',
          children: [

            {
              type: 'text',
              text: tIpSmall,
              font: {
                size: 20,
                weight: 'heavy'
              },
              textColor: metaDead ? gray : C.text,
              minScale: 0.7,
              maxLines: 1
            },

            {
              type: 'spacer',
              length: 3
            },

            {
              type: 'text',
              text: tCountry,
              font: {
                size: 'caption1',
                weight: 'bold'
              },
              textColor: C.muted
            },

            {
              type: 'spacer',
              length: 4
            },

            badge(networkText, networkColor)

          ]
        },

        {
          type: 'spacer'
        },

        {
          type: 'stack',
          direction: 'row',
          alignItems: 'end',
          children: [

            {
              type: 'stack',
              padding: [0, 0, 5, 0],
              children: [

                {
                  type: 'text',
                  text: riskText,
                  font: {
                    size: 'caption1',
                    weight: 'bold'
                  },
                  textColor: riskColor
                }

              ]
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: tScore,
              font: {
                size: 34,
                weight: 'bold'
              },
              textColor: cScore
            }

          ]
        }

      ]

    };

  }

  if (widgetFamily === 'systemMedium') {

    return {

      type: 'widget',
      ...bg,
      borderWidth: 1,
      borderColor: C.borderColor,
      padding: 18,
      gap: 10,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'stack',
              direction: 'row',
              gap: 8,
              children: [

                {
                  type: 'image',
                  src: 'sf-symbol:leaf.fill',
                  width: 16,
                  height: 16,
                  color: C.green
                },

                {
                  type: 'text',
                  text: 'IPPure',
                  font: {
                    size: 'headline',
                    weight: 'bold'
                  },
                  textColor: C.text
                }

              ]
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: strategyGroup,
              font: {
                size: 'caption1',
                weight: 'bold'
              },
              textColor: C.blue,
              maxLines: 1,
              minScale: 0.75
            }

          ]
        },

        {
          type: 'text',
          text: tIp,
          font: {
            size: 24,
            weight: 'bold'
          },
          textColor: metaDead ? gray : C.text,
          maxLines: 1,
          minScale: 0.65
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 10,
          children: [

            badge(networkText, networkColor),

            badge(riskText, riskColor)

          ]
        },

        {
          type: 'spacer'
        },

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'text',
              text: tLocShort,
              font: {
                size: 'subheadline'
              },
              textColor: metaDead ? gray : C.secondary,
              maxLines: 1,
              minScale: 0.75
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: tScore,
              font: {
                size: 'title3',
                weight: 'bold'
              },
              textColor: cScore
            }

          ]
        }

      ]

    };

  }

  if (widgetFamily === 'systemExtraLarge') {

    return {

      type: 'widget',
      ...bg,
      borderWidth: 1,
      borderColor: C.borderColor,
      padding: 22,
      gap: 16,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [

            {
              type: 'stack',
              direction: 'row',
              gap: 8,
              children: [

                {
                  type: 'image',
                  src: 'sf-symbol:leaf.fill',
                  width: 20,
                  height: 20,
                  color: C.green
                },

                {
                  type: 'text',
                  text: 'IPPure',
                  font: {
                    size: 'headline',
                    weight: 'bold'
                  },
                  textColor: C.text
                }

              ]
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: strategyGroup,
              font: {
                size: 'caption1',
                weight: 'bold'
              },
              textColor: C.blue,
              maxLines: 1,
              minScale: 0.75
            }

          ]
        },

        {
          type: 'text',
          text: 'CURRENT IP',
          font: {
            size: 'caption1',
            weight: 'bold'
          },
          textColor: C.muted
        },

        {
          type: 'text',
          text: tIp,
          font: {
            size: 36,
            weight: 'bold'
          },
          textColor: metaDead ? gray : C.text,
          maxLines: 1,
          minScale: 0.65
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 14,
          children: [

            badge(networkText, networkColor),

            badge(riskText, riskColor)

          ]
        },

        row(
          '位置',
          tLoc,
          metaDead ? gray : C.secondary
        ),

        row(
          '运营商',
          ispFor('large'),
          metaDead ? gray : C.secondary
        ),

        row(
          '广播IP',
          tBcast,
          metaDead ? gray : C.secondary
        ),

        row(
          '风险系数',
          tScore,
          cScore
        ),

        {
          type: 'spacer'
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 6,
          children: [

            {
              type: 'image',
              src: 'sf-symbol:checkmark.circle.fill',
              width: 12,
              height: 12,
              color: metaDead ? gray : C.green
            },

            {
              type: 'text',
              text: metaDead ? DASH : 'Connection Active',
              font: { size: 'caption2' },
              textColor: metaDead ? gray : C.secondary
            }

          ]
        }

      ]

    };

  }

  return {

    type: 'widget',
    ...bg,
    borderWidth: 1,
    borderColor: C.borderColor,
    padding: 20,
    gap: 14,

    children: [

      {
        type: 'stack',
        direction: 'row',
        children: [

          {
            type: 'stack',
            direction: 'row',
            gap: 8,
            children: [

              {
                type: 'image',
                src: 'sf-symbol:leaf.fill',
                width: 18,
                height: 18,
                color: C.green
              },

              {
                type: 'text',
                text: 'IPPure',
                font: {
                  size: 'headline',
                  weight: 'bold'
                },
                textColor: C.text
              }

            ]
          },

          {
            type: 'spacer'
          },

          {
            type: 'text',
            text: strategyGroup,
            font: {
              size: 'caption1',
              weight: 'bold'
            },
            textColor: C.blue,
            maxLines: 1,
            minScale: 0.75
          }

        ]
      },

      {
        type: 'text',
        text: 'CURRENT IP',
        font: {
          size: 'caption1',
          weight: 'bold'
        },
        textColor: C.muted
      },

      {
        type: 'text',
        text: tIp,
        font: {
          size: 32,
          weight: 'bold'
        },
        textColor: metaDead ? gray : C.text,
        maxLines: 1,
        minScale: 0.65
      },

      {
        type: 'stack',
        direction: 'row',
        gap: 14,
        children: [

          badge(networkText, networkColor),

          badge(riskText, riskColor)

        ]
      },

      row(
        '位置',
        tLoc,
        metaDead ? gray : C.secondary
      ),

      row(
        '运营商',
        ispFor('large'),
        metaDead ? gray : C.secondary
      ),

      row(
        '广播IP',
        tBcast,
        metaDead ? gray : C.secondary
      ),

      {
        type: 'stack',
        direction: 'row',
        children: [

          {
            type: 'text',
            text: '风险系数',
            font: {
              size: 'caption1',
              weight: 'medium'
            },
            textColor: C.muted
          },

          { type: 'spacer' },

          {
            type: 'text',
            text: tScore,
            font: {
              size: 'caption1',
              weight: 'bold'
            },
            textColor: cScore,
            textAlign: 'right'
          }

        ]
      },

      {
        type: 'spacer'
      },

      {
        type: 'stack',
        direction: 'row',
        gap: 6,
        children: [

          {
            type: 'image',
            src: 'sf-symbol:checkmark.circle.fill',
            width: 12,
            height: 12,
            color: metaDead ? gray : C.green
          },

          {
            type: 'text',
            text: metaDead ? DASH : 'Connection Active',
            font: { size: 'caption2' },
            textColor: metaDead ? gray : C.secondary
          }

        ]
      }

    ]

  };

}

export default async function(ctx) {

  const widget = await __render(ctx);

  return widget;

}
