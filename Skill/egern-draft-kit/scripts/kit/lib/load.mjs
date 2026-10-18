// 第三方脚本「接入」层 —— 通用，零配置。
//
// 职责：给一个 URL 或本地路径，把源码读进来、规范化成 ESM、动态 import，交回 `export default` 函数。
// 为什么要这一层：Egern 的脚本文件扩展名是 `.js` 但内容是 ESM，Node 按扩展名判 CommonJS
// ⇒ 直接用路径 import 会报 `Cannot use import statement outside a module`；必须复制成 `.mjs` 再 import。
//
// ⚠️ 降级阶梯（照 `references/` 的纪律：**跑不起来就只报事实，不许编一张稿**）：
//   ① 能 import → 交回函数，正常出稿
//   ② import 抛错 → 抛 IMPORT_FAILED（带原始错误与规范化后的文件路径，便于定位行号）
//   ③ 没有 `export default` 或是别的类型 → 抛 NOT_A_SCRIPT
//
// 用法：
//   const { fn, code, from } = await load('https://example.com/widget.js');
//   const tree = await fn(fakeCtx);

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** 读源码：URL 走 fetch，其余当本地路径 */
export async function readSource(src) {
  if (/^https?:\/\//i.test(src)) {
    const r = await fetch(src, { redirect: 'follow' });
    if (!r.ok) throw Object.assign(new Error(`抓取失败 HTTP ${r.status}：${src}`), { code: 'FETCH_FAILED' });
    return { code: await r.text(), from: src };
  }
  return { code: readFileSync(src, 'utf8'), from: path.resolve(src) };
}

/** 取出 `export default async function(ctx)`（或 `export default async (ctx) => …`） */
export async function load(src, { tmpDir } = {}) {
  const { code, from } = await readSource(src);
  const dir = tmpDir || path.join(os.tmpdir(), 'egern-draft-kit');
  mkdirSync(dir, { recursive: true });
  const base = String(from).split('?')[0].split('/').pop().replace(/[^\w.-]/g, '_');
  const file = path.join(dir, '_' + base.replace(/\.js$/, '') + '-esm-tmp.mjs');
  writeFileSync(file, code, 'utf8');

  let mod;
  try {
    mod = await import('file:///' + file.replace(/\\/g, '/') + '?t=' + Date.now());
  } catch (e) {
    throw Object.assign(new Error(`导入失败（${e.constructor.name}）：${e.message}`),
      { code: 'IMPORT_FAILED', file, cause: e });
  }
  if (typeof mod.default !== 'function') {
    throw Object.assign(
      new Error(`default 导出不是函数（实际是 ${mod.default === undefined ? 'undefined' : typeof mod.default}）—— 这可能不是一份 Egern 脚本`),
      { code: 'NOT_A_SCRIPT', file });
  }
  return { fn: mod.default, code, from, esmFile: file, module: mod };
}

/** 官方 ctx 面：模拟层做到什么程度。报告里必须如实打出来 ——
 *  「脚本走了失败分支」和「模拟层缺东西」是两件事，别让读者混淆。 */
export const SIM = {
  real: ['env', 'widgetFamily', 'storage', 'http.get/post/put/delete/head/options/patch'],
  stubbed: ['device（字段全 null）', 'app（空串）', 'script（空名）',
            'notify（只记录、不发送）', 'lookupIP（恒 null）', 'compress（原样返回，不真压缩）'],
  missing: ['ssh（调用即抛错，错误信息会说明是模拟层缺的）']
};
export const simLine = () =>
  `已实现 ${SIM.real.join(' / ')}；空壳 ${SIM.stubbed.join(' / ')}；未实现 ${SIM.missing.join(' / ')}`;

/** 通用模拟 ctx：**只用于把树跑出来看看**。所有请求返回"空占位响应"，绝不编造业务数据。
 *  `mock`（一个 JSON 对象）= 所有 http 方法都返回它（--mock 的落地实现，别在 CLI 里猴补丁）。 */
export function genericCtx({ family = 'systemMedium', env = {}, storage = {}, mock = null } = {}) {
  const calls = [];                        // 它请求过哪些 URL（带方法，按顺序）
  const notes = [];                        // 它想发的通知（不真发）
  const store = { ...storage };
  const response = (url) => ({
    status: 200, url,
    ok: true,
    headers: { get: () => null, getAll: () => [], has: () => false },
    json: async () => (mock !== null ? mock : {}),
    text: async () => (mock !== null ? JSON.stringify(mock) : ''),
    arrayBuffer: async () => (mock !== null
      ? new TextEncoder().encode(JSON.stringify(mock)).buffer : new ArrayBuffer(0))
  });
  const http = {};
  for (const m of ['get', 'post', 'put', 'delete', 'head', 'options', 'patch']) {
    http[m] = async (url) => { calls.push(`${m.toUpperCase()} ${url}`); return response(url); };
  }
  const unimplemented = (what) => async () => {
    throw Object.assign(
      new Error(`模拟 ctx 没有实现 ctx.${what}（不是脚本的错；这条分支要上真机验证）`),
      { code: 'SIM_UNIMPLEMENTED' });
  };
  const same = async (a) => a;             // 恒等占位：原样返回，不做真压缩/真摘要
  return {
    calls, notes,
    ctx: {
      env,
      widgetFamily: family,
      script: { name: '' },
      app: { version: '', language: '' },
      device: {
        cellular: { carrier: null, radio: null },
        wifi: { ssid: null, bssid: null },
        ipv4: { address: null }, ipv6: { address: null }, dnsServers: []
      },
      storage: {
        get: (k) => (k in store ? store[k] : null),
        set: (k, v) => { store[k] = v; },
        getJSON: (k) => (k in store ? JSON.parse(store[k]) : null),
        setJSON: (k, v) => { store[k] = JSON.stringify(v); },
        delete: (k) => { delete store[k]; }
      },
      http,
      notify: (opts) => { notes.push(opts); },
      lookupIP: () => null,
      compress: { gzip: same, gunzip: same, deflate: same,
                  inflate: same, brotli: same, unbrotli: same },
      ssh: { connect: unimplemented('ssh.connect') }
    }
  };
}
