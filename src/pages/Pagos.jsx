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

  // Clases pagables: dadas (completadas o sustituidas) atribuidas a este coach.
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
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="rounded-xl border border-line bg-card p-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full bg-transparent font-mono text-[13px] font-bold outline-none"
          />
        </label>
        <label className="rounded-xl border border-line bg-card p-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full bg-transparent font-mono text-[13px] font-bold outline-none"
          />
        </label>
      </div>
      <div className="mt-2 flex gap-2">
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
              className={`rounded-full border px-3 py-1.5 text-[12px] ${
                active ? 'border-fg bg-fg text-card font-bold' : 'border-line text-muted'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-fg bg-fg p-4 text-card">
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">
          Total a pagar · {coach?.name}
        </div>
        <div className="mt-1 text-3xl font-bold">{fmtMoney(total)}</div>
        <div className="mt-1 font-mono text-[11px] opacity-70">
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
                className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5"
              >
                <span className="text-[14px] font-bold">{studioById(sid)?.name}</span>
                <span className="font-mono text-[14px] font-bold">{fmtMoney(amt)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionLabel
        right={
          rows.length > 0 ? (
            <button onClick={exportCSV} className="font-mono text-[11px] uppercase tracking-wide underline">
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
              className={`flex items-center justify-between px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <div className="min-w-0">
                <div className="font-mono text-[12px]">
                  {parseDate(s.date).full} · {s.time}
                </div>
                <div className="truncate text-[13px]">
                  {classLabel(s.classType)} — {studioById(s.studioId)?.name}
                  {s.status === 'substituted' && (
                    <span className="ml-1 font-mono text-[10px] uppercase text-muted">sust.</span>
                  )}
                </div>
              </div>
              <span className="ml-3 shrink-0 font-mono text-[13px] font-bold">
                {payFor(s) != null ? fmtMoney(payFor(s)) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
