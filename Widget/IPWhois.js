// 添加环境变量，名称：GROUP，值：策略组名称
// 全参数诊断面板

export default async function(ctx) {

  const strategyGroup = ctx.env.GROUP || 'DIRECT';
  const widgetFamily = ctx.widgetFamily || 'systemLarge';

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

  const gradient = {
    type: 'linear',
    colors: [C.bgTop, C.bgBottom],
    startPoint: { x: 0.5, y: 0 },
    endPoint: { x: 0.5, y: 1 }
  };


  // --- 出口 IP + 延迟 ---
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


  // --- $utils ---
  const geoCountry = ip !== '--' ? ($utils.geoip(ip) || 'null') : '--';
  const geoAsn     = ip !== '--' ? ($utils.ipasn(ip) || 'null') : '--';
  const geoAso     = ip !== '--' ? ($utils.ipaso(ip) || 'null') : '--';


  // --- 本地网络 ---
  const wifiSsid    = ($network && $network.wifi && $network.wifi.ssid)  || 'null';
  const wifiBssid   = ($network && $network.wifi && $network.wifi.bssid) || 'null';
  const cellRadio   = ($network && $network['cellular-data'] && $network['cellular-data'].radio)   || 'null';
  const cellCarrier = ($network && $network['cellular-data'] && $network['cellular-data'].carrier) || 'null';
  const localV4     = ($network && $network.v4 && $network.v4.primaryAddress) || 'null';
  const localV4Gw   = ($network && $network.v4 && $network.v4.primaryRouter)   || 'null';
  const localV6     = ($network && $network.v6 && $network.v6.primaryAddress)  || 'null';
  const dnsStr      = ($network && $network.dns) ? JSON.stringify($network.dns) : 'null';


  // --- 环境 ---
  const egVersion  = (Egern && Egern.version)  || 'null';
  const sysSystem  = ($environment && $environment.system) || 'null';


  // --- helper ---
  function kv(label, value, ok) {
    return {
      type: 'stack',
      direction: 'row',
      children: [
        { type: 'text', text: label, font: { size: 'caption2', weight: 'medium' }, textColor: C.muted },
        { type: 'spacer' },
        { type: 'text', text: value, font: { size: 'caption2', weight: 'medium' }, textColor: ok ? C.green : C.yellow, textAlign: 'right', maxLine: 1 }
      ]
    };
  }

  function title(t) {
    return { type: 'text', text: t, font: { size: 'caption1', weight: 'bold' }, textColor: C.blue };
  }


  return {
    type: 'widget',
    backgroundGradient: gradient,
    border: { width: 1, color: C.borderColor },
    padding: 14,
    gap: 4,

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
              { type: 'image', src: 'sf-symbol:globe', width: 14, height: 14, color: C.green },
              { type: 'text', text: 'IPWhois', font: { size: 'headline', weight: 'bold' }, textColor: C.text }
            ]
          },
          { type: 'spacer' },
          { type: 'text', text: strategyGroup, font: { size: 'caption1', weight: 'bold' }, textColor: C.blue }
        ]
      },

      { type: 'spacer', height: 2 },

      title('出口'),
      kv('IP',     ip,      fetchOk),
      kv('延迟',   latency, fetchOk),

      { type: 'spacer', height: 2 },
      title('$utils'),
      kv('geoip',  String(geoCountry), geoCountry !== 'null'),
      kv('ipasn',  String(geoAsn),     geoAsn     !== 'null'),
      kv('ipaso',  geoAso,             geoAso     !== 'null'),

      { type: 'spacer', height: 2 },
      title('本地网络'),
      kv('SSID',    wifiSsid,  wifiSsid  !== 'null'),
      kv('BSSID',   wifiBssid, wifiBssid !== 'null'),
      kv('蜂窝制式', cellRadio,   cellRadio   !== 'null'),
      kv('蜂窝运营商', cellCarrier, cellCarrier !== 'null'),
      kv('IPv4',    localV4,   localV4   !== 'null'),
      kv('IPv4 GW', localV4Gw, localV4Gw !== 'null'),
      kv('IPv6',    localV6,   localV6   !== 'null'),
      kv('DNS',     dnsStr,    dnsStr    !== 'null'),

      { type: 'spacer', height: 2 },
      title('环境'),
      kv('Egern',  egVersion, egVersion !== 'null'),
      kv('系统',    sysSystem, sysSystem !== 'null'),

    ]
  };

}
