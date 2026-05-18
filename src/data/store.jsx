import { createContext, useContext, useEffect, useState } from 'react'
import {
  studios as seedStudios,
  coaches as seedCoaches,
  rates as seedRates,
  buildSeedSessions,
} from './seed.js'
import { effectiveCoachId, defaultStatus } from './helpers.js'

const StoreContext = createContext(null)
const LS_KEY = 'sm_data_v2'

function initialData() {
  return {
    studios: seedStudios,
    coaches: seedCoaches,
    rates: seedRates,
    sessions: buildSeedSessions(),
  }
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (d && d.studios && d.coaches && d.rates && d.sessions) return d
    }
  } catch {
    // localStorage corrupto o no disponible — caemos al seed.
  }
  return initialData()
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(load)
  const [editing, setEditing] = useState(null) // null | 'new' | sessionObject

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      // ignore: prototipo, sin persistencia garantizada
    }
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
  function addSession(s) {
    const session = {
      id: uid('s'),
      durationMin: 50,
      status: defaultStatus(s.date),
      substitutedBy: null,
      notes: '',
      ...s,
    }
    setData((d) => ({ ...d, sessions: [...d.sessions, session] }))
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
  const openEditor = (target) => setEditing(target) // 'new' o sesión
  const closeEditor = () => setEditing(null)

  const value = {
    ...data,
    studioById,
    coachById,
    rateFor,
    payFor,
    addSession,
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
