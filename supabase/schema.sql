-- ============================================================
-- Family Hub — Supabase Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- Helper: updated_at trigger function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: family_members
-- ============================================================

CREATE TABLE IF NOT EXISTS family_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read family members"
  ON family_members FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can insert family members"
  ON family_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can delete family members"
  ON family_members FOR DELETE
  TO authenticated
  USING (TRUE);

-- ============================================================
-- TABLE: activities
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_member_id    UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
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
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activities"
  ON activities FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert activities"
  ON activities FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update activities"
  ON activities FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete activities"
  ON activities FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: shopping_lists
-- ============================================================

CREATE TABLE IF NOT EXISTS shopping_lists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read shopping lists"
  ON shopping_lists FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert shopping lists"
  ON shopping_lists FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update shopping lists"
  ON shopping_lists FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete shopping lists"
  ON shopping_lists FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: shopping_items
-- ============================================================

CREATE TABLE IF NOT EXISTS shopping_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id      UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  item         TEXT NOT NULL,
  quantity     TEXT,
  category     TEXT,
  notes        TEXT,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
  added_by     UUID REFERENCES family_members(id) ON DELETE SET NULL,
  priority     TEXT CHECK (priority IN ('low', 'medium', 'high')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shopping_items_updated_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read shopping items"
  ON shopping_items FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert shopping items"
  ON shopping_items FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update shopping items"
  ON shopping_items FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete shopping items"
  ON shopping_items FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: meals
-- ============================================================

CREATE TABLE IF NOT EXISTS meals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date              DATE NOT NULL,
  meal_type         TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  title             TEXT NOT NULL,
  description       TEXT,
  recipe_url        TEXT,
  assigned_to       UUID REFERENCES family_members(id) ON DELETE SET NULL,
  prep_time_minutes INTEGER,
  dietary_notes     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read meals"
  ON meals FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert meals"
  ON meals FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update meals"
  ON meals FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete meals"
  ON meals FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: chores
-- ============================================================

CREATE TABLE IF NOT EXISTS chores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES family_members(id) ON DELETE SET NULL,
  frequency   TEXT,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  category    TEXT,
  points      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER chores_updated_at
  BEFORE UPDATE ON chores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read chores"
  ON chores FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert chores"
  ON chores FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update chores"
  ON chores FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete chores"
  ON chores FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: chore_completions
-- ============================================================

CREATE TABLE IF NOT EXISTS chore_completions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chore_id        UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  completed_by    UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read chore completions"
  ON chore_completions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert chore completions"
  ON chore_completions FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update chore completions"
  ON chore_completions FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete chore completions"
  ON chore_completions FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: announcements
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  posted_by  UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  priority   TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  expires_at TIMESTAMPTZ,
  is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read announcements"
  ON announcements FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert announcements"
  ON announcements FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update announcements"
  ON announcements FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete announcements"
  ON announcements FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: important_info
-- ============================================================

CREATE TABLE IF NOT EXISTS important_info (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category   TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER important_info_updated_at
  BEFORE UPDATE ON important_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE important_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read important info"
  ON important_info FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert important info"
  ON important_info FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update important info"
  ON important_info FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete important info"
  ON important_info FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: carousel_photos
-- ============================================================

CREATE TABLE IF NOT EXISTS carousel_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_path   TEXT NOT NULL,
  caption     TEXT,
  taken_date  DATE,
  uploaded_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE carousel_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read carousel photos"
  ON carousel_photos FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert carousel photos"
  ON carousel_photos FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update carousel photos"
  ON carousel_photos FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete carousel photos"
  ON carousel_photos FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: location_statuses
-- ============================================================

CREATE TABLE IF NOT EXISTS location_statuses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'home'
                     CHECK (status IN ('home', 'away', 'running-late', 'school', 'work')),
  status_message   TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_member_id)
);

ALTER TABLE location_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read location statuses"
  ON location_statuses FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert location statuses"
  ON location_statuses FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update location statuses"
  ON location_statuses FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can delete location statuses"
  ON location_statuses FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- TABLE: tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  assigned_to         UUID REFERENCES family_members(id) ON DELETE SET NULL,
  recurrence_pattern  TEXT,
  recurrence_end_date DATE,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  estimated_minutes   INTEGER,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Family tasks are visible to all authenticated users
CREATE POLICY "Authenticated users can read family tasks"
  ON tasks FOR SELECT TO authenticated
  USING (is_family_task = TRUE OR owner_id = auth.uid());

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own tasks or family tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (is_family_task = TRUE OR owner_id = auth.uid());

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- TABLE: task_tags
-- ============================================================

CREATE TABLE IF NOT EXISTS task_tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#14b8a6',
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, owner_id)
);

ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own task tags"
  ON task_tags FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own task tags"
  ON task_tags FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own task tags"
  ON task_tags FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own task tags"
  ON task_tags FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- TABLE: calendar_events
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,
  all_day             BOOLEAN NOT NULL DEFAULT FALSE,
  event_type          TEXT NOT NULL DEFAULT 'reminder'
                        CHECK (event_type IN ('task', 'activity', 'reminder', 'family')),
  linked_task_id      UUID REFERENCES tasks(id) ON DELETE SET NULL,
  linked_activity_id  UUID REFERENCES activities(id) ON DELETE SET NULL,
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
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Family events visible to all; private events only to owner
CREATE POLICY "Users can read accessible calendar events"
  ON calendar_events FOR SELECT TO authenticated
  USING (is_family_event = TRUE OR visibility = 'family' OR owner_id = auth.uid());

CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own calendar events"
  ON calendar_events FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own calendar events"
  ON calendar_events FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activities_family_member ON activities(family_member_id);
CREATE INDEX IF NOT EXISTS idx_activities_start_time    ON activities(start_time);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list      ON shopping_items(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_completed ON shopping_items(completed);
CREATE INDEX IF NOT EXISTS idx_meals_date               ON meals(date);
CREATE INDEX IF NOT EXISTS idx_chores_assigned_to       ON chores(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chore_completions_chore  ON chore_completions(chore_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority   ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned     ON announcements(is_pinned);
CREATE INDEX IF NOT EXISTS idx_location_statuses_member ON location_statuses(family_member_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner              ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status             ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date           ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_family          ON tasks(is_family_task);
CREATE INDEX IF NOT EXISTS idx_task_tags_owner          ON task_tags(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_owner    ON calendar_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start    ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_family   ON calendar_events(is_family_event);
