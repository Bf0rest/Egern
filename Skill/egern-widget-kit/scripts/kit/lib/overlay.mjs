// 稿页读数浮层 —— 给"交流用"的那一层：
//   鼠标划过组件里的元素 → 浮标（页面级固定层，**不会被组件的 overflow:hidden 裁掉**）
//   点一下 → 钉住；再划过别的元素 → 左下角读数条给差值
//   Esc 或点空白 → 清除
//
// 两处分工：
//   · 元素上的浮标：只给 **名字 · 左边(x) · 尺寸**（信息少，不挡视线、不会被裁）
//   · 左下角读数条：给全量 —— x/y、w×h、层级路径、以及与钉住元素的 Δ左/Δ上/Δ右/Δ下/Δ中X/Δ中Y
//
// 坐标口径（**全部按边缘，不按中心**）：
//   原点 = 组件（.widget）的**外框左上角**；x = 元素**左边缘**到它的距离；y = **上边缘**到它的距离；
//   w×h = 元素外框尺寸（含 padding / border，即 getBoundingClientRect 的语义）。
//   所以「Δ上 +2.6」= 这个元素的上边缘比钉住那个低 2.6pt；「Δ下」比的是下边缘；
//   要看"中心对齐了吗"就读读数条里的 Δ中Y / Δ中X（中心之差）。
//
// 为什么用 JS：尺寸只有浏览器量得到（`hug_contents` / `flex:1` 的节点没有声明值）；
// 面板 file 标签**会执行内联脚本**（2026-10-18 实测 `document.title` 被改），这条路可用。
// 纯 CSS 兜底版本（拿不到真实尺寸）：`[data-eg]:hover{outline:1px dashed}`
//   + `[data-eg]:hover::after{content:attr(data-eg-label)}`。
//
// ⚠️ 读数单位 px = pt（稿页 1:1 真机画布），但这是**近似稿像素** ——
//   按 `references/稿子纪律.md` 不作证据，只用来把"左一点右一点"说成一个数。
//
// 接入：壳里一行 `<script>${overlayJs()}</script>`（放在 </body> 前）。
// 标注属性由 渲染层 的 egAttrs() 打在元素上（data-eg / -label / -path / -decl）。

const CSS = [
  '.widget{position:relative}',                       // 虚线框那一层的定位基准（必须）
  '.eg-layer{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:9}',
  '.eg-box{position:absolute;box-sizing:border-box;border:1px dashed #60A5FA;background:rgba(96,165,250,.07)}',
  '.eg-box.pin{border-style:solid;border-color:#F59E0B;background:rgba(245,158,11,.08)}',
  '#eg-tags{position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:9998}',
  '.eg-tag{position:fixed;background:#0b0c0e;color:#93C5FD;border:1px solid #60A5FA;border-radius:3px;',
  '  font:10px/1.5 "Inter","Noto Sans SC",sans-serif;padding:1px 6px;white-space:nowrap;',
  '  box-shadow:0 2px 8px rgba(0,0,0,.45)}',
  '.eg-tag.pin{color:#FCD34D;border-color:#F59E0B}',
  '#eg-bar{position:fixed;left:12px;bottom:12px;z-index:9999;max-width:94vw;',
  '  background:rgba(11,12,14,.95);color:#E2E8F0;border:1px solid #334155;border-radius:6px;',
  '  font:11px/1.7 ui-monospace,Consolas,monospace;padding:6px 10px;white-space:pre-wrap;user-select:text}',
  '#eg-bar b{color:#93C5FD}',
  '#eg-bar i{color:#64748B;font-style:normal}'
].join('\n');

const HINT = '<b>读数</b> <i>划过元素 → 名字 / 左边 / 尺寸（px = pt，稿页 1:1；坐标全按边缘算）｜点一下钉住 → 再划别的元素，左下角给 Δ左/Δ上/Δ右/Δ下/Δ中｜Esc 清除</i>';

const LINES = [
  '(function () {',
  '  var pins = [], hover = null, layers = [], bar, tagLayer;',
  '  var CSS = ' + JSON.stringify(CSS) + ';',
  '  var HINT = ' + JSON.stringify(HINT) + ';',
  '',
  '  function fmt(n) { return String(Math.round(n * 10) / 10); }',
  '  function signed(n) { var v = Math.round(n * 10) / 10; return (v > 0 ? "+" : "") + v; }',
  '  function widgetOf(el) { return el && el.closest ? el.closest(".widget") : null; }',
  '  function layerOf(w) {',
  '    for (var i = 0; i < layers.length; i++) if (layers[i].w === w) return layers[i].l;',
  '    var l = document.createElement("div"); l.className = "eg-layer"; w.appendChild(l);',
  '    layers.push({ w: w, l: l }); return l;',
  '  }',
  '  function clearLayers() { for (var i = 0; i < layers.length; i++) layers[i].l.textContent = ""; }',
  '  function clearTags() { if (tagLayer) tagLayer.textContent = ""; }',
  '  function geom(el) {',
  '    var w = widgetOf(el); if (!w) return null;',
  '    var r = el.getBoundingClientRect(), wr = w.getBoundingClientRect();',
  '    return {',
  '      x: r.left - wr.left, y: r.top - wr.top, w: r.width, h: r.height,',
  '      cx: (r.left + r.width / 2) - (wr.left + wr.width / 2),',
  '      cy: (r.top + r.height / 2) - (wr.top + wr.height / 2),',
  '      vx: r.left, vy: r.top, vw: r.width, vh: r.height',
  '    };',
  '  }',
  '  function label(el) { return el.getAttribute("data-eg-label") || el.getAttribute("data-eg") || "?"; }',
  '  function drawTag(el, g, isPin) {',
  '    var t = document.createElement("div"); t.className = "eg-tag" + (isPin ? " pin" : "");',
  '    t.textContent = label(el) + "  x=" + fmt(g.x) + "  " + fmt(g.w) + "×" + fmt(g.h) + "pt";',
  '    var top = g.vy - 16;',
  '    if (top < 2) top = g.vy + g.vh + 2;',
  '    t.style.left = Math.max(2, Math.min(g.vx, window.innerWidth - 280)) + "px";',
  '    t.style.top = Math.max(2, top) + "px";',
  '    tagLayer.appendChild(t);',
  '  }',
  '  function draw(el, isPin, from) {',
  '    var w = widgetOf(el), g = geom(el); if (!w || !g) return null;',
  '    var l = layerOf(w);',
  '    var box = document.createElement("div"); box.className = "eg-box" + (isPin ? " pin" : "");',
  '    box.style.left = g.x + "px"; box.style.top = g.y + "px";',
  '    box.style.width = g.w + "px"; box.style.height = g.h + "px";',
  '    l.appendChild(box);',
  '    drawTag(el, g, isPin);',
  '    var txt = label(el) + "  x=" + fmt(g.x) + " y=" + fmt(g.y) + "  " + fmt(g.w) + "×" + fmt(g.h) + "pt";',
  '    if (from) {',
  '      txt += "   Δ左 " + signed(g.x - from.x) + "  Δ上 " + signed(g.y - from.y)',
  '        + "  Δ右 " + signed((g.x + g.w) - (from.x + from.w)) + "  Δ下 " + signed((g.y + g.h) - (from.y + from.h))',
  '        + "  ｜ Δ中X " + signed(g.cx - from.cx) + "  Δ中Y " + signed(g.cy - from.cy);',
  '    }',
  '    if (isPin) txt += "   [钉住]";',
  '    if (bar) bar.innerHTML = "<b>" + (isPin ? "钉住" : "读数") + "</b> " + txt + " <i>"',
  '      + (el.getAttribute("data-eg-path") || "") + "</i>";',
  '    return g;',
  '  }',
  '  function repaint() {',
  '    clearLayers(); clearTags();',
  '    for (var i = 0; i < pins.length; i++) draw(pins[i].el, true, null);',
  '    var p = pins[0] || null;',
  '    if (hover && (!p || p.el !== hover)) draw(hover, false, p ? p.g : null);',
  '  }',
  '  function clear() { pins = []; hover = null; clearLayers(); clearTags(); if (bar) bar.innerHTML = HINT; }',
  '  function inject() {',
  '    var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);',
  '    tagLayer = document.createElement("div"); tagLayer.id = "eg-tags"; document.body.appendChild(tagLayer);',
  '    bar = document.createElement("div"); bar.id = "eg-bar"; bar.innerHTML = HINT; document.body.appendChild(bar);',
  '    window.addEventListener("scroll", function () { clearTags(); }, true);',
  '  }',
  '  var find = function (e) { return e.target && e.target.closest ? e.target.closest("[data-eg]") : null; };',
  '  document.addEventListener("mouseover", function (e) { var el = find(e); if (!el) return; hover = el; repaint(); });',
  '  document.addEventListener("click", function (e) {',
  '    var el = find(e);',
  '    if (!el) { clear(); return; }',
  '    pins = (pins[0] && pins[0].el === el) ? [] : [{ el: el, g: geom(el) }];',
  '    hover = el; repaint(); e.preventDefault();',
  '  }, true);',
  '  document.addEventListener("keydown", function (e) { if (e.key === "Escape") clear(); });',
  '  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject); else inject();',
  '})();'
];

/** 返回要内联进稿页的 `<script>` 内容（接入时写在 </body> 前） */
export function overlayJs() {
  return LINES.join('\n');
}

/** 只想要样式（少数场景：自己做浮层时复用同一套 class） */
export function overlayCss() {
  return CSS;
}
