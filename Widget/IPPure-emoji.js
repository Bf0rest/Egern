// IPPure — 代理 IP 风险评分小组件（Noto 单色图标版）
// ====================================================
// 环境变量（在 Widget 配置中设置）：
//   GROUP  — 策略组名称，默认 DIRECT
//   STYLE  — "glass" 启用透明背景
//   SOURCE — "local" 启用本地 GeoLite2 ASN 查询
//
export default async function(ctx) {

  const strategyGroup =
    ctx.env.GROUP || 'DIRECT';

  const widgetFamily =
    ctx.widgetFamily || 'systemLarge';

  const isGlass =
    (ctx.env.STYLE || '').toLowerCase() === 'glass';

  const ispSource = (ctx.env.SOURCE || '').toLowerCase();


  const C = {
    bgTop: '#0C0D0F',
    bgBottom: '#141619',

    borderColor: 'rgba(255, 255, 255, 0.06)',

    text: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',

    blue: '#60A5FA',

    // IPPure 6 档风险色（绿→红渐进）
    risk0: '#22C55E',  // 0-15   优质
    risk1: '#84CC16',  // 15-25  良好
    risk2: '#EAB308',  // 25-40  普通
    risk3: '#F59E0B',  // 40-50  低危
    risk4: '#F97316',  // 50-70  中危
    risk5: '#DC2626',  // 70-100 高危

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

  let data = null;
  const CACHE_TTL = 3600000;
  const cacheKey = 'ippure_' + strategyGroup;

  // 双路径 ASN 查询：$utils.ipaso → $utils.ipasn → ctx.lookupIP 兜底
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

  try {

    const resp = await ctx.http.get(
      'https://my.ippure.com/v1/info',
      {
        policy: strategyGroup,
        timeout: 8000
      }
    );

    if (resp.status !== 200) {
      throw new Error('HTTP ' + resp.status);
    }

    data = await resp.json();

    if (data && typeof data.fraudScore !== 'undefined') {
      let s = Number(data.fraudScore);
      if (!Number.isFinite(s)) s = 99;
      data.fraudScore = Math.max(0, Math.min(100, s));
    }

    try {
      ctx.storage.setJSON(cacheKey, { ...data, ts: Date.now() });
    } catch(_) {}

    // ISP 信息覆盖 — SOURCE=local 时从本地 GeoLite2 数据库查询
    if (ispSource === 'local' && data.ip) {
      const org = lookupLocalASN(data.ip);
      if (org) data.asOrganization = org;
    }

  } catch(e) {

    // 主请求失败：尝试从缓存读取（验证 TTL）
    try {
      const cached = ctx.storage.getJSON(cacheKey);
      if (cached && Date.now() - cached.ts <= CACHE_TTL) {
        data = cached;
      }
    } catch(_) {}

    // 无缓存或缓存过期：httpbin + ipasn 兜底
    if (!data) {
      try {
        const ipResp = await ctx.http.get(
          'https://httpbin.org/ip',
          { policy: strategyGroup, timeout: 5000 }
        );
        if (ipResp.status !== 200) throw new Error('HTTP ' + ipResp.status);
        const ipBody = await ipResp.json();
        const ip = ipBody.origin || '--';
        const asn = $utils.ipasn(ip);
        data = {
          ip: ip,
          asn: asn ? String(asn) : '---',
          asOrganization: lookupLocalASN(ip) || 'IPASN',
          country: '--',
          region: '',
          city: '',
          fraudScore: 0,
          isResidential: false,
          isBroadcast: false
        };
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


  const riskScore =
    Number.isFinite(data.fraudScore)
      ? Math.max(0, Math.min(100, data.fraudScore))
      : 99;

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

  // ============================================
  // LOCK SCREEN: CIRCULAR
  // ============================================

  if (widgetFamily === 'accessoryCircular') {

    return {
      type: 'image',
      src: riskIcon,
      width: 40,
      height: 40
    };

  }

  // ============================================
  // LOCK SCREEN: RECTANGULAR
  // ============================================

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
          maxLines: 1,
          minScale: 0.75
        },

        {
          type: 'text',
          text: data.asOrganization || 'Unknown',
          font: {
            size: 11,
            weight: 'medium'
          },
          textColor: C.secondary,
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

  // ============================================
  // LOCK SCREEN: INLINE
  // ============================================

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
          maxLines: 1,
          minScale: 0.7
        }

      ]

    };

  }

  // ============================================
  // SMALL
  // ============================================

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
              text: data.ip && data.ip.includes(':') ? 'IPV6 NETWORK' : (data.ip || 'N/A'),
              font: {
                size: 20,
                weight: 'heavy'
              },
              textColor: C.text,
              minScale: 0.7,
              maxLines: 1
            },

            {
              type: 'spacer',
              length: 3
            },

            {
              type: 'text',
              text: data.country || 'Unknown',
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
              text: String(riskScore),
              font: {
                size: 34,
                weight: 'bold'
              },
              textColor: riskColor
            }

          ]
        }

      ]

    };

  }
  // ============================================
  // MEDIUM
  // ============================================

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
          text: data.ip || 'N/A',
          font: {
            size: 24,
            weight: 'bold'
          },
          textColor: C.text,
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
              text: shortLocation || 'Unknown',
              font: {
                size: 'subheadline'
              },
              textColor: C.secondary,
              maxLines: 1,
              minScale: 0.75
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

  // ============================================
  // EXTRA LARGE (iPad)
  // ============================================

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
          text: data.ip || 'N/A',
          font: {
            size: 36,
            weight: 'bold'
          },
          textColor: C.text,
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

  // ============================================
  // LARGE
  // ============================================

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
        text: data.ip || 'N/A',
        font: {
          size: 32,
          weight: 'bold'
        },
        textColor: C.text,
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
