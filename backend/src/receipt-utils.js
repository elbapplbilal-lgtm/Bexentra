// Pure, verifiable parsers for on-chain transaction metadata.
// fee_native is always a BASE-UNIT integer string:
// BNB Chain = wei; Solana = lamports. Never estimate status or gas fees.
export function integerUnits(value) {
 if (value === null || value === undefined || value === "") return null;
 try {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) return null;
  if (typeof value === "string" && !/^(?:0x[0-9a-fA-F]+|[0-9]+)$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed >= 0n ? parsed : null;
 } catch { return null; }
}

export function parseBnbReceipt(receipt, expectedHash) {
 if (!receipt || typeof receipt !== "object") return null;
 if (expectedHash && String(receipt.transactionHash || "").toLowerCase() !== expectedHash.toLowerCase()) return null;
 const rawStatus = integerUnits(receipt.status);
 const status = rawStatus === 1n ? "success" : rawStatus === 0n ? "failed" : null;
 const gasUsed = integerUnits(receipt.gasUsed);
 const gasPrice = integerUnits(receipt.effectiveGasPrice ?? receipt.gasPrice);
 const fee_native = gasUsed === null || gasPrice === null ? null : (gasUsed * gasPrice).toString();
 const height = integerUnits(receipt.blockNumber);
 if (!status && fee_native === null) return null;
 if (height === null || height > BigInt(Number.MAX_SAFE_INTEGER)) return null;
 const sender = /^0x[0-9a-fA-F]{40}$/.test(receipt.from || "") ? receipt.from.toLowerCase() : null;
 const recipient = /^0x[0-9a-fA-F]{40}$/.test(receipt.to || "") ? receipt.to.toLowerCase() : null;
 return {status, fee_native, block_height: Number(height), sender, recipient};
}

export function parseSolanaTransaction(result) {
 if (!result || typeof result !== "object" || !result.meta) return null;
 const meta = result.meta;
 const status = Object.prototype.hasOwnProperty.call(meta, "err")
  ? (meta.err === null ? "success" : "failed") : null;
 const fee = integerUnits(meta.fee);
 const fee_native = fee === null ? null : fee.toString();
 const slot = integerUnits(result.slot);
 if ((!status && fee_native === null) || slot === null || slot > BigInt(Number.MAX_SAFE_INTEGER)) return null;
 // Account key 0 is the fee payer. Do not invent an instruction recipient.
 const first = result.transaction?.message?.accountKeys?.[0];
 const sender = typeof first === "string" ? first : (typeof first?.pubkey === "string" ? first.pubkey : null);
 return {status, fee_native, block_height:Number(slot), sender, recipient:null};
}
