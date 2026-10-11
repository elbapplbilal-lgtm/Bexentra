CREATE TABLE IF NOT EXISTS indexed_blocks (
 chain TEXT NOT NULL CHECK (chain IN ('solana','bnb')),
 height BIGINT NOT NULL,
 block_hash TEXT,
 block_time TIMESTAMPTZ,
 transaction_count INTEGER NOT NULL DEFAULT 0,
 indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (chain,height)
);
CREATE TABLE IF NOT EXISTS indexed_transactions (
 chain TEXT NOT NULL CHECK (chain IN ('solana','bnb')),
 tx_hash TEXT NOT NULL,
 block_height BIGINT NOT NULL,
 sender TEXT,
 recipient TEXT,
 status TEXT,
 fee_native NUMERIC,
 indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(chain,tx_hash)
);
CREATE INDEX IF NOT EXISTS indexed_transactions_chain_height ON indexed_transactions(chain,block_height DESC);
CREATE INDEX IF NOT EXISTS indexed_transactions_sender ON indexed_transactions(chain,sender);
CREATE INDEX IF NOT EXISTS indexed_transactions_recipient ON indexed_transactions(chain,recipient);
CREATE TABLE IF NOT EXISTS indexer_state (
 chain TEXT PRIMARY KEY CHECK (chain IN ('solana','bnb')),
 last_height BIGINT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
