// Worker de Studio Manager: sirve la SPA y un API mínimo de estado.
// GET  /api/state  -> devuelve el estado guardado (o null si no hay)
// PUT  /api/state  -> guarda el estado completo en KV
// Sin auth: prototipo en subdominio privado. La protección real es el siguiente paso.

const STATE_KEY = 'state'
const JSON_HEADERS = { 'content-type': 'application/json' }

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/state') {
      if (request.method === 'GET') {
        const value = await env.STUDIO_STATE.get(STATE_KEY)
        return new Response(value || 'null', { headers: JSON_HEADERS })
      }
      if (request.method === 'PUT') {
        const body = await request.text()
        try {
          JSON.parse(body)
        } catch {
          return new Response('{"error":"invalid json"}', { status: 400, headers: JSON_HEADERS })
        }
        await env.STUDIO_STATE.put(STATE_KEY, body)
        return new Response('{"ok":true}', { headers: JSON_HEADERS })
      }
      return new Response('{"error":"method not allowed"}', { status: 405, headers: JSON_HEADERS })
    }

    return env.ASSETS.fetch(request)
  },
}
