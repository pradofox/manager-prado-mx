import { createContext, useContext, useEffect, useState } from 'react'
import { studios, coaches, rates, buildSeedSessions } from './seed.js'

const StoreContext = createContext(null)
const LS_KEY = 'sm_sessions_v1'

function loadSessions() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage corrupto o no disponible — caemos al seed.
  }
  return buildSeedSessions()
}

export function StoreProvider({ children }) {
  const [sessions, setSessions] = useState(loadSessions)

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(sessions))
    } catch {
      // ignore: prototipo, sin persistencia garantizada
    }
  }, [sessions])

  function updateSession(id, patch) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function substituteSession(id, coachId) {
    updateSession(id, { status: 'substituted', substitutedBy: coachId })
  }

  function clearSubstitution(id) {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const status = s.date < new Date().toISOString().slice(0, 10) ? 'completed' : 'scheduled'
        return { ...s, status, substitutedBy: null }
      }),
    )
  }

  function setStatus(id, status) {
    updateSession(id, { status })
  }

  function resetDemo() {
    setSessions(buildSeedSessions())
  }

  const value = {
    studios,
    coaches,
    rates,
    sessions,
    substituteSession,
    clearSubstitution,
    setStatus,
    resetDemo,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore fuera de StoreProvider')
  return ctx
}
