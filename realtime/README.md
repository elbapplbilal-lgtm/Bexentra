# BEXENTRA — second-by-second stream

Requires an **always-on paid** Node.js 22 web service on Render and private WebSocket RPC endpoints.

## Honest coverage

- BNB: subscribes to `eth_subscribe(newHeads)` and fetches the observed block's transaction hashes using a private HTTP RPC.
- Solana: `logsSubscribe(all, confirmed)` emits confirmed **non-vote** transactions; it excludes votes, and disconnects can cause gaps.
- The server publishes **one SSE snapshot per second**, but new blockchain activity arrives only when providers actually emit notifications.
- It keeps a bounded sample of recent transaction hashes. It does **not** index or save every blockchain transaction.
- On upstream failure, the API returns `stream_offline`; the website falls back to its existing, explicitly labeled API.

## Render settings (after explicit user approval)

- Repository: `elbapplbilal-lgtm/Bexentra`, branch `main`, runtime Node.js 22.
- Build: `npm --prefix realtime install --no-audit --no-fund`.
- Start: `node realtime/src/server.js`.
- Paid always-on compute, not Free (Free web services suspend when inactive).
- Secret environment variables: `BNB_WS_URL`, `BNB_RPC_URL`, `SOLANA_WS_URL`. Set `NODE_VERSION=22`, `ALLOWED_ORIGIN=https://elbapplbilal-lgtm.github.io`.
- Connect only in the Render workspace **confirmed by the user** and confirm the payment before creating a paid resource.
- Paste the deployed Render **public URL, never the API keys**, in `public/realtime-config.js`.
- Set provider usage alerts and budget caps. Solana `logsSubscribe(all)` can be high-volume.

## Endpoints

- `GET /health`: service/provider health without secret URLs.
- `GET /snapshot?chain=bnb|solana`: latest bounded sample.
- `GET /stream?chain=bnb|solana`: SSE `snapshot` event every 1000ms.

## Tests

From `realtime`, run `npm test`. GitHub Actions tests the parser, bounded memory, honest outages and SSE heartbeat.

## Limitations

Receiving a fresh snapshot every second **does not** mean that we have a complete historical index.
Gap-free BNB/Solana transaction history requires replay checkpoints, reorg handling, durable queues, more expensive RPC/Geyser streams, and substantial database capacity.
Never claim this bounded viewer indexes 100% of all transactions or has zero outages.