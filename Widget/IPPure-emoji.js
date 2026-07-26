// =============================================
// Egern IPPure Widget V2 - UniFi Protect Style
// Edition: Studio Solid-Matte with Air-Gradient & Micro Border
// Risk tiers: IPPure 6-tier (custom labels)
// =============================================

export default async function(ctx) {

  const strategyGroup =
    ctx.env.STRATEGY_GROUP || 'DIRECT';

  const widgetFamily =
    ctx.widgetFamily || 'systemLarge';

  // ==================== Premium Color Palette ====================

  const C = {
    // 顶级的微调空气感黑灰：顶部稍深，底部稍浅，营造极为自然的沉浸感
    bgTop: '#0C0D0F',
    bgBottom: '#141619',

    // 物理微轮廓边框颜色（类似 UniFi 设备的精致外壳边缘）
    borderColor: 'rgba(255, 255, 255, 0.06)',

    text: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',

    blue: '#60A5FA',

    // IPPure 6 档风险色（自定义标签）
    risk0: '#166534',  // 0-15   优质
    risk1: '#22C55E',  // 15-25  良好
    risk2: '#84CC16',  // 25-40  普通
    risk3: '#EAB308',  // 40-50  低危
    risk4: '#F97316',  // 50-70  中危
    risk5: '#DC2626',  // 70-100 高危

    // 保留旧色用于向后兼容（网络类型等）
    green: '#34D399',
    yellow: '#FACC15',
    red: '#F87171',
  };

  // 垂直空气感渐变配置
  const premiumGradient = {
    type: 'linear',
    colors: [C.bgTop, C.bgBottom],
    startPoint: { x: 0.5, y: 0 },
    endPoint: { x: 0.5, y: 1 }
  };

  // ==================== Fetch ====================

  let data = null;

  try {

    const resp = await ctx.http.get(
      'https://my.ippure.com/v1/info',
      {
        policy: strategyGroup,
        timeout: 8000
      }
    );

    data = await resp.json();

  } catch(e) {}

  // ==================== Fallback ====================

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

  // ==================== Risk & Colors (6-tier) ====================

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

  // Circular widget icon — select by risk tier
  const riskIconMap = {
    risk0_house:    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOC42OCAxOC40Ij4KICA8cGF0aCBkPSJNMi45MiwxMS41NmExLjEyLDEuMTIsMCwwLDEtLjUzLS4xMkEuNDUuNDUsMCwwLDEsMi4xNiwxMWEuNzUuNzUsMCwwLDEsLjI3LS41NUwxMC4yLDIuNzhhMy4xOCwzLjE4LDAsMCwxLC42Ny0uNTUsMS4zMiwxLjMyLDAsMCwxLDEuMjYsMCwzLjE4LDMuMTgsMCwwLDEsLjY3LjU1bDcuNzcsNy42OGEuNzUuNzUsMCwwLDEsLjI3LjU1LjQ1LjQ1LDAsMCwxLS4yMi40MywxLjEzLDEuMTMsMCwwLDEtLjU0LjEySDE4LjMyTDExLjUsNC44NCw0LjY4LDExLjU2Wm0uMzEtLjY5SDQuMzlsNy4xMS03LDcuMTEsN2gxLjE2YS4wNy4wNywwLDAsMCwuMDgtLjA2LjEzLjEzLDAsMCwwLS4wNS0uMTJMMTIuMywzLjI4YTMuMjQsMy4yNCwwLDAsMC0uNDctLjQxLjU1LjU1LDAsMCwwLS42NiwwLDMuMjQsMy4yNCwwLDAsMC0uNDcuNDFMMy4yLDEwLjY5YS4xMy4xMywwLDAsMC0uMDUuMTJBLjA3LjA3LDAsMCwwLDMuMjMsMTAuODdabTMuMSw4LjIzSDUuODRsLS40NSwwYTMuNjcsMy42NywwLDAsMS0xLjI1LS4xNC41My41MywwLDAsMS0uMy0uNTQsMiwyLDAsMCwxLC40MS0xLjMsMS4zMSwxLjMxLDAsMCwxLDEtLjQ5LDEuMzMsMS4zMywwLDAsMSwuNTYuMTEsMS4zLDEuMywwLDAsMCwuNDkuMSwxLjA3LDEuMDcsMCwwLDAsLjQ5LS4xLDEuNDQsMS40NCwwLDAsMSwuNTYtLjEsMi4xMywyLjEzLDAsMCwxLC44LjE3LDIuNTUsMi41NSwwLDAsMSwuNzEuNDFjLjE5LjE2LjI5LjMuMjkuNDRWMTkuMVptMi4xNCwxLjM3di0xLjRoLjE0di0uNzlINC4wNVYxMS4xNmwuNzEtLjU0djdIMTguMjR2LTdsLjcxLjU0djcuMTJIMTQuMzl2Ljc5aC4xNHYxLjRaTTUuMDUsOC40MVY0LjhINC43OVYzSDdWNC44SDYuNzNWNi42NlptLjc0LDUuMTN2LTFhLjM0LjM0LDAsMCwxLC4xMS0uMjQuMy4zLDAsMCwxLC4yNC0uMWgxdjEuMzJabS4zNSwyYS4zLjMsMCwwLDEtLjI0LS4xLjM0LjM0LDAsMCwxLS4xMS0uMjV2LTFINy4xMnYxLjMzWm0xLjU4LTJWMTIuMjJoMWEuMzQuMzQsMCwwLDEsLjM0LjM0djFabTAsMlYxNC4xNkg5LjA1djFhLjMzLjMzLDAsMCwxLS4xLjI1LjMzLjMzLDAsMCwxLS4yNC4xWm0xLjQ2LDQuMjloNC42NHYtLjVIOS4xOFptLjE0LTFoNC4zNnYtLjQ4SDkuMzJabS41My0xVjEzYTEuMzgsMS4zOCwwLDAsMSwuNS0xLjA4LDEuNzIsMS43MiwwLDAsMSwxLjE1LS40NCwxLjY5LDEuNjksMCwwLDEsMS4xNS40NCwxLjM4LDEuMzgsMCwwLDEsLjUsMS4wOHY0LjhaTTEyLjQ0LDE1YS4yOS4yOSwwLDAsMCwuMjItLjA5LjI5LjI5LDAsMCwwLC4xLS4yMy4yNy4yNywwLDAsMC0uMS0uMjIuMy4zLDAsMCwwLS4yMi0uMS4zMy4zMywwLDAsMC0uMjMuMS4yOS4yOSwwLDAsMC0uMDkuMjIuMzEuMzEsMCwwLDAsLjMyLjMyWm0xLjM4LDQuMDhWMTcuNjNjMC0uMTQuMS0uMjguMjktLjQ0YTIuNTUsMi41NSwwLDAsMSwuNzEtLjQxLDIuMjEsMi4yMSwwLDAsMSwuOC0uMTcsMS40NCwxLjQ0LDAsMCwxLC41Ni4xLDEuMDcsMS4wNywwLDAsMCwuNDkuMSwxLjM1LDEuMzUsMCwwLDAsLjUtLjEsMS4yNSwxLjI1LDAsMCwxLC41NS0uMTEsMS4yOSwxLjI5LDAsMCwxLDEsLjQ5LDEuOTMsMS45MywwLDAsMSwuNDEsMS4zLjUzLjUzLDAsMCwxLS4zLjU0LDMuNjMsMy42MywwLDAsMS0xLjI1LjE0bC0uNDUsMEgxMy44MlpNMTQsMTMuNTR2LTFhLjM0LjM0LDAsMCwxLC4zNC0uMzRoMXYxLjMyWm0uMzQsMmEuMzMuMzMsMCwwLDEtLjI0LS4xLjMzLjMzLDAsMCwxLS4xLS4yNXYtMWgxLjMzdjEuMzNabTEuNTktMlYxMi4yMmgxYS4zLjMsMCwwLDEsLjI0LjEuMzQuMzQsMCwwLDEsLjExLjI0djFabTAsMlYxNC4xNmgxLjMzdjFhLjM0LjM0LDAsMCwxLS4xMS4yNS4zLjMsMCwwLDEtLjI0LjFaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMi4xNiAtMi4wNykiIGZpbGw9IiNmZmYiLz4KPC9zdmc+',
    risk1_sparkles: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMS4yMyAxOC40Ij4KICA8cGF0aCBkPSJNNC40MywyMC40N2wtLjI5LTEuNDJhOS4zNyw5LjM3LDAsMCwwLS4zNy0xLjQsMS43MywxLjczLDAsMCwwLS41Mi0uNzgsMi42NiwyLjY2LDAsMCwwLTEtLjQ0bC0xLjQtLjM3di0uODNsMS40LS4zOGEyLjg0LDIuODQsMCwwLDAsMS0uNDQsMS43MywxLjczLDAsMCwwLC41Mi0uNzgsOC44Nyw4Ljg3LDAsMCwwLC4zNy0xLjM5bC4yOS0xLjQyaC45bC4yOCwxLjQyQTguODcsOC44NywwLDAsMCw2LDEzLjYzYTEuNjcsMS42NywwLDAsMCwuNTMuNzgsMi43NSwyLjc1LDAsMCwwLDEsLjQ0bDEuMzguMzh2LjgzbC0xLjM4LjM3YTIuNTgsMi41OCwwLDAsMC0xLC40NCwxLjY3LDEuNjcsMCwwLDAtLjUzLjc4LDkuMzcsOS4zNywwLDAsMC0uMzcsMS40bC0uMjgsMS40MlptLjQyLTFhMTEuODUsMTEuODUsMCwwLDEsLjM2LTEuNzIsMy4wNywzLjA3LDAsMCwxLC41Mi0xLjA5QTIuMTMsMi4xMywwLDAsMSw2LjYsMTYsNi43NSw2Ljc1LDAsMCwxLDgsMTUuNjF2LjA2YTYuNzUsNi43NSwwLDAsMS0xLjQxLS40LDIuMiwyLjIsMCwwLDEtLjg3LS42NCwzLjEzLDMuMTMsMCwwLDEtLjUyLTEuMSwxMS40LDExLjQsMCwwLDEtLjM2LTEuNzFINC45YTE0Ljg2LDE0Ljg2LDAsMCwxLS4zNSwxLjcxQTMuMTMsMy4xMywwLDAsMSw0LDE0LjYzYTIuMDYsMi4wNiwwLDAsMS0uODcuNjQsNi42NCw2LjY0LDAsMCwxLTEuNC40di0uMDZhNi42NCw2LjY0LDAsMCwxLDEuNC40LDIsMiwwLDAsMSwuODcuNjUsMy4wOCwzLjA4LDAsMCwxLC41MywxLjA5LDE1LjU2LDE1LjU2LDAsMCwxLC4zNSwxLjcyWm0xLTkuODZMNS42NSw4LjQ4YTQuNjYsNC42NiwwLDAsMC0uMzMtMS4xNCwxLjI1LDEuMjUsMCwwLDAtLjU3LS41OUEzLjkyLDMuOTIsMCwwLDAsMy42OCw2LjRMMyw2LjI1VjUuNDNsLjY5LS4xNmEzLjg5LDMuODksMCwwLDAsMS4wNy0uMzYsMS4yNSwxLjI1LDAsMCwwLC41Ny0uNTksNC40Myw0LjQzLDAsMCwwLC4zMy0xLjEzbC4yMi0xLjEyaC44NGwuMjMsMS4xMmE1LjQzLDUuNDMsMCwwLDAsLjMzLDEuMTMsMS4yOCwxLjI4LDAsMCwwLC41Ni41OSw0LjgxLDQuODEsMCwwLDAsMS4wOC4zNmwuNjguMTZ2LjgybC0uNjguMTVhNCw0LDAsMCwwLTEuMDguMzUsMS4zMSwxLjMxLDAsMCwwLS41Ni42LDUuNDMsNS40MywwLDAsMC0uMzMsMS4xM0w2LjcxLDkuNjFabS4zOC0uODlhMTAuNzEsMTAuNzEsMCwwLDEsLjMxLTEuMzVBMi4xOCwyLjE4LDAsMCwxLDcsNi41OGExLjc4LDEuNzgsMCwwLDEsLjctLjQ2LDcuNzMsNy43MywwLDAsMSwxLjEtLjMxdi4wNmE5LjEyLDkuMTIsMCwwLDEtMS4xLS4zMkExLjc3LDEuNzcsMCwwLDEsNyw1LjFhMi4zOCwyLjM4LDAsMCwxLS40NC0uODFBMTAuMSwxMC4xLDAsMCwxLDYuMjUsM2guMDhBMTAuMSwxMC4xLDAsMCwxLDYsNC4yOWEyLjU2LDIuNTYsMCwwLDEtLjQzLjgxLDEuODQsMS44NCwwLDAsMS0uNy40NSwxMC4zNiwxMC4zNiwwLDAsMS0xLjEuMzJWNS44MWE4LjU5LDguNTksMCwwLDEsMS4xLjMxLDEuODYsMS44NiwwLDAsMSwuNy40NkEyLjM0LDIuMzQsMCwwLDEsNiw3LjM3YTEwLjcxLDEwLjcxLDAsMCwxLC4zMSwxLjM1Wm03Ljk0LDExLjc1LS4zNS0yLjQxcS0uMjMtMS40NC0uNDUtMi40YTYuMDksNi4wOSwwLDAsMC0uNTktMS41OCwyLjk0LDIuOTQsMCwwLDAtLjg5LTEsNSw1LDAsMCwwLTEuMzUtLjYzcS0uODEtLjI0LTItLjQ4bC0xLjQ2LS4zdi0uODNsMS40Ni0uM3ExLjE3LS4yNCwyLS40OGE1LDUsMCwwLDAsMS4zNS0uNjMsMywzLDAsMCwwLC44OS0xLDYsNiwwLDAsMCwuNTktMS41OHEuMjItMSwuNDUtMi40bC4zNS0yLjQxaC44N2wuMzQsMi40MWMuMTQsMSwuMjgsMS43Ni40NCwyLjRhNiw2LDAsMCwwLC41OSwxLjU4LDIuODYsMi44NiwwLDAsMCwuOSwxLDQuNyw0LjcsMCwwLDAsMS4zNS42MnEuODEuMjQsMiwuNDhsMS40Ni4zdi44M2wtMS40Ni4zcS0xLjE3LjI0LTIsLjQ4YTUsNSwwLDAsMC0xLjM1LjYzLDIuODYsMi44NiwwLDAsMC0uOSwxLDYuMDksNi4wOSwwLDAsMC0uNTksMS41OGMtLjE2LjY0LS4zLDEuNDQtLjQ0LDIuNGwtLjM0LDIuNDFabS40LTEuN2MuMTMtMSwuMjctMS44Ni40MS0yLjU4YTExLjMyLDExLjMyLDAsMCwxLC40OS0xLjgzLDQuMTksNC4xOSwwLDAsMSwuNy0xLjI0LDMuNTUsMy41NSwwLDAsMSwxLS44MSw3Ljc0LDcuNzQsMCwwLDEsMS40OC0uNThjLjU3LS4xNywxLjI1LS4zMywyLS41di4wOGMtLjgtLjE4LTEuNDgtLjM0LTItLjVhNy43NCw3Ljc0LDAsMCwxLTEuNDgtLjU4LDMuNTUsMy41NSwwLDAsMS0xLS44MSw0LjE5LDQuMTksMCwwLDEtLjctMS4yNEExMS4zMiwxMS4zMiwwLDAsMSwxNSw2LjM1Yy0uMTQtLjcyLS4yOC0xLjU4LS40MS0yLjU4aC4wNmMtLjE0LDEtLjI3LDEuODYtLjQxLDIuNThhMTEuMzIsMTEuMzIsMCwwLDEtLjQ5LDEuODMsNC4xOSw0LjE5LDAsMCwxLS43LDEuMjQsMy41NSwzLjU1LDAsMCwxLTEsLjgxLDcuOSw3LjksMCwwLDEtMS40Ny41OGMtLjU4LjE2LTEuMjYuMzItMi4wNS41di0uMDhjLjc5LjE3LDEuNDcuMzMsMi4wNS41QTcuMjgsNy4yOCwwLDAsMSwxMiwxMi4zYTMuNTUsMy41NSwwLDAsMSwxLC44MSw0LjE5LDQuMTksMCwwLDEsLjcsMS4yNCwxMS4zMiwxMS4zMiwwLDAsMSwuNDksMS44M2MuMTQuNzIuMjcsMS41OC40MSwyLjU5WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTAuODggLTIuMDcpIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==',
    risk2_neutral:  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOC40IDE4LjQiPgogIDxwYXRoIGQ9Ik0xMS41LDIwLjQ3YTkuMTEsOS4xMSwwLDAsMS0zLjU4LS43MUE5LjMxLDkuMzEsMCwwLDEsMywxNC44NSw5LjM4LDkuMzgsMCwwLDEsMyw3LjY5LDkuMzEsOS4zMSwwLDAsMSw3LjkyLDIuNzhhOS4zNiw5LjM2LDAsMCwxLDcuMTUsMCw5LjM2LDkuMzYsMCwwLDEsMi45MywyLDkuMTQsOS4xNCwwLDAsMSwyLjcsNi41MUE5LjE0LDkuMTQsMCwwLDEsMTgsMTcuNzhhOS4zNiw5LjM2LDAsMCwxLTIuOTMsMkE5LjA2LDkuMDYsMCwwLDEsMTEuNSwyMC40N1ptMC0uNzFhOC4zMSw4LjMxLDAsMCwwLDMuMy0uNjYsOC40Nyw4LjQ3LDAsMCwwLDQuNTMtNC41Myw4LjU4LDguNTgsMCwwLDAsMC02LjZBOC40Nyw4LjQ3LDAsMCwwLDE0LjgsMy40NGE4LjU4LDguNTgsMCwwLDAtNi42LDBBOC40Nyw4LjQ3LDAsMCwwLDMuNjcsOGE4LjU4LDguNTgsMCwwLDAsMCw2LjZBOC40Nyw4LjQ3LDAsMCwwLDguMiwxOS4xLDguMzEsOC4zMSwwLDAsMCwxMS41LDE5Ljc2Wk04LjM5LDExLjQ1YTEsMSwwLDAsMS0uNzgtLjQsMS40OSwxLjQ5LDAsMCwxLDAtMS44NywxLDEsMCwwLDEsLjc4LS4zOSwxLDEsMCwwLDEsLjc3LjM5LDEuNDksMS40OSwwLDAsMSwwLDEuODdBLjk0Ljk0LDAsMCwxLDguMzksMTEuNDVaTTcuNCwxNXYtLjcxaDguMlYxNVptNy4yMS0zLjU0YS45NC45NCwwLDAsMS0uNzctLjQsMS40OSwxLjQ5LDAsMCwxLDAtMS44NywxLDEsMCwwLDEsLjc3LS4zOSwxLDEsMCwwLDEsLjc4LjM5LDEuNDksMS40OSwwLDAsMSwwLDEuODdBMSwxLDAsMCwxLDE0LjYxLDExLjQ1WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTIuMyAtMi4wNykiIGZpbGw9IiNmZmYiLz4KPC9zdmc+',
    risk3_thinking: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOC43NCAxOC44NCI+CiAgPHBhdGggZD0iTTYuMTQsMjAuOTFBMy40MywzLjQzLDAsMCwxLDMuNTgsMjBhMy4zOCwzLjM4LDAsMCwxLS44Ny0yLjQ1LDMuMzYsMy4zNiwwLDAsMSwuMDgtLjc5LDMuNTYsMy41NiwwLDAsMCwuMDgtLjY4LDIsMiwwLDAsMC0uMTMtLjcxYy0uMDgtLjIyLS4xNy0uNDItLjI2LS42MmE0LjcsNC43LDAsMCwxLS4yNS0uNTcsMS45MSwxLjkxLDAsMCwxLS4xLS41OCwxLjA3LDEuMDcsMCwwLDEsLjMtLjc4LDEuMTMsMS4xMywwLDAsMSwuODMtLjMsMS43LDEuNywwLDAsMSwxLC4zMiwyLjA5LDIuMDksMCwwLDEsLjcuODVsLjA3LjE1YTMuNTUsMy41NSwwLDAsMCwuMjkuNTMuMzQuMzQsMCwwLDAsLjMuMTRBLjgzLjgzLDAsMCwwLDYsMTQuNDVhMy42MSwzLjYxLDAsMCwwLC41LS4yNCw5LjU0LDkuNTQsMCwwLDEsMS0uNDYsOCw4LDAsMCwxLDEuMzMtLjQxLDcuODQsNy44NCwwLDAsMSwxLjY2LS4xNywyLjIxLDIuMjEsMCwwLDEsMS4xNS4yNS43OS43OSwwLDAsMSwuNDEuNzMuOS45LDAsMCwxLS4xNS41MSwxLjM1LDEuMzUsMCwwLDEtLjU3LjQxLDguOTIsOC45MiwwLDAsMS0xLjIxLjQ0bC0uMjEuMDZBNi42Nyw2LjY3LDAsMCwwLDguNzQsMTZhNS43OCw1Ljc4LDAsMCwwLTEuMTkuODNsLS4zNy0uNDRhNi40Myw2LjQzLDAsMCwxLDEuMzQtMUE1LjMsNS4zLDAsMCwxLDkuNjgsMTVsLjE3LS4wNUE4LjU4LDguNTgsMCwwLDAsMTEsMTQuNTdjLjIzLS4xMS4zNS0uMjMuMzUtLjM2YS4zNS4zNSwwLDAsMC0uMjMtLjMyLDIuMSwyLjEsMCwwLDAtLjcxLS4xLDYuMzgsNi4zOCwwLDAsMC0yLjA3LjMxLDkuNyw5LjcsMCwwLDAtMS41OC42NSw1LjksNS45LDAsMCwxLS43LjMxLDEuNDgsMS40OCwwLDAsMS0uNTEuMUEuNzkuNzksMCwwLDEsNSwxNWEzLDMsMCwwLDEtLjUxLS44M0w0LjQxLDE0QTEuNTQsMS41NCwwLDAsMCw0LDEzLjM4YTEsMSwwLDAsMC0uNjItLjIzLjU5LjU5LDAsMCwwLS40MS4xNS41MS41MSwwLDAsMC0uMTcuNDEsMS4yOSwxLjI5LDAsMCwwLC4wOC40MWMuMDYuMTUuMTMuMzEuMi40NnMuMjEuNDUuMzEuNzFhMi4xNiwyLjE2LDAsMCwxLC4xNS44MSwzLjM2LDMuMzYsMCwwLDEtLjA4Ljc0LDIuOTMsMi45MywwLDAsMC0uMDguNzUsMi43MSwyLjcxLDAsMCwwLC43MiwyLDIuODEsMi44MSwwLDAsMCwyLjA5LjczLDUuNTMsNS41MywwLDAsMCwxLjI2LS4xNCw0LjMzLDQuMzMsMCwwLDAsMS4wOS0uMzdjLjI5LS4xNS40NC0uMzIuNDQtLjVhLjkuOSwwLDAsMCwwLS4xOC41My41MywwLDAsMC0uMDktLjE5bC40LS40N2ExLjE2LDEuMTYsMCwwLDEsLjMyLjg0LjkuOSwwLDAsMS0uMjkuNjcsMi40NywyLjQ3LDAsMCwxLS43OC41Miw1LjY4LDUuNjgsMCwwLDEtMS4xLjMzQTcuMTIsNy4xMiwwLDAsMSw2LjE0LDIwLjkxWm01LjUzLS40NEE5LDksMCwwLDEsOC43OSwyMGwuNC0uNjFhOC41NSw4LjU1LDAsMCwwLDIuNDguMzZBOC4zMSw4LjMxLDAsMCwwLDE1LDE5LjFhOC41Niw4LjU2LDAsMCwwLDQuNTMtNC41Myw4LjU4LDguNTgsMCwwLDAsMC02LjZBOC41Niw4LjU2LDAsMCwwLDE1LDMuNDRhOC4zMSw4LjMxLDAsMCwwLTMuMy0uNjYsOC4yNCw4LjI0LDAsMCwwLTMuMy42Niw4LjU4LDguNTgsMCwwLDAtNSw5LjU4bC0uNjguMThjLS4wNi0uMzEtLjExLS42My0uMTUtLjk1czAtLjY1LDAtMUE5LjA4LDkuMDgsMCwwLDEsNS4xNiw0Ljc2YTkuMzYsOS4zNiwwLDAsMSwyLjkzLTIsOS4zNiw5LjM2LDAsMCwxLDcuMTUsMCw5LjMxLDkuMzEsMCwwLDEsNC45MSw0LjkxLDguOTQsOC45NCwwLDAsMSwuNzIsMy41OCw4Ljk0LDguOTQsMCwwLDEtLjcyLDMuNTgsOS4zMSw5LjMxLDAsMCwxLTQuOTEsNC45MUE5LjA2LDkuMDYsMCwwLDEsMTEuNjcsMjAuNDdaTTguODUsNy41NWExLDEsMCwwLDEtLjc4LS4zOCwxLjQyLDEuNDIsMCwwLDEtLjMzLS45NCwxLjQsMS40LDAsMCwxLC4zMy0uOTQsMSwxLDAsMCwxLDEuNTcsMCwxLjQsMS40LDAsMCwxLC4zMy45NCwxLjQ0LDEuNDQsMCwwLDEtLjMyLjkzQTEsMSwwLDAsMSw4Ljg1LDcuNTVaTTExLDQuMzFhNC41MSw0LjUxLDAsMCwwLTEuNDgtMUE0LjcsNC43LDAsMCwwLDcuNzksM1YyLjI2YTUuMzgsNS4zOCwwLDAsMSwyLC4zNiw1LjIyLDUuMjIsMCwwLDEsMS43LDEuMTlaTTcuOTEsMTguMTNsLS4wOS0uNTNhMS43LDEuNywwLDAsMCwuNzYtLjI4LjYuNiwwLDAsMCwuMjYtLjQ1LjU0LjU0LDAsMCwwLS4xNy0uNC45NC45NCwwLDAsMC0uNDctLjIybC4xMy0uNTNhMS4yMSwxLjIxLDAsMCwxLC43Ny4zOCwxLjA2LDEuMDYsMCwwLDEsLjMxLjc3LDEsMSwwLDAsMS0uMzkuODJBMi4xOCwyLjE4LDAsMCwxLDcuOTEsMTguMTNabTUuOTItNS42NWE0LjQ5LDQuNDksMCwwLDAtMy4yMS0xLjQxLDUuNjksNS42OSwwLDAsMC0yLjQzLjU5TDcuODksMTFhNi41Nyw2LjU3LDAsMCwxLDIuNzQtLjY2QTUuMTgsNS4xOCwwLDAsMSwxNC4zMiwxMlpNOC4xLDE5LjI4LDgsMTguNzVjLjYzLS4xMiwxLS4zNiwxLS43YS42My42MywwLDAsMC0uMTctLjQ1bC4zLS41YTEsMSwwLDAsMSwuMzIuNDEsMS4yNSwxLjI1LDAsMCwxLC4xMi41NCwxLDEsMCwwLDEtLjM2LjhBMi4xNiwyLjE2LDAsMCwxLDguMSwxOS4yOFpNMTYuMzYsNS44OUE0LjY0LDQuNjQsMCwwLDAsMTQsNS4yNWE1LjU0LDUuNTQsMCwwLDAtLjU5LDAsNC41MSw0LjUxLDAsMCwwLS41My4wOWwtLjE2LS42OWMuMjEsMCwuNDItLjA4LjY0LS4xMXMuNDIsMCwuNjQsMGE1LjMyLDUuMzIsMCwwLDEsMi42OS43NFpNMTQuNDMsOS4wNmExLDEsMCwwLDEtLjc5LS4zOSwxLjQsMS40LDAsMCwxLS4zMy0uOTQsMS40MiwxLjQyLDAsMCwxLC4zMy0uOTQsMSwxLDAsMCwxLC43OS0uMzksMSwxLDAsMCwxLC43OS4zOSwxLjQ3LDEuNDcsMCwwLDEsLjMyLjk0LDEuNDMsMS40MywwLDAsMS0uMzIuOTRBMSwxLDAsMCwxLDE0LjQzLDkuMDZaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMi4xMyAtMi4wNykiIGZpbGw9IiNmZmYiLz4KPC9zdmc+',
    risk4_warning:  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOC4yMiAxOC40Ij4KICA8cGF0aCBkPSJNMy44OCwyMC40N0ExLjQ0LDEuNDQsMCwwLDEsMi4zOSwxOWEyLjA1LDIuMDUsMCwwLDEsLjIyLS45TDEwLDMuMDlhMS41NywxLjU3LDAsMCwxLDIuOTQsMGw3LjQyLDE1YTIuMDUsMi4wNSwwLDAsMSwuMjIuOSwxLjQ3LDEuNDcsMCwwLDEtLjQyLDEuMDcsMS40NSwxLjQ1LDAsMCwxLTEuMDcuNDJabTAtLjcxSDE5LjEyYS43Ny43NywwLDAsMCwuNTctLjIxQS43My43MywwLDAsMCwxOS45LDE5YTEuMjYsMS4yNiwwLDAsMC0uMTUtLjU5bC03LjQyLTE1YS45MS45MSwwLDAsMC0uODMtLjYyLjkzLjkzLDAsMCwwLS44My42M2wtNy40MiwxNWExLjMzLDEuMzMsMCwwLDAtLjE1LjYuNzYuNzYsMCwwLDAsLjIxLjU2QS44LjgsMCwwLDAsMy44OCwxOS43NlptNy42Mi00LjNhLjQzLjQzLDAsMCwxLS40NC0uMzlsLS41NS02Ljc2YTEuMjEsMS4yMSwwLDAsMSwuMjQtLjksMSwxLDAsMCwxLDEuNTEsMCwxLjI3LDEuMjcsMCwwLDEsLjIzLjlsLS41NSw2Ljc2YS4zNi4zNiwwLDAsMS0uMTMuMjhBLjQ0LjQ0LDAsMCwxLDExLjUsMTUuNDZabTAsMi40MmEuNzkuNzksMCwxLDEsLjU0LS4yM0EuNzQuNzQsMCwwLDEsMTEuNSwxNy44OFoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0yLjM5IC0yLjA3KSIgZmlsbD0iI2ZmZiIvPgo8L3N2Zz4=',
    risk5_poop:     'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOC4wNSAxOC40Ij4KICA8cGF0aCBkPSJNMTEuNSwyMC40N0ExNC4xMSwxNC4xMSwwLDAsMSw3Ljg5LDIwLDkuNzcsOS43NywwLDAsMSw1LDE4Ljc4YTYsNiwwLDAsMS0xLjg3LTEuODksNC40NSw0LjQ1LDAsMCwxLS42Ny0yLjM5LDMuMjMsMy4yMywwLDAsMSwuNzItMi4xNSw0LjQzLDQuNDMsMCwwLDEsMi0xLjI5LDUuNTEsNS41MSwwLDAsMS0uMDctLjc5QTMuNDksMy40OSwwLDAsMSw1LjgsOC4xNGEzLjMzLDMuMzMsMCwwLDEsMS44My0xLjJWNi43N0E1LjYzLDUuNjMsMCwwLDEsOCw0LjY3YTMuNDgsMy40OCwwLDAsMSwxLjItMS40NkE5LjE4LDkuMTgsMCwwLDEsMTEuNSwyLjA3YTcuMSw3LjEsMCwwLDAsLjE0LDEuNTYsMS40OSwxLjQ5LDAsMCwwLC40OS44NywyLjQxLDIuNDEsMCwwLDAsMSwuNDJMMTMuNiw1YTQuNzMsNC43MywwLDAsMSwyLjI1LjkzLDIuMTYsMi4xNiwwLDAsMSwuNjksMS43LDIuMzksMi4zOSwwLDAsMSwwLC40NCwzLjM5LDMuMzksMCwwLDEtLjEuNDgsMi44OCwyLjg4LDAsMCwxLDEuMzQsMSwzLDMsMCwwLDEsLjUzLDEuNjUsNC4xOSw0LjE5LDAsMCwxLDEuNjYsMS4zNywzLjMzLDMuMzMsMCwwLDEsLjU5LDEuOTIsNC41Myw0LjUzLDAsMCwxLS42NiwyLjM5QTYuMDgsNi4wOCwwLDAsMSwxOCwxOC43OCw5Ljc3LDkuNzcsMCwwLDEsMTUuMSwyMCwxNC4wOSwxNC4wOSwwLDAsMSwxMS41LDIwLjQ3Wk05LDE0LjA5YTEuODYsMS44NiwwLDAsMCwxLS4yNywyLjA3LDIuMDcsMCwwLDAsLjcyLS43MiwxLjg5LDEuODksMCwwLDAsLjI3LTEsMS44NiwxLjg2LDAsMCwwLS4yNy0xQTIuMDcsMi4wNywwLDAsMCwxMCwxMC40YTEuODYsMS44NiwwLDAsMC0xLS4yNywxLjg5LDEuODksMCwwLDAtMSwuMjcsMi4wNywyLjA3LDAsMCwwLS43Mi43MiwxLjg2LDEuODYsMCwwLDAtLjI3LDEsMS44OSwxLjg5LDAsMCwwLC4yNywxLDIuMDcsMi4wNywwLDAsMCwuNzIuNzJBMS44OSwxLjg5LDAsMCwwLDksMTQuMDlaTTksMTNhLjkyLjkyLDAsMSwxLC45Mi0uOTJBLjk0Ljk0LDAsMCwxLDksMTNaTTExLjUsMTguMkEzLjcxLDMuNzEsMCwwLDAsMTIuNzMsMThhNC40Myw0LjQzLDAsMCwwLDEuMS0uNTgsMy4wOSwzLjA5LDAsMCwwLC43Ny0uODEsMS42OCwxLjY4LDAsMCwwLC4yOS0uOS42My42MywwLDAsMC0uMTEtLjM4LjM3LjM3LDAsMCwwLS4zNy0uMWMtLjYxLjA3LTEuMTMuMTMtMS41Ni4xNnMtLjg4LjA2LTEuMzUuMDYtLjkyLDAtMS4zNS0uMDYtMS0uMDktMS41Ni0uMTZhLjM3LjM3LDAsMCwwLS4zNy4xLjYzLjYzLDAsMCwwLS4xMS4zOCwxLjY4LDEuNjgsMCwwLDAsLjI5LjksMy4wOSwzLjA5LDAsMCwwLC43Ny44MSw0LjQzLDQuNDMsMCwwLDAsMS4xLjU4QTMuNzEsMy43MSwwLDAsMCwxMS41LDE4LjJaTTE0LDE0LjA5YTEuOSwxLjksMCwwLDAsMS0uMjcsMi4xMywyLjEzLDAsMCwwLC43MS0uNzIsMS44OSwxLjg5LDAsMCwwLC4yNy0xLDEuODYsMS44NiwwLDAsMC0uMjctMUEyLjEzLDIuMTMsMCwwLDAsMTUsMTAuNGEyLDIsMCwwLDAtMiwwLDIuMDcsMi4wNywwLDAsMC0uNzIuNzIsMS44NiwxLjg2LDAsMCwwLS4yNywxLDEuODksMS44OSwwLDAsMCwuMjcsMSwyLjA3LDIuMDcsMCwwLDAsLjcyLjcyQTEuODksMS44OSwwLDAsMCwxNCwxNC4wOVpNMTQsMTNhLjk0Ljk0LDAsMCwxLS45Mi0uOTJBLjkyLjkyLDAsMSwxLDE0LDEzWiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTIuNDggLTIuMDcpIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==',
  };

  // Select icon by risk tier
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

  // ==================== Location ====================

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

  // ==================== Helpers ====================

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
      gap: 2,

      children: [

        { type: 'spacer' },

        {
          type: 'image',
          src: riskIcon,
          width: 26,
          height: 26,
          color: '#FFFFFF'
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

        // Header
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

        // Location
        {
          type: 'text',
          text: data.country || 'Unknown',
          font: {
            size: 15,
            weight: 'semibold'
          },
          textColor: C.text
        },

        // Network
        badge(networkText, networkColor),

        {
          type: 'spacer'
        },

        // Risk
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

        // Header
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

        // IP
        {
          type: 'text',
          text: data.ip || 'N/A',
          font: {
            size: 24,
            weight: 'bold'
          },
          textColor: C.text
        },

        // Status
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

        // Bottom
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

        // Header
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

        // Title
        {
          type: 'text',
          text: 'CURRENT IP',
          font: {
            size: 'caption1',
            weight: 'bold'
          },
          textColor: C.muted
        },

        // IP
        {
          type: 'text',
          text: data.ip || 'N/A',
          font: {
            size: 36,
            weight: 'bold'
          },
          textColor: C.text
        },

        // Status
        {
          type: 'stack',
          direction: 'row',
          gap: 14,
          children: [

            badge(networkText, networkColor),

            badge(riskText, riskColor)

          ]
        },

        // Details
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

        // Footer
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
              font: {
                size: 'caption2'
              },
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

      // Header
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

      // Title
      {
        type: 'text',
        text: 'CURRENT IP',
        font: {
          size: 'caption1',
          weight: 'bold'
        },
        textColor: C.muted
      },

      // IP
      {
        type: 'text',
        text: data.ip || 'N/A',
        font: {
          size: 32,
          weight: 'bold'
        },
        textColor: C.text
      },

      // Status
      {
        type: 'stack',
        direction: 'row',
        gap: 14,
        children: [

          badge(networkText, networkColor),

          badge(riskText, riskColor)

        ]
      },

      // Details
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

      // Footer
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
            font: {
              size: 'caption2'
            },
            textColor: C.secondary
          }

        ]
      }

    ]

  };

}
