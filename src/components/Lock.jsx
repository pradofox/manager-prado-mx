import { useState } from 'react'
import { useStore } from '../data/store.jsx'

// Pantalla de acceso. Un código compartido, sesión de 30 días por dispositivo.
export default function Lock() {
  const { login } = useStore()
  const [code, setCode] = useState('')
  const [state, setState] = useState('idle') // idle | sending | error

  async function submit(e) {
    e.preventDefault()
    if (!code.trim() || state === 'sending') return
    setState('sending')
    try {
      await login(code)
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <form onSubmit={submit} className="w-full max-w-xs">
        <div className="text-title font-bold">Studio Manager</div>
        <div className="mt-1 font-mono text-label uppercase tracking-widest text-muted">
          PRADO · Acceso privado
        </div>

        <input
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (state === 'error') setState('idle')
          }}
          placeholder="Código de acceso"
          autoComplete="one-time-code"
          className={`mt-6 w-full rounded-lg border bg-card px-3 py-3 text-body outline-none ${
            state === 'error' ? 'border-fg' : 'border-line focus:border-fg'
          }`}
        />
        {state === 'error' && (
          <p className="mt-2 font-mono text-label uppercase tracking-wide text-fg">
            Código incorrecto
          </p>
        )}

        <button
          type="submit"
          disabled={state === 'sending'}
          className="mt-3 w-full rounded-xl bg-fg py-3 text-body font-bold text-card disabled:opacity-50"
        >
          {state === 'sending' ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-5 font-mono text-label leading-relaxed text-muted">
          Este dispositivo queda recordado 30 días.
        </p>
      </form>
    </div>
  )
}
