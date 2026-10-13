import {transactionRoute} from './tx-lookup.js';
// BEXENTRA's optional, read-only, per-viewer blockchain live stream.
// Each open browser subscribes to upstream notifications; it does not index every
// transaction, keep working after the page closes, or guarantee an outage-free feed.
const SITE_ORIGIN = 'https://elbapplbilal-lgtm.github.io';
const PUBLIC = Object.freeze({
  bnb: {
    ws: 'wss://bsc-rpc.publicnode.com',
    http: 'https://bsc-rpc.publicnode.com',
  },
  solana: { ws: 'wss://solana-rpc.publicnode.com' },
});
const HASH_BNB = /^0x[a-fA-F0-9]{64}$/;
const HASH_SOL = /^[1-9A-HJ-NP-Za-km-z]{70,100}$/;
const STREAM_DURATION_MS = 120_000;
const SILENCE_TIMEOUT_MS = 45_000;
const MAX_CLIENTS_PER_ISOLATE = 6; // local protection; not a global quota
let localStreams = 0;
const enc = new TextEncoder();

function integer(value) {
  try {
    const number = typeof value === 'number' ? value : Number(BigInt(value));
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
  } catch { return null; }
}
function isUrl(value, scheme) {
  return typeof value === 'string' && value.startsWith(scheme) && value.length < 800;
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': SITE_ORIGIN,
    'x-content-type-options': 'nosniff'
  }});
}
function freshState(chain) {
  return {
    chain, connected: false, last_event_at: null, last_block: null,
    last_error: 'Waiting for upstream subscription',
    total_observed: 0, last_reported_count: 0, dropped_from_memory: 0,
    recent: [], seen: new Set(), seenQueue: [],
  };
}
function observe(state, tx) {
  const hash = tx?.tx_hash;
  if (typeof hash !== 'string' || !(state.chain === 'bnb' ? HASH_BNB : HASH_SOL).test(hash)) return false;
  const key = state.chain === 'bnb' ? hash.toLowerCase() : hash;
  if (state.seen.has(key)) return false;
  state.seen.add(key);
  state.seenQueue.push(key);
  while (state.seenQueue.length > 320) state.seen.delete(state.seenQueue.shift());
  const block_height = integer(tx.block_height);
  const now = new Date().toISOString();
  state.recent.unshift({
    chain: state.chain, tx_hash: hash, block_height,
    sender: null, recipient: null,
    status: tx.status === 'success' || tx.status === 'failed' ? tx.status : null,
    fee_native: null, source: 'ws_live', observed_at: now, indexed_at: null,
  });
  while (state.recent.length > 32) {
    state.recent.pop();
    state.dropped_from_memory++;
  }
  state.total_observed++;
  state.last_event_at = now;
  return true;
}
function snapshot(state, consume = false) {
  const tick = state.total_observed - state.last_reported_count;
  if (consume) state.last_reported_count = state.total_observed;
  return {
    chain: state.chain,
    source: state.connected ? 'ws_live' : 'stream_offline',
    coverage: 'recent_stream_sample', stream_connected: state.connected,
    last_event_at: state.last_event_at, observed_at: new Date().toISOString(),
    last_error: state.connected ? null : state.last_error,
    observed_since_start: state.total_observed,
    observed_since_last_tick: tick,
    dropped_from_memory: state.dropped_from_memory,
    blocks: state.last_block ? [state.last_block] : [],
    transactions: state.recent.slice(0, 12),
  };
}

function configure(env, chain) {
  const ws = chain === 'bnb' ? env?.BNB_WS_URL : env?.SOLANA_WS_URL;
  const http = env?.BNB_RPC_URL;
  return {
    ws: isUrl(ws, 'wss://') ? ws : PUBLIC[chain].ws,
    http: isUrl(http, 'https://') ? http : PUBLIC.bnb.http,
  };
}
function setBlock(state, height, hash, timestamp = null, transaction_count = null) {
  if (!Number.isSafeInteger(height) || height < 0) return;
  state.last_block = {
    chain: state.chain, height, block_hash: hash,
    block_time: Number.isSafeInteger(timestamp) ? new Date(timestamp * 1000).toISOString() : null,
    transaction_count, indexed_at: null, source: 'ws_live',
  };
  state.last_event_at = new Date().toISOString();
}

// Intentionally small, sequential BNB block lookups to avoid unlimited per-client
// RPC usage. If a client cannot keep up, it drops superseded notifications.
async function getBnbBlock(endpoint, header, fetcher = fetch) {
  const height = integer(header?.number);
  if (height === null || !HASH_BNB.test(header?.hash || '')) return null;
  const response = await fetcher(endpoint, {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByHash', params: [header.hash, false] }),
    signal: AbortSignal.timeout(8500),
  });
  if (!response.ok) throw Error('BNB RPC HTTP ' + response.status);
  const data = await response.json();
  const block = data.result;
  if (data.error || !block || integer(block.number) !== height ||
      String(block.hash || '').toLowerCase() !== header.hash.toLowerCase() ||
      !Array.isArray(block.transactions)) throw Error('BNB block missing or hash mismatch');
  return {
    height, hash: header.hash, timestamp: integer(block.timestamp),
    count: block.transactions.length,
    hashes: block.transactions.filter(h => typeof h === 'string' && HASH_BNB.test(h)).slice(-14),
  };
}

function openStream(chain, env, dependencies = {}) {
  const state = freshState(chain);
  const cfg = configure(env, chain);
  const Socket = dependencies.WebSocket || WebSocket;
  const fetcher = dependencies.fetch || fetch;
  const now = dependencies.now || Date.now;
  let closed = false, ws = null, timer = null, expire = null, pendingHeader = null, busy = false;
  let connectionAt = now();
  let controllerRef = null;
  localStreams++;
  function close() {
    if (closed) return;
    closed = true;
    localStreams = Math.max(0, localStreams - 1);
    if (timer) clearInterval(timer);
    if (expire) clearTimeout(expire);
    if (ws) try { ws.close(); } catch {}
    if (controllerRef) try { controllerRef.close(); } catch {}
  }
  function send() {
    if (closed || !controllerRef) return;
    if (controllerRef.desiredSize !== null && controllerRef.desiredSize < -3) {
      close(); return;
    }
    const result = snapshot(state, true);
    try {
      controllerRef.enqueue(enc.encode('event: snapshot\ndata: ' + JSON.stringify(result) + '\n\n'));
    } catch { close(); }
  }
  async function consumeBnb() {
    if (busy || closed) return;
    busy = true;
    try {
      while (pendingHeader && !closed) {
        const header = pendingHeader;
        pendingHeader = null;
        try {
          const block = await getBnbBlock(cfg.http, header, fetcher);
          if (!block || closed) continue;
          setBlock(state, block.height, block.hash, block.timestamp, block.count);
          for (const hash of block.hashes) observe(state, { tx_hash: hash, block_height: block.height });
        } catch {
          state.last_error = 'BNB block lookup temporarily unavailable';
        }
      }
    } finally { busy = false; }
  }
  function receive(message) {
    if (closed) return;
    let packet;
    try { packet = JSON.parse(typeof message === 'string' ? message : String(message)); }
    catch { return; }
    if (packet.id === 1) {
      if (packet.error || !packet.result) {
        state.connected = false;
        state.last_error = 'Public upstream subscription was rejected';
        send(); close(); return;
      }
      state.connected = true;
      state.last_error = null;
      state.subscriptionId = packet.result;
      connectionAt = now();
      return;
    }
    if (!state.connected || packet.params?.subscription !== state.subscriptionId) return;
    if (chain === 'bnb' && packet.method === 'eth_subscription') {
      const header = packet.params.result;
      if (header && HASH_BNB.test(header.hash) && integer(header.number) !== null) {
        pendingHeader = header;
        void consumeBnb();
      }
    } else if (chain === 'solana' && packet.method === 'logsNotification') {
      const value = packet.params.result?.value;
      const height = integer(packet.params.result?.context?.slot);
      if (!value || height === null) return;
      const status = Object.prototype.hasOwnProperty.call(value, 'err')
        ? (value.err === null ? 'success' : 'failed') : null;
      if (typeof value.signature !== 'string' || !HASH_SOL.test(value.signature)) return;
      setBlock(state, height, null, null, null);
      observe(state, { tx_hash: value.signature, block_height: height, status });
    }
  }
  const body = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      controller.enqueue(enc.encode('retry: 3000\n\n'));
      send(); // explicitly reports stream_offline until RPC subscription succeeds
      try {
        ws = new Socket(cfg.ws);
        ws.addEventListener('open', () => {
          if (closed) return;
          const method = chain === 'bnb' ? 'eth_subscribe' : 'logsSubscribe';
          const params = chain === 'bnb' ? ['newHeads'] : ['all', {commitment: 'confirmed'}];
          ws.send(JSON.stringify({jsonrpc:'2.0', id:1, method, params}));
        });
        ws.addEventListener('message', e => receive(e.data));
        ws.addEventListener('error', () => {
          state.connected = false;
          state.last_error = 'WebSocket provider connection failed';
          send(); close();
        });
        ws.addEventListener('close', () => {
          state.connected = false;
          state.last_error = 'WebSocket provider connection closed';
          send(); close();
        });
      } catch {
        state.connected = false;
        state.last_error = 'Unable to start upstream WebSocket';
        send(); close(); return;
      }
      timer = setInterval(() => {
        if (closed) return;
        if (!state.connected && now() - connectionAt > 15_000) {
          state.last_error = 'Upstream subscription timed out';
          send(); close(); return;
        }
        if (state.connected && state.last_event_at &&
            now() - Date.parse(state.last_event_at) > SILENCE_TIMEOUT_MS) {
          state.connected = false;
          state.last_error = 'No recent network events';
          send(); close(); return;
        }
        send();
      }, 1000);
      expire = setTimeout(close, STREAM_DURATION_MS);
    },
    cancel: close,
  });
  return {body, state, close, receive};
}

export default {
  fetch(request, env) {
    const u = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'access-control-allow-origin': SITE_ORIGIN,
        'access-control-allow-methods': 'GET,OPTIONS',
        'access-control-allow-headers': 'Content-Type',
      }});
    }
    if (request.method !== 'GET') return json({error:'GET only'}, 405);
    if (u.pathname === '/health') {
      return json({app:'BEXENTRA',mode:'per_viewer_live_sample',
        service:'cloudflare-worker', up:true,
        data:'Upstream subscriptions connect only while a viewer is watching',
        coverage:'NOT_COMPLETE_HISTORY'});
    }
    if (u.pathname === '/tx') {
      const origin = request.headers.get('Origin');
      if (origin && origin !== SITE_ORIGIN) return json({error:'Origin not allowed'}, 403);
      return transactionRoute(request, env);
    }
    if (u.pathname !== '/stream') return json({error:'Not found'}, 404);
    const chain = u.searchParams.get('chain');
    if (chain !== 'bnb' && chain !== 'solana') return json({error:'Invalid chain'}, 400);
    const origin = request.headers.get('Origin');
    if (origin && origin !== SITE_ORIGIN) return json({error:'Origin not allowed'}, 403);
    if (localStreams >= MAX_CLIENTS_PER_ISOLATE) return json({error:'Local stream capacity reached'}, 503);
    const {body} = openStream(chain, env);
    return new Response(body, { status: 200, headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'access-control-allow-origin': SITE_ORIGIN,
      'vary': 'Origin',
      'x-accel-buffering': 'no',
      'x-content-type-options': 'nosniff',
    }});
  }
};

// Export only for isolated tests; production uses the default fetch handler.
export { observe, snapshot, freshState, getBnbBlock, openStream, configure };
