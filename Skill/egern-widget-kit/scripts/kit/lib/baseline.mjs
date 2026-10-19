export const HIG = {
  '390': {
    screen: '390×844（13/12 那代）', src: 'official',
    sm: [158, 158], md: [338, 158], lg: [338, 354],
    note: '旧记录 162 / 344×162 / 344×344 是这台设备的**实测**值，与官方框差 ≈4pt（来源未定论：玻璃软边 / 截图含阴影）'
  },
  '402': {
    screen: '402×874（iPhone 17）', src: 'derived',
    sm: [164, 164], md: [349, 164], lg: [349, 366],
    how: '官方表无 402 档 ⇒ 按相邻 393 / 414 档插值 163.5 / 349×163.5 / 349×366.5，取整',
    note: '与 iPhone 17 实测（164.3 / 349.7×164.3 / 349.7×365）差 ≤1.5pt，互为印证'
  },
  '430': {
    screen: '430×932 / 428×926（Pro Max 那代）', src: 'official',
    sm: [170, 170], md: [364, 170], lg: [364, 382],
    note: '⚠️ 按这一档排版会在 390 屏上多算 ≈38pt（382 vs 354）—— 只是给"目标设备是大屏"时留的参照'
  }
};

export const LOCK = {
  '390': {
    screen: '390/393/414 档', src: 'official',
    rect: [160, 72], circular: [72, 72], inline: [234, 26],
    note: '截图量到 162×72 是玻璃软边误差 —— 画布只认 HIG 表，不认截图反推'
  },
  '402': {
    screen: '402×874（iPhone 17）', src: 'derived',
    rect: [160, 72], circular: [72, 72], inline: [234, 26],
    how: 'HIG 393 / 414 两档都是 160×72（圆形 72、inline 234）⇒ 402 夹在中间取同值'
  },
  '430': {
    screen: '430×932 / 428×926', src: 'official',
    rect: [172, 76], circular: [76, 76], inline: [257, 26]
  }
};

export const BASE = '402';

export const MEASURED = [
  {
    device: 'iPhone 17', screen: '402', date: '2026-10-17',
    how: '截图量取（±3pt）',
    sm: [164.3, 164.3], md: [349.7, 164.3], lg: [349.7, 365]
  },
  {
    device: '390 屏那代（旧机）', screen: '390', date: '≤2026-10-15',
    how: '截图标定（小件是正方形 ⇒ 用它的宽高比定 scale）',
    sm: [162, 162], md: [344, 162], lg: [344, 344]
  }
];

export const MEASURED_TOLERANCE = 2;

export const RADIUS = {
  home: { value: 16, src: 'measured', how: '截图边缘量弧长，±3pt', note: 'HIG《Widgets》与《Layout》都没有这个数' },
  lock: { value: 14, src: 'measured', how: '截图边缘量弧长 ≈14pt（±3）', note: '真机是系统的连续圆角，这里只求"别太圆"' }
};

export const IRREPRODUCIBLE = [
  { what: '字体', real: 'SF Pro（西文 / 数字）+ 苹方（中文），苹果专有、装不进 Windows',
    draft: 'Inter ≈ SF Pro、Noto Sans SC ≈ 苹方（开源替身，接近而非一致）',
    effect: '字号 / 位置可信，字重 / 字型 / 笔画粗细不可信' },
  { what: '行高', real: '按字号实测 ≈1.35×（11pt 三行行距 14.3–15.3pt）',
    draft: '稿页渲染层默认 1.25×（偏松）',
    effect: '锁屏矩形类稿子要显式覆盖 line-height' }
];

const MISSING = (screen) =>
  new Error(`屏宽档 ${screen} 未记录 —— 请查 Apple HIG《Widgets → iOS dimensions》原表后补进 lib/baseline.mjs，禁止猜值`);

export function canvas(kind, screen = BASE) {
  const row = HIG[screen];
  if (!row) throw MISSING(screen);
  if (kind === 'xl') {
    return { w: 715.5, h: 342, src: 'derived', screen,
      note: 'iPad Air 10.9"（820×1180）档；官方区间 634.5×305.5 ~ 860×412。结构可信，尺寸随 iPad 型号变' };
  }
  const v = row[kind];
  if (!v) throw new Error(`未知档位 ${kind}（可用：sm / md / lg / xl）`);
  return { w: v[0], h: v[1], src: row.src, screen, note: row.note || row.how || '' };
}

export function lockCanvas(kind, screen = BASE) {
  const row = LOCK[screen];
  if (!row) throw MISSING(screen);
  const v = row[kind];
  if (!v) throw new Error(`未知锁屏档位 ${kind}（可用：rect / circular / inline）`);
  return { w: v[0], h: v[1], src: row.src, screen, note: row.note || row.how || '' };
}

export function cssCanvas(screen = BASE) {
  return ['sm', 'md', 'lg'].reduce((o, k) => (o[k] = canvas(k, screen), o), {});
}

export function provenanceText(screen = BASE, { lockOnly = false } = {}) {
  const c = cssCanvas(screen);
  const locks = LOCK[screen];
  const main = lockOnly ? '' :
    `画布：HIG ${screen} 档（${HIG[screen].src === 'derived' ? '官方表插值' : '官方表'}）`
    + ` 小 ${c.sm.w}×${c.sm.h} / 中 ${c.md.w}×${c.md.h} / 大 ${c.lg.w}×${c.lg.h}`;
  const lock = locks ? `锁屏：矩形 ${locks.rect.join('×')} / 圆形 ${locks.circular.join('×')} / inline ${locks.inline.join('×')}` : '';
  return [main, lock].filter(Boolean).join('；');
}

export function provenanceHtml(screen = BASE, opts = {}) {
  const irr = IRREPRODUCIBLE.map((i) => `${i.what}：真机 ${i.real}；稿页只能 ${i.draft} ⇒ ${i.effect}`).join('；');
  return `<p style="color:#64748B;font-size:11.5px;margin:7px 0 0;max-width:1000px">`
    + `<b>基座</b>：${provenanceText(screen, opts)}。${irr}。`
    + `来源与分级见 scripts/kit/lib/baseline.mjs（official / derived / measured）。</p>`;
}

export function check() {
  const problems = [];
  const seen = new Set();
  for (const [screen, row] of Object.entries(HIG)) {
    if (!['official', 'derived'].includes(row.src)) problems.push(`HIG[${screen}] src=${row.src} 非法（assumed 禁止入基座）`);
    if (row.src === 'derived' && !row.how) problems.push(`HIG[${screen}] 是 derived 但没写 how`);
    for (const k of ['sm', 'md', 'lg']) {
      const v = row[k];
      if (!Array.isArray(v) || v.length !== 2) problems.push(`HIG[${screen}].${k} 形状不对`);
      if (!row.note) problems.push(`HIG[${screen}].${k} 缺 note（来源说明）`);
      const key = v.join('×');
      if (seen.has(`${k}:${key}`)) {  }
      seen.add(`${k}:${key}`);
    }
  }
  for (const [screen, row] of Object.entries(LOCK)) {
    for (const k of ['rect', 'circular', 'inline']) {
      if (!Array.isArray(row[k])) problems.push(`LOCK[${screen}].${k} 形状不对`);
    }
  }
  const deltas = [];
  for (const m of MEASURED) {
    const row = HIG[m.screen];
    if (!row) { problems.push(`MEASURED 里的屏宽档 ${m.screen} 不在 HIG 表内`); continue; }
    for (const k of ['sm', 'md', 'lg']) {
      const d = Math.max(Math.abs(m[k][0] - row[k][0]), Math.abs(m[k][1] - row[k][1]));
      if (d > MEASURED_TOLERANCE) deltas.push(`${m.device} ${k}: 实测 ${m[k].join('×')} vs 官方 ${row[k].join('×')} 差 ${d.toFixed(1)}pt`);
    }
  }
  const xl = canvas('xl');
  if (xl.w < 634.5 || xl.w > 860) problems.push(`xl 宽 ${xl.w} 落在官方区间 634.5~860 之外`);
  return { problems, deltas };
}

if (process.argv[1] && process.argv[1].endsWith('baseline.mjs')) {
  const c = cssCanvas();
  console.log(`基座：BASE=${BASE}（${HIG[BASE].screen}，${HIG[BASE].src}）`);
  console.log(`\n主屏（发布排版用这一套）：`);
  for (const k of ['sm', 'md', 'lg']) console.log(`  ${k}  ${c[k].w}×${c[k].h}  [${c[k].src}]${c[k].note ? '  ' + c[k].note : ''}`);
  console.log(`  xl  ${canvas('xl').w}×${canvas('xl').h}  [derived]`);
  console.log(`锁屏：`);
  for (const k of ['rect', 'circular', 'inline']) { const v = lockCanvas(k); console.log(`  ${k}  ${v.w}×${v.h}  [${v.src}]`); }
  console.log(`圆角：home ${RADIUS.home.value}pt [${RADIUS.home.src}] / lock ${RADIUS.lock.value}pt [${RADIUS.lock.src}]`);
  console.log(`\n稿页头将打印：\n  ${provenanceText()}`);
  const { problems, deltas } = check();
  console.log(`\n自检：`);
  console.log(problems.length ? problems.map((p) => '  ✗ ' + p).join('\n') : '  ✓ 每条数值都有来源，无 assumed，结构完整');
  console.log(deltas.length ? deltas.map((d) => '  ⚠ ' + d).join('\n') : `  ✓ 实测与官方差 ≤${MEASURED_TOLERANCE}pt（实测只作校验，不参与排版）`);
  if (problems.length) process.exitCode = 1;
}
