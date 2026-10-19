import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export async function readSource(src) {
  if (/^https?:\/\//i.test(src)) {
    const r = await fetch(src, { redirect: 'follow' });
    if (!r.ok) throw Object.assign(new Error(`抓取失败 HTTP ${r.status}：${src}`), { code: 'FETCH_FAILED' });
    return { code: await r.text(), from: src };
  }
  return { code: readFileSync(src, 'utf8'), from: path.resolve(src) };
}

export async function load(src, { tmpDir } = {}) {
  const { code, from } = await readSource(src);
  const dir = tmpDir || path.join(os.tmpdir(), 'egern-widget-kit');
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

export const SIM = {
  real: ['env', 'widgetFamily', 'storage', 'http.get/post/put/delete/head/options/patch'],
  stubbed: ['device（字段全 null）', 'app（空串）', 'script（空名）',
            'notify（只记录、不发送）', 'lookupIP（恒 null）', 'compress（原样返回，不真压缩）'],
  missing: ['ssh（调用即抛错，错误信息会说明是模拟层缺的）']
};
export const simLine = () =>
  `已实现 ${SIM.real.join(' / ')}；空壳 ${SIM.stubbed.join(' / ')}；未实现 ${SIM.missing.join(' / ')}`;

export function genericCtx({ family = 'systemMedium', env = {}, storage = {}, mock = null } = {}) {
  const calls = [];
  const notes = [];
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
  const same = async (a) => a;
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
