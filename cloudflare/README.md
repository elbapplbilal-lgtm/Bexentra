# BEXENTRA — Cloudflare Workers free-tier live stream

**Status:** The user's live Production Worker is running at `https://bexentra.elbapplbilal.workers.dev/health` (independently verified from GitHub Actions). The browser configuration now points at that public endpoint. BNB streaming was verified using a real mainnet transaction; Solana streaming is being tested against an alternate public RPC provider, and the browser must fall back to Neon if unavailable.

This is a **per-viewer** SSE live sample, not an always-running indexer. It uses public unauthenticated mainnet RPC by default and avoids Render. Availability depends on public providers and Workers Free limits.

## Once, from your phone

1. Open https://dash.cloudflare.com/ and choose **Workers & Pages** → **Create application** → **Import an existing Git repository**. Connect GitHub and select **elbapplbilal-lgtm/Bexentra** (branch main).
2. Set **root directory** to **cloudflare** and Worker name to **bexentra-live-stream** (matching wrangler.toml). **Build command:** npm install --no-audit --no-fund ; **Deploy command:** npx wrangler deploy. Choose Workers Free. Do not accept any paid upgrade prompt.
3. Deploy; copy only the **public** URL in the form https://bexentra-live-stream.<account-subdomain>.workers.dev and share that **URL only** with ChatGPT. Do not share API tokens, login credentials, payment information or one-time verification codes.
4. ChatGPT can then edit the public/realtime-config.js GitHub file to use the public URL and verify /health and /stream?chain=bnb|solana.

## Limits and source authenticity

- The existing GitHub Pages BEXENTRA site keeps the verified Neon /live API as its fallback until the Worker and its public URL are configured.
- Each open BEXENTRA browser connection creates its own upstream WebSocket; background indexing stops when browsers close. **This is NOT complete chain history, 24/7 logging, or full archival coverage.**
- BNB: eth_subscribe(newHeads) plus hash-verified eth_getBlockByHash over HTTPS. A bounded sample of transaction hashes is displayed; transaction execution status and fees are not fabricated.
- Solana: logsSubscribe(all, confirmed), a bounded sample of confirmed **non-vote** transaction signatures and execution results (no invented fee). The public provider may reject or throttle subscriptions.
- Stream sends one SSE snapshot every second, **not a guarantee of one new transaction per second**. The user interface displays live only after an upstream subscription returns observed real blockchain events.
- Network disconnects, free-tier quotas or provider restrictions can interrupt live updates. The browser automatically falls back to Neon, whose data can be slightly delayed.
- Free-tier request quota is finite; every open browser uses resources. Six-session cap is per Worker isolate only; not global.
- Only if needed, optional private provider URLs can be entered as Cloudflare Worker secrets BNB_WS_URL, BNB_RPC_URL and SOLANA_WS_URL, never in GitHub or browser code. Private RPCs may incur costs and require approval.

Tests: cd cloudflare && node --test test/*.test.mjs .

Service routes: GET /health (no claim of upstream connectivity), GET /stream?chain=bnb|solana (read-only SSE). New streams last a maximum of 120 seconds and reconnect via EventSource.

For full historical blockchain indexing, a dedicated continuous scanner, replay checkpoints and persistent storage are still needed.

References: https://developers.cloudflare.com/workers/get-started/dashboard/ and https://developers.cloudflare.com/workers/platform/limits/
