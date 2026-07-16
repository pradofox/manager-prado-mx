// Worker de Studio Manager: sirve la SPA y un API por entidad sobre D1.
// El estado ya no es un blob: cada mutación toca una fila, así dos dispositivos
// editando cosas distintas no se pisan. El snapshot de pago se congela aquí
// (server-side) al marcar una clase como dada — es la fuente autoritativa.
//
// Rutas:
//   GET    /api/bootstrap?today=YYYY-MM-DD     -> siembra si está vacío; devuelve todo
//   POST   /api/sessions                       -> crea 1 o varias clases
//   PATCH  /api/sessions/:id                   -> edita una clase (re/des-snapshot)
//   DELETE /api/sessions/:id                   -> borra una clase
//   DELETE /api/sessions?seriesId=..&from=..   -> borra la serie desde una fecha
//   POST   /api/coaches                        -> alta de coach
//   POST   /api/studios                        -> alta de estudio
//   POST   /api/rates                          -> cambio de tarifa con vigencia
//   POST   /api/reset?today=YYYY-MM-DD         -> borra y resiembra
//
// Sin auth todavía (prototipo). El cierre de la puerta es la Fase 1.

import { snapshotRate, effectiveCoachId } from '../src/data/money.js'
import { addDays } from '../src/data/date.js'
import { buildSeedData } from './seed.js'

const J = { 'content-type': 'application/json' }
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: J })
const err = (msg, status = 400) => json({ error: msg }, status)

// --- mapeo fila D1 <-> objeto API (camelCase) ---
const rowStudio = (r) => ({ id: r.id, name: r.name, location: r.location, createdAt: r.created_at })
const rowCoach = (r) => ({
  id: r.id,
  name: r.name,
  whatsapp: r.whatsapp,
  email: r.email,
  isPrimary: r.is_primary,
  createdAt: r.created_at,
})
const rowRate = (r) => ({
  id: r.id,
  coachId: r.coach_id,
  studioId: r.studio_id,
  classType: r.class_type,
  rateMxn: r.rate_mxn,
  effectiveFrom: r.effective_from,
  effectiveTo: r.effective_to,
})
const rowSession = (r) => ({
  id: r.id,
  studioId: r.studio_id,
  coachId: r.coach_id,
  classType: r.class_type,
  date: r.date,
  time: r.time,
  durationMin: r.duration_min,
  room: r.room,
  status: r.status,
  substitutedBy: r.substituted_by,
  paidRateMxn: r.paid_rate_mxn,
  seriesId: r.series_id,
  notes: r.notes,
  createdAt: r.created_at,
})

const nowIso = () => new Date().toISOString()
const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const isPaidStatus = (s) => s === 'completed' || s === 'substituted'

async function allRates(db) {
  const { results } = await db.prepare('SELECT * FROM coach_rates').all()
  return results.map(rowRate)
}

async function fetchAll(db) {
  const [studios, coaches, rates, sessions] = await Promise.all([
    db.prepare('SELECT * FROM studios ORDER BY name').all(),
    db.prepare('SELECT * FROM coaches ORDER BY created_at').all(),
    db.prepare('SELECT * FROM coach_rates').all(),
    db.prepare('SELECT * FROM class_sessions ORDER BY date, time').all(),
  ])
  return {
    studios: studios.results.map(rowStudio),
    coaches: coaches.results.map(rowCoach),
    rates: rates.results.map(rowRate),
    sessions: sessions.results.map(rowSession),
  }
}

// --- siembra ---
async function seed(db, today) {
  const data = buildSeedData(today, nowIso())
  const stmts = []
  for (const s of data.studios) {
    stmts.push(
      db
        .prepare('INSERT INTO studios (id,name,location,created_at) VALUES (?,?,?,?)')
        .bind(s.id, s.name, s.location, s.createdAt),
    )
  }
  for (const c of data.coaches) {
    stmts.push(
      db
        .prepare('INSERT INTO coaches (id,name,whatsapp,email,is_primary,created_at) VALUES (?,?,?,?,?,?)')
        .bind(c.id, c.name, c.whatsapp, c.email, c.isPrimary, c.createdAt),
    )
  }
  for (const r of data.rates) {
    stmts.push(
      db
        .prepare(
          'INSERT INTO coach_rates (id,coach_id,studio_id,class_type,rate_mxn,effective_from,effective_to) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(r.id, r.coachId, r.studioId, r.classType, r.rateMxn, r.effectiveFrom, r.effectiveTo),
    )
  }
  for (const s of data.sessions) {
    stmts.push(insertSessionStmt(db, s))
  }
  stmts.push(db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES ('seeded','1')"))
  await db.batch(stmts)
}

function insertSessionStmt(db, s) {
  return db
    .prepare(
      `INSERT INTO class_sessions
       (id,studio_id,coach_id,class_type,date,time,duration_min,room,status,substituted_by,paid_rate_mxn,series_id,notes,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      s.id,
      s.studioId,
      s.coachId,
      s.classType,
      s.date,
      s.time,
      s.durationMin ?? 50,
      s.room ?? '',
      s.status ?? 'scheduled',
      s.substitutedBy ?? null,
      s.paidRateMxn ?? null,
      s.seriesId ?? null,
      s.notes ?? '',
      s.createdAt ?? nowIso(),
    )
}

async function ensureSeeded(db, today) {
  const row = await db.prepare("SELECT value FROM meta WHERE key='seeded'").first()
  if (!row) await seed(db, today || '2026-01-01')
}

async function wipe(db) {
  await db.batch([
    db.prepare('DELETE FROM class_sessions'),
    db.prepare('DELETE FROM coach_rates'),
    db.prepare('DELETE FROM coaches'),
    db.prepare('DELETE FROM studios'),
    db.prepare("DELETE FROM meta WHERE key='seeded'"),
  ])
}

// Decide el snapshot de pago tras crear/editar una clase.
// Regla: se congela al ENTRAR a estado pagable; se preserva mientras siga pagable
// con el mismo coach efectivo; se re-congela si cambia el coach efectivo; se limpia
// si sale de estado pagable. Así una tarifa que cambie después NO mueve lo devengado.
function resolveSnapshot(prev, next, rates) {
  const willPaid = isPaidStatus(next.status)
  if (!willPaid) return null
  const wasPaid = prev && isPaidStatus(prev.status)
  if (wasPaid && effectiveCoachId(prev) === effectiveCoachId(next) && prev.paidRateMxn != null) {
    return prev.paidRateMxn // preservar: mismo devengado
  }
  return snapshotRate(next, rates)
}

// --- handlers de sesiones ---
async function createSessions(db, body) {
  const list = Array.isArray(body.sessions) ? body.sessions : [body]
  if (list.length === 0) return err('sin sesiones')
  const rates = await allRates(db)
  const created = []
  const stmts = []
  for (const input of list) {
    const s = {
      id: input.id || uid('s'),
      studioId: input.studioId,
      coachId: input.coachId,
      classType: input.classType,
      date: input.date,
      time: input.time,
      durationMin: input.durationMin ?? 50,
      room: input.room ?? '',
      status: input.status ?? 'scheduled',
      substitutedBy: input.substitutedBy ?? null,
      paidRateMxn: null,
      seriesId: input.seriesId ?? null,
      notes: input.notes ?? '',
      createdAt: nowIso(),
    }
    s.paidRateMxn = resolveSnapshot(null, s, rates)
    stmts.push(insertSessionStmt(db, s))
    created.push(s)
  }
  await db.batch(stmts)
  return json({ sessions: created })
}

async function patchSession(db, id, patch) {
  const existing = await db.prepare('SELECT * FROM class_sessions WHERE id=?').bind(id).first()
  if (!existing) return err('no existe', 404)
  const prev = rowSession(existing)
  const next = { ...prev, ...patch }
  const rates = await allRates(db)
  next.paidRateMxn = resolveSnapshot(prev, next, rates)
  await db
    .prepare(
      `UPDATE class_sessions SET
        studio_id=?, coach_id=?, class_type=?, date=?, time=?, duration_min=?, room=?,
        status=?, substituted_by=?, paid_rate_mxn=?, series_id=?, notes=?
       WHERE id=?`,
    )
    .bind(
      next.studioId,
      next.coachId,
      next.classType,
      next.date,
      next.time,
      next.durationMin ?? 50,
      next.room ?? '',
      next.status,
      next.substitutedBy ?? null,
      next.paidRateMxn ?? null,
      next.seriesId ?? null,
      next.notes ?? '',
      id,
    )
    .run()
  return json({ session: next })
}

// --- handler de tarifas: cambio con vigencia ---
async function upsertRate(db, body) {
  const { coachId, studioId, classType, rateMxn, effectiveFrom } = body
  if (!coachId || !studioId || !classType || rateMxn == null || !effectiveFrom) {
    return err('faltan campos')
  }
  const openRow = await db
    .prepare(
      'SELECT * FROM coach_rates WHERE coach_id=? AND studio_id=? AND class_type=? AND effective_to IS NULL',
    )
    .bind(coachId, studioId, classType)
    .first()

  if (openRow) {
    const open = rowRate(openRow)
    if (open.rateMxn === rateMxn) {
      return json({ rates: await allRates(db) }) // sin cambio real
    }
    if (open.effectiveFrom >= effectiveFrom) {
      // La tarifa abierta empezó hoy o después: la reemplazamos en su lugar.
      await db.prepare('UPDATE coach_rates SET rate_mxn=? WHERE id=?').bind(rateMxn, open.id).run()
      return json({ rates: await allRates(db) })
    }
    // Cerramos la anterior el día previo e insertamos la nueva.
    await db
      .prepare('UPDATE coach_rates SET effective_to=? WHERE id=?')
      .bind(addDays(effectiveFrom, -1), open.id)
      .run()
  }
  await db
    .prepare(
      'INSERT INTO coach_rates (id,coach_id,studio_id,class_type,rate_mxn,effective_from,effective_to) VALUES (?,?,?,?,?,?,NULL)',
    )
    .bind(uid('r'), coachId, studioId, classType, rateMxn, effectiveFrom)
    .run()
  return json({ rates: await allRates(db) })
}

async function handleApi(request, env, url) {
  const db = env.DB
  const path = url.pathname
  const method = request.method

  if (path === '/api/bootstrap' && method === 'GET') {
    await ensureSeeded(db, url.searchParams.get('today'))
    return json(await fetchAll(db))
  }

  if (path === '/api/reset' && method === 'POST') {
    await wipe(db)
    await seed(db, url.searchParams.get('today') || '2026-01-01')
    return json(await fetchAll(db))
  }

  if (path === '/api/sessions' && method === 'POST') {
    return createSessions(db, await request.json())
  }

  if (path === '/api/sessions' && method === 'DELETE') {
    const seriesId = url.searchParams.get('seriesId')
    const from = url.searchParams.get('from')
    if (seriesId) {
      await db
        .prepare('DELETE FROM class_sessions WHERE series_id=? AND date>=?')
        .bind(seriesId, from || '0000-00-00')
        .run()
      return json({ ok: true })
    }
    return err('falta seriesId')
  }

  const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)$/)
  if (sessionMatch) {
    const id = decodeURIComponent(sessionMatch[1])
    if (method === 'PATCH') return patchSession(db, id, await request.json())
    if (method === 'DELETE') {
      await db.prepare('DELETE FROM class_sessions WHERE id=?').bind(id).run()
      return json({ ok: true })
    }
  }

  if (path === '/api/coaches' && method === 'POST') {
    const b = await request.json()
    if (!b.name) return err('falta name')
    const c = {
      id: b.id || uid('c'),
      name: b.name.trim(),
      whatsapp: b.whatsapp ?? '',
      email: b.email ?? '',
      isPrimary: 0,
      createdAt: nowIso(),
    }
    await db
      .prepare('INSERT INTO coaches (id,name,whatsapp,email,is_primary,created_at) VALUES (?,?,?,?,?,?)')
      .bind(c.id, c.name, c.whatsapp, c.email, c.isPrimary, c.createdAt)
      .run()
    return json({ coach: c })
  }

  if (path === '/api/studios' && method === 'POST') {
    const b = await request.json()
    if (!b.name) return err('falta name')
    const s = {
      id: b.id || uid('st'),
      name: b.name.trim(),
      location: (b.location ?? '').trim(),
      createdAt: nowIso(),
    }
    await db
      .prepare('INSERT INTO studios (id,name,location,created_at) VALUES (?,?,?,?)')
      .bind(s.id, s.name, s.location, s.createdAt)
      .run()
    return json({ studio: s })
  }

  if (path === '/api/rates' && method === 'POST') {
    return upsertRate(db, await request.json())
  }

  return err('ruta no encontrada', 404)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url)
      } catch (e) {
        return err('error interno: ' + (e?.message || String(e)), 500)
      }
    }
    return env.ASSETS.fetch(request)
  },
}
