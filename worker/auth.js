// Auth ligera: un código de acceso compartido -> cookie firmada de 30 días.
// No hay cuentas por persona todavía (eso llega si el piloto valida). El punto
// es que datos reales de pago no vivan en un endpoint abierto.
//
// Secretos del Worker (wrangler secret put):
//   ACCESS_CODE  -> el código que se comparte con quien puede entrar
//   AUTH_SECRET  -> llave HMAC para firmar la cookie

const COOKIE = 'sm_session'
const THIRTY_DAYS = 30 * 24 * 60 * 60

function b64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(secret, data) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64url(new Uint8Array(sig))
}

// Comparación en tiempo constante (evita filtrar la firma por timing).
function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function makeToken(secret) {
  const exp = String(Date.now() + THIRTY_DAYS * 1000)
  return `${exp}.${await sign(secret, exp)}`
}

export async function verifyToken(secret, token) {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig) return false
  const expected = await sign(secret, exp)
  if (!safeEqual(sig, expected)) return false
  return Number(exp) > Date.now()
}

export function readCookie(request, name = COOKIE) {
  const header = request.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${THIRTY_DAYS}`
}

// ¿La petición trae sesión válida?
export async function isAuthed(request, env) {
  if (!env.AUTH_SECRET) return false // fail-closed: sin llave no se entra
  return verifyToken(env.AUTH_SECRET, readCookie(request))
}

// Valida el código de acceso enviado en el login.
export function checkCode(env, code) {
  if (!env.ACCESS_CODE || typeof code !== 'string') return false
  return safeEqual(code.trim(), env.ACCESS_CODE)
}
