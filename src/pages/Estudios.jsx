import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import { TODAY } from '../data/seed.js'
import { addDays, parseDate, fmtMoney, classLabel, effectiveCoachId, isToday } from '../data/helpers.js'
import { SessionCard, SectionLabel, EmptyState, Pill } from '../components/ui.jsx'

export default function Estudios() {
  const { sessions, studios, rates, payFor, coachById, addStudio, openEditor } = useStore()
  const [studioId, setStudioId] = useState('s_energee')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [loc, setLoc] = useState('')

  const windowEnd = addDays(TODAY, 6)
  const week = sessions
    .filter((s) => s.studioId === studioId && s.date >= TODAY && s.date <= windowEnd && s.status !== 'cancelled')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const total = week.reduce((sum, s) => sum + (payFor(s) || 0), 0)
  const studioRates = rates.filter((r) => r.studioId === studioId)

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
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {studios.map((st) => (
          <button
            key={st.id}
            onClick={() => setStudioId(st.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] ${
              st.id === studioId ? 'border-fg bg-fg text-card font-bold' : 'border-line bg-card text-muted'
            }`}
          >
            {st.name}
          </button>
        ))}
        <button
          onClick={() => setAdding((v) => !v)}
          className="shrink-0 rounded-full border border-dashed border-muted px-3 py-1.5 text-[12px] text-muted"
        >
          + Estudio
        </button>
      </div>

      {adding && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del estudio"
            className="rounded-lg border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-fg"
          />
          <div className="flex gap-2">
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitStudio()}
              placeholder="Zona / colonia"
              className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-fg"
            />
            <button onClick={submitStudio} className="rounded-lg bg-fg px-4 text-[13px] font-bold text-card">
              Agregar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-card p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Clases · 7 días</div>
          <div className="mt-1 text-2xl font-bold">{week.length}</div>
        </div>
        <div className="rounded-xl border border-line bg-card p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Nómina semana</div>
          <div className="mt-1 text-2xl font-bold">{fmtMoney(total)}</div>
        </div>
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
          <div className="flex flex-col gap-2.5">
            {byDay[d].map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                accessory={
                  <span className="font-mono text-[12px] text-muted">
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
              className={`flex items-center justify-between px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <span className="text-[13px]">
                {coachById(r.coachId)?.name.split(' ')[0]} · {classLabel(r.classType)}
              </span>
              <span className="font-mono text-[13px] font-bold">{fmtMoney(r.rateMxn)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
