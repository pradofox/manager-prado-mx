import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import { todayStr, parseDate, classLabel } from '../data/helpers.js'

// Cierre de día: al abrir la app, si hay clases pasadas que quedaron en
// "programada" (nunca se confirmó si se dieron), pide resolverlas. Sin esto,
// una clase dada nunca entra a Pagos — el defecto #1 del diagnóstico.
export default function DayClose() {
  const { sessions, studioById, coachById, resolveSessions, updateSession } = useStore()
  const [mode, setMode] = useState('summary') // 'summary' | 'review'
  const [dismissed, setDismissed] = useState(false)

  const today = todayStr()
  const pending = sessions
    .filter((s) => s.status === 'scheduled' && s.date < today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  if (dismissed || pending.length === 0) return null

  function allDone() {
    resolveSessions(pending.map((s) => s.id), 'completed')
    setDismissed(true)
  }

  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-end justify-center bg-fg/50 md:items-center md:p-6">
      <div className="animate-sheet flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl border border-line bg-card md:max-h-[80dvh] md:rounded-2xl">
        <div className="border-b border-line p-5">
          <div className="font-mono text-label uppercase tracking-widest text-muted">Cierre de día</div>
          <h2 className="mt-1 text-title font-bold">
            {pending.length} clase{pending.length === 1 ? '' : 's'} sin confirmar
          </h2>
          <p className="mt-1 text-meta text-muted">
            Ya pasaron pero no marcaste si se dieron. Confírmalas para que cuenten en los pagos.
          </p>
        </div>

        {mode === 'summary' ? (
          <div className="p-5">
            <div className="max-h-[30dvh] overflow-y-auto rounded-xl border border-line">
              {pending.slice(0, 6).map((s, i) => (
                <Row key={s.id} s={s} studioById={studioById} coachById={coachById} border={i > 0} />
              ))}
              {pending.length > 6 && (
                <div className="border-t border-line px-4 py-2 font-mono text-label uppercase text-muted">
                  +{pending.length - 6} más
                </div>
              )}
            </div>
            <button
              onClick={allDone}
              className="mt-4 w-full rounded-xl bg-fg py-3 text-body font-bold text-card active:scale-[0.99]"
            >
              Todas se dieron
            </button>
            <button
              onClick={() => setMode('review')}
              className="mt-2 w-full rounded-xl border border-line py-2.5 text-meta text-fg"
            >
              Revisar una por una
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="mt-2 w-full py-2 font-mono text-label uppercase tracking-wide text-muted"
            >
              Luego
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-col gap-2">
                {pending.map((s) => (
                  <div key={s.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-meta font-bold">{s.time}</span>
                      <span className="font-mono text-micro text-muted">{parseDate(s.date).full}</span>
                    </div>
                    <div className="mt-1 text-body font-bold">{classLabel(s.classType)}</div>
                    <div className="text-meta text-muted">
                      {studioById(s.studioId)?.name} · {coachById(s.coachId)?.name?.split(' ')[0]}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateSession(s.id, { status: 'completed' })}
                        className="rounded-lg bg-fg py-2 font-mono text-label uppercase tracking-wide font-bold text-card"
                      >
                        Se dio
                      </button>
                      <button
                        onClick={() => updateSession(s.id, { status: 'cancelled' })}
                        className="rounded-lg border border-line py-2 font-mono text-label uppercase tracking-wide text-muted"
                      >
                        No se dio
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-line p-4">
              <button
                onClick={() => setDismissed(true)}
                className="w-full py-2 font-mono text-label uppercase tracking-wide text-muted"
              >
                Terminar luego
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ s, studioById, coachById, border }) {
  return (
    <div className={`px-4 py-2.5 ${border ? 'border-t border-line' : ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-meta font-bold">{classLabel(s.classType)}</span>
        <span className="font-mono text-micro text-muted">
          {parseDate(s.date).short} · {s.time}
        </span>
      </div>
      <div className="text-micro text-muted">
        {studioById(s.studioId)?.name} · {coachById(s.coachId)?.name?.split(' ')[0]}
      </div>
    </div>
  )
}
