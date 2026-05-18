import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import { TODAY } from '../data/seed.js'
import { addDays, parseDate, fmtMoney, effectiveCoachId, isToday } from '../data/helpers.js'
import { SessionCard, SectionLabel, EmptyState, Pill, PayTag } from '../components/ui.jsx'

export default function Horarios() {
  const { sessions, coaches, payFor, addCoach, openEditor } = useStore()
  const [coachId, setCoachId] = useState('c_hugo')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const windowEnd = addDays(TODAY, 6)
  const mine = sessions
    .filter((s) => effectiveCoachId(s) === coachId && s.date >= TODAY && s.date <= windowEnd)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const live = mine.filter((s) => s.status !== 'cancelled')
  const projected = live.reduce((sum, s) => sum + (payFor(s) || 0), 0)

  const byDay = {}
  mine.forEach((s) => {
    ;(byDay[s.date] ||= []).push(s)
  })
  const days = Object.keys(byDay).sort()

  function submitCoach() {
    if (!name.trim()) return
    const c = addCoach(name)
    setCoachId(c.id)
    setName('')
    setAdding(false)
  }

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {coaches.map((c) => (
          <button
            key={c.id}
            onClick={() => setCoachId(c.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] ${
              c.id === coachId ? 'border-fg bg-fg text-card font-bold' : 'border-line bg-card text-muted'
            }`}
          >
            {c.name.split(' ')[0]}
          </button>
        ))}
        <button
          onClick={() => setAdding((v) => !v)}
          className="shrink-0 rounded-full border border-dashed border-muted px-3 py-1.5 text-[12px] text-muted"
        >
          + Coach
        </button>
      </div>

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCoach()}
            placeholder="Nombre del coach"
            className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-fg"
          />
          <button onClick={submitCoach} className="rounded-lg bg-fg px-4 text-[13px] font-bold text-card">
            Agregar
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-card p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Clases · 7 días</div>
          <div className="mt-1 text-2xl font-bold">{live.length}</div>
        </div>
        <div className="rounded-xl border border-line bg-card p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Proyectado</div>
          <div className="mt-1 text-2xl font-bold">{fmtMoney(projected)}</div>
        </div>
      </div>

      {days.length === 0 && (
        <div className="mt-6">
          <EmptyState>Sin clases en los próximos 7 días · usa el botón + para asignar una</EmptyState>
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
                accessory={<PayTag session={s} />}
                showCoach={s.status !== 'scheduled'}
                onClick={() => openEditor(s)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
