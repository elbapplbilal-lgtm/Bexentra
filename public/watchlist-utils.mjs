// Public addresses only. No passwords, recovery phrases or private keys.
export const WATCHLIST_KEY = 'bexentra-watchlist-v1';
export const WATCHLIST_LIMIT = 12;
const BNB_ADDR = /^(?:0x)?[a-fA-F0-9]{40}$/;
const SOL_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function parsePublicAddress(raw, chain) {
  if (chain !== 'bnb' && chain !== 'solana') throw Error('network');
  const address = String(raw ?? '').trim();
  if (chain === 'bnb') {
    if (!BNB_ADDR.test(address)) throw Error('address');
    return '0x' + address.replace(/^0x/i, '').toLowerCase();
  }
  if (!SOL_ADDR.test(address)) throw Error('address');
  return address;
}
export function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') throw Error('address');
  const chain = raw.chain;
  const address = parsePublicAddress(raw.address, chain);
  const label = String(raw.label ?? '').trim().slice(0, 30);
  return {chain, address, label};
}
export function readList(raw) {
  try {
    if (typeof raw !== 'string' || raw.length > 12000) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set(); const entries = [];
    for (const candidate of parsed.slice(0, 40)) {
      try {
        const entry = normalizeEntry(candidate);
        const key = entry.chain + ':' + entry.address;
        if (seen.has(key)) continue;
        seen.add(key);entries.push(entry);
        if (entries.length >= WATCHLIST_LIMIT) break;
      } catch {}
    }
    return entries;
  } catch {return []}
}
export function addEntry(existing, candidate) {
  const entry = normalizeEntry(candidate);
  const key = entry.chain + ':' + entry.address;
  if (existing.some(x => x.chain + ':' + x.address === key)) throw Error('duplicate');
  if (existing.length >= WATCHLIST_LIMIT) throw Error('limit');
  return [...existing, entry];
}
export function balanceText(raw, chain) {
  const decimals = chain === 'bnb' ? 18 : chain === 'solana' ? 9 : null;
  if (decimals === null || !/^\d{1,100}$/.test(String(raw))) throw Error('unverified');
  const n = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = (n / base).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fracRaw = (n % base).toString().padStart(decimals, '0');
  const fraction = fracRaw.slice(0, 6).replace(/0+$/, '');
  if (n > 0n && whole === '0' && !fraction) return '<0.000001';
  return whole + (fraction ? '.' + fraction : '');
}
export function verifiedBalance(body, entry, now = Date.now()) {
  if (!body || body.chain !== entry.chain || body.source !== 'rpc_live' ||
      body.coverage !== 'current_native_balance_only' ||
      body.native_unit !== (entry.chain === 'bnb' ? 'BNB' : 'SOL') ||
      parsePublicAddress(body.address, entry.chain) !== entry.address) throw Error('unverified');
  const stamp = Date.parse(body.observed_at || '');
  if (!Number.isFinite(stamp) || Math.abs(now - stamp) > 120000) throw Error('stale');
  return balanceText(body.native_balance, entry.chain);
}
export function explorerUrl(entry) {
  return './explorer.html?chain=' + encodeURIComponent(entry.chain) + '&type=address&q=' + encodeURIComponent(entry.address);
}
