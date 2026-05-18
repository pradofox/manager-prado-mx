# Studio Manager — PRADO

Herramienta operativa interna para gestionar el lado *staff* de estudios fitness boutique:
roster semanal de coaches, sustituciones, conteo de horas y cálculo de pago por clase.

**Estado:** prototipo (sin backend). Datos mock + `localStorage`. Sin auth, sin Supabase.

## Stack

React + Vite + Tailwind v4. Deploy en Cloudflare Workers (static assets) → `manager.prado-mx.com`.

## Desarrollo

```sh
npm install
npm run dev      # http://localhost:5173
npm run deploy   # build + wrangler deploy
```

## Estructura

- `src/data/seed.js` — datos mock (estudios, coaches, tarifas, plantilla semanal)
- `src/data/store.jsx` — estado global + persistencia en localStorage
- `src/pages/` — Horarios, Pagos, Sustituciones, Estudios

## Pendiente (ver handoff)

Backend Supabase, auth, edición de tarifas, recibos de honorarios, notificaciones WhatsApp.
Nada de esto se construye hasta validar las 3 preguntas con Hugo.
