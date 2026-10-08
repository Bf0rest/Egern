// IPPure — 代理 IP 风险评分小组件
// 添加环境变量，名称：GROUP，值：策略组名称（默认 DIRECT）
// 6-tier risk labels (优质/良好/普通/低危/中危/高危)
//
// 刷新策略相关（单位：分钟，除 PROBE_URL / NETWORK_AWARE / FORCE 外）：
//   PROBE          出口 IP 检测间隔，默认 0 = 每次渲染都检测。
//                  调大可压请求量，但会牺牲换节点 / 手动刷新的实时性。
//   PROBE_URL      自定义出口 IP 探测地址，需返回含 ip= 的纯文本或 {ip|origin} 的 JSON
//   REFRESH        refreshAfter 建议值，默认 30；设 0 则完全不设置，交给系统
//   TTL            出口 IP 没变时的重新打分区间，默认 720（12 小时）；设 0 则只在换 IP 时重打
//   MAX_AGE        陈旧数据可接受上限，默认 1440（24 小时），用于取数失败兜底
//   RETRY          取数失败后的重试间隔，默认 15
//   NETWORK_AWARE  设为 1 时，Wi-Fi / 蜂窝链路变化会立即触发一次检测
//   FORCE          设为 1 完全回到最初的行为：每次渲染都打完整接口，不做任何缓存判定
//
// 思路：昂贵的打分请求只在「出口 IP 变了」或「TTL 到期」时才发，其余渲染只花一次约 200 字节的探测。
let __nextRefreshAt = null;

function __numEnv(raw, def, lo, hi) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
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

function __linkSignature(c) {
  try {
    const d = c.device || {};
    const wifi = d.wifi || {};
    const cell = d.cellular || {};
    const ip4 = d.ipv4 || {};
    return [
      wifi.bssid || wifi.ssid || '',
      cell.radio || cell.carrier || '',
      ip4.interface || ''
    ].join('|');
  } catch (_) { return ''; }
}

function __ageText(ms) {
  const min = Math.round(ms / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return min + ' 分钟前';
  const hr = Math.floor(min / 60);
  return hr < 24 ? hr + ' 小时前' : Math.floor(hr / 24) + ' 天前';
}


async function __render(ctx) {

  __nextRefreshAt = null;

  const strategyGroup =
    ctx.env.GROUP || 'DIRECT';

  const widgetFamily =
    ctx.widgetFamily || 'systemLarge';


  const C = {
    bgTop: '#0C0D0F',
    bgBottom: '#141619',

    borderColor: 'rgba(255, 255, 255, 0.06)',

    text: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',

    blue: '#60A5FA',

    risk0: '#22C55E',  // 0-15   优质
    risk1: '#84CC16',  // 15-25  良好
    risk2: '#EAB308',  // 25-40  普通
    risk3: '#F59E0B',  // 40-50  低危
    risk4: '#F97316',  // 50-70  中危
    risk5: '#DC2626',  // 70-100 高危

    green: '#34D399',
    yellow: '#FACC15',
    red: '#F87171',
  };

  const premiumGradient = {
    type: 'linear',
    colors: [C.bgTop, C.bgBottom],
    startPoint: { x: 0.5, y: 0 },
    endPoint: { x: 0.5, y: 1 }
  };


  const probeMin   = __numEnv(ctx.env.PROBE, 0, 0, 720);
  const rescoreMin = __numEnv(ctx.env.TTL, 720, 0, 10080);
  const refreshMin = __numEnv(ctx.env.REFRESH, 30, 0, 1440);
  const maxAgeMin  = __numEnv(ctx.env.MAX_AGE, 1440, 60, 10080);
  const retryMin   = __numEnv(ctx.env.RETRY, 15, 1, 120);
  const netAware   = ctx.env.NETWORK_AWARE === '1';
  const probeUrl   = ctx.env.PROBE_URL || 'https://cloudflare.com/cdn-cgi/trace';
  const forceAlways = ctx.env.FORCE === '1';

  const accessory     = /^accessory/.test(ctx.widgetFamily || '');
  const effProbeMs    = (accessory ? Math.min(probeMin * 2, 720) : probeMin) * 60000;
  const effRefreshMin = refreshMin;
  const cacheKey = 'ippure_' + strategyGroup;
  const linkSig  = __linkSignature(ctx);

  let data = null;
  let fromCache = false;
  let latency = '--';
  let attemptFailed = false;

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

  function writeCache(d, keepTs, probeIp) {
    try {
      ctx.storage.setJSON(cacheKey, {
        ...d,
        ts: keepTs || Date.now(),
        checkTs: Date.now(),
        probeIp: probeIp || null,
        ok: true,
        sig: linkSig
      });
    } catch(_) {}
  }

  let cached = null;
  try { cached = ctx.storage.getJSON(cacheKey); } catch(_) {}

  const cacheAge    = cached && cached.ts ? Date.now() - cached.ts : Infinity;
  const cacheUsable = !!cached && cacheAge <= maxAgeMin * 60000;

  const sinceCheck = cached && cached.checkTs ? Date.now() - cached.checkTs : Infinity;
  const due = forceAlways
    || !cached
    || sinceCheck >= effProbeMs
    || (netAware && cached.sig !== linkSig);

  if (!due) {

    data = cached;
    fromCache = true;
    latency = __ageText(cacheAge);

  } else {

    const egressIp = !forceAlways
      ? await __probeEgressIp(ctx, strategyGroup, probeUrl)
      : null;

    const lastProbeIp = (cached && cached.probeIp) || null;
    const baseMissing = !!cached && !lastProbeIp;
    const ipChanged   = !!cached && !!egressIp && !!lastProbeIp
                        && String(egressIp) !== String(lastProbeIp);
    const rescoreDue  = rescoreMin > 0 && cacheAge > rescoreMin * 60000;

    if (!cached || baseMissing || ipChanged || rescoreDue || egressIp === null) {

      const t0 = Date.now();

      try {

        const body = await fetchScore();
        data = body;
        latency = (Date.now() - t0) + 'ms';
        writeCache(data, Date.now(), egressIp);

      } catch(_) {

        attemptFailed = true;
        latency = (Date.now() - t0) + 'ms';

        if (cacheUsable) {
          data = cached;
          fromCache = true;
          latency = __ageText(cacheAge);
        }

      }

    } else {

      data = cached;
      fromCache = true;
      latency = __ageText(cacheAge);
      writeCache(cached, cached.ts || Date.now(), egressIp);

    }

    if (!data) {
      try {
        const ipResp = await ctx.http.get(
          'https://httpbin.org/ip',
          { policy: strategyGroup, timeout: 5000 }
        );
        const ipBody = await ipResp.json();
        const ip = ipBody.origin || '--';
        const asn = $utils.ipasn(ip);
        data = {
          ip: ip,
          asn: asn ? String(asn) : '---',
          asOrganization: 'IPASN',
          country: '--',
          region: '',
          city: '',
          fraudScore: 0,
          isResidential: false,
          isBroadcast: false
        };
        latency = 'ipasn';
        fromCache = true;
      } catch(_) {}
    }

  }


  if (!data) {

    data = {
      ip: '请求失败',
      asn: '---',
      asOrganization: 'Network Error',
      country: 'Unknown',
      region: '',
      city: '',
      fraudScore: 99,
      isResidential: false
    };

  }

  let nextMs = attemptFailed ? retryMin * 60000 : effRefreshMin * 60000;
  if (!attemptFailed && refreshMin <= 0) {
    nextMs = 0;
  } else {
    if (!Number.isFinite(nextMs) || nextMs < 60000) nextMs = 60000;
    nextMs = Math.min(nextMs, 1440 * 60000) * (0.95 + Math.random() * 0.1);
    __nextRefreshAt = Date.now() + nextMs;
  }


  const riskScore =
    Number(data.fraudScore || 0);

  let riskText = '高危';
  let riskColor = C.risk5;

  let riskEmoji = '🤖';

  if (riskScore <= 15) {
    riskText = '优质';
    riskColor = C.risk0;
    riskEmoji = '💎';
  } else if (riskScore <= 25) {
    riskText = '良好';
    riskColor = C.risk1;
    riskEmoji = '✨';
  } else if (riskScore <= 40) {
    riskText = '普通';
    riskColor = C.risk2;
    riskEmoji = '😐';
  } else if (riskScore <= 50) {
    riskText = '低危';
    riskColor = C.risk3;
    riskEmoji = '🤔';
  } else if (riskScore <= 70) {
    riskText = '中危';
    riskColor = C.risk4;
    riskEmoji = '⚠️';
  }


  const networkText =
    data.isResidential === true
      ? '住宅原生'
      : '机房网络';

  const networkColor =
    data.isResidential === true
      ? C.green
      : C.yellow;


  const locationText = [
    data.country,
    data.region,
    data.city
  ]
  .filter(Boolean)
  .join(' · ');

  const shortLocation = [
    data.country,
    data.city
  ]
  .filter(Boolean)
  .join(' · ');


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
          textAlign: 'right'
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

    return {

      type: 'widget',
      padding: 4,
      gap: 0,

      children: [

        {
          type: 'stack',
          direction: 'row',
          children: [
            { type: 'spacer' },
            {
              type: 'text',
              text: String(riskScore),
              font: { size: 32, weight: 'bold' },
              textColor: riskColor,
              textAlign: 'center'
            },
            { type: 'spacer' }
          ]
        },

        {
          type: 'stack',
          direction: 'row',
          children: [
            { type: 'spacer' },
            {
              type: 'text',
              text: riskText,
              font: { size: 8, weight: 'medium' },
              textColor: C.muted,
              textAlign: 'center',
              maxLine: 1
            },
            { type: 'spacer' }
          ]
        }

      ]

    };

  }

  if (widgetFamily === 'accessoryRectangular') {

    return {

      type: 'widget',
      padding: [6, 10],
      gap: 2,

      children: [

        {
          type: 'text',
          text: (data.countryCode || data.country || '--') + (data.city ? ' · ' + data.city : ''),
          font: {
            size: 14,
            weight: 'semibold'
          },
          textColor: C.text,
          maxLine: 1
        },

        {
          type: 'text',
          text: data.asOrganization || 'Unknown',
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: C.secondary,
          maxLine: 1
        },

        {
          type: 'text',
          text: networkText,
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: networkColor,
          maxLine: 1
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
          text: (data.countryCode || data.country || '--') + ' · ' + networkText,
          font: {
            size: 14,
            weight: 'semibold'
          },
          textColor: C.text,
          maxLine: 1
        }

      ]

    };

  }

  if (widgetFamily === 'systemSmall') {

    return {

      type: 'widget',
      backgroundGradient: premiumGradient,
      border: { width: 1, color: C.borderColor },
      padding: 16,
      gap: 10,

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
                  textColor: C.blue
                }

              ]
            }

          ]
        },

        {
          type: 'text',
          text: data.country || 'Unknown',
          font: {
            size: 15,
            weight: 'semibold'
          },
          textColor: C.text
        },

        badge(networkText, networkColor),

        {
          type: 'spacer'
        },

        {
          type: 'stack',
          direction: 'row',
          gap: 8,
          children: [

            {
              type: 'text',
              text: String(riskScore),
              font: {
                size: 30,
                weight: 'bold'
              },
              textColor: riskColor
            },

            {
              type: 'stack',
              children: [

                {
                  type: 'spacer'
                },

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
            }

          ]
        }

      ]

    };

  }

  if (widgetFamily === 'systemMedium') {

    return {

      type: 'widget',
      backgroundGradient: premiumGradient,
      border: { width: 1, color: C.borderColor },
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
              textColor: C.blue
            }

          ]
        },

        {
          type: 'text',
          text: data.ip || 'N/A',
          font: {
            size: 24,
            weight: 'bold'
          },
          textColor: C.text
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
              text: shortLocation || 'Unknown',
              font: {
                size: 'subheadline'
              },
              textColor: C.secondary
            },

            {
              type: 'spacer'
            },

            {
              type: 'text',
              text: String(riskScore),
              font: {
                size: 'title3',
                weight: 'bold'
              },
              textColor: riskColor
            }

          ]
        }

      ]

    };

  }

  if (widgetFamily === 'systemExtraLarge') {

    return {

      type: 'widget',
      backgroundGradient: premiumGradient,
      border: { width: 1, color: C.borderColor },
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
              textColor: C.blue
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
          text: data.ip || 'N/A',
          font: {
            size: 36,
            weight: 'bold'
          },
          textColor: C.text
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
          locationText || 'Unknown'
        ),

        row(
          '运营商',
          data.asOrganization || 'Unknown'
        ),

        row(
          'ASN',
          String(data.asn || '---')
        ),

        row(
          '广播IP',
          data.isBroadcast === true ? '是' : '否'
        ),

        row(
          '风险系数',
          String(riskScore),
          riskColor
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
              color: C.green
            },

            {
              type: 'text',
              text: 'Connection Active',
              font: { size: 'caption2' },
              textColor: C.secondary
            }

          ]
        }

      ]

    };

  }

  return {

    type: 'widget',
    backgroundGradient: premiumGradient,
    border: { width: 1, color: C.borderColor },
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
            textColor: C.blue
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
        text: data.ip || 'N/A',
        font: {
          size: 32,
          weight: 'bold'
        },
        textColor: C.text
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
        locationText || 'Unknown'
      ),

      row(
        '运营商',
        data.asOrganization || 'Unknown'
      ),

      row(
        '广播IP',
        data.isBroadcast === true ? '是' : '否'
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
            text: String(riskScore),
            font: {
              size: 'caption1',
              weight: 'bold'
            },
            textColor: riskColor,
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
            color: C.green
          },

          {
            type: 'text',
            text: 'Connection Active',
            font: { size: 'caption2' },
            textColor: C.secondary
          }

        ]
      }

    ]

  };

}

export default async function(ctx) {

  let widget = await __render(ctx);

  if (widget && __nextRefreshAt) {
    widget.refreshAfter = new Date(__nextRefreshAt).toISOString();
  }

  return widget;

}
