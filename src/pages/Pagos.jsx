import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import {
  currentQuincena,
  previousQuincena,
  currentMonth,
  parseDate,
  fmtMoney,
  effectiveCoachId,
  classLabel,
} from '../data/helpers.js'
import { SectionLabel, EmptyState } from '../components/ui.jsx'

export default function Pagos() {
  const { sessions, coaches, payFor, studioById, coachById } = useStore()
  const [coachId, setCoachId] = useState('c_hugo')
  const q = currentQuincena()
  const [from, setFrom] = useState(q.from)
  const [to, setTo] = useState(q.to)

  const rows = sessions
    .filter(
      (s) =>
        effectiveCoachId(s) === coachId &&
        (s.status === 'completed' || s.status === 'substituted') &&
        s.date >= from &&
        s.date <= to,
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const total = rows.reduce((sum, s) => sum + (payFor(s) || 0), 0)
  const coach = coachById(coachId)

  const byStudio = {}
  rows.forEach((s) => {
    byStudio[s.studioId] = (byStudio[s.studioId] || 0) + (payFor(s) || 0)
  })

  function exportCSV() {
    const header = ['Fecha', 'Hora', 'Estudio', 'Tipo', 'Sala', 'Sustituida', 'Pago MXN']
    const lines = rows.map((s) => [
      s.date,
      s.time,
      studioById(s.studioId)?.name || '',
      classLabel(s.classType),
      s.room,
      s.status === 'substituted' ? 'Sí' : 'No',
      payFor(s) || 0,
    ])
    lines.push(['', '', '', '', '', 'TOTAL', total])
    const csv = [header, ...lines].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pago_${(coach?.name || 'coach').split(' ')[0].toLowerCase()}_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {coaches.map((c) => (
          <button
            key={c.id}
            onClick={() => setCoachId(c.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-micro ${
              c.id === coachId ? 'border-fg bg-fg text-card font-bold' : 'border-line bg-card text-muted'
            }`}
          >
            {c.name.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="rounded-xl border border-line bg-card p-4">
          <span className="font-mono text-label uppercase tracking-widest text-muted">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1.5 w-full bg-transparent font-mono text-meta font-bold outline-none"
          />
        </label>
        <label className="rounded-xl border border-line bg-card p-4">
          <span className="font-mono text-label uppercase tracking-widest text-muted">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1.5 w-full bg-transparent font-mono text-meta font-bold outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ['Quincena actual', currentQuincena()],
          ['Anterior', previousQuincena()],
          ['Este mes', currentMonth()],
        ].map(([label, range]) => {
          const active = from === range.from && to === range.to
          return (
            <button
              key={label}
              onClick={() => {
                setFrom(range.from)
                setTo(range.to)
              }}
              className={`rounded-full border px-3 py-1.5 text-micro ${
                active ? 'border-fg bg-fg text-card font-bold' : 'border-line text-muted'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-fg bg-fg p-5 text-card">
        <div className="font-mono text-label uppercase tracking-widest opacity-70">
          Total a pagar · {coach?.name}
        </div>
        <div className="mt-1.5 text-display font-bold">{fmtMoney(total)}</div>
        <div className="mt-1 font-mono text-micro opacity-70">
          {rows.length} clase{rows.length === 1 ? '' : 's'} · {from} → {to}
        </div>
      </div>

      {Object.keys(byStudio).length > 0 && (
        <>
          <SectionLabel>Por estudio</SectionLabel>
          <div className="flex flex-col gap-2">
            {Object.entries(byStudio).map(([sid, amt]) => (
              <div
                key={sid}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3"
              >
                <span className="text-body font-bold">{studioById(sid)?.name}</span>
                <span className="font-mono text-body font-bold">{fmtMoney(amt)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionLabel
        right={
          rows.length > 0 ? (
            <button onClick={exportCSV} className="font-mono text-label uppercase tracking-wide underline">
              Exportar CSV
            </button>
          ) : null
        }
      >
        Detalle de clases
      </SectionLabel>

      {rows.length === 0 ? (
        <EmptyState>Sin clases pagables en este rango</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          {rows.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <div className="min-w-0">
                <div className="font-mono text-micro text-muted">
                  {parseDate(s.date).full} · {s.time}
                </div>
                <div className="mt-0.5 truncate text-meta">
                  {classLabel(s.classType)} — {studioById(s.studioId)?.name}
                  {s.status === 'substituted' && (
                    <span className="ml-1 font-mono text-label uppercase text-muted">sust.</span>
                  )}
                </div>
              </div>
              <span className="ml-3 shrink-0 font-mono text-meta font-bold">
                {payFor(s) != null ? fmtMoney(payFor(s)) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
