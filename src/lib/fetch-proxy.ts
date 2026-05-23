import { setGlobalDispatcher, ProxyAgent } from 'undici';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(agent);
  console.log(`[Proxy] Global dispatcher set: ${proxyUrl}`);
}

export function fetchWithProxy(url: string, init?: RequestInit): Promise<Response> {
  // When global dispatcher is set, regular fetch already uses the proxy
  return fetch(url, init);
}
