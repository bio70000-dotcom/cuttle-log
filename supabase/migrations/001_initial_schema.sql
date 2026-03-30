-- Enable Row Level Security extension (already available in Supabase)
-- ============================================================
-- trips
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id                BIGSERIAL PRIMARY KEY,
  local_id          INTEGER,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_start        TIMESTAMPTZ,
  date_end          TIMESTAMPTZ,
  spot_id           TEXT,
  spot_name         TEXT,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  tide_stage        SMALLINT,
  tide_high_times   TEXT[],
  tide_low_times    TEXT[],
  notes             TEXT,
  fishing_type      TEXT,
  boat_company      TEXT,
  boat_position     TEXT,
  species           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trips_user_id_idx     ON public.trips (user_id);
CREATE INDEX IF NOT EXISTS trips_updated_at_idx  ON public.trips (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS trips_user_local_id_idx ON public.trips (user_id, local_id);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips: select own" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trips: insert own" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips: update own" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trips: delete own" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- catch_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catch_events (
  id           BIGSERIAL PRIMARY KEY,
  local_id     INTEGER,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id      INTEGER,
  at           TIMESTAMPTZ,
  spot_id      TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  rig_slot     TEXT,
  egi_slot     TEXT,
  size_cm      DOUBLE PRECISION,
  weight       DOUBLE PRECISION,
  kept         BOOLEAN,
  photo_thumb  TEXT,
  depth        DOUBLE PRECISION,
  note         TEXT,
  condition_id INTEGER,
  species      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catch_events_user_id_idx    ON public.catch_events (user_id);
CREATE INDEX IF NOT EXISTS catch_events_updated_at_idx ON public.catch_events (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS catch_events_user_local_id_idx ON public.catch_events (user_id, local_id);

ALTER TABLE public.catch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catch_events: select own" ON public.catch_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "catch_events: insert own" ON public.catch_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "catch_events: update own" ON public.catch_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "catch_events: delete own" ON public.catch_events
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- track_points
-- ============================================================
CREATE TABLE IF NOT EXISTS public.track_points (
  id           BIGSERIAL PRIMARY KEY,
  local_id     INTEGER,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id      INTEGER,
  at           TIMESTAMPTZ,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  accuracy     DOUBLE PRECISION,
  condition_id INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS track_points_user_id_idx    ON public.track_points (user_id);
CREATE INDEX IF NOT EXISTS track_points_updated_at_idx ON public.track_points (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS track_points_user_local_id_idx ON public.track_points (user_id, local_id);

ALTER TABLE public.track_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_points: select own" ON public.track_points
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "track_points: insert own" ON public.track_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "track_points: update own" ON public.track_points
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "track_points: delete own" ON public.track_points
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- rig_presets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rig_presets (
  id                   BIGSERIAL PRIMARY KEY,
  local_id             INTEGER,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot                 TEXT,
  name                 TEXT,
  sinker_drop_length   TEXT,
  branch_line_length   TEXT,
  sinker_mode          TEXT,
  sinker_value         DOUBLE PRECISION,
  sinker_pair          DOUBLE PRECISION[],
  branch_mode          TEXT,
  branch_value         DOUBLE PRECISION,
  branch_pair          DOUBLE PRECISION[],
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rig_presets_user_id_idx    ON public.rig_presets (user_id);
CREATE INDEX IF NOT EXISTS rig_presets_updated_at_idx ON public.rig_presets (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS rig_presets_user_local_id_idx ON public.rig_presets (user_id, local_id);

ALTER TABLE public.rig_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rig_presets: select own" ON public.rig_presets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rig_presets: insert own" ON public.rig_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rig_presets: update own" ON public.rig_presets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rig_presets: delete own" ON public.rig_presets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- egi_presets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.egi_presets (
  id         BIGSERIAL PRIMARY KEY,
  local_id   INTEGER,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot       TEXT,
  name       TEXT,
  size       TEXT,
  color      TEXT,
  finish     TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egi_presets_user_id_idx    ON public.egi_presets (user_id);
CREATE INDEX IF NOT EXISTS egi_presets_updated_at_idx ON public.egi_presets (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS egi_presets_user_local_id_idx ON public.egi_presets (user_id, local_id);

ALTER TABLE public.egi_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egi_presets: select own" ON public.egi_presets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "egi_presets: insert own" ON public.egi_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "egi_presets: update own" ON public.egi_presets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "egi_presets: delete own" ON public.egi_presets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- rod_presets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rod_presets (
  id         BIGSERIAL PRIMARY KEY,
  local_id   INTEGER,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot       TEXT,
  brand      TEXT,
  model      TEXT,
  length_ft  DOUBLE PRECISION,
  action     TEXT,
  power      TEXT,
  egi_range  TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rod_presets_user_id_idx    ON public.rod_presets (user_id);
CREATE INDEX IF NOT EXISTS rod_presets_updated_at_idx ON public.rod_presets (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS rod_presets_user_local_id_idx ON public.rod_presets (user_id, local_id);

ALTER TABLE public.rod_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rod_presets: select own" ON public.rod_presets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rod_presets: insert own" ON public.rod_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rod_presets: update own" ON public.rod_presets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rod_presets: delete own" ON public.rod_presets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- spots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spots (
  id          BIGSERIAL PRIMARY KEY,
  local_id    INTEGER,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  water_type  TEXT,
  notes       TEXT,
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spots_user_id_idx    ON public.spots (user_id);
CREATE INDEX IF NOT EXISTS spots_updated_at_idx ON public.spots (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS spots_user_local_id_idx ON public.spots (user_id, local_id);

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spots: select own" ON public.spots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "spots: insert own" ON public.spots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "spots: update own" ON public.spots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "spots: delete own" ON public.spots
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- condition_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.condition_snapshots (
  id               BIGSERIAL PRIMARY KEY,
  local_id         INTEGER,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id          INTEGER,
  at               TIMESTAMPTZ,
  water_temp       DOUBLE PRECISION,
  wind_dir         TEXT,
  wind_speed       DOUBLE PRECISION,
  wave_height      DOUBLE PRECISION,
  clouds           SMALLINT,
  current_strength TEXT,
  water_color      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS condition_snapshots_user_id_idx    ON public.condition_snapshots (user_id);
CREATE INDEX IF NOT EXISTS condition_snapshots_updated_at_idx ON public.condition_snapshots (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS condition_snapshots_user_local_id_idx ON public.condition_snapshots (user_id, local_id);

ALTER TABLE public.condition_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "condition_snapshots: select own" ON public.condition_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "condition_snapshots: insert own" ON public.condition_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "condition_snapshots: update own" ON public.condition_snapshots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "condition_snapshots: delete own" ON public.condition_snapshots
  FOR DELETE USING (auth.uid() = user_id);
