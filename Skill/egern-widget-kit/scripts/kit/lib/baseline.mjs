export const HIG = {
  '430': {
    screen: '430×932（14/15 Pro Max 那代）', src: 'official',
    sm: [170, 170], md: [364, 170], lg: [364, 382],
    lock: { circular: [76, 76], rect: [172, 76], inline: [257, 26] },
    note: '官方 HIG《Widgets → iOS dimensions》原表（2026-10-20 核对，该页 2026-10-13 更新）'
  },
  '428': {
    screen: '428×926（12/13 Pro Max、14 Plus）', src: 'official',
    sm: [170, 170], md: [364, 170], lg: [364, 382],
    lock: { circular: [76, 76], rect: [172, 76], inline: [257, 26] },
    note: '官方原表（2026-10-20 核对）'
  },
  '414': {
    screen: '414×896（11 Pro Max / XS Max）', src: 'official',
    sm: [169, 169], md: [360, 169], lg: [360, 379],
    lock: { circular: [76, 76], rect: [160, 72], inline: [248, 26] },
    note: '官方原表（2026-10-20 核对）'
  },
  '414736': {
    screen: '414×736（6/7/8 Plus）', src: 'official',
    sm: [159, 159], md: [348, 157], lg: [348, 357],
    lock: { circular: [76, 76], rect: [170, 76], inline: [248, 26] },
    note: '官方原表（2026-10-20 核对）。这一档中件高 157 < 小件 159，官方表如此，不是笔误'
  },
  '402': {
    screen: '402×874（iPhone 17）', src: 'derived',
    sm: [164, 164], md: [349, 164], lg: [349, 366],
    lock: { circular: [72, 72], rect: [160, 72], inline: [234, 26] },
    how: '官方表没有 402 档 ⇒ 按相邻 393 / 414 两档插值 163.5 / 349×163.5 / 349×366.5，取整',
    note: '与 iPhone 17 实测（164.3 / 349.7×164.3 / 349.7×365）差 ≤1.5pt，互为印证'
  },
  '393': {
    screen: '393×852（14 Pro / 15 / 16）', src: 'official',
    sm: [158, 158], md: [338, 158], lg: [338, 354],
    lock: { circular: [72, 72], rect: [160, 72], inline: [234, 26] },
    note: '官方原表（2026-10-20 核对）'
  },
  '390': {
    screen: '390×844（13/12 那代）', src: 'official',
    sm: [158, 158], md: [338, 158], lg: [338, 354],
    lock: { circular: [72, 72], rect: [160, 72], inline: [234, 26] },
    note: '官方原表。旧记录 162 / 344×162 / 344×344 是这台设备的实测值，与官方差 4~10pt（原因未定论）'
  },
  '375': {
    screen: '375×812（X / XS / 11 Pro / 12·13 mini）', src: 'official',
    sm: [155, 155], md: [329, 155], lg: [329, 345],
    lock: { circular: [72, 72], rect: [157, 72], inline: [225, 26] },
    note: '官方原表（2026-10-20 核对）'
  },
  '375667': {
    screen: '375×667（SE 2/3 代、6/7/8）', src: 'official',
    sm: [148, 148], md: [321, 148], lg: [321, 324],
    lock: { circular: [68, 68], rect: [153, 68], inline: [225, 26] },
    note: '官方原表（2026-10-20 核对）'
  },
  '360': {
    screen: '360×780（官方 iOS 段里的小屏档）', src: 'official',
    sm: [155, 155], md: [329, 155], lg: [329, 345],
    lock: { circular: [72, 72], rect: [157, 72], inline: [225, 26] },
    note: '官方原表（2026-10-20 核对）'
  },
  '320': {
    screen: '320×568（SE 1 代）', src: 'official',
    sm: [141, 141], md: [292, 141], lg: [292, 311],
    lock: null,
    note: '官方表里锁屏三档是 N/A（该屏宽不支持锁屏组件）'
  }
};

export const IPAD = {
  screen: 'iPad（官方表逐设备给 Canvas / Device 两行）', src: 'official',
  base: '820×1180',
  rows: [
    { device: '768×1024', canvas: { sm: 141, md: [305.5, 141], lg: [305.5, 305.5], xl: [634.5, 305.5] }, drawn: { sm: 120, md: [260, 120], lg: [260, 260], xl: [540, 260] } },
    { device: '744×1133', canvas: { sm: 141, md: [305.5, 141], lg: [305.5, 305.5], xl: [634.5, 305.5] }, drawn: { sm: 120, md: [260, 120], lg: [260, 260], xl: [540, 260] } },
    { device: '810×1080', canvas: { sm: 146, md: [320.5, 146], lg: [320.5, 320.5], xl: [669, 320.5] }, drawn: { sm: 124, md: [272, 124], lg: [272, 272], xl: [568, 272] } },
    { device: '820×1180', canvas: { sm: 155, md: [342, 155], lg: [342, 342], xl: [715.5, 342] }, drawn: { sm: 136, md: [300, 136], lg: [300, 300], xl: [628, 300] } },
    { device: '834×1112', canvas: { sm: 150, md: [327.5, 150], lg: [327.5, 327.5], xl: [682, 327.5] }, drawn: { sm: 132, md: [288, 132], lg: [288, 288], xl: [600, 288] } },
    { device: '834×1194', canvas: { sm: 155, md: [342, 155], lg: [342, 342], xl: [715.5, 342] }, drawn: { sm: 136, md: [300, 136], lg: [300, 300], xl: [628, 300] } },
    { device: '954×1373（显示缩放 More Space）', canvas: { sm: 162, md: [350, 162], lg: [350, 350], xl: [726, 350] }, drawn: { sm: 162, md: [350, 162], lg: [350, 350], xl: [726, 350] } },
    { device: '970×1389（显示缩放 More Space）', canvas: { sm: 162, md: [350, 162], lg: [350, 350], xl: [726, 350] }, drawn: { sm: 162, md: [350, 162], lg: [350, 350], xl: [726, 350] } },
    { device: '1024×1366', canvas: { sm: 170, md: [378.5, 170], lg: [378.5, 378.5], xl: [795, 378.5] }, drawn: { sm: 160, md: [356, 160], lg: [356, 356], xl: [748, 356] } },
    { device: '1192×1590（显示缩放 More Space）', canvas: { sm: 188, md: [412, 188], lg: [412, 412], xl: [860, 412] }, drawn: { sm: 188, md: [412, 188], lg: [412, 412], xl: [860, 412] } }
  ],
  note: 'Canvas = 官方「设计画布」列，Device = 实际绘制列；两列之比逐设备不同（≈0.849 ~ 1.000），官方没给通用缩放公式。本仓默认取 820×1180 的 Canvas（715.5×342）。'
};

export const LOCK = Object.fromEntries(
  Object.entries(HIG)
    .filter(([, r]) => r.lock)
    .map(([k, r]) => [k, { screen: r.screen, src: r.src, ...r.lock, note: r.note }])
);

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
  { what: '行高', real: '主屏 12pt 行盒实测 ≈14.3pt（≈1.19× 字号，2026-10-20 从大件截图量得）；锁屏 11pt 三行行距 14.3–15.3pt（≈1.3–1.4×）',
    draft: '稿页渲染层默认 1.25×',
    effect: '主屏按 1.35× 算会把每行多算 ≈2pt、余量结论偏紧；锁屏矩形类稿子要显式覆盖 line-height' }
];

const MISSING = (screen) =>
  new Error(`屏宽档 ${screen} 未记录 —— 请查 Apple HIG《Widgets → iOS dimensions》原表后补进 lib/baseline.mjs，禁止猜值`);

export const SCREENS = Object.keys(HIG);

export function canvas(kind, screen = BASE) {
  const row = HIG[screen];
  if (!row) throw MISSING(screen);
  if (kind === 'xl') {
    const r = IPAD.rows.find((x) => x.device.indexOf(IPAD.base) === 0);
    return { w: r.canvas.xl[0], h: r.canvas.xl[1], src: 'official', screen,
      note: `iPad ${IPAD.base} 的 Canvas 列；同一档的 Device 列是 ${r.drawn.xl.join('×')}` };
  }
  const v = row[kind];
  if (!v) throw new Error(`未知档位 ${kind}（可用：sm / md / lg / xl）`);
  return { w: v[0], h: v[1], src: row.src, screen, note: row.note || row.how || '' };
}

export function lockCanvas(kind, screen = BASE) {
  const row = HIG[screen];
  if (!row) throw MISSING(screen);
  if (!row.lock) throw new Error(`屏宽档 ${screen} 官方表里锁屏三档是 N/A`);
  const v = row.lock[kind];
  if (!v) throw new Error(`未知锁屏档位 ${kind}（可用：rect / circular / inline）`);
  return { w: v[0], h: v[1], src: row.src, screen, note: row.note || row.how || '' };
}

export function cssCanvas(screen = BASE) {
  return ['sm', 'md', 'lg'].reduce((o, k) => (o[k] = canvas(k, screen), o), {});
}

export function screenTable() {
  return SCREENS.map((k) => {
    const r = HIG[k];
    return { key: k, screen: r.screen, src: r.src, sm: r.sm, md: r.md, lg: r.lg, lock: r.lock };
  });
}

export function provenanceText(screen = BASE, { lockOnly = false } = {}) {
  const c = cssCanvas(screen);
  const locks = HIG[screen] && HIG[screen].lock;
  const main = lockOnly ? '' :
    `画布：HIG ${screen} 档（${HIG[screen].src === 'derived' ? '官方表插值' : '官方表'}）`
    + ` 小 ${c.sm.w}×${c.sm.h} / 中 ${c.md.w}×${c.md.h} / 大 ${c.lg.w}×${c.lg.h}`;
  const lock = locks ? `锁屏：矩形 ${locks.rect.join('×')} / 圆形 ${locks.circular.join('×')} / inline ${locks.inline.join('×')}` : '锁屏：该档 N/A';
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
  for (const [screen, row] of Object.entries(HIG)) {
    if (!['official', 'derived'].includes(row.src)) problems.push(`HIG[${screen}] src=${row.src} 非法（assumed 禁止入基座）`);
    if (row.src === 'derived' && !row.how) problems.push(`HIG[${screen}] 是 derived 但没写 how`);
    for (const k of ['sm', 'md', 'lg']) {
      const v = row[k];
      if (!Array.isArray(v) || v.length !== 2) problems.push(`HIG[${screen}].${k} 形状不对`);
    }
    if (!row.note) problems.push(`HIG[${screen}] 缺 note（来源说明）`);
    if (row.lock) {
      for (const k of ['circular', 'rect', 'inline']) {
        if (!Array.isArray(row.lock[k]) || row.lock[k].length !== 2) problems.push(`HIG[${screen}].lock.${k} 形状不对`);
      }
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
  console.log(`  xl  ${canvas('xl').w}×${canvas('xl').h}  [${canvas('xl').src}]  ${canvas('xl').note}`);
  console.log(`锁屏：`);
  for (const k of ['rect', 'circular', 'inline']) { const v = lockCanvas(k); console.log(`  ${k}  ${v.w}×${v.h}  [${v.src}]`); }
  console.log(`\n官方表收录 ${SCREENS.length} 个屏宽档：${SCREENS.join(' / ')}`);
  console.log(`圆角：home ${RADIUS.home.value}pt [${RADIUS.home.src}] / lock ${RADIUS.lock.value}pt [${RADIUS.lock.src}]`);
  console.log(`\n稿页头将打印：\n  ${provenanceText()}`);
  const { problems, deltas } = check();
  console.log(`\n自检：`);
  console.log(problems.length ? problems.map((p) => '  ✗ ' + p).join('\n') : '  ✓ 每条数值都有来源，无 assumed，结构完整');
  console.log(deltas.length ? deltas.map((d) => '  ⚠ ' + d).join('\n') : `  ✓ 实测与官方差 ≤${MEASURED_TOLERANCE}pt（实测只作校验，不参与排版）`);
  if (problems.length) process.exitCode = 1;
}
