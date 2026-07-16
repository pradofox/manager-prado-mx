# Studio Manager — Análisis crítico y plan de trabajo

**Fecha:** 2026-07-16 · **Autor del análisis:** Claude (sesión con Roberto)
**Para:** Opus 4.8 (o quien ejecute) · **Repo:** `~/Code/studio-manager` · **Live:** manager.prado-mx.com

---

## 1. Diagnóstico honesto del estado actual

Lo que hay es un prototipo CRUD bien ejecutado pero genérico. Funciona como demo;
NO es confiable todavía para lo único que importa: **el dinero de los coaches**.

### Defectos de fondo (orden de gravedad)

1. **Las clases nunca se completan solas.** `status` se fija al crear la clase
   (`defaultStatus`); una clase programada cuya fecha ya pasó se queda `scheduled`
   para siempre y **no aparece en Pagos**. Hugo daría 10 clases y el sistema le
   calcularía $0 si nadie edita clase por clase. (`src/data/store.jsx`,
   `src/pages/Pagos.jsx` filtra `completed|substituted`.)
2. **Las tarifas reescriben la historia.** `payFor()` usa la tarifa *vigente*, no la
   tarifa al momento de la clase. Si Energee sube la tarifa en junio, los pagos de
   mayo cambian retroactivamente. El handoff original tenía `effective_from/to` en
   `coach_rates` y se perdió en la implementación. Para nómina esto es descalificante.
3. **Escrituras concurrentes se pisan.** El estado completo viaja como UN blob JSON a
   KV (`PUT /api/state`, last-write-wins). Dos dispositivos abiertos = el segundo
   borra los cambios del primero sin aviso. Con un solo usuario se tolera; con Hugo +
   una dueña, se pierde información.
4. **Cero control de acceso.** El endpoint es público (lectura Y escritura) y el
   selector de coach es un chip — cualquiera ve y edita el dinero de todos.
5. **La sustitución no avisa a nadie.** El flujo registra el cambio pero el coach
   sustituto se entera... por WhatsApp manual, que es exactamente el status quo que
   queremos reemplazar.
6. **Recurrencia sin serie.** "Repetir 8 semanas" crea 8 filas independientes; no hay
   forma de editar/cancelar la serie ni de extenderla cuando se acaba.

### Veredicto

La UI y el sistema de diseño están bien. El modelo de datos y la capa de persistencia
están por debajo de lo que el problema exige. Antes de agregar UNA feature más, se
arregla la correctness del dinero.

---

## 2. Mercado: qué existe ya (investigado 2026-07-16)

### Staff-ops / sustituciones (el nicho exacto)

| Producto | Qué hace | Debilidad para nuestro caso |
|---|---|---|
| **NetGym** (netgym.com) | Líder en staff-ops boutique: subs automatizados, comunicación, certificaciones, analytics. Integra con Mariana Tek/Mindbody/ClubReady | Sin payroll. Inglés/US. Precio no público (demo call). Studio-céntrico |
| **Zipper** (joinzipper.com) | Sub board integrado a su booking/pagos | Hay que adoptar TODA su plataforma |
| **SubSync** | Sub management puro con app móvil y disponibilidad | Herramienta suelta; inglés/US; sin dinero |
| **Sub Finder (ClassPass)** | Red de instructores externos para cubrir | Coaches que no conocen el estudio |
| **Momence / Mariana Tek / Mindbody / TeamUp** | Plataformas completas con módulo de subs | Caras, en inglés, el estudio entero debe migrar |

### Payroll fitness

Netchex, Paylocity, FRIDAY, BEG: payroll US formal (W-2, ~$25-45 USD/empleado/mes).
Nada de esto aplica a México ni al esquema de honorarios por clase.

### México / LatAm

Fitco, FITMA, Crossfy, FitMentor, Trainingym, etc.: **todos son booking + membresías +
cobro a alumnos**. El lado staff (roster del coach, subs, pago por clase) no lo trabaja
nadie en español. Para el coach individual solo existen time-trackers genéricos
(Hours Keeper) que no entienden estudios ni tarifas por clase.

### El hueco real

Todo lo que existe es: (a) en inglés y precios US, (b) **studio-céntrico** — el estudio
compra, el coach es un recurso, (c) silos por estudio. **Nadie atiende al coach
freelance mexicano que enseña en 3 estudios** y necesita: su semana consolidada, su
quincena calculada por tarifas distintas por estudio, subs que se resuelvan por
WhatsApp, y el desglose para su recibo de honorarios.

---

## 3. Ventajas que SÍ podemos construir (defendibles)

1. **Coach-first, no studio-first.** El coach multi-estudio es el usuario primario; la
   vista de dueño es secundaria. Nadie más está parado ahí. Hugo ES ese usuario.
2. **WhatsApp-nativo.** Los subs en México se resuelven en WhatsApp. Fase 1: deep links
   `wa.me` con mensaje prellenado ("¿Me cubres Lagree jue 7am en Energee? Tarifa $450.
   Confirma aquí: <link>") y confirmación de un tap con link firmado. Sin API de pago,
   sin fricción de adopción: funciona aunque el estudio no use nada.
3. **Quincena mexicana + honorarios.** Cierre de quincena con desglose listo para
   recibo de honorarios (subtotal, retenciones ISR/IVA si aplica, por estudio). Ningún
   competidor lo tiene; a los US ni les interesa.
4. **Dinero auditable.** Tarifas con vigencia + snapshot de tarifa al completar la
   clase + log de cambios. "¿Por qué me pagaron $380 y no $450?" siempre tiene
   respuesta. Es la queja #1 contra los Sheets/WhatsApp actuales.
5. **Adopción unilateral.** NetGym exige que el estudio compre. Studio Manager le sirve
   a UN coach solo desde el día 1, y el estudio se suma después (la dueña recibe el
   corte quincenal como link de solo-lectura). Bottom-up, no top-down.

**Ancla estratégica (no cambia):** sigue siendo herramienta interna + artefacto
editorial de PRADO Consulting. Las ventajas de arriba son para que Hugo la use de
verdad, no para venderla como SaaS. Los umbrales del handoff (§2, §10) siguen vigentes.

---

## 4. Plan de trabajo

> **Regla:** cada fase tiene un gate. No se pasa a la siguiente sin cumplirlo.
> Features fuera de este plan = scope creep (ver handoff §10).

### Fase 0 — Correctness del dinero (bloqueante, ~2-3 sesiones)

*Nada nuevo visible; que lo que existe sea confiable.*

- [ ] **Migrar KV → D1.** El modelo es relacional (handoff §3: `studios`, `coaches`,
      `coach_rates`, `class_sessions`). Crear D1 en la cuenta CF, migrations en
      `/supabase/migrations` → renombrar a `/db/migrations`. API por entidad
      (`GET/POST /api/sessions`, etc.) con updates por fila — se acaba el blob único
      y el last-write-wins.
- [ ] **Tarifas con vigencia.** `coach_rates` gana `effective_from`/`effective_to`.
      `payFor(session)` resuelve la tarifa vigente EN LA FECHA de la clase.
- [ ] **Snapshot de pago.** Al marcar `completed`/`substituted` se congela
      `paid_rate_mxn` en la fila de la sesión. Pagos suma snapshots, no recalcula.
- [ ] **Cierre de día.** Al abrir la app: "Ayer tenías 3 clases — ¿se dieron?"
      [✓ todas] [revisar una por una]. Es UNA pantalla; resuelve el defecto #1 sin
      automatismo ciego (una clase pudo no darse).
- [ ] **Series de recurrencia.** `series_id` en sesiones; editar/cancelar "esta clase"
      vs "toda la serie".
- [ ] Tests de la lógica de dinero (vitest): tarifa por fecha, snapshot, quincena.

**Gate F0:** dos dispositivos editando a la vez no pierden datos; una tarifa cambiada
hoy NO altera pagos pasados; el flujo de ayer→pagos funciona sin editar clases a mano.

### Fase 1 — Acceso + subs por WhatsApp (~2-3 sesiones)

- [ ] **Auth ligera en Cloudflare** (patrón del dash de Roberto): passcode → cookie
      firmada 30 días por dispositivo. Roles mínimos: `admin` (Hugo/Roberto) y
      `coach` (link mágico firmado por coach, solo ve lo suyo).
- [ ] **Sub por WhatsApp v1:** botón "Pedir sub" → arma mensaje prellenado con
      deep link `wa.me/<coach>` + URL firmada de confirmación. El sustituto abre el
      link, ve la clase y tarifa, y confirma con un tap. La sesión se actualiza sola.
- [ ] Log de actividad simple (quién cambió qué — respaldo de las disputas de pago).

**Gate F1:** un sub completo (pedir → WhatsApp → confirmar → reasignación de pago)
sin que nadie edite nada a mano. Endpoint ya no público.

### Fase 2 — La quincena como producto (~2 sesiones)

- [ ] **Cierre de quincena:** botón que congela el periodo, genera resumen por coach y
      por estudio, y queda inmutable (correcciones = ajustes visibles, no ediciones).
- [ ] **Desglose para recibo de honorarios:** subtotal por estudio, campo de retención
      ISR/IVA configurable, total neto. Export PDF limpio (estética PRADO) + CSV.
- [ ] **Link de solo-lectura para dueñas:** URL firmada del corte del estudio — el
      caballo de Troya para que los estudios lo adopten sin comprar nada.

**Gate F2:** Hugo puede mandar su corte de quincena a una dueña sin tocar Excel.

### Fase 3 — Validación real (no es de código)

- [ ] Sentar a Hugo con la app cargada con SUS datos reales (las 3 preguntas del
      handoff §7 siguen sin responderse — hacerlo aquí con la app enfrente).
- [ ] 2 semanas de uso real; medir: ¿abrió la app sin que le recordaran? ¿el corte de
      quincena coincidió con lo que le pagaron?
- [ ] Decidir con datos: ¿se queda interno, se ofrece a estudios de PRADO Consulting,
      o se congela? (umbral del handoff §2 para cualquier idea de producto).

### Explícitamente NO (además del handoff §10)

- WhatsApp Business API de paga (los deep links bastan hasta que duela)
- Supabase/migración de stack (D1 cubre esto; revisar solo si llega auth multi-tenant
  real con 5+ estudios pagando)
- Modo oscuro, i18n, apps nativas, notificaciones push

---

## 5. Notas técnicas para quien ejecute

- Stack actual: React 19 + Vite + Tailwind v4 (tokens en `src/index.css` `@theme` —
  respetarlos), Worker en `worker/index.js`, deploy `npm run deploy`.
- El KV `studio-manager-state` (id `0013d561...`) muere en F0; escribir migración
  one-shot KV→D1 y conservar el KV como backup un mes.
- Fechas son strings `YYYY-MM-DD` locales a propósito (México, sin TZ cruzadas). No
  introducir `Date.parse` con TZ.
- Diseño: Geist 400/700, paleta `#F0F0F0/#000/#888`, español en UI, inglés en código.
- Bitácora del proyecto en Obsidian PRADO — actualizar al cerrar cada fase.
