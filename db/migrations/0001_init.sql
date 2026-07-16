-- Studio Manager — esquema inicial (Fase 0)
-- Modelo relacional: el dinero necesita filas auditables, no un blob JSON.
-- Fechas como texto 'YYYY-MM-DD' (local a México, sin zonas horarias).

CREATE TABLE IF NOT EXISTS studios (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  location   TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coaches (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  whatsapp   TEXT,
  email      TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Tarifa por coach × estudio × tipo, CON VIGENCIA.
-- effective_to NULL = tarifa vigente. Al cambiar una tarifa se cierra la anterior
-- (effective_to = día previo) y se inserta una nueva. Así los pagos pasados nunca cambian.
CREATE TABLE IF NOT EXISTS coach_rates (
  id             TEXT PRIMARY KEY,
  coach_id       TEXT NOT NULL,
  studio_id      TEXT NOT NULL,
  class_type     TEXT NOT NULL,
  rate_mxn       REAL NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to   TEXT
);

CREATE INDEX IF NOT EXISTS idx_rates_lookup
  ON coach_rates (coach_id, studio_id, class_type, effective_from);

CREATE TABLE IF NOT EXISTS class_sessions (
  id             TEXT PRIMARY KEY,
  studio_id      TEXT NOT NULL,
  coach_id       TEXT NOT NULL,
  class_type     TEXT NOT NULL,
  date           TEXT NOT NULL,
  time           TEXT NOT NULL,
  duration_min   INTEGER NOT NULL DEFAULT 50,
  room           TEXT,
  status         TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled|completed|substituted|cancelled
  substituted_by TEXT,
  paid_rate_mxn  REAL,        -- snapshot congelado al completar/sustituir; NULL si aún no se da
  series_id      TEXT,        -- agrupa clases creadas como serie recurrente
  notes          TEXT,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_date   ON class_sessions (date);
CREATE INDEX IF NOT EXISTS idx_sessions_coach  ON class_sessions (coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_studio ON class_sessions (studio_id);
CREATE INDEX IF NOT EXISTS idx_sessions_series ON class_sessions (series_id);

-- Metadatos clave/valor (p. ej. si el seed ya corrió).
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
