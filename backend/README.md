# BEXENTRA Mainnet Indexer — initial production-oriented foundation

This is **real mainnet data**, not demo fixtures. The backend is **not deployed automatically** by merging this repository. A continuously running worker, a web service, a PostgreSQL database and reliable mainnet RPC access must be provisioned.

## Services
- `npm start`: read-only HTTP API, port `PORT` (default 8080).
- `npm run index`: independent continuous indexer worker for Solana and BNB Chain.
- `schema.sql`: PostgreSQL schema and indexes.

## Deployment
1. Provision PostgreSQL and run `schema.sql`.
2. Configure `DATABASE_URL` and production-grade `SOLANA_RPC_URL` and `BNB_RPC_URL` as **private environment variables** in the hosting provider. Never commit real secrets.
3. Run `npm install` in `backend/`.
4. Deploy **two services** from `backend/`: web service `npm start` and always-on background worker `npm run index`. A sleeping/free web instance cannot continuously index.
5. Verify `/health`, `/api/status`, `/api/blocks?chain=bnb` and `/api/transactions?chain=solana`.
6. Configure a frontend API base URL once deployed.

## Important scope and limitations
- The indexer starts near the chain tip unless `INDEXER_START_BNB` / `INDEXER_START_SOLANA` are configured. It **does not backfill chain history automatically**.
- It indexes blocks and transaction summaries, not all token transfers, smart contracts, logs, account histories or traces. A full BscScan/Solscan equivalent requires much more infrastructure.
- Solana skipped slots are represented as rows with null block hash; clients should treat them as skipped.
- BNB fees in `indexed_transactions.fee_native` are stored in **wei**, Solana fees in **lamports**; convert for display.
- Solana account keys may be encoded as strings or objects depending on RPC responses; sender extraction is best-effort. Recipient is not inferred for arbitrary instructions.
- This is an initial indexer: no automatic reorg rollback, no distributed lock, no RPC retry/backoff or batch receipt fetching. Do not claim comprehensive or high-availability indexing.
- One RPC request per BNB transaction receipt is expensive; a dedicated provider and improved batching are needed for sustained indexing at mainnet speed.
- Public RPC endpoints can rate-limit, deny historical block data or refuse heavy requests. Use paid/dedicated RPC for continuous operation.
- Add authentication/rate limiting and narrow CORS before publicly exposing higher-cost API routes.
