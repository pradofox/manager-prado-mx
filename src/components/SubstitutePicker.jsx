import { useStore } from '../data/store.jsx'
import { classLabel, parseDate, fmtMoney } from '../data/helpers.js'

export default function SubstitutePicker() {
  const { subPicking, closeSubPicker, coaches, substituteSession, studioById, coachById, rateFor } =
    useStore()
  if (!subPicking) return null
  const ps = subPicking

  return (
    <div
      className="animate-fade fixed inset-0 z-20 flex items-end justify-center bg-fg/40 md:items-center md:p-6"
      onClick={closeSubPicker}
    >
      <div
        className="animate-sheet w-full max-w-md rounded-t-2xl border border-line bg-card p-5 pb-8 md:rounded-2xl md:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-label uppercase tracking-widest text-muted">
          ¿Quién cubre esta clase?
        </div>
        <div className="mt-1.5 text-body font-bold">
          {classLabel(ps.classType)} · {parseDate(ps.date).full} {ps.time}
        </div>
        <div className="text-meta text-muted">
          {studioById(ps.studioId)?.name} · titular {coachById(ps.coachId)?.name}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {coaches
            .filter((c) => c.id !== ps.coachId)
            .map((c) => {
              const rate = rateFor(c.id, ps.studioId, ps.classType)
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    substituteSession(ps.id, c.id)
                    closeSubPicker()
                  }}
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-left active:bg-bg"
                >
                  <span className="text-body font-bold">{c.name}</span>
                  <span className="font-mono text-micro text-muted">
                    {rate != null ? fmtMoney(rate) : 'sin tarifa'}
                  </span>
                </button>
              )
            })}
        </div>
        <button
          onClick={closeSubPicker}
          className="mt-3 w-full py-2.5 font-mono text-label uppercase tracking-wide text-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
