import https from 'https';
import http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || undefined;
}

let agent: HttpsProxyAgent<string> | null = null;

function getAgent(): HttpsProxyAgent<string> {
  if (!agent) agent = new HttpsProxyAgent(getProxyUrl()!);
  return agent;
}

function headersToObject(headers: http.IncomingHttpHeaders): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      result[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return result;
}

export function fetchWithProxy(url: string, init?: RequestInit): Promise<Response> {
  const proxyUrl = getProxyUrl();

  if (!proxyUrl) {
    // No proxy configured, use built-in fetch directly
    return fetch(url, init);
  }

  // Node.js https module with HttpsProxyAgent
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const mod = isHttps ? https : http;

    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: init?.method || 'GET',
      headers: (init?.headers as Record<string, string>) || {},
      agent: getAgent(),
      timeout: 15000,
    };

    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve(new Response(body, {
          status: res.statusCode || 502,
          statusText: res.statusMessage,
          headers: headersToObject(res.headers),
        }));
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (init?.body) {
      req.write(init.body as string);
    }
    req.end();
  });
}
