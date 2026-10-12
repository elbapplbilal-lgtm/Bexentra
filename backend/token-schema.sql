-- BEP-20 Transfer event indexing (BNB Chain only).
CREATE TABLE IF NOT EXISTS indexed_token_transfers (
 chain TEXT NOT NULL DEFAULT 'bnb' CHECK (chain='bnb'),
 tx_hash TEXT NOT NULL,
 log_index BIGINT NOT NULL,
 block_height BIGINT NOT NULL,
 token_address TEXT NOT NULL,
 sender TEXT NOT NULL,
 recipient TEXT NOT NULL,
 amount_raw NUMERIC(78,0) NOT NULL,
 indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(chain,tx_hash,log_index)
);
CREATE INDEX IF NOT EXISTS token_transfers_sender_idx ON indexed_token_transfers(chain,lower(sender),block_height DESC);
CREATE INDEX IF NOT EXISTS token_transfers_recipient_idx ON indexed_token_transfers(chain,lower(recipient),block_height DESC);
CREATE INDEX IF NOT EXISTS token_transfers_height_idx ON indexed_token_transfers(chain,block_height DESC);
CREATE TABLE IF NOT EXISTS token_indexer_state (
 chain TEXT PRIMARY KEY CHECK(chain='bnb'),
 last_height BIGINT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
