import https from 'https';
import http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';

let proxyAgent: http.Agent | null = null;

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || undefined;
}

function getAgent(): http.Agent {
  if (!proxyAgent) proxyAgent = new HttpsProxyAgent(getProxyUrl()!);
  return proxyAgent;
}

function headersToInit(headers: http.IncomingHttpHeaders): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) h.append(key, v);
      } else {
        h.set(key, value);
      }
    }
  }
  return h;
}

function collectBody(res: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
}

function doRequest(url: string, useProxy: boolean, init?: RequestInit): Promise<Response> {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';
  const mod = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: init?.method || 'GET',
      headers: (init?.headers as Record<string, string>) || {},
      agent: useProxy ? getAgent() : undefined,
      timeout: 15000,
    };

    const req = mod.request(options, async (res) => {
      const body = await collectBody(res);
      resolve(new Response(body.toString('utf-8'), {
        status: res.statusCode || 502,
        statusText: res.statusMessage,
        headers: headersToInit(res.headers),
      }));
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (init?.body) {
      req.write(init.body as string);
    }
    req.end();
  });
}

function isProxyError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('etimedout');
}

export async function fetchWithProxy(url: string, init?: RequestInit & { timeout?: number }): Promise<Response> {
  const proxyUrl = getProxyUrl();
  const timeout = init?.timeout;
  const { timeout: _, ...fetchInit } = init || {};

  if (!proxyUrl) {
    if (timeout) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeout);
      try {
        const res = await fetch(url, { ...fetchInit, signal: ac.signal });
        return res;
      } finally {
        clearTimeout(timer);
      }
    }
    return fetch(url, fetchInit);
  }

  console.log(`[fetch-proxy] using proxy ${proxyUrl} for ${new URL(url).hostname}`);

  try {
    return await doRequest(url, true, fetchInit);
  } catch (err) {
    if (isProxyError(err as Error)) {
      console.warn(`[fetch-proxy] proxy failed (${(err as Error).message}), retrying direct for ${new URL(url).hostname}`);
      return doRequest(url, false, fetchInit);
    }
    throw err;
  }
}
