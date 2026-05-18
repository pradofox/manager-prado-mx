import { useStore } from '../data/store.jsx'
import { todayStr } from '../data/helpers.js'
import { SessionCard, SectionLabel, EmptyState } from '../components/ui.jsx'

export default function Sustituciones() {
  const { sessions, clearSubstitution, openSubPicker } = useStore()

  const active = sessions
    .filter((s) => s.status === 'substituted')
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))

  const today = todayStr()
  const upcoming = sessions
    .filter((s) => s.status === 'scheduled' && s.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 12)

  return (
    <div>
      <p className="font-mono text-micro leading-relaxed text-muted">
        Marca una clase como cubierta por otro coach. El ingreso se reasigna automáticamente a quien
        la dio.
      </p>

      <SectionLabel>Sustituciones activas</SectionLabel>
      {active.length === 0 ? (
        <EmptyState>Ninguna clase sustituida</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              accessory={
                <button
                  onClick={() => clearSubstitution(s.id)}
                  className="rounded-full border border-line px-3 py-1.5 font-mono text-label uppercase"
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
        <div className="flex flex-col gap-3">
          {upcoming.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              accessory={
                <button
                  onClick={() => openSubPicker(s)}
                  className="rounded-full bg-fg px-3 py-1.5 font-mono text-label uppercase text-card"
                >
                  Sustituir
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
