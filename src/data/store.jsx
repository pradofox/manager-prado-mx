import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { todayStr, defaultStatus } from './helpers.js'
import { computePay, resolveRate } from './money.js'

const StoreContext = createContext(null)
const LS_KEY = 'sm_data_v3' // v3: modelo relacional con vigencia + snapshot

const EMPTY = { studios: [], coaches: [], rates: [], sessions: [] }

function isValid(d) {
  return d && Array.isArray(d.studios) && Array.isArray(d.coaches) && Array.isArray(d.rates) && Array.isArray(d.sessions)
}

// Caché de lectura para pintar al instante y sobrevivir sin conexión.
function loadCache() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (isValid(d)) return d
    }
  } catch {
    // ignore
  }
  return EMPTY
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

class HttpError extends Error {
  constructor(status) {
    super('http ' + status)
    this.status = status
  }
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new HttpError(res.status)
  return res.json()
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(loadCache)
  const [editing, setEditing] = useState(null) // null | 'new' | sessionObject
  const [subPicking, setSubPicking] = useState(null)
  const [sync, setSync] = useState('syncing') // 'syncing' | 'online' | 'offline'
  const [authed, setAuthed] = useState('unknown') // 'unknown' | 'yes' | 'no'

  const dataRef = useRef(data)
  dataRef.current = data

  function loadAll() {
    return api('GET', `/api/bootstrap?today=${todayStr()}`)
      .then((server) => {
        if (isValid(server)) setData(server)
        setAuthed('yes')
        setSync('online')
      })
      .catch((e) => {
        if (e.status === 401) {
          setAuthed('no')
          setData(EMPTY) // no dejar datos en caché a la vista sin sesión
        } else {
          setAuthed('yes')
          setSync('offline')
        }
        throw e
      })
  }

  // Carga inicial desde el servidor (D1). Siembra sola si está vacío.
  useEffect(() => {
    loadAll().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Canjea el código de acceso por una sesión de 30 días.
  async function login(code) {
    await api('POST', '/api/login', { code })
    await loadAll()
  }

  // Persistir la caché de lectura en cada cambio.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
  }, [data])

  // Corre una mutación optimista y sincroniza con el servidor.
  // apply: (data) => nuevoData    ·    call: () => Promise<reconciliador|void>
  function mutate(apply, call) {
    setData((d) => apply(d))
    setSync('syncing')
    call()
      .then((reconcile) => {
        if (typeof reconcile === 'function') setData((d) => reconcile(d))
        setSync('online')
      })
      .catch(() => setSync('offline'))
  }

  // --- lookups ---
  const studioById = (id) => data.studios.find((s) => s.id === id)
  const coachById = (id) => data.coaches.find((c) => c.id === id)
  // Tarifa vigente a una fecha (default hoy). Usa la lógica de vigencia compartida.
  const rateFor = (coachId, studioId, classType, date = todayStr()) =>
    resolveRate(data.rates, coachId, studioId, classType, date)
  // Pago de una sesión: snapshot congelado si ya se dio, si no proyección por fecha.
  const payFor = (session) => computePay(session, data.rates)

  // --- clases ---
  function buildSession(input) {
    return {
      id: input.id || uid('s'),
      studioId: input.studioId,
      coachId: input.coachId,
      classType: input.classType,
      date: input.date,
      time: input.time,
      durationMin: input.durationMin ?? 50,
      room: input.room ?? '',
      status: input.status ?? defaultStatus(input.date),
      substitutedBy: input.substitutedBy ?? null,
      paidRateMxn: null,
      seriesId: input.seriesId ?? null,
      notes: input.notes ?? '',
    }
  }

  function replaceSessions(newRows) {
    // Reconciliador: reemplaza por id con las filas autoritativas del servidor.
    const byId = new Map(newRows.map((s) => [s.id, s]))
    return (d) => ({
      ...d,
      sessions: d.sessions.map((s) => byId.get(s.id) || s),
    })
  }

  function addSession(input) {
    const s = buildSession(input)
    mutate(
      (d) => ({ ...d, sessions: [...d.sessions, s] }),
      () => api('POST', '/api/sessions', s).then((r) => replaceSessions(r.sessions)),
    )
    return s
  }

  function addSessions(list) {
    const made = list.map(buildSession)
    mutate(
      (d) => ({ ...d, sessions: [...d.sessions, ...made] }),
      () => api('POST', '/api/sessions', { sessions: made }).then((r) => replaceSessions(r.sessions)),
    )
    return made
  }

  function updateSession(id, patch) {
    mutate(
      (d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      () => api('PATCH', `/api/sessions/${encodeURIComponent(id)}`, patch).then((r) => replaceSessions([r.session])),
    )
  }

  function deleteSession(id) {
    mutate(
      (d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }),
      () => api('DELETE', `/api/sessions/${encodeURIComponent(id)}`),
    )
  }

  function deleteSeries(seriesId, from) {
    mutate(
      (d) => ({
        ...d,
        sessions: d.sessions.filter((s) => !(s.seriesId === seriesId && s.date >= from)),
      }),
      () => api('DELETE', `/api/sessions?seriesId=${encodeURIComponent(seriesId)}&from=${from}`),
    )
  }

  function substituteSession(id, coachId) {
    updateSession(id, { status: 'substituted', substitutedBy: coachId })
  }

  function clearSubstitution(id) {
    const s = dataRef.current.sessions.find((x) => x.id === id)
    updateSession(id, { status: defaultStatus(s ? s.date : todayStr()), substitutedBy: null })
  }

  function setStatus(id, status) {
    updateSession(id, { status })
  }

  // Cierre de día: resuelve varias clases pasadas de golpe.
  function resolveSessions(ids, status) {
    if (ids.length === 0) return
    const set = new Set(ids)
    mutate(
      (d) => ({ ...d, sessions: d.sessions.map((s) => (set.has(s.id) ? { ...s, status } : s)) }),
      () =>
        Promise.all(
          ids.map((id) => api('PATCH', `/api/sessions/${encodeURIComponent(id)}`, { status })),
        ).then((rs) => replaceSessions(rs.map((r) => r.session))),
    )
  }

  // --- equipo y tarifas ---
  function addCoach(name) {
    const coach = { id: uid('c'), name: name.trim(), whatsapp: '', email: '', isPrimary: 0 }
    mutate(
      (d) => ({ ...d, coaches: [...d.coaches, coach] }),
      () => api('POST', '/api/coaches', coach),
    )
    return coach
  }

  function addStudio(name, location) {
    const studio = { id: uid('st'), name: name.trim(), location: (location || '').trim() }
    mutate(
      (d) => ({ ...d, studios: [...d.studios, studio] }),
      () => api('POST', '/api/studios', studio),
    )
    return studio
  }

  // Cambio de tarifa con vigencia: el servidor cierra la anterior e inserta la nueva.
  // effectiveFrom = hoy (los pagos ya devengados no cambian).
  function upsertRate(coachId, studioId, classType, rateMxn) {
    const today = todayStr()
    const current = resolveRate(dataRef.current.rates, coachId, studioId, classType, today)
    if (current === rateMxn) return // sin cambio real
    setSync('syncing')
    api('POST', '/api/rates', { coachId, studioId, classType, rateMxn, effectiveFrom: today })
      .then((r) => {
        setData((d) => ({ ...d, rates: r.rates }))
        setSync('online')
      })
      .catch(() => setSync('offline'))
  }

  // mode 'demo' resiembra el demo; 'empty' deja todo en blanco para datos reales.
  function resetData(mode = 'demo') {
    setEditing(null)
    setSync('syncing')
    const q = mode === 'empty' ? '?mode=empty' : `?today=${todayStr()}`
    api('POST', `/api/reset${q}`)
      .then((server) => {
        if (isValid(server)) setData(server)
        setSync('online')
      })
      .catch(() => setSync('offline'))
  }

  // --- editor / selector ---
  const openEditor = (target) => setEditing(target)
  const closeEditor = () => setEditing(null)
  const openSubPicker = (session) => setSubPicking(session)
  const closeSubPicker = () => setSubPicking(null)

  const value = {
    ...data,
    sync,
    authed,
    login,
    studioById,
    coachById,
    rateFor,
    payFor,
    addSession,
    addSessions,
    updateSession,
    deleteSession,
    deleteSeries,
    substituteSession,
    clearSubstitution,
    setStatus,
    resolveSessions,
    addCoach,
    addStudio,
    upsertRate,
    resetData,
    editing,
    openEditor,
    closeEditor,
    subPicking,
    openSubPicker,
    closeSubPicker,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore fuera de StoreProvider')
  return ctx
}
