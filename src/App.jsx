import { useState } from 'react'
import { parseDate, todayStr } from './data/helpers.js'
import { useStore } from './data/store.jsx'
import ClassForm from './components/ClassForm.jsx'
import SubstitutePicker from './components/SubstitutePicker.jsx'
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

const SYNC_LABEL = {
  syncing: 'Sincronizando…',
  online: 'Guardado en la nube',
  offline: 'Sin conexión — guardado local',
}

function Settings({ onClose }) {
  const { resetDemo, sync } = useStore()
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="animate-fade absolute inset-0 z-30 flex items-end justify-center bg-fg/40" onClick={onClose}>
      <div
        className="animate-sheet w-full max-w-md rounded-t-2xl border-t border-line bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold">Ajustes</h2>
          <button onClick={onClose} className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Cerrar
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2.5">
          <span
            className={`h-2 w-2 rounded-full ${sync === 'online' ? 'bg-fg' : sync === 'offline' ? 'border border-fg' : 'bg-muted'}`}
          />
          <span className="font-mono text-[11px] uppercase tracking-wide text-fg">
            {SYNC_LABEL[sync]}
          </span>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-muted">
          Prototipo de Studio Manager. Los datos (clases, equipo, tarifas) se guardan en la nube y se
          sincronizan entre dispositivos. Todavía no hay cuenta ni contraseña.
        </p>
        <button
          onClick={() => {
            if (!confirm) {
              setConfirm(true)
              return
            }
            resetDemo()
            onClose()
          }}
          className={`mt-4 w-full rounded-xl border py-3 text-[13px] ${
            confirm ? 'border-fg bg-fg font-bold text-card' : 'border-line text-fg'
          }`}
        >
          {confirm ? 'Confirmar — esto borra tus cambios' : 'Reiniciar datos de demo'}
        </button>
        <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
          Studio Manager · PRADO · v0.3
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('horarios')
  const [settings, setSettings] = useState(false)
  const { editing, openEditor } = useStore()
  const Active = TABS.find((t) => t.id === tab).Page

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#E4E4E4] md:py-6">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-bg md:h-[min(880px,calc(100dvh_-_3rem))] md:rounded-[2rem] md:border md:border-line md:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.4)]">
        <header className="flex items-center justify-between border-b border-line bg-bg px-4 py-3">
          <div>
            <div className="text-[15px] font-bold leading-none">Studio Manager</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              PRADO · Hugo Prado
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase text-muted">Hoy</div>
              <div className="font-mono text-[13px] font-bold">{parseDate(todayStr()).full}</div>
            </div>
            <button
              onClick={() => setSettings(true)}
              aria-label="Ajustes"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="2.4" fill="none" stroke="#000" strokeWidth="1.4" />
                <path
                  d="M8 1.3v2M8 12.7v2M1.3 8h2M12.7 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4"
                  fill="none"
                  stroke="#000"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
          <Active />
        </main>

        <button
          onClick={() => openEditor('new')}
          aria-label="Nueva clase"
          className="absolute bottom-[5.5rem] right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-fg text-card shadow-lg active:scale-95"
        >
          <svg width="22" height="22" viewBox="0 0 22 22">
            <path d="M11 4v14M4 11h14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <nav className="flex justify-around border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
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

        {editing && <ClassForm />}
        {settings && <Settings onClose={() => setSettings(false)} />}
        <SubstitutePicker />
      </div>

      <div className="mt-3 hidden font-mono text-[10px] uppercase tracking-widest text-muted md:block">
        Studio Manager · PRADO · Prototipo
      </div>
    </div>
  )
}
