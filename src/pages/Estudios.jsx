import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import {
  addDays,
  todayStr,
  parseDate,
  fmtMoney,
  classLabel,
  effectiveCoachId,
  isToday,
} from '../data/helpers.js'
import { SessionCard, SectionLabel, EmptyState, Pill, StatCard } from '../components/ui.jsx'

export default function Estudios() {
  const { sessions, studios, rates, payFor, coachById, addStudio, openEditor } = useStore()
  const [studioId, setStudioId] = useState('s_energee')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [loc, setLoc] = useState('')

  const today = todayStr()
  const windowEnd = addDays(today, 6)
  const week = sessions
    .filter(
      (s) => s.studioId === studioId && s.date >= today && s.date <= windowEnd && s.status !== 'cancelled',
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const total = week.reduce((sum, s) => sum + (payFor(s) || 0), 0)
  // Solo tarifas vigentes (effectiveTo null) — no el histórico.
  const studioRates = rates.filter((r) => r.studioId === studioId && !r.effectiveTo)

  const byDay = {}
  week.forEach((s) => {
    ;(byDay[s.date] ||= []).push(s)
  })
  const days = Object.keys(byDay).sort()

  function submitStudio() {
    if (!name.trim()) return
    const st = addStudio(name, loc)
    setStudioId(st.id)
    setName('')
    setLoc('')
    setAdding(false)
  }

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {studios.map((st) => (
          <button
            key={st.id}
            onClick={() => setStudioId(st.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-micro ${
              st.id === studioId ? 'border-fg bg-fg text-card font-bold' : 'border-line bg-card text-muted'
            }`}
          >
            {st.name}
          </button>
        ))}
        <button
          onClick={() => setAdding((v) => !v)}
          className="shrink-0 rounded-full border border-dashed border-muted px-3 py-1.5 text-micro text-muted"
        >
          + Estudio
        </button>
      </div>

      {adding && (
        <div className="mt-3 flex flex-col gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del estudio"
            className="rounded-lg border border-line bg-card px-3 py-2.5 text-body outline-none focus:border-fg"
          />
          <div className="flex gap-2">
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitStudio()}
              placeholder="Zona / colonia"
              className="flex-1 rounded-lg border border-line bg-card px-3 py-2.5 text-body outline-none focus:border-fg"
            />
            <button onClick={submitStudio} className="rounded-lg bg-fg px-4 text-meta font-bold text-card">
              Agregar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Clases · 7 días" value={week.length} />
        <StatCard label="Nómina semana" value={fmtMoney(total)} />
      </div>

      {days.length === 0 && (
        <div className="mt-6">
          <EmptyState>Sin clases esta semana · usa el botón + para asignar una</EmptyState>
        </div>
      )}

      {days.map((d) => (
        <div key={d}>
          <SectionLabel right={isToday(d) ? <Pill tone="today">Hoy</Pill> : null}>
            {parseDate(d).full}
          </SectionLabel>
          <div className="flex flex-col gap-3">
            {byDay[d].map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                accessory={
                  <span className="font-mono text-micro text-muted">
                    {coachById(effectiveCoachId(s))?.name.split(' ')[0]}
                  </span>
                }
                showCoach={false}
                onClick={() => openEditor(s)}
              />
            ))}
          </div>
        </div>
      ))}

      <SectionLabel>Tarifas del estudio</SectionLabel>
      {studioRates.length === 0 ? (
        <EmptyState>Sin tarifas · se registran al asignar una clase con monto</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          {studioRates.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <span className="text-meta">
                {coachById(r.coachId)?.name.split(' ')[0]} · {classLabel(r.classType)}
              </span>
              <span className="font-mono text-meta font-bold">{fmtMoney(r.rateMxn)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
