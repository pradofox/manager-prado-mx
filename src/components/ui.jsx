import { studioById, coachById, classLabel, parseDate, sessionPay, fmtMoney, effectiveCoachId } from '../data/helpers.js'

export function Pill({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-bg text-muted',
    fg: 'bg-fg text-card',
    sub: 'bg-fg text-card',
    today: 'border border-fg text-fg',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function SectionLabel({ children, right }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between first:mt-0">
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">{children}</h2>
      {right}
    </div>
  )
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-line py-10 text-center font-mono text-xs text-muted">
      {children}
    </div>
  )
}

// Tarjeta de una clase. `accessory` se renderiza a la derecha (botón, monto, etc.)
export function SessionCard({ session, accessory, onClick, showCoach = true }) {
  const studio = studioById(session.studioId)
  const date = parseDate(session.date)
  const subbed = session.status === 'substituted'
  const effCoach = coachById(effectiveCoachId(session))
  const cancelled = session.status === 'cancelled'

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-line bg-card p-3.5 ${onClick ? 'cursor-pointer active:bg-bg' : ''} ${cancelled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{session.time}</span>
            <span className="font-mono text-[11px] text-muted">{date.full}</span>
          </div>
          <div className="mt-1 truncate text-[15px] font-bold">{classLabel(session.classType)}</div>
          <div className="mt-0.5 truncate text-[13px] text-muted">
            {studio.name} · {session.room}
          </div>
          {showCoach && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {subbed ? (
                <>
                  <Pill tone="sub">Sustituida</Pill>
                  <span className="text-[12px] text-muted">{effCoach?.name}</span>
                </>
              ) : (
                <span className="text-[12px] text-muted">{effCoach?.name}</span>
              )}
              {cancelled && <Pill>Cancelada</Pill>}
            </div>
          )}
        </div>
        {accessory && <div className="shrink-0 text-right">{accessory}</div>}
      </div>
    </div>
  )
}

export function PayTag({ session }) {
  const pay = sessionPay(session)
  if (pay == null) return <span className="font-mono text-[11px] text-muted">sin tarifa</span>
  return <span className="font-mono text-sm font-bold">{fmtMoney(pay)}</span>
}
