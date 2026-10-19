export default async function (ctx) {
  const city = (ctx.env && ctx.env.CITY) || 'Shanghai';
  let cur = null, why = '';
  try {
    const g = await ctx.http.get('https://geocoding-api.open-meteo.com/v1/search?count=1&language=zh&name=' + encodeURIComponent(city));
    const gj = await g.json();
    const hit = gj && gj.results && gj.results[0];
    if (!hit) throw new Error('城市没找到');
    const w = await ctx.http.get('https://api.open-meteo.com/v1/forecast?latitude=' + hit.latitude
      + '&longitude=' + hit.longitude + '&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto');
    const wj = await w.json();
    cur = (wj && wj.current) || null;
    if (!cur) throw new Error('没拿到当前天气');
  } catch (e) {
    why = String((e && e.message) || e).slice(0, 40);
  }

  const t = (s, o) => Object.assign({ type: 'text', text: String(s), font: { size: 12 }, textColor: '#E2E8F0' }, o || {});
  const temp = cur && Number.isFinite(cur.temperature_2m) ? Math.round(cur.temperature_2m) + '°' : '--';
  const hum = cur && Number.isFinite(cur.relative_humidity_2m) ? cur.relative_humidity_2m + '%' : '--';
  const CODE = { 0: '晴', 1: '少云', 2: '多云', 3: '阴', 45: '雾', 51: '毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 80: '阵雨', 95: '雷暴' };
  const desc = cur && CODE[cur.weather_code] ? CODE[cur.weather_code] : (cur ? '天气码 ' + cur.weather_code : '--');

  return {
    type: 'widget',
    padding: 14,
    gap: 8,
    backgroundGradient: { type: 'linear', colors: ['#0C0D0F', '#141619'], startPoint: { x: 0.5, y: 0 }, endPoint: { x: 0.5, y: 1 } },
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
        { type: 'image', src: 'sf-symbol:leaf.fill', width: 13, height: 13, color: '#34D399' },
        t(city, { font: { size: 13, weight: 'semibold' } }),
        { type: 'spacer' },
        t('湿度 ' + hum, { font: { size: 11 }, textColor: '#94A3B8' })
      ] },
      t(temp, { font: { size: 34, weight: 'bold' } }),
      t(desc, { font: { size: 13 }, textColor: '#CBD5E1' }),
      { type: 'spacer' },
      why
        ? t('取数失败：' + why, { font: { size: 10 }, textColor: '#F87171' })
        : { type: 'date', date: new Date().toISOString(), format: 'relative', font: { size: 10 }, textColor: '#64748B' }
    ]
  };
}
