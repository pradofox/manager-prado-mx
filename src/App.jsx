import { useState } from 'react'
import { parseDate } from './data/helpers.js'
import { TODAY } from './data/seed.js'
import Horarios from './pages/Horarios.jsx'
import Pagos from './pages/Pagos.jsx'
import Sustituciones from './pages/Sustituciones.jsx'
import Estudios from './pages/Estudios.jsx'

const TABS = [
  { id: 'horarios', label: 'Horarios', Page: Horarios },
  { id: 'pagos', label: 'Pagos', Page: Pagos },
  { id: 'sustituciones', label: 'Sustituc.', Page: Sustituciones },
  { id: 'estudios', label: 'Estudios', Page: Estudios },
]

function Icon({ id, active }) {
  const stroke = active ? '#000' : '#888'
  const p = { fill: 'none', stroke, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (id === 'horarios')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="3" y="4" width="14" height="13" rx="2" {...p} />
        <path d="M3 8h14M7 2v4M13 2v4" {...p} />
      </svg>
    )
  if (id === 'pagos')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="2.5" y="5" width="15" height="10" rx="2" {...p} />
        <path d="M2.5 9h15M6 12.5h2" {...p} />
      </svg>
    )
  if (id === 'sustituciones')
    return (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M5 6h9l-2.2-2.2M15 14H6l2.2 2.2" {...p} />
      </svg>
    )
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path d="M4 16V8l6-4 6 4v8M8 16v-4h4v4" {...p} />
    </svg>
  )
}

export default function App() {
  const [tab, setTab] = useState('horarios')
  const Active = TABS.find((t) => t.id === tab).Page

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-[15px] font-bold leading-none">Studio Manager</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">PRADO · Hugo Prado</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] uppercase text-muted">Hoy</div>
          <div className="font-mono text-[13px] font-bold">{parseDate(TODAY).full}</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-3">
        <Active />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <Icon id={t.id} active={active} />
              <span
                className={`font-mono text-[10px] uppercase tracking-wide ${active ? 'font-bold text-fg' : 'text-muted'}`}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
