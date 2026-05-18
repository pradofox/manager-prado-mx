import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import { classLabel, parseDate, fmtMoney, todayStr } from '../data/helpers.js'
import { SessionCard, SectionLabel, EmptyState } from '../components/ui.jsx'

export default function Sustituciones() {
  const { sessions, coaches, substituteSession, clearSubstitution, studioById, coachById, rateFor } =
    useStore()
  const [picking, setPicking] = useState(null)

  const active = sessions
    .filter((s) => s.status === 'substituted')
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))

  const today = todayStr()
  const upcoming = sessions
    .filter((s) => s.status === 'scheduled' && s.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 12)

  const pickSession = picking ? sessions.find((s) => s.id === picking) : null

  return (
    <div>
      <p className="font-mono text-[11px] leading-relaxed text-muted">
        Marca una clase como cubierta por otro coach. El ingreso se reasigna automáticamente a quien
        la dio.
      </p>

      <SectionLabel>Sustituciones activas</SectionLabel>
      {active.length === 0 ? (
        <EmptyState>Ninguna clase sustituida</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {active.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              accessory={
                <button
                  onClick={() => clearSubstitution(s.id)}
                  className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] uppercase"
                >
                  Quitar
                </button>
              }
            />
          ))}
        </div>
      )}

      <SectionLabel>Próximas clases</SectionLabel>
      {upcoming.length === 0 ? (
        <EmptyState>Sin clases programadas</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {upcoming.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              accessory={
                <button
                  onClick={() => setPicking(s.id)}
                  className="rounded-full bg-fg px-3 py-1.5 font-mono text-[11px] uppercase text-card"
                >
                  Sustituir
                </button>
              }
            />
          ))}
        </div>
      )}

      {pickSession && (
        <div
          className="animate-fade fixed inset-0 z-20 flex items-end justify-center bg-fg/40"
          onClick={() => setPicking(null)}
        >
          <div
            className="animate-sheet mx-auto w-full max-w-md rounded-t-2xl border-t border-line bg-card p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              ¿Quién cubre esta clase?
            </div>
            <div className="mt-1 text-[15px] font-bold">
              {classLabel(pickSession.classType)} · {parseDate(pickSession.date).full} {pickSession.time}
            </div>
            <div className="text-[13px] text-muted">
              {studioById(pickSession.studioId)?.name} · titular{' '}
              {coachById(pickSession.coachId)?.name}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {coaches
                .filter((c) => c.id !== pickSession.coachId)
                .map((c) => {
                  const rate = rateFor(c.id, pickSession.studioId, pickSession.classType)
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        substituteSession(pickSession.id, c.id)
                        setPicking(null)
                      }}
                      className="flex items-center justify-between rounded-xl border border-line px-3.5 py-3 text-left active:bg-bg"
                    >
                      <span className="text-[14px] font-bold">{c.name}</span>
                      <span className="font-mono text-[12px] text-muted">
                        {rate != null ? fmtMoney(rate) : 'sin tarifa'}
                      </span>
                    </button>
                  )
                })}
            </div>
            <button
              onClick={() => setPicking(null)}
              className="mt-3 w-full py-2 font-mono text-[11px] uppercase tracking-wide text-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
