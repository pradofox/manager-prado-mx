import { useState, useEffect } from 'react'
import { useStore } from '../data/store.jsx'
import { CLASS_TYPES } from '../data/seed.js'
import { todayStr, addDays, parseDate } from '../data/helpers.js'

const fieldCls =
  'mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-body outline-none focus:border-fg'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="font-mono text-label uppercase tracking-widest text-muted">{label}</span>
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
  const [date, setDate] = useState(session?.date || todayStr())
  const [time, setTime] = useState(session?.time || '07:00')
  const [room, setRoom] = useState(session?.room || '')
  const [duration, setDuration] = useState(String(session?.durationMin || 50))
  const [status, setStatus] = useState(session?.status || 'scheduled')
  const [notes, setNotes] = useState(session?.notes || '')
  const [rate, setRate] = useState('')
  const [repeat, setRepeat] = useState(false)
  const [weeks, setWeeks] = useState(8)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const r = rateFor(coachId, studioId, classType)
    setRate(r != null ? String(r) : '')
  }, [coachId, studioId, classType, rateFor])

  const substituted = session?.status === 'substituted'

  function save() {
    const rateNum = rate.trim() === '' ? null : Number(rate)
    const base = {
      studioId,
      coachId,
      classType,
      time,
      room: room.trim(),
      durationMin: Number(duration) || 50,
      notes: notes.trim(),
    }
    if (rateNum != null && !Number.isNaN(rateNum) && rateNum > 0) {
      store.upsertRate(coachId, studioId, classType, rateNum)
    }
    if (isNew) {
      if (repeat && weeks > 1) {
        const list = Array.from({ length: weeks }, (_, i) => ({ ...base, date: addDays(date, i * 7) }))
        store.addSessions(list)
      } else {
        store.addSession({ ...base, date })
      }
    } else {
      store.updateSession(session.id, substituted ? { ...base, date } : { ...base, date, status })
    }
    store.closeEditor()
  }

  function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    store.deleteSession(session.id)
    store.closeEditor()
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-30 flex items-end justify-center bg-fg/40 md:items-center md:p-6"
      onClick={store.closeEditor}
    >
      <div
        className="animate-sheet max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-card p-5 pb-8 md:max-h-[88dvh] md:rounded-2xl md:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title font-bold">{isNew ? 'Nueva clase' : 'Editar clase'}</h2>
          <button
            onClick={store.closeEditor}
            className="font-mono text-label uppercase tracking-wide text-muted"
          >
            Cerrar
          </button>
        </div>

        <div className="flex flex-col gap-4">
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
            <span className="mt-1.5 block font-mono text-label text-muted">
              Se guarda como tarifa de {store.coachById(coachId)?.name?.split(' ')[0]} ·{' '}
              {CLASS_TYPES[classType]} en este estudio.
            </span>
          </Field>

          <Field label="Notas (opcional)">
            <input
              className={fieldCls}
              value={notes}
              placeholder="Ej. clase de prueba, evento especial…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          {isNew && (
            <div className="rounded-lg border border-line bg-bg p-4">
              <label className="flex items-center justify-between">
                <span className="text-meta font-bold">Repetir cada semana</span>
                <button
                  type="button"
                  onClick={() => setRepeat((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${repeat ? 'bg-fg' : 'bg-line'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-all ${repeat ? 'left-[1.375rem]' : 'left-0.5'}`}
                  />
                </button>
              </label>
              {repeat && (
                <div className="mt-3">
                  <span className="font-mono text-label uppercase tracking-widest text-muted">
                    ¿Por cuántas semanas?
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[4, 8, 12, 16].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeeks(w)}
                        className={`rounded-lg border px-3 py-1.5 text-micro ${
                          weeks === w ? 'border-fg bg-fg text-card font-bold' : 'border-line text-muted'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 font-mono text-label text-muted">
                    Crea {weeks} clases: cada {parseDate(date).dow} hasta el{' '}
                    {parseDate(addDays(date, (weeks - 1) * 7)).full}.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isNew && !substituted && (
            <Field label="Estado">
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  ['scheduled', 'Programada'],
                  ['completed', 'Completada'],
                  ['cancelled', 'Cancelada'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatus(val)}
                    className={`rounded-lg border py-2 text-micro ${
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
            <p className="rounded-lg border border-line bg-bg px-3 py-2.5 font-mono text-label text-muted">
              Clase sustituida — gestiona la sustitución desde la pestaña Sustituciones.
            </p>
          )}
        </div>

        <button
          onClick={save}
          className="mt-5 w-full rounded-xl bg-fg py-3 text-body font-bold text-card active:scale-[0.99]"
        >
          {isNew ? (repeat && weeks > 1 ? `Crear ${weeks} clases` : 'Crear clase') : 'Guardar cambios'}
        </button>
        {!isNew && (
          <button
            onClick={remove}
            className={`mt-2 w-full py-2.5 font-mono text-label uppercase tracking-wide ${
              confirmDelete ? 'font-bold text-fg' : 'text-muted'
            }`}
          >
            {confirmDelete ? 'Toca de nuevo para confirmar' : 'Eliminar clase'}
          </button>
        )}
      </div>
    </div>
  )
}
