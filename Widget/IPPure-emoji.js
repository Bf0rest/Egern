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
    risk0_house:    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(2.4558,2.4558)scale(0.265116)"><path d="M2.92,11.56a1.12,1.12,0,0,1-.53-.12A.45.45,0,0,1,2.16,11a.75.75,0,0,1,.27-.55L10.2,2.78a3.18,3.18,0,0,1,.67-.55,1.32,1.32,0,0,1,1.26,0,3.18,3.18,0,0,1,.67.55l7.77,7.68a.75.75,0,0,1,.27.55.45.45,0,0,1-.22.43,1.13,1.13,0,0,1-.54.12H18.32L11.5,4.84,4.68,11.56Zm.31-.69H4.39l7.11-7,7.11,7h1.16a.07.07,0,0,0,.08-.06.13.13,0,0,0-.05-.12L12.3,3.28a3.24,3.24,0,0,0-.47-.41.55.55,0,0,0-.66,0,3.24,3.24,0,0,0-.47.41L3.2,10.69a.13.13,0,0,0-.05.12A.07.07,0,0,0,3.23,10.87Zm3.1,8.23H5.84l-.45,0a3.67,3.67,0,0,1-1.25-.14.53.53,0,0,1-.3-.54,2,2,0,0,1,.41-1.3,1.31,1.31,0,0,1,1-.49,1.33,1.33,0,0,1,.56.11,1.3,1.3,0,0,0,.49.1,1.07,1.07,0,0,0,.49-.1,1.44,1.44,0,0,1,.56-.1,2.13,2.13,0,0,1,.8.17,2.55,2.55,0,0,1,.71.41c.19.16.29.3.29.44V19.1Zm2.14,1.37v-1.4h.14v-.79H4.05V11.16l.71-.54v7H18.24v-7l.71.54v7.12H14.39v.79h.14v1.4ZM5.05,8.41V4.8H4.79V3H7V4.8H6.73V6.66Zm.74,5.13v-1a.34.34,0,0,1,.11-.24.3.3,0,0,1,.24-.1h1v1.32Zm.35,2a.3.3,0,0,1-.24-.1.34.34,0,0,1-.11-.25v-1H7.12v1.33Zm1.58-2V12.22h1a.34.34,0,0,1,.34.34v1Zm0,2V14.16H9.05v1a.33.33,0,0,1-.1.25.33.33,0,0,1-.24.1Zm1.46,4.29h4.64v-.5H9.18Zm.14-1h4.36v-.48H9.32Zm.53-1V13a1.38,1.38,0,0,1,.5-1.08,1.72,1.72,0,0,1,1.15-.44,1.69,1.69,0,0,1,1.15.44,1.38,1.38,0,0,1,.5,1.08v4.8ZM12.44,15a.29.29,0,0,0,.22-.09.29.29,0,0,0,.1-.23.27.27,0,0,0-.1-.22.3.3,0,0,0-.22-.1.33.33,0,0,0-.23.1.29.29,0,0,0-.09.22.31.31,0,0,0,.32.32Zm1.38,4.08V17.63c0-.14.1-.28.29-.44a2.55,2.55,0,0,1,.71-.41,2.21,2.21,0,0,1,.8-.17,1.44,1.44,0,0,1,.56.1,1.07,1.07,0,0,0,.49.1,1.35,1.35,0,0,0,.5-.1,1.25,1.25,0,0,1,.55-.11,1.29,1.29,0,0,1,1,.49,1.93,1.93,0,0,1,.41,1.3.53.53,0,0,1-.3.54,3.63,3.63,0,0,1-1.25.14l-.45,0H13.82ZM14,13.54v-1a.34.34,0,0,1,.34-.34h1v1.32Zm.34,2a.33.33,0,0,1-.24-.1.33.33,0,0,1-.1-.25v-1h1.33v1.33Zm1.59-2V12.22h1a.3.3,0,0,1,.24.1.34.34,0,0,1,.11.24v1Zm0,2V14.16h1.33v1a.34.34,0,0,1-.11.25.3.3,0,0,1-.24.1Z" fill="#fff"/></g></svg>',
    risk1_sparkles:   'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(2.0345,2.8740)scale(0.230629)"><path d="M4.43,20.47l-.29-1.42a9.37,9.37,0,0,0-.37-1.4,1.73,1.73,0,0,0-.52-.78,2.66,2.66,0,0,0-1-.44l-1.4-.37v-.83l1.4-.38a2.84,2.84,0,0,0,1-.44,1.73,1.73,0,0,0,.52-.78,8.87,8.87,0,0,0,.37-1.39l.29-1.42h.9l.28,1.42A8.87,8.87,0,0,0,6,13.63a1.67,1.67,0,0,0,.53.78,2.75,2.75,0,0,0,1,.44l1.38.38v.83l-1.38.37a2.58,2.58,0,0,0-1,.44,1.67,1.67,0,0,0-.53.78,9.37,9.37,0,0,0-.37,1.4l-.28,1.42Zm.42-1a11.85,11.85,0,0,1,.36-1.72,3.07,3.07,0,0,1,.52-1.09A2.13,2.13,0,0,1,6.6,16,6.75,6.75,0,0,1,8,15.61v.06a6.75,6.75,0,0,1-1.41-.4,2.2,2.2,0,0,1-.87-.64,3.13,3.13,0,0,1-.52-1.1,11.4,11.4,0,0,1-.36-1.71H4.9a14.86,14.86,0,0,1-.35,1.71A3.13,3.13,0,0,1,4,14.63a2.06,2.06,0,0,1-.87.64,6.64,6.64,0,0,1-1.4.4v-.06a6.64,6.64,0,0,1,1.4.4,2,2,0,0,1,.87.65,3.08,3.08,0,0,1,.53,1.09,15.56,15.56,0,0,1,.35,1.72Zm1-9.86L5.65,8.48a4.66,4.66,0,0,0-.33-1.14,1.25,1.25,0,0,0-.57-.59A3.92,3.92,0,0,0,3.68,6.4L3,6.25V5.43l.69-.16a3.89,3.89,0,0,0,1.07-.36,1.25,1.25,0,0,0,.57-.59,4.43,4.43,0,0,0,.33-1.13l.22-1.12h.84l.23,1.12a5.43,5.43,0,0,0,.33,1.13,1.28,1.28,0,0,0,.56.59,4.81,4.81,0,0,0,1.08.36l.68.16v.82l-.68.15a4,4,0,0,0-1.08.35,1.31,1.31,0,0,0-.56.6,5.43,5.43,0,0,0-.33,1.13L6.71,9.61Zm.38-.89a10.71,10.71,0,0,1,.31-1.35A2.18,2.18,0,0,1,7,6.58a1.78,1.78,0,0,1,.7-.46,7.73,7.73,0,0,1,1.1-.31v.06a9.12,9.12,0,0,1-1.1-.32A1.77,1.77,0,0,1,7,5.1a2.38,2.38,0,0,1-.44-.81A10.1,10.1,0,0,1,6.25,3h.08A10.1,10.1,0,0,1,6,4.29a2.56,2.56,0,0,1-.43.81,1.84,1.84,0,0,1-.7.45,10.36,10.36,0,0,1-1.1.32V5.81a8.59,8.59,0,0,1,1.1.31,1.86,1.86,0,0,1,.7.46A2.34,2.34,0,0,1,6,7.37a10.71,10.71,0,0,1,.31,1.35Zm7.94,11.75-.35-2.41q-.23-1.44-.45-2.4a6.09,6.09,0,0,0-.59-1.58,2.94,2.94,0,0,0-.89-1,5,5,0,0,0-1.35-.63q-.81-.24-2-.48l-1.46-.3v-.83l1.46-.3q1.17-.24,2-.48a5,5,0,0,0,1.35-.63,3,3,0,0,0,.89-1,6,6,0,0,0,.59-1.58q.22-1,.45-2.4l.35-2.41h.87l.34,2.41c.14,1,.28,1.76.44,2.4a6,6,0,0,0,.59,1.58,2.86,2.86,0,0,0,.9,1,4.7,4.7,0,0,0,1.35.62q.81.24,2,.48l1.46.3v.83l-1.46.3q-1.17.24-2,.48a5,5,0,0,0-1.35.63,2.86,2.86,0,0,0-.9,1,6.09,6.09,0,0,0-.59,1.58c-.16.64-.3,1.44-.44,2.4l-.34,2.41Zm.4-1.7c.13-1,.27-1.86.41-2.58a11.32,11.32,0,0,1,.49-1.83,4.19,4.19,0,0,1,.7-1.24,3.55,3.55,0,0,1,1-.81,7.74,7.74,0,0,1,1.48-.58c.57-.17,1.25-.33,2-.5v.08c-.8-.18-1.48-.34-2-.5a7.74,7.74,0,0,1-1.48-.58,3.55,3.55,0,0,1-1-.81,4.19,4.19,0,0,1-.7-1.24A11.32,11.32,0,0,1,15,6.35c-.14-.72-.28-1.58-.41-2.58h.06c-.14,1-.27,1.86-.41,2.58a11.32,11.32,0,0,1-.49,1.83,4.19,4.19,0,0,1-.7,1.24,3.55,3.55,0,0,1-1,.81,7.9,7.9,0,0,1-1.47.58c-.58.16-1.26.32-2.05.5v-.08c.79.17,1.47.33,2.05.5A7.28,7.28,0,0,1,12,12.3a3.55,3.55,0,0,1,1,.81,4.19,4.19,0,0,1,.7,1.24,11.32,11.32,0,0,1,.49,1.83c.14.72.27,1.58.41,2.59Z" fill="#fff"/></g></svg>',
    risk2_neutral:  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(2.0820,2.0820)scale(0.224542)"><path d="M11.5,20.47a9.11,9.11,0,0,1-3.58-.71A9.31,9.31,0,0,1,3,14.85,9.38,9.38,0,0,1,3,7.69,9.31,9.31,0,0,1,7.92,2.78a9.36,9.36,0,0,1,7.15,0,9.36,9.36,0,0,1,2.93,2,9.14,9.14,0,0,1,2.7,6.51A9.14,9.14,0,0,1,18,17.78a9.36,9.36,0,0,1-2.93,2A9.06,9.06,0,0,1,11.5,20.47Zm0-.71a8.31,8.31,0,0,0,3.3-.66,8.47,8.47,0,0,0,4.53-4.53,8.58,8.58,0,0,0,0-6.6A8.47,8.47,0,0,0,14.8,3.44a8.58,8.58,0,0,0-6.6,0A8.47,8.47,0,0,0,3.67,8a8.58,8.58,0,0,0,0,6.6A8.47,8.47,0,0,0,8.2,19.1,8.31,8.31,0,0,0,11.5,19.76ZM8.39,11.45a1,1,0,0,1-.78-.4,1.49,1.49,0,0,1,0-1.87,1,1,0,0,1,.78-.39,1,1,0,0,1,.77.39,1.49,1.49,0,0,1,0,1.87A.94.94,0,0,1,8.39,11.45ZM7.4,15v-.71h8.2V15Zm7.21-3.54a.94.94,0,0,1-.77-.4,1.49,1.49,0,0,1,0-1.87,1,1,0,0,1,.77-.39,1,1,0,0,1,.78.39,1.49,1.49,0,0,1,0,1.87A1,1,0,0,1,14.61,11.45Z" fill="#fff"/></g></svg>',
    risk3_thinking:  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(2.1007,1.8799)scale(0.226528)"><path d="M6.14,20.91A3.43,3.43,0,0,1,3.58,20a3.38,3.38,0,0,1-.87-2.45,3.36,3.36,0,0,1,.08-.79,3.56,3.56,0,0,0,.08-.68,2,2,0,0,0-.13-.71c-.08-.22-.17-.42-.26-.62a4.7,4.7,0,0,1-.25-.57,1.91,1.91,0,0,1-.1-.58,1.07,1.07,0,0,1,.3-.78,1.13,1.13,0,0,1,.83-.3,1.7,1.7,0,0,1,1,.32,2.09,2.09,0,0,1,.7.85l.07.15a3.55,3.55,0,0,0,.29.53.34.34,0,0,0,.3.14A.83.83,0,0,0,6,14.45a3.61,3.61,0,0,0,.5-.24,9.54,9.54,0,0,1,1-.46,8,8,0,0,1,1.33-.41,7.84,7.84,0,0,1,1.66-.17,2.21,2.21,0,0,1,1.15.25.79.79,0,0,1,.41.73.9.9,0,0,1-.15.51,1.35,1.35,0,0,1-.57.41,8.92,8.92,0,0,1-1.21.44l-.21.06A6.67,6.67,0,0,0,8.74,16a5.78,5.78,0,0,0-1.19.83l-.37-.44a6.43,6.43,0,0,1,1.34-1A5.3,5.3,0,0,1,9.68,15l.17-.05A8.58,8.58,0,0,0,11,14.57c.23-.11.35-.23.35-.36a.35.35,0,0,0-.23-.32,2.1,2.1,0,0,0-.71-.1,6.38,6.38,0,0,0-2.07.31,9.7,9.7,0,0,0-1.58.65,5.9,5.9,0,0,1-.7.31,1.48,1.48,0,0,1-.51.1A.79.79,0,0,1,5,15a3,3,0,0,1-.51-.83L4.41,14A1.54,1.54,0,0,0,4,13.38a1,1,0,0,0-.62-.23.59.59,0,0,0-.41.15.51.51,0,0,0-.17.41,1.29,1.29,0,0,0,.08.41c.06.15.13.31.2.46s.21.45.31.71a2.16,2.16,0,0,1,.15.81,3.36,3.36,0,0,1-.08.74,2.93,2.93,0,0,0-.08.75,2.71,2.71,0,0,0,.72,2,2.81,2.81,0,0,0,2.09.73,5.53,5.53,0,0,0,1.26-.14,4.33,4.33,0,0,0,1.09-.37c.29-.15.44-.32.44-.5a.9.9,0,0,0,0-.18.53.53,0,0,0-.09-.19l.4-.47a1.16,1.16,0,0,1,.32.84.9.9,0,0,1-.29.67,2.47,2.47,0,0,1-.78.52,5.68,5.68,0,0,1-1.1.33A7.12,7.12,0,0,1,6.14,20.91Zm5.53-.44A9,9,0,0,1,8.79,20l.4-.61a8.55,8.55,0,0,0,2.48.36A8.31,8.31,0,0,0,15,19.1a8.56,8.56,0,0,0,4.53-4.53,8.58,8.58,0,0,0,0-6.6A8.56,8.56,0,0,0,15,3.44a8.31,8.31,0,0,0-3.3-.66,8.24,8.24,0,0,0-3.3.66,8.58,8.58,0,0,0-5,9.58l-.68.18c-.06-.31-.11-.63-.15-.95s0-.65,0-1A9.08,9.08,0,0,1,5.16,4.76a9.36,9.36,0,0,1,2.93-2,9.36,9.36,0,0,1,7.15,0,9.31,9.31,0,0,1,4.91,4.91,8.94,8.94,0,0,1,.72,3.58,8.94,8.94,0,0,1-.72,3.58,9.31,9.31,0,0,1-4.91,4.91A9.06,9.06,0,0,1,11.67,20.47ZM8.85,7.55a1,1,0,0,1-.78-.38,1.42,1.42,0,0,1-.33-.94,1.4,1.4,0,0,1,.33-.94,1,1,0,0,1,1.57,0,1.4,1.4,0,0,1,.33.94,1.44,1.44,0,0,1-.32.93A1,1,0,0,1,8.85,7.55ZM11,4.31a4.51,4.51,0,0,0-1.48-1A4.7,4.7,0,0,0,7.79,3V2.26a5.38,5.38,0,0,1,2,.36,5.22,5.22,0,0,1,1.7,1.19ZM7.91,18.13l-.09-.53a1.7,1.7,0,0,0,.76-.28.6.6,0,0,0,.26-.45.54.54,0,0,0-.17-.4.94.94,0,0,0-.47-.22l.13-.53a1.21,1.21,0,0,1,.77.38,1.06,1.06,0,0,1,.31.77,1,1,0,0,1-.39.82A2.18,2.18,0,0,1,7.91,18.13Zm5.92-5.65a4.49,4.49,0,0,0-3.21-1.41,5.69,5.69,0,0,0-2.43.59L7.89,11a6.57,6.57,0,0,1,2.74-.66A5.18,5.18,0,0,1,14.32,12ZM8.1,19.28,8,18.75c.63-.12,1-.36,1-.7a.63.63,0,0,0-.17-.45l.3-.5a1,1,0,0,1,.32.41,1.25,1.25,0,0,1,.12.54,1,1,0,0,1-.36.8A2.16,2.16,0,0,1,8.1,19.28ZM16.36,5.89A4.64,4.64,0,0,0,14,5.25a5.54,5.54,0,0,0-.59,0,4.51,4.51,0,0,0-.53.09l-.16-.69c.21,0,.42-.08.64-.11s.42,0,.64,0a5.32,5.32,0,0,1,2.69.74ZM14.43,9.06a1,1,0,0,1-.79-.39,1.4,1.4,0,0,1-.33-.94,1.42,1.42,0,0,1,.33-.94,1,1,0,0,1,.79-.39,1,1,0,0,1,.79.39,1.47,1.47,0,0,1,.32.94,1.43,1.43,0,0,1-.32.94A1,1,0,0,1,14.43,9.06Z" fill="#fff"/></g></svg>',
    risk4_warning:  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(4.6448,2.2847)scale(0.227046)"><path d="M3.88,20.47A1.44,1.44,0,0,1,2.39,19a2.05,2.05,0,0,1,.22-.9L10,3.09a1.57,1.57,0,0,1,2.94,0l7.42,15a2.05,2.05,0,0,1,.22.9,1.47,1.47,0,0,1-.42,1.07,1.45,1.45,0,0,1-1.07.42Zm0-.71H19.12a.77.77,0,0,0,.57-.21A.73.73,0,0,0,19.9,19a1.26,1.26,0,0,0-.15-.59l-7.42-15a.91.91,0,0,0-.83-.62.93.93,0,0,0-.83.63l-7.42,15a1.33,1.33,0,0,0-.15.6.76.76,0,0,0,.21.56A.8.8,0,0,0,3.88,19.76Zm7.62-4.3a.43.43,0,0,1-.44-.39l-.55-6.76a1.21,1.21,0,0,1,.24-.9,1,1,0,0,1,1.51,0,1.27,1.27,0,0,1,.23.9l-.55,6.76a.36.36,0,0,1-.13.28A.44.44,0,0,1,11.5,15.46Zm0,2.42a.79.79,0,1,1,.54-.23A.74.74,0,0,1,11.5,17.88Z" fill="#fff"/></g></svg>',
    risk5_poop:  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(1.1318,1.1599)scale(0.234255)"><path d="M11.5,20.47A14.11,14.11,0,0,1,7.89,20,9.77,9.77,0,0,1,5,18.78a6,6,0,0,1-1.87-1.89,4.45,4.45,0,0,1-.67-2.39,3.23,3.23,0,0,1,.72-2.15,4.43,4.43,0,0,1,2-1.29,5.51,5.51,0,0,1-.07-.79A3.49,3.49,0,0,1,5.8,8.14a3.33,3.33,0,0,1,1.83-1.2V6.77A5.63,5.63,0,0,1,8,4.67a3.48,3.48,0,0,1,1.2-1.46A9.18,9.18,0,0,1,11.5,2.07a7.1,7.1,0,0,0,.14,1.56,1.49,1.49,0,0,0,.49.87,2.41,2.41,0,0,0,1,.42L13.6,5a4.73,4.73,0,0,1,2.25.93,2.16,2.16,0,0,1,.69,1.7,2.39,2.39,0,0,1,0,.44,3.39,3.39,0,0,1-.1.48,2.88,2.88,0,0,1,1.34,1,3,3,0,0,1,.53,1.65,4.19,4.19,0,0,1,1.66,1.37,3.33,3.33,0,0,1,.59,1.92,4.53,4.53,0,0,1-.66,2.39A6.08,6.08,0,0,1,18,18.78,9.77,9.77,0,0,1,15.1,20,14.09,14.09,0,0,1,11.5,20.47ZM9,14.09a1.86,1.86,0,0,0,1-.27,2.07,2.07,0,0,0,.72-.72,1.89,1.89,0,0,0,.27-1,1.86,1.86,0,0,0-.27-1A2.07,2.07,0,0,0,10,10.4a1.86,1.86,0,0,0-1-.27,1.89,1.89,0,0,0-1,.27,2.07,2.07,0,0,0-.72.72,1.86,1.86,0,0,0-.27,1,1.89,1.89,0,0,0,.27,1,2.07,2.07,0,0,0,.72.72A1.89,1.89,0,0,0,9,14.09ZM9,13a.92.92,0,1,1,.92-.92A.94.94,0,0,1,9,13ZM11.5,18.2A3.71,3.71,0,0,0,12.73,18a4.43,4.43,0,0,0,1.1-.58,3.09,3.09,0,0,0,.77-.81,1.68,1.68,0,0,0,.29-.9.63.63,0,0,0-.11-.38.37.37,0,0,0-.37-.1c-.61.07-1.13.13-1.56.16s-.88.06-1.35.06-.92,0-1.35-.06-1-.09-1.56-.16a.37.37,0,0,0-.37.1.63.63,0,0,0-.11.38,1.68,1.68,0,0,0,.29.9,3.09,3.09,0,0,0,.77.81,4.43,4.43,0,0,0,1.1.58A3.71,3.71,0,0,0,11.5,18.2ZM14,14.09a1.9,1.9,0,0,0,1-.27,2.13,2.13,0,0,0,.71-.72,1.89,1.89,0,0,0,.27-1,1.86,1.86,0,0,0-.27-1A2.13,2.13,0,0,0,15,10.4a2,2,0,0,0-2,0,2.07,2.07,0,0,0-.72.72,1.86,1.86,0,0,0-.27,1,1.89,1.89,0,0,0,.27,1,2.07,2.07,0,0,0,.72.72A1.89,1.89,0,0,0,14,14.09ZM14,13a.94.94,0,0,1-.92-.92A.92.92,0,1,1,14,13Z" fill="#fff"/></g></svg>'
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
              width: 28,
              height: 28,
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
