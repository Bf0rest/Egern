// 添加环境变量，名称：GROUP，值：策略组名称
// 全参数诊断面板 — 仅 systemLarge

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


  // --- fetch outgoing IP + latency ---
  let ip = '--';
  let latency = '--';
  let fetchOk = false;
  const t0 = Date.now();

  try {
    const resp = await ctx.http.get(
      'https://httpbin.org/ip',
      { policy: strategyGroup, timeout: 8000 }
    );
    const body = await resp.json();
    ip = body.origin || '--';
    latency = (Date.now() - t0) + 'ms';
    fetchOk = true;
  } catch(e) {
    latency = (Date.now() - t0) + 'ms';
  }


  // --- $utils IP lookups ---
  const geoCountry = ip !== '--' ? ($utils.geoip(ip) || 'null') : '--';
  const geoAsn     = ip !== '--' ? ($utils.ipasn(ip) || 'null') : '--';
  const geoAso     = ip !== '--' ? ($utils.ipaso(ip) || 'null') : '--';


  // --- device / local network ---
  const wifiSsid  = ($network && $network.wifi && $network.wifi.ssid)  || 'null';
  const wifiBssid = ($network && $network.wifi && $network.wifi.bssid) || 'null';
  const cellRadio   = ($network && $network['cellular-data'] && $network['cellular-data'].radio)   || 'null';
  const cellCarrier = ($network && $network['cellular-data'] && $network['cellular-data'].carrier) || 'null';
  const localV4     = ($network && $network.v4 && $network.v4.primaryAddress) || 'null';
  const localV4Gw   = ($network && $network.v4 && $network.v4.primaryRouter)   || 'null';
  const localV6     = ($network && $network.v6 && $network.v6.primaryAddress)  || 'null';
  const dnsServers  = ($network && $network.dns) ? JSON.stringify($network.dns) : 'null';


  // --- Egern / system ---
  const egVersion  = (Egern && Egern.version)  || 'null';
  const egLanguage = (Egern && Egern.language) || 'null';
  const sysSystem  = ($environment && $environment.system) || 'null';
  const sysLang    = ($environment && $environment.language) || 'null';


  // --- helpers ---
  function row(label, value, valueColor) {
    return {
      type: 'stack',
      direction: 'row',
      children: [
        { type: 'text', text: label, font: { size: 'caption2', weight: 'medium' }, textColor: C.muted },
        { type: 'spacer' },
        { type: 'text', text: value, font: { size: 'caption2', weight: 'medium' }, textColor: valueColor || C.secondary, textAlign: 'right', maxLine: 1 }
      ]
    };
  }

  function section(title) {
    return {
      type: 'text',
      text: title,
      font: { size: 'caption1', weight: 'bold' },
      textColor: C.blue
    };
  }


  // --- output ---

  return {
    type: 'widget',
    backgroundGradient: premiumGradient,
    border: { width: 1, color: C.borderColor },
    padding: 16,
    gap: 6,

    children: [

      // header
      {
        type: 'stack',
        direction: 'row',
        children: [
          {
            type: 'stack',
            direction: 'row',
            gap: 6,
            children: [
              { type: 'image', src: 'sf-symbol:globe', width: 14, height: 14, color: C.green },
              { type: 'text', text: 'IPWhois', font: { size: 'headline', weight: 'bold' }, textColor: C.text }
            ]
          },
          { type: 'spacer' },
          { type: 'text', text: strategyGroup, font: { size: 'caption1', weight: 'bold' }, textColor: C.blue }
        ]
      },

      { type: 'spacer', height: 4 },

      section('出口'),
      row('IP', ip, C.green),
      row('延迟', latency, C.secondary),

      { type: 'spacer', height: 2 },
      section('$utils'),
      row('geoip (国家)', String(geoCountry), geoCountry !== 'null' ? C.green : C.yellow),
      row('ipasn (ASN)',   String(geoAsn),     geoAsn     !== 'null' ? C.green : C.yellow),
      row('ipaso (运营商)', geoAso,             geoAso     !== 'null' ? C.green : C.yellow),

      { type: 'spacer', height: 2 },
      section('本地网络 ($network)'),
      row('Wi-Fi SSID',  wifiSsid,  wifiSsid  !== 'null' ? C.green : C.yellow),
      row('Wi-Fi BSSID', wifiBssid, wifiBssid !== 'null' ? C.green : C.yellow),
      row('蜂窝制式',     cellRadio,   cellRadio   !== 'null' ? C.green : C.yellow),
      row('蜂窝运营商',   cellCarrier, cellCarrier !== 'null' ? C.green : C.yellow),
      row('IPv4 地址',   localV4,   localV4   !== 'null' ? C.green : C.yellow),
      row('IPv4 网关',   localV4Gw, localV4Gw !== 'null' ? C.green : C.yellow),
      row('IPv6 地址',   localV6,   localV6   !== 'null' ? C.green : C.yellow),
      row('DNS',          dnsServers, dnsServers !== 'null' ? C.green : C.yellow),

      { type: 'spacer', height: 2 },
      section('环境'),
      row('Egern',  egVersion,  C.green),
      row('系统',    sysSystem,  C.green),
      row('语言',    sysLang,    C.secondary),

    ]
  };

}
