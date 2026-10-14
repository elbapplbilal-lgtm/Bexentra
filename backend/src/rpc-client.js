// Dependency-free JSON-RPC client with bounded retries for transient provider failures.
// No upstream URLs, secrets or request bodies are logged.
const retryableStatus = new Set([408, 429, 500, 502, 503, 504]);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function retryDelay(response, attempt, random) {
  const seconds = Number(response?.headers?.get?.('retry-after'));
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(5000, Math.ceil(seconds * 1000));
  }
  // Bounded exponential backoff with jitter to avoid synchronized retries.
  return Math.min(5000, 500 * (2 ** attempt) + Math.floor(random() * 250));
}

function retryableRpcError(error) {
  const code = Number(error?.code);
  return code === -32005 || /rate.limit|too many requests|temporarily unavailable|timeout|timed out|busy/i.test(String(error?.message || ''));
}

export function createRpcClient({fetchImpl = fetch, wait = sleep, random = Math.random, maxAttempts = 3, timeoutMs = 20000} = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw Error('maxAttempts must be between 1 and 5');
  return async function requestRpc(url, method, params = []) {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      let canRetry = false;
      let delay;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params}),
          signal: controller.signal
        });
        if (!response.ok) {
          canRetry = retryableStatus.has(response.status);
          delay = retryDelay(response, attempt, random);
          throw Error('RPC HTTP ' + response.status);
        }
        const json = await response.json();
        if (json?.error) {
          canRetry = retryableRpcError(json.error);
          delay = retryDelay(response, attempt, random);
          throw Error(json.error.message || 'RPC error');
        }
        // A null JSON-RPC result is legitimate, for example a skipped Solana slot.
        return json?.result;
      } catch (error) {
        lastError = error;
        if (!response && (error?.name === 'AbortError' || error instanceof TypeError)) {
          canRetry = true;
        }
        if (!canRetry || attempt === maxAttempts - 1) throw error;
        await wait(delay ?? retryDelay(null, attempt, random));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  };
}
