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
    risk0_house:    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMS4yIC0xMS4xIDkwLjAgOTAuMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCI+CiAgPHBhdGggZD0iTTIuOTIsMTEuNTZhMS4xMiwxLjEyLDAsMCwxLS41My0uMTJBLjQ1LjQ1LDAsMCwxLDIuMTYsMTFhLjc1Ljc1LDAsMCwxLC4yNy0uNTVMMTAuMiwyLjc4YTMuMTgsMy4xOCwwLDAsMSwuNjctLjU1LDEuMzIsMS4zMiwwLDAsMSwxLjI2LDAsMy4xOCwzLjE4LDAsMCwxLC42Ny41NWw3Ljc3LDcuNjhhLjc1Ljc1LDAsMCwxLC4yNy41NS40NS40NSwwLDAsMS0uMjIuNDMsMS4xMywxLjEzLDAsMCwxLS41NC4xMkgxOC4zMkwxMS41LDQuODQsNC42OCwxMS41NlptLjMxLS42OUg0LjM5bDcuMTEtNyw3LjExLDdoMS4xNmEuMDcuMDcsMCwwLDAsLjA4LS4wNi4xMy4xMywwLDAsMC0uMDUtLjEyTDEyLjMsMy4yOGEzLjI0LDMuMjQsMCwwLDAtLjQ3LS40MS41NS41NSwwLDAsMC0uNjYsMCwzLjI0LDMuMjQsMCwwLDAtLjQ3LjQxTDMuMiwxMC42OWEuMTMuMTMsMCwwLDAtLjA1LjEyQS4wNy4wNywwLDAsMCwzLjIzLDEwLjg3Wm0zLjEsOC4yM0g1Ljg0bC0uNDUsMGEzLjY3LDMuNjcsMCwwLDEtMS4yNS0uMTQuNTMuNTMsMCwwLDEtLjMtLjU0LDIsMiwwLDAsMSwuNDEtMS4zLDEuMzEsMS4zMSwwLDAsMSwxLS40OSwxLjMzLDEuMzMsMCwwLDEsLjU2LjExLDEuMywxLjMsMCwwLDAsLjQ5LjEsMS4wNywxLjA3LDAsMCwwLC40OS0uMSwxLjQ0LDEuNDQsMCwwLDEsLjU2LS4xLDIuMTMsMi4xMywwLDAsMSwuOC4xNywyLjU1LDIuNTUsMCwwLDEsLjcxLjQxYy4xOS4xNi4yOS4zLjI5LjQ0VjE5LjFabTIuMTQsMS4zN3YtMS40aC4xNHYtLjc5SDQuMDVWMTEuMTZsLjcxLS41NHY3SDE4LjI0di03bC43MS41NHY3LjEySDE0LjM5di43OWguMTR2MS40Wk01LjA1LDguNDFWNC44SDQuNzlWM0g3VjQuOEg2LjczVjYuNjZabS43NCw1LjEzdi0xYS4zNC4zNCwwLDAsMSwuMTEtLjI0LjMuMywwLDAsMSwuMjQtLjFoMXYxLjMyWm0uMzUsMmEuMy4zLDAsMCwxLS4yNC0uMS4zNC4zNCwwLDAsMS0uMTEtLjI1di0xSDcuMTJ2MS4zM1ptMS41OC0yVjEyLjIyaDFhLjM0LjM0LDAsMCwxLC4zNC4zNHYxWm0wLDJWMTQuMTZIOS4wNXYxYS4zMy4zMywwLDAsMS0uMS4yNS4zMy4zMywwLDAsMS0uMjQuMVptMS40Niw0LjI5aDQuNjR2LS41SDkuMThabS4xNC0xaDQuMzZ2LS40OEg5LjMyWm0uNTMtMVYxM2ExLjM4LDEuMzgsMCwwLDEsLjUtMS4wOCwxLjcyLDEuNzIsMCwwLDEsMS4xNS0uNDQsMS42OSwxLjY5LDAsMCwxLDEuMTUuNDQsMS4zOCwxLjM4LDAsMCwxLC41LDEuMDh2NC44Wk0xMi40NCwxNWEuMjkuMjksMCwwLDAsLjIyLS4wOS4yOS4yOSwwLDAsMCwuMS0uMjMuMjcuMjcsMCwwLDAtLjEtLjIyLjMuMywwLDAsMC0uMjItLjEuMzMuMzMsMCwwLDAtLjIzLjEuMjkuMjksMCwwLDAtLjA5LjIyLjMxLjMxLDAsMCwwLC4zMi4zMlptMS4zOCw0LjA4VjE3LjYzYzAtLjE0LjEtLjI4LjI5LS40NGEyLjU1LDIuNTUsMCwwLDEsLjcxLS40MSwyLjIxLDIuMjEsMCwwLDEsLjgtLjE3LDEuNDQsMS40NCwwLDAsMSwuNTYuMSwxLjA3LDEuMDcsMCwwLDAsLjQ5LjEsMS4zNSwxLjM1LDAsMCwwLC41LS4xLDEuMjUsMS4yNSwwLDAsMSwuNTUtLjExLDEuMjksMS4yOSwwLDAsMSwxLC40OSwxLjkzLDEuOTMsMCwwLDEsLjQxLDEuMy41My41MywwLDAsMS0uMy41NCwzLjYzLDMuNjMsMCwwLDEtMS4yNS4xNGwtLjQ1LDBIMTMuODJaTTE0LDEzLjU0di0xYS4zNC4zNCwwLDAsMSwuMzQtLjM0aDF2MS4zMlptLjM0LDJhLjMzLjMzLDAsMCwxLS4yNC0uMS4zMy4zMywwLDAsMS0uMS0uMjV2LTFoMS4zM3YxLjMzWm0xLjU5LTJWMTIuMjJoMWEuMy4zLDAsMCwxLC4yNC4xLjM0LjM0LDAsMCwxLC4xMS4yNHYxWm0wLDJWMTQuMTZoMS4zM3YxYS4zNC4zNCwwLDAsMS0uMTEuMjUuMy4zLDAsMCwxLS4yNC4xWiIgZmlsbD0iI2ZmZiIvPgo8L3N2Zz4=',
    risk1_sparkles: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii05LjEgLTEzLjkgMTAyLjkgMTAyLjkiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiPgogIDxwYXRoIGQ9Ik00LjQzLDIwLjQ3bC0uMjktMS40MmE5LjM3LDkuMzcsMCwwLDAtLjM3LTEuNCwxLjczLDEuNzMsMCwwLDAtLjUyLS43OCwyLjY2LDIuNjYsMCwwLDAtMS0uNDRsLTEuNC0uMzd2LS44M2wxLjQtLjM4YTIuODQsMi44NCwwLDAsMCwxLS40NCwxLjczLDEuNzMsMCwwLDAsLjUyLS43OCw4Ljg3LDguODcsMCwwLDAsLjM3LTEuMzlsLjI5LTEuNDJoLjlsLjI4LDEuNDJBOC44Nyw4Ljg3LDAsMCwwLDYsMTMuNjNhMS42NywxLjY3LDAsMCwwLC41My43OCwyLjc1LDIuNzUsMCwwLDAsMSwuNDRsMS4zOC4zOHYuODNsLTEuMzguMzdhMi41OCwyLjU4LDAsMCwwLTEsLjQ0LDEuNjcsMS42NywwLDAsMC0uNTMuNzgsOS4zNyw5LjM3LDAsMCwwLS4zNywxLjRsLS4yOCwxLjQyWm0uNDItMWExMS44NSwxMS44NSwwLDAsMSwuMzYtMS43MiwzLjA3LDMuMDcsMCwwLDEsLjUyLTEuMDlBMi4xMywyLjEzLDAsMCwxLDYuNiwxNiw2Ljc1LDYuNzUsMCwwLDEsOCwxNS42MXYuMDZhNi43NSw2Ljc1LDAsMCwxLTEuNDEtLjQsMi4yLDIuMiwwLDAsMS0uODctLjY0LDMuMTMsMy4xMywwLDAsMS0uNTItMS4xLDExLjQsMTEuNCwwLDAsMS0uMzYtMS43MUg0LjlhMTQuODYsMTQuODYsMCwwLDEtLjM1LDEuNzFBMy4xMywzLjEzLDAsMCwxLDQsMTQuNjNhMi4wNiwyLjA2LDAsMCwxLS44Ny42NCw2LjY0LDYuNjQsMCwwLDEtMS40LjR2LS4wNmE2LjY0LDYuNjQsMCwwLDEsMS40LjQsMiwyLDAsMCwxLC44Ny42NSwzLjA4LDMuMDgsMCwwLDEsLjUzLDEuMDksMTUuNTYsMTUuNTYsMCwwLDEsLjM1LDEuNzJabTEtOS44Nkw1LjY1LDguNDhhNC42Niw0LjY2LDAsMCwwLS4zMy0xLjE0LDEuMjUsMS4yNSwwLDAsMC0uNTctLjU5QTMuOTIsMy45MiwwLDAsMCwzLjY4LDYuNEwzLDYuMjVWNS40M2wuNjktLjE2YTMuODksMy44OSwwLDAsMCwxLjA3LS4zNiwxLjI1LDEuMjUsMCwwLDAsLjU3LS41OSw0LjQzLDQuNDMsMCwwLDAsLjMzLTEuMTNsLjIyLTEuMTJoLjg0bC4yMywxLjEyYTUuNDMsNS40MywwLDAsMCwuMzMsMS4xMywxLjI4LDEuMjgsMCwwLDAsLjU2LjU5LDQuODEsNC44MSwwLDAsMCwxLjA4LjM2bC42OC4xNnYuODJsLS42OC4xNWE0LDQsMCwwLDAtMS4wOC4zNSwxLjMxLDEuMzEsMCwwLDAtLjU2LjYsNS40Myw1LjQzLDAsMCwwLS4zMywxLjEzTDYuNzEsOS42MVptLjM4LS44OWExMC43MSwxMC43MSwwLDAsMSwuMzEtMS4zNUEyLjE4LDIuMTgsMCwwLDEsNyw2LjU4YTEuNzgsMS43OCwwLDAsMSwuNy0uNDYsNy43Myw3LjczLDAsMCwxLDEuMS0uMzF2LjA2YTkuMTIsOS4xMiwwLDAsMS0xLjEtLjMyQTEuNzcsMS43NywwLDAsMSw3LDUuMWEyLjM4LDIuMzgsMCwwLDEtLjQ0LS44MUExMC4xLDEwLjEsMCwwLDEsNi4yNSwzaC4wOEExMC4xLDEwLjEsMCwwLDEsNiw0LjI5YTIuNTYsMi41NiwwLDAsMS0uNDMuODEsMS44NCwxLjg0LDAsMCwxLS43LjQ1LDEwLjM2LDEwLjM2LDAsMCwxLTEuMS4zMlY1LjgxYTguNTksOC41OSwwLDAsMSwxLjEuMzEsMS44NiwxLjg2LDAsMCwxLC43LjQ2QTIuMzQsMi4zNCwwLDAsMSw2LDcuMzdhMTAuNzEsMTAuNzEsMCwwLDEsLjMxLDEuMzVabTcuOTQsMTEuNzUtLjM1LTIuNDFxLS4yMy0xLjQ0LS40NS0yLjRhNi4wOSw2LjA5LDAsMCwwLS41OS0xLjU4LDIuOTQsMi45NCwwLDAsMC0uODktMSw1LDUsMCwwLDAtMS4zNS0uNjNxLS44MS0uMjQtMi0uNDhsLTEuNDYtLjN2LS44M2wxLjQ2LS4zcTEuMTctLjI0LDItLjQ4YTUsNSwwLDAsMCwxLjM1LS42MywzLDMsMCwwLDAsLjg5LTEsNiw2LDAsMCwwLC41OS0xLjU4cS4yMi0xLC40NS0yLjRsLjM1LTIuNDFoLjg3bC4zNCwyLjQxYy4xNCwxLC4yOCwxLjc2LjQ0LDIuNGE2LDYsMCwwLDAsLjU5LDEuNTgsMi44NiwyLjg2LDAsMCwwLC45LDEsNC43LDQuNywwLDAsMCwxLjM1LjYycS44MS4yNCwyLC40OGwxLjQ2LjN2LjgzbC0xLjQ2LjNxLTEuMTcuMjQtMiwuNDhhNSw1LDAsMCwwLTEuMzUuNjMsMi44NiwyLjg2LDAsMCwwLS45LDEsNi4wOSw2LjA5LDAsMCwwLS41OSwxLjU4Yy0uMTYuNjQtLjMsMS40NC0uNDQsMi40bC0uMzQsMi40MVptLjQtMS43Yy4xMy0xLC4yNy0xLjg2LjQxLTIuNThhMTEuMzIsMTEuMzIsMCwwLDEsLjQ5LTEuODMsNC4xOSw0LjE5LDAsMCwxLC43LTEuMjQsMy41NSwzLjU1LDAsMCwxLDEtLjgxLDcuNzQsNy43NCwwLDAsMSwxLjQ4LS41OGMuNTctLjE3LDEuMjUtLjMzLDItLjV2LjA4Yy0uOC0uMTgtMS40OC0uMzQtMi0uNWE3Ljc0LDcuNzQsMCwwLDEtMS40OC0uNTgsMy41NSwzLjU1LDAsMCwxLTEtLjgxLDQuMTksNC4xOSwwLDAsMS0uNy0xLjI0QTExLjMyLDExLjMyLDAsMCwxLDE1LDYuMzVjLS4xNC0uNzItLjI4LTEuNTgtLjQxLTIuNThoLjA2Yy0uMTQsMS0uMjcsMS44Ni0uNDEsMi41OGExMS4zMiwxMS4zMiwwLDAsMS0uNDksMS44Myw0LjE5LDQuMTksMCwwLDEtLjcsMS4yNCwzLjU1LDMuNTUsMCwwLDEtMSwuODEsNy45LDcuOSwwLDAsMS0xLjQ3LjU4Yy0uNTguMTYtMS4yNi4zMi0yLjA1LjV2LS4wOGMuNzkuMTcsMS40Ny4zMywyLjA1LjVBNy4yOCw3LjI4LDAsMCwxLDEyLDEyLjNhMy41NSwzLjU1LDAsMCwxLDEsLjgxLDQuMTksNC4xOSwwLDAsMSwuNywxLjI0LDExLjMyLDExLjMyLDAsMCwxLC40OSwxLjgzYy4xNC43Mi4yNywxLjU4LjQxLDIuNTlaIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==',
    risk2_neutral:  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMC45IC0xMC43IDEwNS41IDEwNS41IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0Ij4KICA8cGF0aCBkPSJNMTEuNSwyMC40N2E5LjExLDkuMTEsMCwwLDEtMy41OC0uNzFBOS4zMSw5LjMxLDAsMCwxLDMsMTQuODUsOS4zOCw5LjM4LDAsMCwxLDMsNy42OSw5LjMxLDkuMzEsMCwwLDEsNy45MiwyLjc4YTkuMzYsOS4zNiwwLDAsMSw3LjE1LDAsOS4zNiw5LjM2LDAsMCwxLDIuOTMsMiw5LjE0LDkuMTQsMCwwLDEsMi43LDYuNTFBOS4xNCw5LjE0LDAsMCwxLDE4LDE3Ljc4YTkuMzYsOS4zNiwwLDAsMS0yLjkzLDJBOS4wNiw5LjA2LDAsMCwxLDExLjUsMjAuNDdabTAtLjcxYTguMzEsOC4zMSwwLDAsMCwzLjMtLjY2LDguNDcsOC40NywwLDAsMCw0LjUzLTQuNTMsOC41OCw4LjU4LDAsMCwwLDAtNi42QTguNDcsOC40NywwLDAsMCwxNC44LDMuNDRhOC41OCw4LjU4LDAsMCwwLTYuNiwwQTguNDcsOC40NywwLDAsMCwzLjY3LDhhOC41OCw4LjU4LDAsMCwwLDAsNi42QTguNDcsOC40NywwLDAsMCw4LjIsMTkuMSw4LjMxLDguMzEsMCwwLDAsMTEuNSwxOS43NlpNOC4zOSwxMS40NWExLDEsMCwwLDEtLjc4LS40LDEuNDksMS40OSwwLDAsMSwwLTEuODcsMSwxLDAsMCwxLC43OC0uMzksMSwxLDAsMCwxLC43Ny4zOSwxLjQ5LDEuNDksMCwwLDEsMCwxLjg3QS45NC45NCwwLDAsMSw4LjM5LDExLjQ1Wk03LjQsMTV2LS43MWg4LjJWMTVabTcuMjEtMy41NGEuOTQuOTQsMCwwLDEtLjc3LS40LDEuNDksMS40OSwwLDAsMSwwLTEuODcsMSwxLDAsMCwxLC43Ny0uMzksMSwxLDAsMCwxLC43OC4zOSwxLjQ5LDEuNDksMCwwLDEsMCwxLjg3QTEsMSwwLDAsMSwxNC42MSwxMS40NVoiIGZpbGw9IiNmZmYiLz4KPC9zdmc+',
    risk3_thinking: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMC44IC05LjcgMTA0LjcgMTA0LjciIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiPgogIDxwYXRoIGQ9Ik02LjE0LDIwLjkxQTMuNDMsMy40MywwLDAsMSwzLjU4LDIwYTMuMzgsMy4zOCwwLDAsMS0uODctMi40NSwzLjM2LDMuMzYsMCwwLDEsLjA4LS43OSwzLjU2LDMuNTYsMCwwLDAsLjA4LS42OCwyLDIsMCwwLDAtLjEzLS43MWMtLjA4LS4yMi0uMTctLjQyLS4yNi0uNjJhNC43LDQuNywwLDAsMS0uMjUtLjU3LDEuOTEsMS45MSwwLDAsMS0uMS0uNTgsMS4wNywxLjA3LDAsMCwxLC4zLS43OCwxLjEzLDEuMTMsMCwwLDEsLjgzLS4zLDEuNywxLjcsMCwwLDEsMSwuMzIsMi4wOSwyLjA5LDAsMCwxLC43Ljg1bC4wNy4xNWEzLjU1LDMuNTUsMCwwLDAsLjI5LjUzLjM0LjM0LDAsMCwwLC4zLjE0QS44My44MywwLDAsMCw2LDE0LjQ1YTMuNjEsMy42MSwwLDAsMCwuNS0uMjQsOS41NCw5LjU0LDAsMCwxLDEtLjQ2LDgsOCwwLDAsMSwxLjMzLS40MSw3Ljg0LDcuODQsMCwwLDEsMS42Ni0uMTcsMi4yMSwyLjIxLDAsMCwxLDEuMTUuMjUuNzkuNzksMCwwLDEsLjQxLjczLjkuOSwwLDAsMS0uMTUuNTEsMS4zNSwxLjM1LDAsMCwxLS41Ny40MSw4LjkyLDguOTIsMCwwLDEtMS4yMS40NGwtLjIxLjA2QTYuNjcsNi42NywwLDAsMCw4Ljc0LDE2YTUuNzgsNS43OCwwLDAsMC0xLjE5LjgzbC0uMzctLjQ0YTYuNDMsNi40MywwLDAsMSwxLjM0LTFBNS4zLDUuMywwLDAsMSw5LjY4LDE1bC4xNy0uMDVBOC41OCw4LjU4LDAsMCwwLDExLDE0LjU3Yy4yMy0uMTEuMzUtLjIzLjM1LS4zNmEuMzUuMzUsMCwwLDAtLjIzLS4zMiwyLjEsMi4xLDAsMCwwLS43MS0uMSw2LjM4LDYuMzgsMCwwLDAtMi4wNy4zMSw5LjcsOS43LDAsMCwwLTEuNTguNjUsNS45LDUuOSwwLDAsMS0uNy4zMSwxLjQ4LDEuNDgsMCwwLDEtLjUxLjFBLjc5Ljc5LDAsMCwxLDUsMTVhMywzLDAsMCwxLS41MS0uODNMNC40MSwxNEExLjU0LDEuNTQsMCwwLDAsNCwxMy4zOGExLDEsMCwwLDAtLjYyLS4yMy41OS41OSwwLDAsMC0uNDEuMTUuNTEuNTEsMCwwLDAtLjE3LjQxLDEuMjksMS4yOSwwLDAsMCwuMDguNDFjLjA2LjE1LjEzLjMxLjIuNDZzLjIxLjQ1LjMxLjcxYTIuMTYsMi4xNiwwLDAsMSwuMTUuODEsMy4zNiwzLjM2LDAsMCwxLS4wOC43NCwyLjkzLDIuOTMsMCwwLDAtLjA4Ljc1LDIuNzEsMi43MSwwLDAsMCwuNzIsMiwyLjgxLDIuODEsMCwwLDAsMi4wOS43Myw1LjUzLDUuNTMsMCwwLDAsMS4yNi0uMTQsNC4zMyw0LjMzLDAsMCwwLDEuMDktLjM3Yy4yOS0uMTUuNDQtLjMyLjQ0LS41YS45LjksMCwwLDAsMC0uMTguNTMuNTMsMCwwLDAtLjA5LS4xOWwuNC0uNDdhMS4xNiwxLjE2LDAsMCwxLC4zMi44NC45LjksMCwwLDEtLjI5LjY3LDIuNDcsMi40NywwLDAsMS0uNzguNTIsNS42OCw1LjY4LDAsMCwxLTEuMS4zM0E3LjEyLDcuMTIsMCwwLDEsNi4xNCwyMC45MVptNS41My0uNDRBOSw5LDAsMCwxLDguNzksMjBsLjQtLjYxYTguNTUsOC41NSwwLDAsMCwyLjQ4LjM2QTguMzEsOC4zMSwwLDAsMCwxNSwxOS4xYTguNTYsOC41NiwwLDAsMCw0LjUzLTQuNTMsOC41OCw4LjU4LDAsMCwwLDAtNi42QTguNTYsOC41NiwwLDAsMCwxNSwzLjQ0YTguMzEsOC4zMSwwLDAsMC0zLjMtLjY2LDguMjQsOC4yNCwwLDAsMC0zLjMuNjYsOC41OCw4LjU4LDAsMCwwLTUsOS41OGwtLjY4LjE4Yy0uMDYtLjMxLS4xMS0uNjMtLjE1LS45NXMwLS42NSwwLTFBOS4wOCw5LjA4LDAsMCwxLDUuMTYsNC43NmE5LjM2LDkuMzYsMCwwLDEsMi45My0yLDkuMzYsOS4zNiwwLDAsMSw3LjE1LDAsOS4zMSw5LjMxLDAsMCwxLDQuOTEsNC45MSw4Ljk0LDguOTQsMCwwLDEsLjcyLDMuNTgsOC45NCw4Ljk0LDAsMCwxLS43MiwzLjU4LDkuMzEsOS4zMSwwLDAsMS00LjkxLDQuOTFBOS4wNiw5LjA2LDAsMCwxLDExLjY3LDIwLjQ3Wk04Ljg1LDcuNTVhMSwxLDAsMCwxLS43OC0uMzgsMS40MiwxLjQyLDAsMCwxLS4zMy0uOTQsMS40LDEuNCwwLDAsMSwuMzMtLjk0LDEsMSwwLDAsMSwxLjU3LDAsMS40LDEuNCwwLDAsMSwuMzMuOTQsMS40NCwxLjQ0LDAsMCwxLS4zMi45M0ExLDEsMCwwLDEsOC44NSw3LjU1Wk0xMSw0LjMxYTQuNTEsNC41MSwwLDAsMC0xLjQ4LTFBNC43LDQuNywwLDAsMCw3Ljc5LDNWMi4yNmE1LjM4LDUuMzgsMCwwLDEsMiwuMzYsNS4yMiw1LjIyLDAsMCwxLDEuNywxLjE5Wk03LjkxLDE4LjEzbC0uMDktLjUzYTEuNywxLjcsMCwwLDAsLjc2LS4yOC42LjYsMCwwLDAsLjI2LS40NS41NC41NCwwLDAsMC0uMTctLjQuOTQuOTQsMCwwLDAtLjQ3LS4yMmwuMTMtLjUzYTEuMjEsMS4yMSwwLDAsMSwuNzcuMzgsMS4wNiwxLjA2LDAsMCwxLC4zMS43NywxLDEsMCwwLDEtLjM5LjgyQTIuMTgsMi4xOCwwLDAsMSw3LjkxLDE4LjEzWm01LjkyLTUuNjVhNC40OSw0LjQ5LDAsMCwwLTMuMjEtMS40MSw1LjY5LDUuNjksMCwwLDAtMi40My41OUw3Ljg5LDExYTYuNTcsNi41NywwLDAsMSwyLjc0LS42NkE1LjE4LDUuMTgsMCwwLDEsMTQuMzIsMTJaTTguMSwxOS4yOCw4LDE4Ljc1Yy42My0uMTIsMS0uMzYsMS0uN2EuNjMuNjMsMCwwLDAtLjE3LS40NWwuMy0uNWExLDEsMCwwLDEsLjMyLjQxLDEuMjUsMS4yNSwwLDAsMSwuMTIuNTQsMSwxLDAsMCwxLS4zNi44QTIuMTYsMi4xNiwwLDAsMSw4LjEsMTkuMjhaTTE2LjM2LDUuODlBNC42NCw0LjY0LDAsMCwwLDE0LDUuMjVhNS41NCw1LjU0LDAsMCwwLS41OSwwLDQuNTEsNC41MSwwLDAsMC0uNTMuMDlsLS4xNi0uNjljLjIxLDAsLjQyLS4wOC42NC0uMTFzLjQyLDAsLjY0LDBhNS4zMiw1LjMyLDAsMCwxLDIuNjkuNzRaTTE0LjQzLDkuMDZhMSwxLDAsMCwxLS43OS0uMzksMS40LDEuNCwwLDAsMS0uMzMtLjk0LDEuNDIsMS40MiwwLDAsMSwuMzMtLjk0LDEsMSwwLDAsMSwuNzktLjM5LDEsMSwwLDAsMSwuNzkuMzksMS40NywxLjQ3LDAsMCwxLC4zMi45NCwxLjQzLDEuNDMsMCwwLDEtLjMyLjk0QTEsMSwwLDAsMSwxNC40Myw5LjA2WiIgZmlsbD0iI2ZmZiIvPgo8L3N2Zz4=',
    risk4_warning:  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0yMi4yIC0xMS41IDEwNC40IDEwNC40IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0Ij4KICA8cGF0aCBkPSJNMy44OCwyMC40N0ExLjQ0LDEuNDQsMCwwLDEsMi4zOSwxOWEyLjA1LDIuMDUsMCwwLDEsLjIyLS45TDEwLDMuMDlhMS41NywxLjU3LDAsMCwxLDIuOTQsMGw3LjQyLDE1YTIuMDUsMi4wNSwwLDAsMSwuMjIuOSwxLjQ3LDEuNDcsMCwwLDEtLjQyLDEuMDcsMS40NSwxLjQ1LDAsMCwxLTEuMDcuNDJabTAtLjcxSDE5LjEyYS43Ny43NywwLDAsMCwuNTctLjIxQS43My43MywwLDAsMCwxOS45LDE5YTEuMjYsMS4yNiwwLDAsMC0uMTUtLjU5bC03LjQyLTE1YS45MS45MSwwLDAsMC0uODMtLjYyLjkzLjkzLDAsMCwwLS44My42M2wtNy40MiwxNWExLjMzLDEuMzMsMCwwLDAtLjE1LjYuNzYuNzYsMCwwLDAsLjIxLjU2QS44LjgsMCwwLDAsMy44OCwxOS43NlptNy42Mi00LjNhLjQzLjQzLDAsMCwxLS40NC0uMzlsLS41NS02Ljc2YTEuMjEsMS4yMSwwLDAsMSwuMjQtLjksMSwxLDAsMCwxLDEuNTEsMCwxLjI3LDEuMjcsMCwwLDEsLjIzLjlsLS41NSw2Ljc2YS4zNi4zNiwwLDAsMS0uMTMuMjhBLjQ0LjQ0LDAsMCwxLDExLjUsMTUuNDZabTAsMi40MmEuNzkuNzksMCwxLDEsLjU0LS4yM0EuNzQuNzQsMCwwLDEsMTEuNSwxNy44OFoiIGZpbGw9IiNmZmYiLz4KPC9zdmc+',
    risk5_poop:     'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii02LjggLTYuNSAxMDEuMyAxMDEuMyIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCI+CiAgPHBhdGggZD0iTTExLjUsMjAuNDdBMTQuMTEsMTQuMTEsMCwwLDEsNy44OSwyMCw5Ljc3LDkuNzcsMCwwLDEsNSwxOC43OGE2LDYsMCwwLDEtMS44Ny0xLjg5LDQuNDUsNC40NSwwLDAsMS0uNjctMi4zOSwzLjIzLDMuMjMsMCwwLDEsLjcyLTIuMTUsNC40Myw0LjQzLDAsMCwxLDItMS4yOSw1LjUxLDUuNTEsMCwwLDEtLjA3LS43OUEzLjQ5LDMuNDksMCwwLDEsNS44LDguMTRhMy4zMywzLjMzLDAsMCwxLDEuODMtMS4yVjYuNzdBNS42Myw1LjYzLDAsMCwxLDgsNC42N2EzLjQ4LDMuNDgsMCwwLDEsMS4yLTEuNDZBOS4xOCw5LjE4LDAsMCwxLDExLjUsMi4wN2E3LjEsNy4xLDAsMCwwLC4xNCwxLjU2LDEuNDksMS40OSwwLDAsMCwuNDkuODcsMi40MSwyLjQxLDAsMCwwLDEsLjQyTDEzLjYsNWE0LjczLDQuNzMsMCwwLDEsMi4yNS45MywyLjE2LDIuMTYsMCwwLDEsLjY5LDEuNywyLjM5LDIuMzksMCwwLDEsMCwuNDQsMy4zOSwzLjM5LDAsMCwxLS4xLjQ4LDIuODgsMi44OCwwLDAsMSwxLjM0LDEsMywzLDAsMCwxLC41MywxLjY1LDQuMTksNC4xOSwwLDAsMSwxLjY2LDEuMzcsMy4zMywzLjMzLDAsMCwxLC41OSwxLjkyLDQuNTMsNC41MywwLDAsMS0uNjYsMi4zOUE2LjA4LDYuMDgsMCwwLDEsMTgsMTguNzgsOS43Nyw5Ljc3LDAsMCwxLDE1LjEsMjAsMTQuMDksMTQuMDksMCwwLDEsMTEuNSwyMC40N1pNOSwxNC4wOWExLjg2LDEuODYsMCwwLDAsMS0uMjcsMi4wNywyLjA3LDAsMCwwLC43Mi0uNzIsMS44OSwxLjg5LDAsMCwwLC4yNy0xLDEuODYsMS44NiwwLDAsMC0uMjctMUEyLjA3LDIuMDcsMCwwLDAsMTAsMTAuNGExLjg2LDEuODYsMCwwLDAtMS0uMjcsMS44OSwxLjg5LDAsMCwwLTEsLjI3LDIuMDcsMi4wNywwLDAsMC0uNzIuNzIsMS44NiwxLjg2LDAsMCwwLS4yNywxLDEuODksMS44OSwwLDAsMCwuMjcsMSwyLjA3LDIuMDcsMCwwLDAsLjcyLjcyQTEuODksMS44OSwwLDAsMCw5LDE0LjA5Wk05LDEzYS45Mi45MiwwLDEsMSwuOTItLjkyQS45NC45NCwwLDAsMSw5LDEzWk0xMS41LDE4LjJBMy43MSwzLjcxLDAsMCwwLDEyLjczLDE4YTQuNDMsNC40MywwLDAsMCwxLjEtLjU4LDMuMDksMy4wOSwwLDAsMCwuNzctLjgxLDEuNjgsMS42OCwwLDAsMCwuMjktLjkuNjMuNjMsMCwwLDAtLjExLS4zOC4zNy4zNywwLDAsMC0uMzctLjFjLS42MS4wNy0xLjEzLjEzLTEuNTYuMTZzLS44OC4wNi0xLjM1LjA2LS45MiwwLTEuMzUtLjA2LTEtLjA5LTEuNTYtLjE2YS4zNy4zNywwLDAsMC0uMzcuMS42My42MywwLDAsMC0uMTEuMzgsMS42OCwxLjY4LDAsMCwwLC4yOS45LDMuMDksMy4wOSwwLDAsMCwuNzcuODEsNC40Myw0LjQzLDAsMCwwLDEuMS41OEEzLjcxLDMuNzEsMCwwLDAsMTEuNSwxOC4yWk0xNCwxNC4wOWExLjksMS45LDAsMCwwLDEtLjI3LDIuMTMsMi4xMywwLDAsMCwuNzEtLjcyLDEuODksMS44OSwwLDAsMCwuMjctMSwxLjg2LDEuODYsMCwwLDAtLjI3LTFBMi4xMywyLjEzLDAsMCwwLDE1LDEwLjRhMiwyLDAsMCwwLTIsMCwyLjA3LDIuMDcsMCwwLDAtLjcyLjcyLDEuODYsMS44NiwwLDAsMC0uMjcsMSwxLjg5LDEuODksMCwwLDAsLjI3LDEsMi4wNywyLjA3LDAsMCwwLC43Mi43MkExLjg5LDEuODksMCwwLDAsMTQsMTQuMDlaTTE0LDEzYS45NC45NCwwLDAsMS0uOTItLjkyQS45Mi45MiwwLDEsMSwxNCwxM1oiIGZpbGw9IiNmZmYiLz4KPC9zdmc+',
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
          type: 'stack',
          direction: 'row',
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
