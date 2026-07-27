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
    risk0_house: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIuMDAwLDEyLjAwMClzY2FsZSgwLjc2Nil0cmFuc2xhdGUoLTYuMDUwLC04LjE2MCkiPjxwYXRoIGQ9Ik0yLjkyLDExLjU2YTEuMTIsMS4xMiwwLDAsMS0uNTMtLjEyQS40NS40NSwwLDAsMSwyLjE2LDExYS43NS43NSwwLDAsMSwuMjctLjU1TDEwLjIsMi43OGEzLjE4LDMuMTgsMCwwLDEsLjY3LS41NSwxLjMyLDEuMzIsMCwwLDEsMS4yNiwwLDMuMTgsMy4xOCwwLDAsMSwuNjcuNTVsNy43Nyw3LjY4YS43NS43NSwwLDAsMSwuMjcuNTUuNDUuNDUsMCwwLDEtLjIyLjQzLDEuMTMsMS4xMywwLDAsMS0uNTQuMTJIMTguMzJMMTEuNSw0Ljg0LDQuNjgsMTEuNTZabS4zMS0uNjlINC4zOWw3LjExLTcsNy4xMSw3aDEuMTZhLjA3LjA3LDAsMCwwLC4wOC0uMDYuMTMuMTMsMCwwLDAtLjA1LS4xMkwxMi4zLDMuMjhhMy4yNCwzLjI0LDAsMCwwLS40Ny0uNDEuNTUuNTUsMCwwLDAtLjY2LDAsMy4yNCwzLjI0LDAsMCwwLS40Ny40MUwzLjIsMTAuNjlhLjEzLjEzLDAsMCwwLS4wNS4xMkEuMDcuMDcsMCwwLDAsMy4yMywxMC44N1ptMy4xLDguMjNINS44NGwtLjQ1LDBhMy42NywzLjY3LDAsMCwxLTEuMjUtLjE0LjUzLjUzLDAsMCwxLS4zLS41NCwyLDIsMCwwLDEsLjQxLTEuMywxLjMxLDEuMzEsMCwwLDEsMS0uNDksMS4zMywxLjMzLDAsMCwxLC41Ni4xMSwxLjMsMS4zLDAsMCwwLC40OS4xLDEuMDcsMS4wNywwLDAsMCwuNDktLjEsMS40NCwxLjQ0LDAsMCwxLC41Ni0uMSwyLjEzLDIuMTMsMCwwLDEsLjguMTcsMi41NSwyLjU1LDAsMCwxLC43MS40MWMuMTkuMTYuMjkuMy4yOS40NFYxOS4xWm0yLjE0LDEuMzd2LTEuNGguMTR2LS43OUg0LjA1VjExLjE2bC43MS0uNTR2N0gxOC4yNHYtN2wuNzEuNTR2Ny4xMkgxNC4zOXYuNzloLjE0djEuNFpNNS4wNSw4LjQxVjQuOEg0Ljc5VjNIN1Y0LjhINi43M1Y2LjY2Wm0uNzQsNS4xM3YtMWEuMzQuMzQsMCwwLDEsLjExLS4yNC4zLjMsMCwwLDEsLjI0LS4xaDF2MS4zMlptLjM1LDJhLjMuMywwLDAsMS0uMjQtLjEuMzQuMzQsMCwwLDEtLjExLS4yNXYtMUg3LjEydjEuMzNabTEuNTgtMlYxMi4yMmgxYS4zNC4zNCwwLDAsMSwuMzQuMzR2MVptMCwyVjE0LjE2SDkuMDV2MWEuMzMuMzMsMCwwLDEtLjEuMjUuMzMuMzMsMCwwLDEtLjI0LjFabTEuNDYsNC4yOWg0LjY0di0uNUg5LjE4Wm0uMTQtMWg0LjM2di0uNDhIOS4zMlptLjUzLTFWMTNhMS4zOCwxLjM4LDAsMCwxLC41LTEuMDgsMS43MiwxLjcyLDAsMCwxLDEuMTUtLjQ0LDEuNjksMS42OSwwLDAsMSwxLjE1LjQ0LDEuMzgsMS4zOCwwLDAsMSwuNSwxLjA4djQuOFpNMTIuNDQsMTVhLjI5LjI5LDAsMCwwLC4yMi0uMDkuMjkuMjksMCwwLDAsLjEtLjIzLjI3LjI3LDAsMCwwLS4xLS4yMi4zLjMsMCwwLDAtLjIyLS4xLjMzLjMzLDAsMCwwLS4yMy4xLjI5LjI5LDAsMCwwLS4wOS4yMi4zMS4zMSwwLDAsMCwuMzIuMzJabTEuMzgsNC4wOFYxNy42M2MwLS4xNC4xLS4yOC4yOS0uNDRhMi41NSwyLjU1LDAsMCwxLC43MS0uNDEsMi4yMSwyLjIxLDAsMCwxLC44LS4xNywxLjQ0LDEuNDQsMCwwLDEsLjU2LjEsMS4wNywxLjA3LDAsMCwwLC40OS4xLDEuMzUsMS4zNSwwLDAsMCwuNS0uMSwxLjI1LDEuMjUsMCwwLDEsLjU1LS4xMSwxLjI5LDEuMjksMCwwLDEsMSwuNDksMS45MywxLjkzLDAsMCwxLC40MSwxLjMuNTMuNTMsMCwwLDEtLjMuNTQsMy42MywzLjYzLDAsMCwxLTEuMjUuMTRsLS40NSwwSDEzLjgyWk0xNCwxMy41NHYtMWEuMzQuMzQsMCwwLDEsLjM0LS4zNGgxdjEuMzJabS4zNCwyYS4zMy4zMywwLDAsMS0uMjQtLjEuMzMuMzMsMCwwLDEtLjEtLjI1di0xaDEuMzN2MS4zM1ptMS41OS0yVjEyLjIyaDFhLjMuMywwLDAsMSwuMjQuMS4zNC4zNCwwLDAsMSwuMTEuMjR2MVptMCwyVjE0LjE2aDEuMzN2MWEuMzQuMzQsMCwwLDEtLjExLjI1LjMuMywwLDAsMS0uMjQuMVoiIGZpbGw9IiNmZmYiLz48L2c+PC9zdmc+',
    risk1_sparkles: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIuMDAwLDEyLjAwMClzY2FsZSgwLjY1OSl0cmFuc2xhdGUoLTYuNTE1LC01LjMwNSkiPjxwYXRoIGQ9Ik00LjQzLDIwLjQ3bC0uMjktMS40MmE5LjM3LDkuMzcsMCwwLDAtLjM3LTEuNCwxLjczLDEuNzMsMCwwLDAtLjUyLS43OCwyLjY2LDIuNjYsMCwwLDAtMS0uNDRsLTEuNC0uMzd2LS44M2wxLjQtLjM4YTIuODQsMi44NCwwLDAsMCwxLS40NCwxLjczLDEuNzMsMCwwLDAsLjUyLS43OCw4Ljg3LDguODcsMCwwLDAsLjM3LTEuMzlsLjI5LTEuNDJoLjlsLjI4LDEuNDJBOC44Nyw4Ljg3LDAsMCwwLDYsMTMuNjNhMS42NywxLjY3LDAsMCwwLC41My43OCwyLjc1LDIuNzUsMCwwLDAsMSwuNDRsMS4zOC4zOHYuODNsLTEuMzguMzdhMi41OCwyLjU4LDAsMCwwLTEsLjQ0LDEuNjcsMS42NywwLDAsMC0uNTMuNzgsOS4zNyw5LjM3LDAsMCwwLS4zNywxLjRsLS4yOCwxLjQyWm0uNDItMWExMS44NSwxMS44NSwwLDAsMSwuMzYtMS43MiwzLjA3LDMuMDcsMCwwLDEsLjUyLTEuMDlBMi4xMywyLjEzLDAsMCwxLDYuNiwxNiw2Ljc1LDYuNzUsMCwwLDEsOCwxNS42MXYuMDZhNi43NSw2Ljc1LDAsMCwxLTEuNDEtLjQsMi4yLDIuMiwwLDAsMS0uODctLjY0LDMuMTMsMy4xMywwLDAsMS0uNTItMS4xLDExLjQsMTEuNCwwLDAsMS0uMzYtMS43MUg0LjlhMTQuODYsMTQuODYsMCwwLDEtLjM1LDEuNzFBMy4xMywzLjEzLDAsMCwxLDQsMTQuNjNhMi4wNiwyLjA2LDAsMCwxLS44Ny42NCw2LjY0LDYuNjQsMCwwLDEtMS40LjR2LS4wNmE2LjY0LDYuNjQsMCwwLDEsMS40LjQsMiwyLDAsMCwxLC44Ny42NSwzLjA4LDMuMDgsMCwwLDEsLjUzLDEuMDksMTUuNTYsMTUuNTYsMCwwLDEsLjM1LDEuNzJabTEtOS44Nkw1LjY1LDguNDhhNC42Niw0LjY2LDAsMCwwLS4zMy0xLjE0LDEuMjUsMS4yNSwwLDAsMC0uNTctLjU5QTMuOTIsMy45MiwwLDAsMCwzLjY4LDYuNEwzLDYuMjVWNS40M2wuNjktLjE2YTMuODksMy44OSwwLDAsMCwxLjA3LS4zNiwxLjI1LDEuMjUsMCwwLDAsLjU3LS41OSw0LjQzLDQuNDMsMCwwLDAsLjMzLTEuMTNsLjIyLTEuMTJoLjg0bC4yMywxLjEyYTUuNDMsNS40MywwLDAsMCwuMzMsMS4xMywxLjI4LDEuMjgsMCwwLDAsLjU2LjU5LDQuODEsNC44MSwwLDAsMCwxLjA4LjM2bC42OC4xNnYuODJsLS42OC4xNWE0LDQsMCwwLDAtMS4wOC4zNSwxLjMxLDEuMzEsMCwwLDAtLjU2LjYsNS40Myw1LjQzLDAsMCwwLS4zMywxLjEzTDYuNzEsOS42MVptLjM4LS44OWExMC43MSwxMC43MSwwLDAsMSwuMzEtMS4zNUEyLjE4LDIuMTgsMCwwLDEsNyw2LjU4YTEuNzgsMS43OCwwLDAsMSwuNy0uNDYsNy43Myw3LjczLDAsMCwxLDEuMS0uMzF2LjA2YTkuMTIsOS4xMiwwLDAsMS0xLjEtLjMyQTEuNzcsMS43NywwLDAsMSw3LDUuMWEyLjM4LDIuMzgsMCwwLDEtLjQ0LS44MUExMC4xLDEwLjEsMCwwLDEsNi4yNSwzaC4wOEExMC4xLDEwLjEsMCwwLDEsNiw0LjI5YTIuNTYsMi41NiwwLDAsMS0uNDMuODEsMS44NCwxLjg0LDAsMCwxLS43LjQ1LDEwLjM2LDEwLjM2LDAsMCwxLTEuMS4zMlY1LjgxYTguNTksOC41OSwwLDAsMSwxLjEuMzEsMS44NiwxLjg2LDAsMCwxLC43LjQ2QTIuMzQsMi4zNCwwLDAsMSw2LDcuMzdhMTAuNzEsMTAuNzEsMCwwLDEsLjMxLDEuMzVabTcuOTQsMTEuNzUtLjM1LTIuNDFxLS4yMy0xLjQ0LS40NS0yLjRhNi4wOSw2LjA5LDAsMCwwLS41OS0xLjU4LDIuOTQsMi45NCwwLDAsMC0uODktMSw1LDUsMCwwLDAtMS4zNS0uNjNxLS44MS0uMjQtMi0uNDhsLTEuNDYtLjN2LS44M2wxLjQ2LS4zcTEuMTctLjI0LDItLjQ4YTUsNSwwLDAsMCwxLjM1LS42MywzLDMsMCwwLDAsLjg5LTEsNiw2LDAsMCwwLC41OS0xLjU4cS4yMi0xLC40NS0yLjRsLjM1LTIuNDFoLjg3bC4zNCwyLjQxYy4xNCwxLC4yOCwxLjc2LjQ0LDIuNGE2LDYsMCwwLDAsLjU5LDEuNTgsMi44NiwyLjg2LDAsMCwwLC45LDEsNC43LDQuNywwLDAsMCwxLjM1LjYycS44MS4yNCwyLC40OGwxLjQ2LjN2LjgzbC0xLjQ2LjNxLTEuMTcuMjQtMiwuNDhhNSw1LDAsMCwwLTEuMzUuNjMsMi44NiwyLjg2LDAsMCwwLS45LDEsNi4wOSw2LjA5LDAsMCwwLS41OSwxLjU4Yy0uMTYuNjQtLjMsMS40NC0uNDQsMi40bC0uMzQsMi40MVptLjQtMS43Yy4xMy0xLC4yNy0xLjg2LjQxLTIuNThhMTEuMzIsMTEuMzIsMCwwLDEsLjQ5LTEuODMsNC4xOSw0LjE5LDAsMCwxLC43LTEuMjQsMy41NSwzLjU1LDAsMCwxLDEtLjgxLDcuNzQsNy43NCwwLDAsMSwxLjQ4LS41OGMuNTctLjE3LDEuMjUtLjMzLDItLjV2LjA4Yy0uOC0uMTgtMS40OC0uMzQtMi0uNWE3Ljc0LDcuNzQsMCwwLDEtMS40OC0uNTgsMy41NSwzLjU1LDAsMCwxLTEtLjgxLDQuMTksNC4xOSwwLDAsMS0uNy0xLjI0QTExLjMyLDExLjMyLDAsMCwxLDE1LDYuMzVjLS4xNC0uNzItLjI4LTEuNTgtLjQxLTIuNThoLjA2Yy0uMTQsMS0uMjcsMS44Ni0uNDEsMi41OGExMS4zMiwxMS4zMiwwLDAsMS0uNDksMS44Myw0LjE5LDQuMTksMCwwLDEtLjcsMS4yNCwzLjU1LDMuNTUsMCwwLDEtMSwuODEsNy45LDcuOSwwLDAsMS0xLjQ3LjU4Yy0uNTguMTYtMS4yNi4zMi0yLjA1LjV2LS4wOGMuNzkuMTcsMS40Ny4zMywyLjA1LjVBNy4yOCw3LjI4LDAsMCwxLDEyLDEyLjNhMy41NSwzLjU1LDAsMCwxLDEsLjgxLDQuMTksNC4xOSwwLDAsMSwuNywxLjI0LDExLjMyLDExLjMyLDAsMCwxLC40OSwxLjgzYy4xNC43Mi4yNywxLjU4LjQxLDIuNTlaIiBmaWxsPSIjZmZmIi8+PC9nPjwvc3ZnPg==',
    risk2_neutral: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIuMDAwLDEyLjAwMClzY2FsZSgwLjczOSl0cmFuc2xhdGUoLTYuNTgwLC02LjkzNSkiPjxwYXRoIGQ9Ik0xMS41LDIwLjQ3YTkuMTEsOS4xMSwwLDAsMS0zLjU4LS43MUE5LjMxLDkuMzEsMCwwLDEsMywxNC44NSw5LjM4LDkuMzgsMCwwLDEsMyw3LjY5LDkuMzEsOS4zMSwwLDAsMSw3LjkyLDIuNzhhOS4zNiw5LjM2LDAsMCwxLDcuMTUsMCw5LjM2LDkuMzYsMCwwLDEsMi45MywyLDkuMTQsOS4xNCwwLDAsMSwyLjcsNi41MUE5LjE0LDkuMTQsMCwwLDEsMTgsMTcuNzhhOS4zNiw5LjM2LDAsMCwxLTIuOTMsMkE5LjA2LDkuMDYsMCwwLDEsMTEuNSwyMC40N1ptMC0uNzFhOC4zMSw4LjMxLDAsMCwwLDMuMy0uNjYsOC40Nyw4LjQ3LDAsMCwwLDQuNTMtNC41Myw4LjU4LDguNTgsMCwwLDAsMC02LjZBOC40Nyw4LjQ3LDAsMCwwLDE0LjgsMy40NGE4LjU4LDguNTgsMCwwLDAtNi42LDBBOC40Nyw4LjQ3LDAsMCwwLDMuNjcsOGE4LjU4LDguNTgsMCwwLDAsMCw2LjZBOC40Nyw4LjQ3LDAsMCwwLDguMiwxOS4xLDguMzEsOC4zMSwwLDAsMCwxMS41LDE5Ljc2Wk04LjM5LDExLjQ1YTEsMSwwLDAsMS0uNzgtLjQsMS40OSwxLjQ5LDAsMCwxLDAtMS44NywxLDEsMCwwLDEsLjc4LS4zOSwxLDEsMCwwLDEsLjc3LjM5LDEuNDksMS40OSwwLDAsMSwwLDEuODdBLjk0Ljk0LDAsMCwxLDguMzksMTEuNDVaTTcuNCwxNXYtLjcxaDguMlYxNVptNy4yMS0zLjU0YS45NC45NCwwLDAsMS0uNzctLjQsMS40OSwxLjQ5LDAsMCwxLDAtMS44NywxLDEsMCwwLDEsLjc3LS4zOSwxLDEsMCwwLDEsLjc4LjM5LDEuNDksMS40OSwwLDAsMSwwLDEuODdBMSwxLDAsMCwxLDE0LjYxLDExLjQ1WiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=',
    risk3_thinking: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIuMDAwLDEyLjAwMClzY2FsZSgwLjcyNyl0cmFuc2xhdGUoLTcuOTU1LC03LjE1NSkiPjxwYXRoIGQ9Ik02LjE0LDIwLjkxQTMuNDMsMy40MywwLDAsMSwzLjU4LDIwYTMuMzgsMy4zOCwwLDAsMS0uODctMi40NSwzLjM2LDMuMzYsMCwwLDEsLjA4LS43OSwzLjU2LDMuNTYsMCwwLDAsLjA4LS42OCwyLDIsMCwwLDAtLjEzLS43MWMtLjA4LS4yMi0uMTctLjQyLS4yNi0uNjJhNC43LDQuNywwLDAsMS0uMjUtLjU3LDEuOTEsMS45MSwwLDAsMS0uMS0uNTgsMS4wNywxLjA3LDAsMCwxLC4zLS43OCwxLjEzLDEuMTMsMCwwLDEsLjgzLS4zLDEuNywxLjcsMCwwLDEsMSwuMzIsMi4wOSwyLjA5LDAsMCwxLC43Ljg1bC4wNy4xNWEzLjU1LDMuNTUsMCwwLDAsLjI5LjUzLjM0LjM0LDAsMCwwLC4zLjE0QS44My44MywwLDAsMCw2LDE0LjQ1YTMuNjEsMy42MSwwLDAsMCwuNS0uMjQsOS41NCw5LjU0LDAsMCwxLDEtLjQ2LDgsOCwwLDAsMSwxLjMzLS40MSw3Ljg0LDcuODQsMCwwLDEsMS42Ni0uMTcsMi4yMSwyLjIxLDAsMCwxLDEuMTUuMjUuNzkuNzksMCwwLDEsLjQxLjczLjkuOSwwLDAsMS0uMTUuNTEsMS4zNSwxLjM1LDAsMCwxLS41Ny40MSw4LjkyLDguOTIsMCwwLDEtMS4yMS40NGwtLjIxLjA2QTYuNjcsNi42NywwLDAsMCw4Ljc0LDE2YTUuNzgsNS43OCwwLDAsMC0xLjE5LjgzbC0uMzctLjQ0YTYuNDMsNi40MywwLDAsMSwxLjM0LTFBNS4zLDUuMywwLDAsMSw5LjY4LDE1bC4xNy0uMDVBOC41OCw4LjU4LDAsMCwwLDExLDE0LjU3Yy4yMy0uMTEuMzUtLjIzLjM1LS4zNmEuMzUuMzUsMCwwLDAtLjIzLS4zMiwyLjEsMi4xLDAsMCwwLS43MS0uMSw2LjM4LDYuMzgsMCwwLDAtMi4wNy4zMSw5LjcsOS43LDAsMCwwLTEuNTguNjUsNS45LDUuOSwwLDAsMS0uNy4zMSwxLjQ4LDEuNDgsMCwwLDEtLjUxLjFBLjc5Ljc5LDAsMCwxLDUsMTVhMywzLDAsMCwxLS41MS0uODNMNC40MSwxNEExLjU0LDEuNTQsMCwwLDAsNCwxMy4zOGExLDEsMCwwLDAtLjYyLS4yMy41OS41OSwwLDAsMC0uNDEuMTUuNTEuNTEsMCwwLDAtLjE3LjQxLDEuMjksMS4yOSwwLDAsMCwuMDguNDFjLjA2LjE1LjEzLjMxLjIuNDZzLjIxLjQ1LjMxLjcxYTIuMTYsMi4xNiwwLDAsMSwuMTUuODEsMy4zNiwzLjM2LDAsMCwxLS4wOC43NCwyLjkzLDIuOTMsMCwwLDAtLjA4Ljc1LDIuNzEsMi43MSwwLDAsMCwuNzIsMiwyLjgxLDIuODEsMCwwLDAsMi4wOS43Myw1LjUzLDUuNTMsMCwwLDAsMS4yNi0uMTQsNC4zMyw0LjMzLDAsMCwwLDEuMDktLjM3Yy4yOS0uMTUuNDQtLjMyLjQ0LS41YS45LjksMCwwLDAsMC0uMTguNTMuNTMsMCwwLDAtLjA5LS4xOWwuNC0uNDdhMS4xNiwxLjE2LDAsMCwxLC4zMi44NC45LjksMCwwLDEtLjI5LjY3LDIuNDcsMi40NywwLDAsMS0uNzguNTIsNS42OCw1LjY4LDAsMCwxLTEuMS4zM0E3LjEyLDcuMTIsMCwwLDEsNi4xNCwyMC45MVptNS41My0uNDRBOSw5LDAsMCwxLDguNzksMjBsLjQtLjYxYTguNTUsOC41NSwwLDAsMCwyLjQ4LjM2QTguMzEsOC4zMSwwLDAsMCwxNSwxOS4xYTguNTYsOC41NiwwLDAsMCw0LjUzLTQuNTMsOC41OCw4LjU4LDAsMCwwLDAtNi42QTguNTYsOC41NiwwLDAsMCwxNSwzLjQ0YTguMzEsOC4zMSwwLDAsMC0zLjMtLjY2LDguMjQsOC4yNCwwLDAsMC0zLjMuNjYsOC41OCw4LjU4LDAsMCwwLTUsOS41OGwtLjY4LjE4Yy0uMDYtLjMxLS4xMS0uNjMtLjE1LS45NXMwLS42NSwwLTFBOS4wOCw5LjA4LDAsMCwxLDUuMTYsNC43NmE5LjM2LDkuMzYsMCwwLDEsMi45My0yLDkuMzYsOS4zNiwwLDAsMSw3LjE1LDAsOS4zMSw5LjMxLDAsMCwxLDQuOTEsNC45MSw4Ljk0LDguOTQsMCwwLDEsLjcyLDMuNTgsOC45NCw4Ljk0LDAsMCwxLS43MiwzLjU4LDkuMzEsOS4zMSwwLDAsMS00LjkxLDQuOTFBOS4wNiw5LjA2LDAsMCwxLDExLjY3LDIwLjQ3Wk04Ljg1LDcuNTVhMSwxLDAsMCwxLS43OC0uMzgsMS40MiwxLjQyLDAsMCwxLS4zMy0uOTQsMS40LDEuNCwwLDAsMSwuMzMtLjk0LDEsMSwwLDAsMSwxLjU3LDAsMS40LDEuNCwwLDAsMSwuMzMuOTQsMS40NCwxLjQ0LDAsMCwxLS4zMi45M0ExLDEsMCwwLDEsOC44NSw3LjU1Wk0xMSw0LjMxYTQuNTEsNC41MSwwLDAsMC0xLjQ4LTFBNC43LDQuNywwLDAsMCw3Ljc5LDNWMi4yNmE1LjM4LDUuMzgsMCwwLDEsMiwuMzYsNS4yMiw1LjIyLDAsMCwxLDEuNywxLjE5Wk03LjkxLDE4LjEzbC0uMDktLjUzYTEuNywxLjcsMCwwLDAsLjc2LS4yOC42LjYsMCwwLDAsLjI2LS40NS41NC41NCwwLDAsMC0uMTctLjQuOTQuOTQsMCwwLDAtLjQ3LS4yMmwuMTMtLjUzYTEuMjEsMS4yMSwwLDAsMSwuNzcuMzgsMS4wNiwxLjA2LDAsMCwxLC4zMS43NywxLDEsMCwwLDEtLjM5LjgyQTIuMTgsMi4xOCwwLDAsMSw3LjkxLDE4LjEzWm01LjkyLTUuNjVhNC40OSw0LjQ5LDAsMCwwLTMuMjEtMS40MSw1LjY5LDUuNjksMCwwLDAtMi40My41OUw3Ljg5LDExYTYuNTcsNi41NywwLDAsMSwyLjc0LS42NkE1LjE4LDUuMTgsMCwwLDEsMTQuMzIsMTJaTTguMSwxOS4yOCw4LDE4Ljc1Yy42My0uMTIsMS0uMzYsMS0uN2EuNjMuNjMsMCwwLDAtLjE3LS40NWwuMy0uNWExLDEsMCwwLDEsLjMyLjQxLDEuMjUsMS4yNSwwLDAsMSwuMTIuNTQsMSwxLDAsMCwxLS4zNi44QTIuMTYsMi4xNiwwLDAsMSw4LjEsMTkuMjhaTTE2LjM2LDUuODlBNC42NCw0LjY0LDAsMCwwLDE0LDUuMjVhNS41NCw1LjU0LDAsMCwwLS41OSwwLDQuNTEsNC41MSwwLDAsMC0uNTMuMDlsLS4xNi0uNjljLjIxLDAsLjQyLS4wOC42NC0uMTFzLjQyLDAsLjY0LDBhNS4zMiw1LjMyLDAsMCwxLDIuNjkuNzRaTTE0LjQzLDkuMDZhMSwxLDAsMCwxLS43OS0uMzksMS40LDEuNCwwLDAsMS0uMzMtLjk0LDEuNDIsMS40MiwwLDAsMSwuMzMtLjk0LDEsMSwwLDAsMSwuNzktLjM5LDEsMSwwLDAsMSwuNzkuMzksMS40NywxLjQ3LDAsMCwxLC4zMi45NCwxLjQzLDEuNDMsMCwwLDEtLjMyLjk0QTEsMSwwLDAsMSwxNC40Myw5LjA2WiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=',
    risk4_warning: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIuMDAwLDEyLjAwMClzY2FsZSgwLjU2NCl0cmFuc2xhdGUoLTYuMTcwLC0yLjczNSkiPjxwYXRoIGQ9Ik0zLjg4LDIwLjQ3QTEuNDQsMS40NCwwLDAsMSwyLjM5LDE5YTIuMDUsMi4wNSwwLDAsMSwuMjItLjlMMTAsMy4wOWExLjU3LDEuNTcsMCwwLDEsMi45NCwwbDcuNDIsMTVhMi4wNSwyLjA1LDAsMCwxLC4yMi45LDEuNDcsMS40NywwLDAsMS0uNDIsMS4wNywxLjQ1LDEuNDUsMCwwLDEtMS4wNy40MlptMC0uNzFIMTkuMTJhLjc3Ljc3LDAsMCwwLC41Ny0uMjFBLjczLjczLDAsMCwwLDE5LjksMTlhMS4yNiwxLjI2LDAsMCwwLS4xNS0uNTlsLTcuNDItMTVhLjkxLjkxLDAsMCwwLS44My0uNjIuOTMuOTMsMCwwLDAtLjgzLjYzbC03LjQyLDE1YTEuMzMsMS4zMywwLDAsMC0uMTUuNi43Ni43NiwwLDAsMCwuMjEuNTZBLjguOCwwLDAsMCwzLjg4LDE5Ljc2Wm03LjYyLTQuM2EuNDMuNDMsMCwwLDEtLjQ0LS4zOWwtLjU1LTYuNzZhMS4yMSwxLjIxLDAsMCwxLC4yNC0uOSwxLDEsMCwwLDEsMS41MSwwLDEuMjcsMS4yNywwLDAsMSwuMjMuOWwtLjU1LDYuNzZhLjM2LjM2LDAsMCwxLS4xMy4yOEEuNDQuNDQsMCwwLDEsMTEuNSwxNS40NlptMCwyLjQyYS43OS43OSwwLDEsMSwuNTQtLjIzQS43NC43NCwwLDAsMSwxMS41LDE3Ljg4WiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=',
    risk5_poop: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIuMDAwLDEyLjAwMClzY2FsZSgwLjg3NSl0cmFuc2xhdGUoLTguOTI1LC05LjA0MCkiPjxwYXRoIGQ9Ik0xMS41LDIwLjQ3QTE0LjExLDE0LjExLDAsMCwxLDcuODksMjAsOS43Nyw5Ljc3LDAsMCwxLDUsMTguNzhhNiw2LDAsMCwxLTEuODctMS44OSw0LjQ1LDQuNDUsMCwwLDEtLjY3LTIuMzksMy4yMywzLjIzLDAsMCwxLC43Mi0yLjE1LDQuNDMsNC40MywwLDAsMSwyLTEuMjksNS41MSw1LjUxLDAsMCwxLS4wNy0uNzlBMy40OSwzLjQ5LDAsMCwxLDUuOCw4LjE0YTMuMzMsMy4zMywwLDAsMSwxLjgzLTEuMlY2Ljc3QTUuNjMsNS42MywwLDAsMSw4LDQuNjdhMy40OCwzLjQ4LDAsMCwxLDEuMi0xLjQ2QTkuMTgsOS4xOCwwLDAsMSwxMS41LDIuMDdhNy4xLDcuMSwwLDAsMCwuMTQsMS41NiwxLjQ5LDEuNDksMCwwLDAsLjQ5Ljg3LDIuNDEsMi40MSwwLDAsMCwxLC40MkwxMy42LDVhNC43Myw0LjczLDAsMCwxLDIuMjUuOTMsMi4xNiwyLjE2LDAsMCwxLC42OSwxLjcsMi4zOSwyLjM5LDAsMCwxLDAsLjQ0LDMuMzksMy4zOSwwLDAsMS0uMS40OCwyLjg4LDIuODgsMCwwLDEsMS4zNCwxLDMsMywwLDAsMSwuNTMsMS42NSw0LjE5LDQuMTksMCwwLDEsMS42NiwxLjM3LDMuMzMsMy4zMywwLDAsMSwuNTksMS45Miw0LjUzLDQuNTMsMCwwLDEtLjY2LDIuMzlBNi4wOCw2LjA4LDAsMCwxLDE4LDE4Ljc4LDkuNzcsOS43NywwLDAsMSwxNS4xLDIwLDE0LjA5LDE0LjA5LDAsMCwxLDExLjUsMjAuNDdaTTksMTQuMDlhMS44NiwxLjg2LDAsMCwwLDEtLjI3LDIuMDcsMi4wNywwLDAsMCwuNzItLjcyLDEuODksMS44OSwwLDAsMCwuMjctMSwxLjg2LDEuODYsMCwwLDAtLjI3LTFBMi4wNywyLjA3LDAsMCwwLDEwLDEwLjRhMS44NiwxLjg2LDAsMCwwLTEtLjI3LDEuODksMS44OSwwLDAsMC0xLC4yNywyLjA3LDIuMDcsMCwwLDAtLjcyLjcyLDEuODYsMS44NiwwLDAsMC0uMjcsMSwxLjg5LDEuODksMCwwLDAsLjI3LDEsMi4wNywyLjA3LDAsMCwwLC43Mi43MkExLjg5LDEuODksMCwwLDAsOSwxNC4wOVpNOSwxM2EuOTIuOTIsMCwxLDEsLjkyLS45MkEuOTQuOTQsMCwwLDEsOSwxM1pNMTEuNSwxOC4yQTMuNzEsMy43MSwwLDAsMCwxMi43MywxOGE0LjQzLDQuNDMsMCwwLDAsMS4xLS41OCwzLjA5LDMuMDksMCwwLDAsLjc3LS44MSwxLjY4LDEuNjgsMCwwLDAsLjI5LS45LjYzLjYzLDAsMCwwLS4xMS0uMzguMzcuMzcsMCwwLDAtLjM3LS4xYy0uNjEuMDctMS4xMy4xMy0xLjU2LjE2cy0uODguMDYtMS4zNS4wNi0uOTIsMC0xLjM1LS4wNi0xLS4wOS0xLjU2LS4xNmEuMzcuMzcsMCwwLDAtLjM3LjEuNjMuNjMsMCwwLDAtLjExLjM4LDEuNjgsMS42OCwwLDAsMCwuMjkuOSwzLjA5LDMuMDksMCwwLDAsLjc3LjgxLDQuNDMsNC40MywwLDAsMCwxLjEuNThBMy43MSwzLjcxLDAsMCwwLDExLjUsMTguMlpNMTQsMTQuMDlhMS45LDEuOSwwLDAsMCwxLS4yNywyLjEzLDIuMTMsMCwwLDAsLjcxLS43MiwxLjg5LDEuODksMCwwLDAsLjI3LTEsMS44NiwxLjg2LDAsMCwwLS4yNy0xQTIuMTMsMi4xMywwLDAsMCwxNSwxMC40YTIsMiwwLDAsMC0yLDAsMi4wNywyLjA3LDAsMCwwLS43Mi43MiwxLjg2LDEuODYsMCwwLDAtLjI3LDEsMS44OSwxLjg5LDAsMCwwLC4yNywxLDIuMDcsMi4wNywwLDAsMCwuNzIuNzJBMS44OSwxLjg5LDAsMCwwLDE0LDE0LjA5Wk0xNCwxM2EuOTQuOTQsMCwwLDEtLjkyLS45MkEuOTIuOTIsMCwxLDEsMTQsMTNaIiBmaWxsPSIjZmZmIi8+PC9nPjwvc3ZnPg=='
  };
  // Select icon by risk tier (SVGs pre-centered, no runtime transform needed)
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
      padding: 2,
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
              src: riskIcon,
              width: 44,
              height: 44,
              resizeMode: 'cover'
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
