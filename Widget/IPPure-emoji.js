// 添加环境变量，名称：GROUP，值：策略组名称
// IPPure 6-tier risk labels (优质/良好/普通/低危/中危/高危)

export default async function(ctx) {

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


  let data = null;
  let fromCache = false;
  let latency = '--';
  const CACHE_TTL = 3600000;
  const cacheKey = 'ippure_' + strategyGroup;

  const t0 = Date.now();

  try {

    const resp = await ctx.http.get(
      'https://my.ippure.com/v1/info',
      {
        policy: strategyGroup,
        timeout: 8000
      }
    );

    data = await resp.json();
    latency = (Date.now() - t0) + 'ms';

    try {
      ctx.storage.setJSON(cacheKey, { ...data, ts: Date.now() });
    } catch(_) {}

  } catch(e) {

    latency = (Date.now() - t0) + 'ms';

    try {
      const cached = ctx.storage.getJSON(cacheKey);
      if (cached) {
        data = cached;
        fromCache = true;
        const ageMin = Math.round((Date.now() - cached.ts) / 60000);
        latency = ageMin ? '缓存 ' + ageMin + 'min' : '缓存';
      }
    } catch(_) {}

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


  const riskScore =
    Number(data.fraudScore || 0);

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
    risk0_house: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNy4zNjQsNS43NDcpc2NhbGUoMC43NjYpIj48cGF0aCBkPSJNMi45MiwxMS41NmExLjEyLDEuMTIsMCwwLDEtLjUzLS4xMkEuNDUuNDUsMCwwLDEsMi4xNiwxMWEuNzUuNzUsMCwwLDEsLjI3LS41NUwxMC4yLDIuNzhhMy4xOCwzLjE4LDAsMCwxLC42Ny0uNTUsMS4zMiwxLjMyLDAsMCwxLDEuMjYsMCwzLjE4LDMuMTgsMCwwLDEsLjY3LjU1bDcuNzcsNy42OGEuNzUuNzUsMCwwLDEsLjI3LjU1LjQ1LjQ1LDAsMCwxLS4yMi40MywxLjEzLDEuMTMsMCwwLDEtLjU0LjEySDE4LjMyTDExLjUsNC44NCw0LjY4LDExLjU2Wm0uMzEtLjY5SDQuMzlsNy4xMS03LDcuMTEsN2gxLjE2YS4wNy4wNywwLDAsMCwuMDgtLjA2LjEzLjEzLDAsMCwwLS4wNS0uMTJMMTIuMywzLjI4YTMuMjQsMy4yNCwwLDAsMC0uNDctLjQxLjU1LjU1LDAsMCwwLS42NiwwLDMuMjQsMy4yNCwwLDAsMC0uNDcuNDFMMy4yLDEwLjY5YS4xMy4xMywwLDAsMC0uMDUuMTJBLjA3LjA3LDAsMCwwLDMuMjMsMTAuODdabTMuMSw4LjIzSDUuODRsLS40NSwwYTMuNjcsMy42NywwLDAsMS0xLjI1LS4xNC41My41MywwLDAsMS0uMy0uNTQsMiwyLDAsMCwxLC40MS0xLjMsMS4zMSwxLjMxLDAsMCwxLDEtLjQ5LDEuMzMsMS4zMywwLDAsMSwuNTYuMTEsMS4zLDEuMywwLDAsMCwuNDkuMSwxLjA3LDEuMDcsMCwwLDAsLjQ5LS4xLDEuNDQsMS40NCwwLDAsMSwuNTYtLjEsMi4xMywyLjEzLDAsMCwxLC44LjE3LDIuNTUsMi41NSwwLDAsMSwuNzEuNDFjLjE5LjE2LjI5LjMuMjkuNDRWMTkuMVptMi4xNCwxLjM3di0xLjRoLjE0di0uNzlINC4wNVYxMS4xNmwuNzEtLjU0djdIMTguMjR2LTdsLjcxLjU0djcuMTJIMTQuMzl2Ljc5aC4xNHYxLjRaTTUuMDUsOC40MVY0LjhINC43OVYzSDdWNC44SDYuNzNWNi42NlptLjc0LDUuMTN2LTFhLjM0LjM0LDAsMCwxLC4xMS0uMjQuMy4zLDAsMCwxLC4yNC0uMWgxdjEuMzJabS4zNSwyYS4zLjMsMCwwLDEtLjI0LS4xLjM0LjM0LDAsMCwxLS4xMS0uMjV2LTFINy4xMnYxLjMzWm0xLjU4LTJWMTIuMjJoMWEuMzQuMzQsMCwwLDEsLjM0LjM0djFabTAsMlYxNC4xNkg5LjA1djFhLjMzLjMzLDAsMCwxLS4xLjI1LjMzLjMzLDAsMCwxLS4yNC4xWm0xLjQ2LDQuMjloNC42NHYtLjVIOS4xOFptLjE0LTFoNC4zNnYtLjQ4SDkuMzJabS41My0xVjEzYTEuMzgsMS4zOCwwLDAsMSwuNS0xLjA4LDEuNzIsMS43MiwwLDAsMSwxLjE1LS40NCwxLjY5LDEuNjksMCwwLDEsMS4xNS40NCwxLjM4LDEuMzgsMCwwLDEsLjUsMS4wOHY0LjhaTTEyLjQ0LDE1YS4yOS4yOSwwLDAsMCwuMjItLjA5LjI5LjI5LDAsMCwwLC4xLS4yMy4yNy4yNywwLDAsMC0uMS0uMjIuMy4zLDAsMCwwLS4yMi0uMS4zMy4zMywwLDAsMC0uMjMuMS4yOS4yOSwwLDAsMC0uMDkuMjIuMzEuMzEsMCwwLDAsLjMyLjMyWm0xLjM4LDQuMDhWMTcuNjNjMC0uMTQuMS0uMjguMjktLjQ0YTIuNTUsMi41NSwwLDAsMSwuNzEtLjQxLDIuMjEsMi4yMSwwLDAsMSwuOC0uMTcsMS40NCwxLjQ0LDAsMCwxLC41Ni4xLDEuMDcsMS4wNywwLDAsMCwuNDkuMSwxLjM1LDEuMzUsMCwwLDAsLjUtLjEsMS4yNSwxLjI1LDAsMCwxLC41NS0uMTEsMS4yOSwxLjI5LDAsMCwxLDEsLjQ5LDEuOTMsMS45MywwLDAsMSwuNDEsMS4zLjUzLjUzLDAsMCwxLS4zLjU0LDMuNjMsMy42MywwLDAsMS0xLjI1LjE0bC0uNDUsMEgxMy44MlpNMTQsMTMuNTR2LTFhLjM0LjM0LDAsMCwxLC4zNC0uMzRoMXYxLjMyWm0uMzQsMmEuMzMuMzMsMCwwLDEtLjI0LS4xLjMzLjMzLDAsMCwxLS4xLS4yNXYtMWgxLjMzdjEuMzNabTEuNTktMlYxMi4yMmgxYS4zLjMsMCwwLDEsLjI0LjEuMzQuMzQsMCwwLDEsLjExLjI0djFabTAsMlYxNC4xNmgxLjMzdjFhLjM0LjM0LDAsMCwxLS4xMS4yNS4zLjMsMCwwLDEtLjI0LjFaIiBmaWxsPSIjZmZmIi8+PC9nPjwvc3ZnPg==',
    risk1_sparkles: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNy43MDQsOC41MDIpc2NhbGUoMC42NTkpIj48cGF0aCBkPSJNNC40MywyMC40N2wtLjI5LTEuNDJhOS4zNyw5LjM3LDAsMCwwLS4zNy0xLjQsMS43MywxLjczLDAsMCwwLS41Mi0uNzgsMi42NiwyLjY2LDAsMCwwLTEtLjQ0bC0xLjQtLjM3di0uODNsMS40LS4zOGEyLjg0LDIuODQsMCwwLDAsMS0uNDQsMS43MywxLjczLDAsMCwwLC41Mi0uNzgsOC44Nyw4Ljg3LDAsMCwwLC4zNy0xLjM5bC4yOS0xLjQyaC45bC4yOCwxLjQyQTguODcsOC44NywwLDAsMCw2LDEzLjYzYTEuNjcsMS42NywwLDAsMCwuNTMuNzgsMi43NSwyLjc1LDAsMCwwLDEsLjQ0bDEuMzguMzh2LjgzbC0xLjM4LjM3YTIuNTgsMi41OCwwLDAsMC0xLC40NCwxLjY3LDEuNjcsMCwwLDAtLjUzLjc4LDkuMzcsOS4zNywwLDAsMC0uMzcsMS40bC0uMjgsMS40MlptLjQyLTFhMTEuODUsMTEuODUsMCwwLDEsLjM2LTEuNzIsMy4wNywzLjA3LDAsMCwxLC41Mi0xLjA5QTIuMTMsMi4xMywwLDAsMSw2LjYsMTYsNi43NSw2Ljc1LDAsMCwxLDgsMTUuNjF2LjA2YTYuNzUsNi43NSwwLDAsMS0xLjQxLS40LDIuMiwyLjIsMCwwLDEtLjg3LS42NCwzLjEzLDMuMTMsMCwwLDEtLjUyLTEuMSwxMS40LDExLjQsMCwwLDEtLjM2LTEuNzFINC45YTE0Ljg2LDE0Ljg2LDAsMCwxLS4zNSwxLjcxQTMuMTMsMy4xMywwLDAsMSw0LDE0LjYzYTIuMDYsMi4wNiwwLDAsMS0uODcuNjQsNi42NCw2LjY0LDAsMCwxLTEuNC40di0uMDZhNi42NCw2LjY0LDAsMCwxLDEuNC40LDIsMiwwLDAsMSwuODcuNjUsMy4wOCwzLjA4LDAsMCwxLC41MywxLjA5LDE1LjU2LDE1LjU2LDAsMCwxLC4zNSwxLjcyWm0xLTkuODZMNS42NSw4LjQ4YTQuNjYsNC42NiwwLDAsMC0uMzMtMS4xNCwxLjI1LDEuMjUsMCwwLDAtLjU3LS41OUEzLjkyLDMuOTIsMCwwLDAsMy42OCw2LjRMMyw2LjI1VjUuNDNsLjY5LS4xNmEzLjg5LDMuODksMCwwLDAsMS4wNy0uMzYsMS4yNSwxLjI1LDAsMCwwLC41Ny0uNTksNC40Myw0LjQzLDAsMCwwLC4zMy0xLjEzbC4yMi0xLjEyaC44NGwuMjMsMS4xMmE1LjQzLDUuNDMsMCwwLDAsLjMzLDEuMTMsMS4yOCwxLjI4LDAsMCwwLC41Ni41OSw0LjgxLDQuODEsMCwwLDAsMS4wOC4zNmwuNjguMTZ2LjgybC0uNjguMTVhNCw0LDAsMCwwLTEuMDguMzUsMS4zMSwxLjMxLDAsMCwwLS41Ni42LDUuNDMsNS40MywwLDAsMC0uMzMsMS4xM0w2LjcxLDkuNjFabS4zOC0uODlhMTAuNzEsMTAuNzEsMCwwLDEsLjMxLTEuMzVBMi4xOCwyLjE4LDAsMCwxLDcsNi41OGExLjc4LDEuNzgsMCwwLDEsLjctLjQ2LDcuNzMsNy43MywwLDAsMSwxLjEtLjMxdi4wNmE5LjEyLDkuMTIsMCwwLDEtMS4xLS4zMkExLjc3LDEuNzcsMCwwLDEsNyw1LjFhMi4zOCwyLjM4LDAsMCwxLS40NC0uODFBMTAuMSwxMC4xLDAsMCwxLDYuMjUsM2guMDhBMTAuMSwxMC4xLDAsMCwxLDYsNC4yOWEyLjU2LDIuNTYsMCwwLDEtLjQzLjgxLDEuODQsMS44NCwwLDAsMS0uNy40NSwxMC4zNiwxMC4zNiwwLDAsMS0xLjEuMzJWNS44MWE4LjU5LDguNTksMCwwLDEsMS4xLjMxLDEuODYsMS44NiwwLDAsMSwuNy40NkEyLjM0LDIuMzQsMCwwLDEsNiw3LjM3YTEwLjcxLDEwLjcxLDAsMCwxLC4zMSwxLjM1Wm03Ljk0LDExLjc1LS4zNS0yLjQxcS0uMjMtMS40NC0uNDUtMi40YTYuMDksNi4wOSwwLDAsMC0uNTktMS41OCwyLjk0LDIuOTQsMCwwLDAtLjg5LTEsNSw1LDAsMCwwLTEuMzUtLjYzcS0uODEtLjI0LTItLjQ4bC0xLjQ2LS4zdi0uODNsMS40Ni0uM3ExLjE3LS4yNCwyLS40OGE1LDUsMCwwLDAsMS4zNS0uNjMsMywzLDAsMCwwLC44OS0xLDYsNiwwLDAsMCwuNTktMS41OHEuMjItMSwuNDUtMi40bC4zNS0yLjQxaC44N2wuMzQsMi40MWMuMTQsMSwuMjgsMS43Ni40NCwyLjRhNiw2LDAsMCwwLC41OSwxLjU4LDIuODYsMi44NiwwLDAsMCwuOSwxLDQuNyw0LjcsMCwwLDAsMS4zNS42MnEuODEuMjQsMiwuNDhsMS40Ni4zdi44M2wtMS40Ni4zcS0xLjE3LjI0LTIsLjQ4YTUsNSwwLDAsMC0xLjM1LjYzLDIuODYsMi44NiwwLDAsMC0uOSwxLDYuMDksNi4wOSwwLDAsMC0uNTksMS41OGMtLjE2LjY0LS4zLDEuNDQtLjQ0LDIuNGwtLjM0LDIuNDFabS40LTEuN2MuMTMtMSwuMjctMS44Ni40MS0yLjU4YTExLjMyLDExLjMyLDAsMCwxLC40OS0xLjgzLDQuMTksNC4xOSwwLDAsMSwuNy0xLjI0LDMuNTUsMy41NSwwLDAsMSwxLS44MSw3Ljc0LDcuNzQsMCwwLDEsMS40OC0uNThjLjU3LS4xNywxLjI1LS4zMywyLS41di4wOGMtLjgtLjE4LTEuNDgtLjM0LTItLjVhNy43NCw3Ljc0LDAsMCwxLTEuNDgtLjU4LDMuNTUsMy41NSwwLDAsMS0xLS44MSw0LjE5LDQuMTksMCwwLDEtLjctMS4yNEExMS4zMiwxMS4zMiwwLDAsMSwxNSw2LjM1Yy0uMTQtLjcyLS4yOC0xLjU4LS40MS0yLjU4aC4wNmMtLjE0LDEtLjI3LDEuODYtLjQxLDIuNThhMTEuMzIsMTEuMzIsMCwwLDEtLjQ5LDEuODMsNC4xOSw0LjE5LDAsMCwxLS43LDEuMjQsMy41NSwzLjU1LDAsMCwxLTEsLjgxLDcuOSw3LjksMCwwLDEtMS40Ny41OGMtLjU4LjE2LTEuMjYuMzItMi4wNS41di0uMDhjLjc5LjE3LDEuNDcuMzMsMi4wNS41QTcuMjgsNy4yOCwwLDAsMSwxMiwxMi4zYTMuNTUsMy41NSwwLDAsMSwxLC44MSw0LjE5LDQuMTksMCwwLDEsLjcsMS4yNCwxMS4zMiwxMS4zMiwwLDAsMSwuNDksMS44M2MuMTQuNzIuMjcsMS41OC40MSwyLjU5WiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=',
    risk2_neutral: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNy4xMzksNi44NzYpc2NhbGUoMC43MzkpIj48cGF0aCBkPSJNMTEuNSwyMC40N2E5LjExLDkuMTEsMCwwLDEtMy41OC0uNzFBOS4zMSw5LjMxLDAsMCwxLDMsMTQuODUsOS4zOCw5LjM4LDAsMCwxLDMsNy42OSw5LjMxLDkuMzEsMCwwLDEsNy45MiwyLjc4YTkuMzYsOS4zNiwwLDAsMSw3LjE1LDAsOS4zNiw5LjM2LDAsMCwxLDIuOTMsMiw5LjE0LDkuMTQsMCwwLDEsMi43LDYuNTFBOS4xNCw5LjE0LDAsMCwxLDE4LDE3Ljc4YTkuMzYsOS4zNiwwLDAsMS0yLjkzLDJBOS4wNiw5LjA2LDAsMCwxLDExLjUsMjAuNDdabTAtLjcxYTguMzEsOC4zMSwwLDAsMCwzLjMtLjY2LDguNDcsOC40NywwLDAsMCw0LjUzLTQuNTMsOC41OCw4LjU4LDAsMCwwLDAtNi42QTguNDcsOC40NywwLDAsMCwxNC44LDMuNDRhOC41OCw4LjU4LDAsMCwwLTYuNiwwQTguNDcsOC40NywwLDAsMCwzLjY3LDhhOC41OCw4LjU4LDAsMCwwLDAsNi42QTguNDcsOC40NywwLDAsMCw4LjIsMTkuMSw4LjMxLDguMzEsMCwwLDAsMTEuNSwxOS43NlpNOC4zOSwxMS40NWExLDEsMCwwLDEtLjc4LS40LDEuNDksMS40OSwwLDAsMSwwLTEuODcsMSwxLDAsMCwxLC43OC0uMzksMSwxLDAsMCwxLC43Ny4zOSwxLjQ5LDEuNDksMCwwLDEsMCwxLjg3QS45NC45NCwwLDAsMSw4LjM5LDExLjQ1Wk03LjQsMTV2LS43MWg4LjJWMTVabTcuMjEtMy41NGEuOTQuOTQsMCwwLDEtLjc3LS40LDEuNDksMS40OSwwLDAsMSwwLTEuODcsMSwxLDAsMCwxLC43Ny0uMzksMSwxLDAsMCwxLC43OC4zOSwxLjQ5LDEuNDksMCwwLDEsMCwxLjg3QTEsMSwwLDAsMSwxNC42MSwxMS40NVoiIGZpbGw9IiNmZmYiLz48L2c+PC9zdmc+',
    risk3_thinking: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNi4yMTcsNi43OTgpc2NhbGUoMC43MjcpIj48cGF0aCBkPSJNNi4xNCwyMC45MUEzLjQzLDMuNDMsMCwwLDEsMy41OCwyMGEzLjM4LDMuMzgsMCwwLDEtLjg3LTIuNDUsMy4zNiwzLjM2LDAsMCwxLC4wOC0uNzksMy41NiwzLjU2LDAsMCwwLC4wOC0uNjgsMiwyLDAsMCwwLS4xMy0uNzFjLS4wOC0uMjItLjE3LS40Mi0uMjYtLjYyYTQuNyw0LjcsMCwwLDEtLjI1LS41NywxLjkxLDEuOTEsMCwwLDEtLjEtLjU4LDEuMDcsMS4wNywwLDAsMSwuMy0uNzgsMS4xMywxLjEzLDAsMCwxLC44My0uMywxLjcsMS43LDAsMCwxLDEsLjMyLDIuMDksMi4wOSwwLDAsMSwuNy44NWwuMDcuMTVhMy41NSwzLjU1LDAsMCwwLC4yOS41My4zNC4zNCwwLDAsMCwuMy4xNEEuODMuODMsMCwwLDAsNiwxNC40NWEzLjYxLDMuNjEsMCwwLDAsLjUtLjI0LDkuNTQsOS41NCwwLDAsMSwxLS40Niw4LDgsMCwwLDEsMS4zMy0uNDEsNy44NCw3Ljg0LDAsMCwxLDEuNjYtLjE3LDIuMjEsMi4yMSwwLDAsMSwxLjE1LjI1Ljc5Ljc5LDAsMCwxLC40MS43My45LjksMCwwLDEtLjE1LjUxLDEuMzUsMS4zNSwwLDAsMS0uNTcuNDEsOC45Miw4LjkyLDAsMCwxLTEuMjEuNDRsLS4yMS4wNkE2LjY3LDYuNjcsMCwwLDAsOC43NCwxNmE1Ljc4LDUuNzgsMCwwLDAtMS4xOS44M2wtLjM3LS40NGE2LjQzLDYuNDMsMCwwLDEsMS4zNC0xQTUuMyw1LjMsMCwwLDEsOS42OCwxNWwuMTctLjA1QTguNTgsOC41OCwwLDAsMCwxMSwxNC41N2MuMjMtLjExLjM1LS4yMy4zNS0uMzZhLjM1LjM1LDAsMCwwLS4yMy0uMzIsMi4xLDIuMSwwLDAsMC0uNzEtLjEsNi4zOCw2LjM4LDAsMCwwLTIuMDcuMzEsOS43LDkuNywwLDAsMC0xLjU4LjY1LDUuOSw1LjksMCwwLDEtLjcuMzEsMS40OCwxLjQ4LDAsMCwxLS41MS4xQS43OS43OSwwLDAsMSw1LDE1YTMsMywwLDAsMS0uNTEtLjgzTDQuNDEsMTRBMS41NCwxLjU0LDAsMCwwLDQsMTMuMzhhMSwxLDAsMCwwLS42Mi0uMjMuNTkuNTksMCwwLDAtLjQxLjE1LjUxLjUxLDAsMCwwLS4xNy40MSwxLjI5LDEuMjksMCwwLDAsLjA4LjQxYy4wNi4xNS4xMy4zMS4yLjQ2cy4yMS40NS4zMS43MWEyLjE2LDIuMTYsMCwwLDEsLjE1LjgxLDMuMzYsMy4zNiwwLDAsMS0uMDguNzQsMi45MywyLjkzLDAsMCwwLS4wOC43NSwyLjcxLDIuNzEsMCwwLDAsLjcyLDIsMi44MSwyLjgxLDAsMCwwLDIuMDkuNzMsNS41Myw1LjUzLDAsMCwwLDEuMjYtLjE0LDQuMzMsNC4zMywwLDAsMCwxLjA5LS4zN2MuMjktLjE1LjQ0LS4zMi40NC0uNWEuOS45LDAsMCwwLDAtLjE4LjUzLjUzLDAsMCwwLS4wOS0uMTlsLjQtLjQ3YTEuMTYsMS4xNiwwLDAsMSwuMzIuODQuOS45LDAsMCwxLS4yOS42NywyLjQ3LDIuNDcsMCwwLDEtLjc4LjUyLDUuNjgsNS42OCwwLDAsMS0xLjEuMzNBNy4xMiw3LjEyLDAsMCwxLDYuMTQsMjAuOTFabTUuNTMtLjQ0QTksOSwwLDAsMSw4Ljc5LDIwbC40LS42MWE4LjU1LDguNTUsMCwwLDAsMi40OC4zNkE4LjMxLDguMzEsMCwwLDAsMTUsMTkuMWE4LjU2LDguNTYsMCwwLDAsNC41My00LjUzLDguNTgsOC41OCwwLDAsMCwwLTYuNkE4LjU2LDguNTYsMCwwLDAsMTUsMy40NGE4LjMxLDguMzEsMCwwLDAtMy4zLS42Niw4LjI0LDguMjQsMCwwLDAtMy4zLjY2LDguNTgsOC41OCwwLDAsMC01LDkuNThsLS42OC4xOGMtLjA2LS4zMS0uMTEtLjYzLS4xNS0uOTVzMC0uNjUsMC0xQTkuMDgsOS4wOCwwLDAsMSw1LjE2LDQuNzZhOS4zNiw5LjM2LDAsMCwxLDIuOTMtMiw5LjM2LDkuMzYsMCwwLDEsNy4xNSwwLDkuMzEsOS4zMSwwLDAsMSw0LjkxLDQuOTEsOC45NCw4Ljk0LDAsMCwxLC43MiwzLjU4LDguOTQsOC45NCwwLDAsMS0uNzIsMy41OCw5LjMxLDkuMzEsMCwwLDEtNC45MSw0LjkxQTkuMDYsOS4wNiwwLDAsMSwxMS42NywyMC40N1pNOC44NSw3LjU1YTEsMSwwLDAsMS0uNzgtLjM4LDEuNDIsMS40MiwwLDAsMS0uMzMtLjk0LDEuNCwxLjQsMCwwLDEsLjMzLS45NCwxLDEsMCwwLDEsMS41NywwLDEuNCwxLjQsMCwwLDEsLjMzLjk0LDEuNDQsMS40NCwwLDAsMS0uMzIuOTNBMSwxLDAsMCwxLDguODUsNy41NVpNMTEsNC4zMWE0LjUxLDQuNTEsMCwwLDAtMS40OC0xQTQuNyw0LjcsMCwwLDAsNy43OSwzVjIuMjZhNS4zOCw1LjM4LDAsMCwxLDIsLjM2LDUuMjIsNS4yMiwwLDAsMSwxLjcsMS4xOVpNNy45MSwxOC4xM2wtLjA5LS41M2ExLjcsMS43LDAsMCwwLC43Ni0uMjguNi42LDAsMCwwLC4yNi0uNDUuNTQuNTQsMCwwLDAtLjE3LS40Ljk0Ljk0LDAsMCwwLS40Ny0uMjJsLjEzLS41M2ExLjIxLDEuMjEsMCwwLDEsLjc3LjM4LDEuMDYsMS4wNiwwLDAsMSwuMzEuNzcsMSwxLDAsMCwxLS4zOS44MkEyLjE4LDIuMTgsMCwwLDEsNy45MSwxOC4xM1ptNS45Mi01LjY1YTQuNDksNC40OSwwLDAsMC0zLjIxLTEuNDEsNS42OSw1LjY5LDAsMCwwLTIuNDMuNTlMNy44OSwxMWE2LjU3LDYuNTcsMCwwLDEsMi43NC0uNjZBNS4xOCw1LjE4LDAsMCwxLDE0LjMyLDEyWk04LjEsMTkuMjgsOCwxOC43NWMuNjMtLjEyLDEtLjM2LDEtLjdhLjYzLjYzLDAsMCwwLS4xNy0uNDVsLjMtLjVhMSwxLDAsMCwxLC4zMi40MSwxLjI1LDEuMjUsMCwwLDEsLjEyLjU0LDEsMSwwLDAsMS0uMzYuOEEyLjE2LDIuMTYsMCwwLDEsOC4xLDE5LjI4Wk0xNi4zNiw1Ljg5QTQuNjQsNC42NCwwLDAsMCwxNCw1LjI1YTUuNTQsNS41NCwwLDAsMC0uNTksMCw0LjUxLDQuNTEsMCwwLDAtLjUzLjA5bC0uMTYtLjY5Yy4yMSwwLC40Mi0uMDguNjQtLjExcy40MiwwLC42NCwwYTUuMzIsNS4zMiwwLDAsMSwyLjY5Ljc0Wk0xNC40Myw5LjA2YTEsMSwwLDAsMS0uNzktLjM5LDEuNCwxLjQsMCwwLDEtLjMzLS45NCwxLjQyLDEuNDIsMCwwLDEsLjMzLS45NCwxLDEsMCwwLDEsLjc5LS4zOSwxLDEsMCwwLDEsLjc5LjM5LDEuNDcsMS40NywwLDAsMSwuMzIuOTQsMS40MywxLjQzLDAsMCwxLS4zMi45NEExLDEsMCwwLDEsMTQuNDMsOS4wNloiIGZpbGw9IiNmZmYiLz48L2c+PC9zdmc+',
    risk4_warning: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOC41MjEsMTAuNDU4KXNjYWxlKDAuNTY0KSI+PHBhdGggZD0iTTMuODgsMjAuNDdBMS40NCwxLjQ0LDAsMCwxLDIuMzksMTlhMi4wNSwyLjA1LDAsMCwxLC4yMi0uOUwxMCwzLjA5YTEuNTcsMS41NywwLDAsMSwyLjk0LDBsNy40MiwxNWEyLjA1LDIuMDUsMCwwLDEsLjIyLjksMS40NywxLjQ3LDAsMCwxLS40MiwxLjA3LDEuNDUsMS40NSwwLDAsMS0xLjA3LjQyWm0wLS43MUgxOS4xMmEuNzcuNzcsMCwwLDAsLjU3LS4yMUEuNzMuNzMsMCwwLDAsMTkuOSwxOWExLjI2LDEuMjYsMCwwLDAtLjE1LS41OWwtNy40Mi0xNWEuOTEuOTEsMCwwLDAtLjgzLS42Mi45My45MywwLDAsMC0uODMuNjNsLTcuNDIsMTVhMS4zMywxLjMzLDAsMCwwLS4xNS42Ljc2Ljc2LDAsMCwwLC4yMS41NkEuOC44LDAsMCwwLDMuODgsMTkuNzZabTcuNjItNC4zYS40My40MywwLDAsMS0uNDQtLjM5bC0uNTUtNi43NmExLjIxLDEuMjEsMCwwLDEsLjI0LS45LDEsMSwwLDAsMSwxLjUxLDAsMS4yNywxLjI3LDAsMCwxLC4yMy45bC0uNTUsNi43NmEuMzYuMzYsMCwwLDEtLjEzLjI4QS40NC40NCwwLDAsMSwxMS41LDE1LjQ2Wm0wLDIuNDJhLjc5Ljc5LDAsMSwxLC41NC0uMjNBLjc0Ljc0LDAsMCwxLDExLjUsMTcuODhaIiBmaWxsPSIjZmZmIi8+PC9nPjwvc3ZnPg==',
    risk5_poop: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNC4xOTIsNC4wOTEpc2NhbGUoMC44NzUpIj48cGF0aCBkPSJNMTEuNSwyMC40N0ExNC4xMSwxNC4xMSwwLDAsMSw3Ljg5LDIwLDkuNzcsOS43NywwLDAsMSw1LDE4Ljc4YTYsNiwwLDAsMS0xLjg3LTEuODksNC40NSw0LjQ1LDAsMCwxLS42Ny0yLjM5LDMuMjMsMy4yMywwLDAsMSwuNzItMi4xNSw0LjQzLDQuNDMsMCwwLDEsMi0xLjI5LDUuNTEsNS41MSwwLDAsMS0uMDctLjc5QTMuNDksMy40OSwwLDAsMSw1LjgsOC4xNGEzLjMzLDMuMzMsMCwwLDEsMS44My0xLjJWNi43N0E1LjYzLDUuNjMsMCwwLDEsOCw0LjY3YTMuNDgsMy40OCwwLDAsMSwxLjItMS40NkE5LjE4LDkuMTgsMCwwLDEsMTEuNSwyLjA3YTcuMSw3LjEsMCwwLDAsLjE0LDEuNTYsMS40OSwxLjQ5LDAsMCwwLC40OS44NywyLjQxLDIuNDEsMCwwLDAsMSwuNDJMMTMuNiw1YTQuNzMsNC43MywwLDAsMSwyLjI1LjkzLDIuMTYsMi4xNiwwLDAsMSwuNjksMS43LDIuMzksMi4zOSwwLDAsMSwwLC40NCwzLjM5LDMuMzksMCwwLDEtLjEuNDgsMi44OCwyLjg4LDAsMCwxLDEuMzQsMSwzLDMsMCwwLDEsLjUzLDEuNjUsNC4xOSw0LjE5LDAsMCwxLDEuNjYsMS4zNywzLjMzLDMuMzMsMCwwLDEsLjU5LDEuOTIsNC41Myw0LjUzLDAsMCwxLS42NiwyLjM5QTYuMDgsNi4wOCwwLDAsMSwxOCwxOC43OCw5Ljc3LDkuNzcsMCwwLDEsMTUuMSwyMCwxNC4wOSwxNC4wOSwwLDAsMSwxMS41LDIwLjQ3Wk05LDE0LjA5YTEuODYsMS44NiwwLDAsMCwxLS4yNywyLjA3LDIuMDcsMCwwLDAsLjcyLS43MiwxLjg5LDEuODksMCwwLDAsLjI3LTEsMS44NiwxLjg2LDAsMCwwLS4yNy0xQTIuMDcsMi4wNywwLDAsMCwxMCwxMC40YTEuODYsMS44NiwwLDAsMC0xLS4yNywxLjg5LDEuODksMCwwLDAtMSwuMjcsMi4wNywyLjA3LDAsMCwwLS43Mi43MiwxLjg2LDEuODYsMCwwLDAtLjI3LDEsMS44OSwxLjg5LDAsMCwwLC4yNywxLDIuMDcsMi4wNywwLDAsMCwuNzIuNzJBMS44OSwxLjg5LDAsMCwwLDksMTQuMDlaTTksMTNhLjkyLjkyLDAsMSwxLC45Mi0uOTJBLjk0Ljk0LDAsMCwxLDksMTNaTTExLjUsMTguMkEzLjcxLDMuNzEsMCwwLDAsMTIuNzMsMThhNC40Myw0LjQzLDAsMCwwLDEuMS0uNTgsMy4wOSwzLjA5LDAsMCwwLC43Ny0uODEsMS42OCwxLjY4LDAsMCwwLC4yOS0uOS42My42MywwLDAsMC0uMTEtLjM4LjM3LjM3LDAsMCwwLS4zNy0uMWMtLjYxLjA3LTEuMTMuMTMtMS41Ni4xNnMtLjg4LjA2LTEuMzUuMDYtLjkyLDAtMS4zNS0uMDYtMS0uMDktMS41Ni0uMTZhLjM3LjM3LDAsMCwwLS4zNy4xLjYzLjYzLDAsMCwwLS4xMS4zOCwxLjY4LDEuNjgsMCwwLDAsLjI5LjksMy4wOSwzLjA5LDAsMCwwLC43Ny44MSw0LjQzLDQuNDMsMCwwLDAsMS4xLjU4QTMuNzEsMy43MSwwLDAsMCwxMS41LDE4LjJaTTE0LDE0LjA5YTEuOSwxLjksMCwwLDAsMS0uMjcsMi4xMywyLjEzLDAsMCwwLC43MS0uNzIsMS44OSwxLjg5LDAsMCwwLC4yNy0xLDEuODYsMS44NiwwLDAsMC0uMjctMUEyLjEzLDIuMTMsMCwwLDAsMTUsMTAuNGEyLDIsMCwwLDAtMiwwLDIuMDcsMi4wNywwLDAsMC0uNzIuNzIsMS44NiwxLjg2LDAsMCwwLS4yNywxLDEuODksMS44OSwwLDAsMCwuMjcsMSwyLjA3LDIuMDcsMCwwLDAsLjcyLjcyQTEuODksMS44OSwwLDAsMCwxNCwxNC4wOVpNMTQsMTNhLjk0Ljk0LDAsMCwxLS45Mi0uOTJBLjkyLjkyLDAsMSwxLDE0LDEzWiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4='
  };
  // Select icon by risk tier (SVGs pre-centered, no runtime transform needed)
  function restoreSvgIcon(src) {
    return src;
  }

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

  // ============================================
  // LOCK SCREEN: CIRCULAR
  // ============================================

  if (widgetFamily === 'accessoryCircular') {

    return {

      type: 'widget',
      padding: 4,
      gap: 0,

      children: [

        { type: 'spacer' },

        {
          type: 'stack',
          direction: 'row',
          children: [
            { type: 'spacer' },
            {
              type: 'image',
              src: restoreSvgIcon(riskIcon),
              width: 36,
              height: 36,
              resizeMode: 'contain'
            },
            { type: 'spacer' }
          ]
        },

        { type: 'spacer' }

      ]

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
          maxLine: 1
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

  // ============================================
  // MEDIUM
  // ============================================

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

  // ============================================
  // EXTRA LARGE (iPad)
  // ============================================

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

  // ============================================
  // LARGE
  // ============================================

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
