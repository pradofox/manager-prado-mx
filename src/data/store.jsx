import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  studios as seedStudios,
  coaches as seedCoaches,
  rates as seedRates,
  buildSeedSessions,
} from './seed.js'
import { effectiveCoachId, defaultStatus } from './helpers.js'

const StoreContext = createContext(null)
const LS_KEY = 'sm_data_v2'
const API = '/api/state'

function initialData() {
  return {
    studios: seedStudios,
    coaches: seedCoaches,
    rates: seedRates,
    sessions: buildSeedSessions(),
  }
}

function isValid(d) {
  return d && d.studios && d.coaches && d.rates && d.sessions
}

// Carga rápida desde localStorage (caché) para render instantáneo.
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (isValid(d)) return d
    }
  } catch {
    // localStorage corrupto o no disponible
  }
  return initialData()
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(loadLocal)
  const [editing, setEditing] = useState(null) // null | 'new' | sessionObject
  const [sync, setSync] = useState('syncing') // 'syncing' | 'online' | 'offline'

  const dataRef = useRef(data)
  dataRef.current = data
  const readyRef = useRef(false) // true cuando ya reconciliamos con el servidor
  const timerRef = useRef(null)

  // Carga inicial: traer el estado de la nube y reconciliar.
  useEffect(() => {
    let cancelled = false
    fetch(API)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((server) => {
        if (cancelled) return
        if (isValid(server)) {
          setData(server)
        } else {
          // El servidor está vacío: lo sembramos con lo que tenemos.
          fetch(API, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(dataRef.current),
          }).catch(() => {})
        }
        readyRef.current = true
        setSync('online')
      })
      .catch(() => {
        if (cancelled) return
        readyRef.current = true
        setSync('offline')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Guardado: localStorage siempre; nube con debounce.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
    if (!readyRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setSync('syncing')
      fetch(API, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dataRef.current),
      })
        .then((r) => setSync(r.ok ? 'online' : 'offline'))
        .catch(() => setSync('offline'))
    }, 700)
  }, [data])

  // --- lookups ---
  const studioById = (id) => data.studios.find((s) => s.id === id)
  const coachById = (id) => data.coaches.find((c) => c.id === id)
  const rateFor = (coachId, studioId, classType) => {
    const r = data.rates.find(
      (x) => x.coachId === coachId && x.studioId === studioId && x.classType === classType,
    )
    return r ? r.rateMxn : null
  }
  const payFor = (session) =>
    rateFor(effectiveCoachId(session), session.studioId, session.classType)

  // --- acciones: clases ---
  function makeSession(s) {
    return {
      id: uid('s'),
      durationMin: 50,
      status: defaultStatus(s.date),
      substitutedBy: null,
      notes: '',
      ...s,
    }
  }

  function addSession(s) {
    const session = makeSession(s)
    setData((d) => ({ ...d, sessions: [...d.sessions, session] }))
  }

  function addSessions(list) {
    const made = list.map(makeSession)
    setData((d) => ({ ...d, sessions: [...d.sessions, ...made] }))
  }

  function updateSession(id, patch) {
    setData((d) => ({
      ...d,
      sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function deleteSession(id) {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }))
  }

  function substituteSession(id, coachId) {
    updateSession(id, { status: 'substituted', substitutedBy: coachId })
  }

  function clearSubstitution(id) {
    setData((d) => ({
      ...d,
      sessions: d.sessions.map((s) =>
        s.id === id ? { ...s, status: defaultStatus(s.date), substitutedBy: null } : s,
      ),
    }))
  }

  function setStatus(id, status) {
    updateSession(id, { status })
  }

  // --- acciones: equipo y tarifas ---
  function addCoach(name) {
    const coach = { id: uid('c'), name: name.trim() }
    setData((d) => ({ ...d, coaches: [...d.coaches, coach] }))
    return coach
  }

  function addStudio(name, location) {
    const studio = { id: uid('st'), name: name.trim(), location: (location || '').trim() }
    setData((d) => ({ ...d, studios: [...d.studios, studio] }))
    return studio
  }

  function upsertRate(coachId, studioId, classType, rateMxn) {
    setData((d) => {
      const i = d.rates.findIndex(
        (x) => x.coachId === coachId && x.studioId === studioId && x.classType === classType,
      )
      const rates = [...d.rates]
      if (i >= 0) rates[i] = { ...rates[i], rateMxn }
      else rates.push({ coachId, studioId, classType, rateMxn })
      return { ...d, rates }
    })
  }

  function resetDemo() {
    setData(initialData())
    setEditing(null)
  }

  // --- editor de clase ---
  const openEditor = (target) => setEditing(target)
  const closeEditor = () => setEditing(null)

  const value = {
    ...data,
    sync,
    studioById,
    coachById,
    rateFor,
    payFor,
    addSession,
    addSessions,
    updateSession,
    deleteSession,
    substituteSession,
    clearSubstitution,
    setStatus,
    addCoach,
    addStudio,
    upsertRate,
    resetDemo,
    editing,
    openEditor,
    closeEditor,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore fuera de StoreProvider')
  return ctx
}
