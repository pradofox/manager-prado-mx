import { useState, useEffect } from 'react'
import { useStore } from '../data/store.jsx'
import { CLASS_TYPES, TODAY } from '../data/seed.js'

const fieldCls =
  'mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] outline-none focus:border-fg'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  )
}

export default function ClassForm() {
  const store = useStore()
  const { editing, studios, coaches, rateFor } = store
  const isNew = editing === 'new'
  const session = isNew ? null : editing

  const [studioId, setStudioId] = useState(session?.studioId || studios[0]?.id || '')
  const [coachId, setCoachId] = useState(session?.coachId || coaches[0]?.id || '')
  const [classType, setClassType] = useState(session?.classType || 'lagree')
  const [date, setDate] = useState(session?.date || TODAY)
  const [time, setTime] = useState(session?.time || '07:00')
  const [room, setRoom] = useState(session?.room || '')
  const [duration, setDuration] = useState(String(session?.durationMin || 50))
  const [status, setStatus] = useState(session?.status || 'scheduled')
  const [rate, setRate] = useState('')

  // Sugerir la tarifa registrada cada vez que cambia coach/estudio/tipo.
  useEffect(() => {
    const r = rateFor(coachId, studioId, classType)
    setRate(r != null ? String(r) : '')
  }, [coachId, studioId, classType, rateFor])

  const substituted = session?.status === 'substituted'

  function save() {
    const rateNum = rate.trim() === '' ? null : Number(rate)
    const fields = {
      studioId,
      coachId,
      classType,
      date,
      time,
      room: room.trim(),
      durationMin: Number(duration) || 50,
    }
    if (rateNum != null && !Number.isNaN(rateNum) && rateNum > 0) {
      store.upsertRate(coachId, studioId, classType, rateNum)
    }
    if (isNew) {
      store.addSession(fields)
    } else {
      store.updateSession(session.id, substituted ? fields : { ...fields, status })
    }
    store.closeEditor()
  }

  function remove() {
    store.deleteSession(session.id)
    store.closeEditor()
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-fg/40"
      onClick={store.closeEditor}
    >
      <div
        className="mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-line bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold">{isNew ? 'Nueva clase' : 'Editar clase'}</h2>
          <button
            onClick={store.closeEditor}
            className="font-mono text-[11px] uppercase tracking-wide text-muted"
          >
            Cerrar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Estudio">
            <select className={fieldCls} value={studioId} onChange={(e) => setStudioId(e.target.value)}>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Coach">
            <select className={fieldCls} value={coachId} onChange={(e) => setCoachId(e.target.value)}>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo de clase">
            <select className={fieldCls} value={classType} onChange={(e) => setClassType(e.target.value)}>
              {Object.entries(CLASS_TYPES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Hora">
              <input type="time" className={fieldCls} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sala">
              <input
                className={fieldCls}
                value={room}
                placeholder="Sala A"
                onChange={(e) => setRoom(e.target.value)}
              />
            </Field>
            <Field label="Duración (min)">
              <input
                type="number"
                className={fieldCls}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Tarifa de esta clase (MXN)">
            <input
              type="number"
              className={fieldCls}
              value={rate}
              placeholder="Sin tarifa registrada"
              onChange={(e) => setRate(e.target.value)}
            />
            <span className="mt-1 block font-mono text-[10px] text-muted">
              Se guarda como tarifa de {store.coachById(coachId)?.name?.split(' ')[0]} ·{' '}
              {CLASS_TYPES[classType]} en este estudio.
            </span>
          </Field>

          {!isNew && !substituted && (
            <Field label="Estado">
              <div className="mt-1 grid grid-cols-3 gap-2">
                {[
                  ['scheduled', 'Programada'],
                  ['completed', 'Completada'],
                  ['cancelled', 'Cancelada'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatus(val)}
                    className={`rounded-lg border py-2 text-[12px] ${
                      status === val ? 'border-fg bg-fg text-card font-bold' : 'border-line text-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {!isNew && substituted && (
            <p className="rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[10px] text-muted">
              Clase sustituida — gestiona la sustitución desde la pestaña Sustituciones.
            </p>
          )}
        </div>

        <button
          onClick={save}
          className="mt-5 w-full rounded-xl bg-fg py-3 text-[14px] font-bold text-card"
        >
          {isNew ? 'Crear clase' : 'Guardar cambios'}
        </button>
        {!isNew && (
          <button
            onClick={remove}
            className="mt-2 w-full py-2.5 font-mono text-[11px] uppercase tracking-wide text-muted underline"
          >
            Eliminar clase
          </button>
        )}
      </div>
    </div>
  )
}
