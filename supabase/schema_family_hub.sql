-- ============================================================
-- Family Hub — Isolated Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Create isolated schema so Family Hub data never touches
-- any other project's tables in this Supabase project
CREATE SCHEMA IF NOT EXISTS family_hub;

-- Grant access to Supabase auth roles
GRANT USAGE ON SCHEMA family_hub TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA family_hub
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA family_hub
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA family_hub
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

--────────────────────────────────────────────────────────────
-- Helper: updated_at trigger function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION family_hub.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: family_members
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.family_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  nickname      TEXT,
  color         TEXT NOT NULL DEFAULT '#14b8a6',
  avatar_url    TEXT,
  date_of_birth DATE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER family_members_updated_at
  BEFORE UPDATE ON family_hub.family_members
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read family members"
  ON family_hub.family_members FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert family members"
  ON family_hub.family_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update family members"
  ON family_hub.family_members FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete family members"
  ON family_hub.family_members FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: activities
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.activities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id    UUID NOT NULL REFERENCES family_hub.family_members(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  location            TEXT,
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,
  all_day             BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_pattern   TEXT,
  recurring_end_date  DATE,
  color               TEXT,
  category            TEXT,
  reminder_minutes    INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON family_hub.activities
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activities"
  ON family_hub.activities FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert activities"
  ON family_hub.activities FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update activities"
  ON family_hub.activities FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete activities"
  ON family_hub.activities FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: shopping_lists
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.shopping_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON family_hub.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read shopping lists"
  ON family_hub.shopping_lists FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert shopping lists"
  ON family_hub.shopping_lists FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update shopping lists"
  ON family_hub.shopping_lists FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete shopping lists"
  ON family_hub.shopping_lists FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: shopping_items
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.shopping_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      UUID NOT NULL REFERENCES family_hub.shopping_lists(id) ON DELETE CASCADE,
  item         TEXT NOT NULL,
  quantity     TEXT,
  category     TEXT,
  notes        TEXT,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES family_hub.family_members(id) ON DELETE SET NULL,
  added_by     UUID REFERENCES family_hub.family_members(id) ON DELETE SET NULL,
  priority     TEXT CHECK (priority IN ('low', 'medium', 'high')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shopping_items_updated_at
  BEFORE UPDATE ON family_hub.shopping_items
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read shopping items"
  ON family_hub.shopping_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert shopping items"
  ON family_hub.shopping_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update shopping items"
  ON family_hub.shopping_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete shopping items"
  ON family_hub.shopping_items FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: meals
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.meals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date              DATE NOT NULL,
  meal_type         TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  title             TEXT NOT NULL,
  description       TEXT,
  recipe_url        TEXT,
  assigned_to       UUID REFERENCES family_hub.family_members(id) ON DELETE SET NULL,
  prep_time_minutes INTEGER,
  dietary_notes     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER meals_updated_at
  BEFORE UPDATE ON family_hub.meals
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read meals"
  ON family_hub.meals FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert meals"
  ON family_hub.meals FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update meals"
  ON family_hub.meals FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete meals"
  ON family_hub.meals FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: chores
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.chores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES family_hub.family_members(id) ON DELETE SET NULL,
  frequency   TEXT,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  category    TEXT,
  points      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER chores_updated_at
  BEFORE UPDATE ON family_hub.chores
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read chores"
  ON family_hub.chores FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert chores"
  ON family_hub.chores FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update chores"
  ON family_hub.chores FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete chores"
  ON family_hub.chores FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: chore_completions
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.chore_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id        UUID NOT NULL REFERENCES family_hub.chores(id) ON DELETE CASCADE,
  completed_by    UUID NOT NULL REFERENCES family_hub.family_members(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE family_hub.chore_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read chore completions"
  ON family_hub.chore_completions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert chore completions"
  ON family_hub.chore_completions FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update chore completions"
  ON family_hub.chore_completions FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete chore completions"
  ON family_hub.chore_completions FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: announcements
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  posted_by  UUID NOT NULL REFERENCES family_hub.family_members(id) ON DELETE CASCADE,
  priority   TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  expires_at TIMESTAMPTZ,
  is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON family_hub.announcements
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read announcements"
  ON family_hub.announcements FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert announcements"
  ON family_hub.announcements FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update announcements"
  ON family_hub.announcements FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete announcements"
  ON family_hub.announcements FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: important_info
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.important_info (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category   TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER important_info_updated_at
  BEFORE UPDATE ON family_hub.important_info
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.important_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read important info"
  ON family_hub.important_info FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert important info"
  ON family_hub.important_info FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update important info"
  ON family_hub.important_info FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete important info"
  ON family_hub.important_info FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: carousel_photos
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.carousel_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path   TEXT NOT NULL,
  caption     TEXT,
  taken_date  DATE,
  uploaded_by UUID REFERENCES family_hub.family_members(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE family_hub.carousel_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read carousel photos"
  ON family_hub.carousel_photos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert carousel photos"
  ON family_hub.carousel_photos FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update carousel photos"
  ON family_hub.carousel_photos FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete carousel photos"
  ON family_hub.carousel_photos FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: location_statuses
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.location_statuses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_hub.family_members(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'home'
                     CHECK (status IN ('home', 'away', 'running-late', 'school', 'work')),
  status_message   TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_member_id)
);

ALTER TABLE family_hub.location_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read location statuses"
  ON family_hub.location_statuses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert location statuses"
  ON family_hub.location_statuses FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update location statuses"
  ON family_hub.location_statuses FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete location statuses"
  ON family_hub.location_statuses FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  due_date            DATE,
  due_time            TIME,
  priority            TEXT NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status              TEXT NOT NULL DEFAULT 'todo'
                        CHECK (status IN ('todo', 'in-progress', 'done')),
  category            TEXT NOT NULL DEFAULT 'personal'
                        CHECK (category IN ('work', 'school', 'personal', 'health', 'finance', 'other')),
  is_family_task      BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to         UUID REFERENCES family_hub.family_members(id) ON DELETE SET NULL,
  recurrence_pattern  TEXT,
  recurrence_end_date DATE,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  estimated_minutes   INTEGER,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON family_hub.tasks
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read family tasks"
  ON family_hub.tasks FOR SELECT TO authenticated
  USING (is_family_task = TRUE OR owner_id = auth.uid());
CREATE POLICY "Users can insert their own tasks"
  ON family_hub.tasks FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their own tasks or family tasks"
  ON family_hub.tasks FOR UPDATE TO authenticated
  USING (is_family_task = TRUE OR owner_id = auth.uid());
CREATE POLICY "Users can delete their own tasks"
  ON family_hub.tasks FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- TABLE: task_tags
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.task_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#14b8a6',
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, owner_id)
);

ALTER TABLE family_hub.task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own task tags"
  ON family_hub.task_tags FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Users can insert their own task tags"
  ON family_hub.task_tags FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their own task tags"
  ON family_hub.task_tags FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Users can delete their own task tags"
  ON family_hub.task_tags FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ============================================================
-- TABLE: calendar_events
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.calendar_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,
  all_day             BOOLEAN NOT NULL DEFAULT FALSE,
  event_type          TEXT NOT NULL DEFAULT 'reminder'
                        CHECK (event_type IN ('task', 'activity', 'reminder', 'family')),
  linked_task_id      UUID REFERENCES family_hub.tasks(id) ON DELETE SET NULL,
  linked_activity_id  UUID REFERENCES family_hub.activities(id) ON DELETE SET NULL,
  color               TEXT,
  is_family_event     BOOLEAN NOT NULL DEFAULT FALSE,
  visibility          TEXT NOT NULL DEFAULT 'family'
                        CHECK (visibility IN ('private', 'family')),
  recurrence_pattern  TEXT,
  recurrence_end_date DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON family_hub.calendar_events
  FOR EACH ROW EXECUTE FUNCTION family_hub.update_updated_at_column();

ALTER TABLE family_hub.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read accessible calendar events"
  ON family_hub.calendar_events FOR SELECT TO authenticated
  USING (is_family_event = TRUE OR visibility = 'family' OR owner_id = auth.uid());
CREATE POLICY "Users can insert their own calendar events"
  ON family_hub.calendar_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their own calendar events"
  ON family_hub.calendar_events FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Users can delete their own calendar events"
  ON family_hub.calendar_events FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_fh_activities_member    ON family_hub.activities(family_member_id);
CREATE INDEX IF NOT EXISTS idx_fh_activities_start     ON family_hub.activities(start_time);
CREATE INDEX IF NOT EXISTS idx_fh_shopping_items_list  ON family_hub.shopping_items(list_id);
CREATE INDEX IF NOT EXISTS idx_fh_shopping_completed   ON family_hub.shopping_items(completed);
CREATE INDEX IF NOT EXISTS idx_fh_meals_date           ON family_hub.meals(date);
CREATE INDEX IF NOT EXISTS idx_fh_chores_assigned      ON family_hub.chores(assigned_to);
CREATE INDEX IF NOT EXISTS idx_fh_chore_completions    ON family_hub.chore_completions(chore_id);
CREATE INDEX IF NOT EXISTS idx_fh_announcements_pinned ON family_hub.announcements(is_pinned);
CREATE INDEX IF NOT EXISTS idx_fh_location_member      ON family_hub.location_statuses(family_member_id);
CREATE INDEX IF NOT EXISTS idx_fh_tasks_owner          ON family_hub.tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_fh_tasks_status         ON family_hub.tasks(status);
CREATE INDEX IF NOT EXISTS idx_fh_tasks_due            ON family_hub.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_fh_tasks_family         ON family_hub.tasks(is_family_task);
CREATE INDEX IF NOT EXISTS idx_fh_calendar_owner       ON family_hub.calendar_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_fh_calendar_start       ON family_hub.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_fh_calendar_family      ON family_hub.calendar_events(is_family_event);

-- ============================================================
-- TABLE: families (for family linking via invite codes)
-- ============================================================

CREATE TABLE IF NOT EXISTS family_hub.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Our Family',
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE family_hub.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read families"
  ON family_hub.families FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can insert their own family"
  ON family_hub.families FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Family creator can update family"
  ON family_hub.families FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- ============================================================
-- Storage bucket for photos (run separately if needed)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('photos', 'photos', true)
-- ON CONFLICT DO NOTHING;
