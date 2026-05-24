const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

export function corsResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...init?.headers },
  });
}
