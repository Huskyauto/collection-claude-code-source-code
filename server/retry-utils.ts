export async function retryFetch(url: string, opts?: RequestInit & { retries?: number; delayMs?: number }): Promise<Response> {
  const { retries = 2, delayMs = 1000, ...fetchOpts } = opts || {};
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, fetchOpts);
      if (resp.status === 429 && i < retries) {
        const wait = delayMs * Math.pow(2, i);
        console.warn(`[retryFetch] 429 rate limited, waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return resp;
    } catch (err: any) {
      lastErr = err;
      if (i < retries) {
        const wait = delayMs * Math.pow(2, i);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}
