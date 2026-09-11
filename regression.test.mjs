import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = resolve(process.env.KIOSKHELPER_TEST_ROOT || fileURLToPath(new URL('.', import.meta.url)));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const swSource = readFileSync(resolve(root, 'sw.js'), 'utf8');
function section(from, to) {
  const start = html.indexOf(from), end = html.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Source markers: ${from}`);
  return html.slice(start, end);
}
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function lockManager() {
  let tail = Promise.resolve();
  return { request(_name, fn) { const run = tail.then(fn); tail = run.catch(() => {}); return run; } };
}
const queueKey = 'kioskHelperOfflineEvents';
const event = (user_id, detail = 'test') => ({ user_id, event_type: 'symptom_click', detail, created_at: '2026-09-10T01:00:00.000Z' });
function queueHarness(options = {}) {
  const localStorage = options.storage || storage();
  const inserted = [];
  const context = vm.createContext({
    localStorage, crypto: { randomUUID }, navigator: { onLine: true, ...(options.locks ? { locks: options.locks } : {}) },
    currentUser: { id: 'A' }, showToast() {}, window: { addEventListener() {} },
    sb: { from(table) { assert.equal(table, 'events'); return { async insert(payload) {
      inserted.push(structuredClone(payload));
      return options.insert ? options.insert(payload) : { error: null };
    } }; } },
  });
  vm.runInContext(section('const OFFLINE_QUEUE_KEY =', "document.getElementById('logoutBtn').addEventListener"), context);
  return { context, localStorage, inserted, queue: () => JSON.parse(localStorage.getItem(queueKey) || '[]') };
}

test('inline scripts and service worker parse; PWA assets exist', () => {
  let count = 0;
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) { new vm.Script(match[1]); count++; }
  assert.ok(count >= 2);
  new vm.Script(swSource);
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(existsSync(resolve(root, icon.src)));
  assert.ok(existsSync(resolve(root, manifest.start_url)));
});

test('every diagnostic tree start, transition, jump, and ending resolves', () => {
  const context = vm.createContext({});
  const data = section('const SYMPTOM_LABEL =', '/* ============================= STATE');
  vm.runInContext(data + '\nglobalThis.result = { TREES, DEVICES, SYMPTOM_LABEL };', context);
  const { TREES, DEVICES, SYMPTOM_LABEL } = context.result;
  for (const device of DEVICES) for (const id of device.symptoms) { assert.ok(TREES[id], id); assert.ok(SYMPTOM_LABEL[id], id); }
  for (const [id, tree] of Object.entries(TREES)) {
    assert.ok(tree.nodes[tree.start], id + ' start');
    for (const [nodeId, node] of Object.entries(tree.nodes)) for (const option of node.options || []) {
      assert.equal(['next', 'jump', 'end'].filter(key => option[key]).length, 1, id + ':' + nodeId);
      if (option.next) assert.ok(tree.nodes[option.next], id + ' -> ' + option.next);
      if (option.jump) assert.ok(TREES[option.jump], id + ' jump ' + option.jump);
      if (option.end) assert.ok(['solved', 'escalate', 'as', 'info'].includes(option.end));
    }
  }
});

test('offline event retains its original click time and sends no queue metadata', async () => {
  const h = queueHarness();
  h.context.navigator.onLine = false;
  const before = Date.now();
  await h.context.logEvent('symptom_click', { symptomId: 'CAM-1' });
  const saved = h.queue()[0];
  assert.ok(Date.parse(saved.created_at) >= before && Date.parse(saved.created_at) <= Date.now());
  assert.ok(saved._queueId);
  h.context.navigator.onLine = true;
  await h.context.flushOfflineQueue();
  assert.equal(h.inserted[0][0].created_at, saved.created_at);
  assert.equal('_queueId' in h.inserted[0][0], false);
  assert.equal(h.queue().length, 0);
});

test('only current user records are sent; legacy records survive account changes', async () => {
  const h = queueHarness();
  h.localStorage.setItem(queueKey, JSON.stringify([event('B'), event('A')]));
  await h.context.flushOfflineQueue();
  assert.deepEqual(h.inserted[0].map(e => e.user_id), ['A']);
  assert.deepEqual(h.queue().map(e => e.user_id), ['B']);
  h.context.currentUser = { id: 'B' };
  await h.context.flushOfflineQueue();
  assert.equal(h.queue().length, 0);
});

test('logged-out flush does not send or remove queued records', async () => {
  const h = queueHarness();
  await h.context.queueOfflineEvent(event('A'));
  h.context.currentUser = null;
  await h.context.flushOfflineQueue();
  assert.equal(h.inserted.length, 0);
  assert.equal(h.queue().length, 1);
});

test('failed batch remains; only acknowledged batches are removed', async () => {
  let requests = 0;
  const h = queueHarness({ insert: () => ({ error: ++requests === 2 ? { message: 'offline' } : null }) });
  h.localStorage.setItem(queueKey, JSON.stringify(Array.from({ length: 250 }, (_, i) => event('A', String(i)))));
  await h.context.flushOfflineQueue();
  assert.equal(h.queue().length, 150);
  assert.equal(h.queue()[0].detail, '100');
});

test('concurrent flushes in one tab do not duplicate inserts', async () => {
  const h = queueHarness();
  await h.context.queueOfflineEvent(event('A'));
  await Promise.all([h.context.flushOfflineQueue(), h.context.flushOfflineQueue()]);
  assert.equal(h.inserted.length, 1);
});

test('Web Locks prevent two tabs from sending the same queue entry', async () => {
  const shared = storage(), locks = lockManager();
  const a = queueHarness({ storage: shared, locks }), b = queueHarness({ storage: shared, locks });
  await a.context.queueOfflineEvent(event('A'));
  await Promise.all([a.context.flushOfflineQueue(), b.context.flushOfflineQueue()]);
  assert.equal(a.inserted.length + b.inserted.length, 1);
});

test('events queued while a request is in flight are preserved', async () => {
  let release, started;
  const waiting = new Promise(resolve => { release = resolve; });
  const sending = new Promise(resolve => { started = resolve; });
  const h = queueHarness({ insert: async () => { started(); await waiting; return { error: null }; } });
  await h.context.queueOfflineEvent(event('A', 'first'));
  const flush = h.context.flushOfflineQueue();
  await sending;
  const enqueue = h.context.queueOfflineEvent(event('A', 'second'));
  release();
  await Promise.all([flush, enqueue]);
  assert.deepEqual(h.queue().map(e => e.detail), ['second']);
});

test('malformed queue is not overwritten or sent', async () => {
  const h = queueHarness();
  h.localStorage.setItem(queueKey, '{broken');
  await h.context.queueOfflineEvent(event('A'));
  await h.context.flushOfflineQueue();
  assert.equal(h.localStorage.getItem(queueKey), '{broken');
  assert.equal(h.inserted.length, 0);
});

function pagingHarness(rows, cap = 500, failPage = 0) {
  let calls = 0;
  const context = vm.createContext({ sb: { from() {
    let ascending = true, limit = 500, upper, after;
    return {
      select() { return this; }, order(_key, options) { ascending = options.ascending; return this; },
      limit(n) { limit = n; return this; }, lte(_key, id) { upper = id; return this; }, gt(_key, id) { after = id; return this; },
      then(resolve, reject) {
        calls++;
        if (calls === failPage) return Promise.resolve({ data: null, error: new Error('read failed') }).then(resolve, reject);
        const data = rows.filter(e => (upper === undefined || e.id <= upper) && (after === undefined || e.id > after))
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) * (ascending ? 1 : -1)).slice(0, Math.min(limit, cap));
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
  } } });
  vm.runInContext(section('async function loadAllAdminRows(', 'async function renderAdminDashboardScreen('), context);
  return context;
}

test('admin fetch includes 1,251 records even when server caps pages at 137', async () => {
  const rows = Array.from({ length: 1251 }, (_, i) => ({ id: i + 1 }));
  const result = await pagingHarness(rows, 137).loadAllAdminRows('events');
  assert.deepEqual(Array.from(result, e => e.id), rows.map(e => e.id));
});

test('admin fetch supports UUID profile IDs and empty tables', async () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({ id: '00000000-0000-0000-0000-' + String(i).padStart(12, '0') }));
  assert.equal((await pagingHarness(rows, 2).loadAllAdminRows('profiles')).length, 7);
  assert.equal((await pagingHarness([]).loadAllAdminRows('events')).length, 0);
});

test('admin fetch propagates page errors instead of showing partial totals', async () => {
  await assert.rejects(pagingHarness([{ id: 1 }, { id: 2 }], 1, 3).loadAllAdminRows('profiles'), /read failed/);
});

function workerHarness(options = {}) {
  const handlers = {}, removed = [], put = [], matched = [];
  const cacheName = swSource.match(/const CACHE_NAME = '([^']+)'/)[1];
  let claimed = false, skipped = false;
  const cache = { async addAll() { if (options.installFails) throw new Error('download failed'); }, async add() {},
    async put(key, value) { put.push({ key, value }); }, async match(key) { matched.push(key); return options.cached; } };
  const worker = vm.createContext({ URL, Response, Set, console,
    self: { location: { href: 'https://example.com/KIOSKHELPER/sw.js' }, addEventListener: (type, handler) => { handlers[type] = handler; },
      clients: { async claim() { claimed = true; } }, async skipWaiting() { skipped = true; } },
    caches: { async open() { return cache; }, async keys() { return ['photoism-helper-v5', cacheName, 'photoism-helper-staging-v1', 'another-app']; }, async delete(key) { removed.push(key); } },
    fetch: options.fetch || (async () => new Response('online')),
  });
  vm.runInContext(swSource, worker);
  return { handlers, removed, put, matched, claimed: () => claimed, skipped: () => skipped };
}

test('worker upgrade removes only this environment old cache', async () => {
  const h = workerHarness(); let done;
  h.handlers.activate({ waitUntil: p => { done = p; } });
  await done;
  const staging = /const CACHE_NAME = 'photoism-helper-staging-/.test(swSource);
  assert.deepEqual(h.removed, [staging ? 'photoism-helper-staging-v1' : 'photoism-helper-v5']);
  assert.equal(h.claimed(), true);
});

test('failed core installation does not activate an incomplete worker', async () => {
  const h = workerHarness({ installFails: true }); let done;
  h.handlers.install({ waitUntil: p => { done = p; } });
  await assert.rejects(done, /download failed/);
  assert.equal(h.skipped(), false);
});

test('worker never intercepts private API responses or other app files', () => {
  const h = workerHarness();
  for (const url of ['https://project.supabase.co/rest/v1/profiles', 'https://example.com/private.json', 'https://example.com/kioskhelper-staging/index.html']) {
    let intercepted = false;
    h.handlers.fetch({ request: { method: 'GET', mode: 'cors', url }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false, url);
  }
});

test('offline page navigation uses its own cached index', async () => {
  const cached = new Response('offline app');
  const h = workerHarness({ cached, fetch: async () => { throw new Error('offline'); } }); let response;
  h.handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/KIOSKHELPER/' }, respondWith: p => { response = p; } });
  assert.equal(await (await response).text(), 'offline app');
  assert.deepEqual(h.matched, ['https://example.com/KIOSKHELPER/index.html']);
});

test('recovery query is not retained in page cache keys', async () => {
  const h = workerHarness(); let response;
  h.handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/KIOSKHELPER/index.html?code=example-recovery-code' }, respondWith: p => { response = p; } });
  await response;
  assert.deepEqual(h.put.map(e => e.key), ['https://example.com/KIOSKHELPER/index.html']);
});

test('HTTP failures do not overwrite an existing offline page', async () => {
  const h = workerHarness({ cached: new Response('saved app'), fetch: async () => new Response('error', { status: 503 }) }); let response;
  h.handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/KIOSKHELPER/' }, respondWith: p => { response = p; } });
  assert.equal(await (await response).text(), 'saved app');
  assert.equal(h.put.length, 0);
});
