import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import {
  addDays,
  todayStr,
  parseDate,
  relativeDay,
  fmtMoney,
  effectiveCoachId,
  isToday,
  classLabel,
} from '../data/helpers.js'
import { SessionCard, SectionLabel, EmptyState, Pill, PayTag } from '../components/ui.jsx'

function nowHHMM() {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

export default function Horarios() {
  const { sessions, coaches, payFor, addCoach, openEditor } = useStore()
  const [coachId, setCoachId] = useState('c_hugo')
  const [weekOffset, setWeekOffset] = useState(0)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const today = todayStr()
  const from = addDays(today, weekOffset * 7)
  const to = addDays(from, 6)

  const forCoach = sessions.filter((s) => effectiveCoachId(s) === coachId)

  // Próxima clase: la siguiente programada de hoy en adelante.
  const hhmm = nowHHMM()
  const next = forCoach
    .filter(
      (s) =>
        s.status === 'scheduled' &&
        (s.date > today || (s.date === today && s.time >= hhmm)),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]

  const inWindow = forCoach
    .filter((s) => s.date >= from && s.date <= to)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const live = inWindow.filter((s) => s.status !== 'cancelled')
  const projected = live.reduce((sum, s) => sum + (payFor(s) || 0), 0)

  const byDay = {}
  inWindow.forEach((s) => {
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

  const weekLabel =
    weekOffset === 0
      ? 'Próximos 7 días'
      : `${parseDate(from).short} – ${parseDate(to).short}`

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
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

      {/* Hero: próxima clase */}
      {next ? (
        <button
          onClick={() => openEditor(next)}
          className="mt-4 w-full rounded-2xl bg-fg p-4 text-left text-card active:scale-[0.99]"
        >
          <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">Tu próxima clase</div>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <div className="text-2xl font-bold">{classLabel(next.classType)}</div>
            <div className="font-mono text-lg font-bold">{next.time}</div>
          </div>
          <NextMeta session={next} />
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-5 text-center font-mono text-xs text-muted">
          Sin próxima clase programada
        </div>
      )}

      {/* Navegación de semana */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg active:bg-bg"
          aria-label="Semana anterior"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{weekLabel}</div>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="font-mono text-[10px] uppercase tracking-wide text-fg underline"
            >
              Volver a hoy
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg active:bg-bg"
          aria-label="Semana siguiente"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-card p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Clases</div>
          <div className="mt-1 text-2xl font-bold">{live.length}</div>
        </div>
        <div className="rounded-xl border border-line bg-card p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Proyectado</div>
          <div className="mt-1 text-2xl font-bold">{fmtMoney(projected)}</div>
        </div>
      </div>

      {days.length === 0 && (
        <div className="mt-6">
          <EmptyState>Sin clases en este rango · usa el botón + para asignar una</EmptyState>
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

function NextMeta({ session }) {
  const { studioById } = useStore()
  const studio = studioById(session.studioId)
  return (
    <div className="mt-2 flex items-center gap-2 border-t border-card/20 pt-2">
      <span className="rounded-full bg-card/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide">
        {relativeDay(session.date)}
      </span>
      <span className="text-[13px] opacity-80">
        {studio?.name || '—'} · {session.room || 's/sala'}
      </span>
    </div>
  )
}
