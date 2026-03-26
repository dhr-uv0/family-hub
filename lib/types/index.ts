// ─── Family Members ───────────────────────────────────────────────────────────

export interface FamilyMember {
  id: string
  user_id: string
  name: string
  nickname?: string | null
  color: string
  avatar_url?: string | null
  date_of_birth?: string | null
  role: 'admin' | 'member'
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  family_member_id: string
  title: string
  description?: string | null
  location?: string | null
  start_time: string
  end_time?: string | null
  all_day: boolean
  recurring_pattern?: string | null
  recurring_end_date?: string | null
  color?: string | null
  category?: string | null
  reminder_minutes?: number | null
  created_at?: string
  updated_at?: string
}

// ─── Shopping ─────────────────────────────────────────────────────────────────

export interface ShoppingList {
  id: string
  name: string
  icon?: string | null
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface ShoppingItem {
  id: string
  list_id: string
  item: string
  quantity?: string | null
  category?: string | null
  notes?: string | null
  completed: boolean
  completed_at?: string | null
  completed_by?: string | null
  added_by?: string | null
  priority?: 'low' | 'medium' | 'high' | null
  created_at?: string
  updated_at?: string
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export interface Meal {
  id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  title: string
  description?: string | null
  recipe_url?: string | null
  assigned_to?: string | null
  prep_time_minutes?: number | null
  dietary_notes?: string | null
  created_at?: string
  updated_at?: string
}

// ─── Chores ───────────────────────────────────────────────────────────────────

export interface Chore {
  id: string
  title: string
  description?: string | null
  assigned_to?: string | null
  frequency?: string | null
  day_of_week?: number | null
  category?: string | null
  points?: number | null
  created_at?: string
  updated_at?: string
}

export interface ChoreCompletion {
  id: string
  chore_id: string
  completed_by: string
  completion_date: string
  notes?: string | null
  created_at?: string
}

// ─── Announcements ────────────────────────────────────────────────────────────

export interface Announcement {
  id: string
  title: string
  message: string
  posted_by: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  expires_at?: string | null
  is_pinned: boolean
  created_at: string
  updated_at?: string
}

// ─── Important Info ───────────────────────────────────────────────────────────

export interface ImportantInfo {
  id: string
  category: string
  title: string
  content: string
  url?: string | null
  created_at?: string
  updated_at?: string
}

// ─── Carousel Photos ──────────────────────────────────────────────────────────

export interface CarouselPhoto {
  id: string
  file_path: string
  caption?: string | null
  taken_date?: string | null
  uploaded_by?: string | null
  created_at: string
}

// ─── Location Status ──────────────────────────────────────────────────────────

export type LocationStatusType = 'home' | 'away' | 'running-late' | 'school' | 'work'

export interface LocationStatus {
  id: string
  family_member_id: string
  status: LocationStatusType
  status_message?: string | null
  updated_at: string
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskCategory = 'work' | 'school' | 'personal' | 'health' | 'finance' | 'other'

export interface Task {
  id: string // UUID
  owner_id: string
  title: string
  description?: string | null
  due_date?: string | null
  due_time?: string | null
  priority: TaskPriority
  status: TaskStatus
  category: TaskCategory
  is_family_task: boolean
  assigned_to?: string | null
  recurrence_pattern?: string | null
  recurrence_end_date?: string | null
  tags: string[]
  estimated_minutes?: number | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface TaskTag {
  id: string
  name: string
  color: string
  owner_id: string
  created_at?: string
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export type CalendarEventType = 'task' | 'activity' | 'reminder' | 'family'
export type CalendarEventVisibility = 'private' | 'family'

export interface CalendarEvent {
  id: string
  owner_id: string
  title: string
  description?: string | null
  start_time: string
  end_time?: string | null
  all_day: boolean
  event_type: CalendarEventType
  linked_task_id?: string | null
  linked_activity_id?: string | null
  color?: string | null
  is_family_event: boolean
  visibility: CalendarEventVisibility
  recurrence_pattern?: string | null
  recurrence_end_date?: string | null
  created_at: string
  updated_at?: string
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export interface WeatherData {
  temp: number
  feels_like: number
  humidity: number
  wind_speed: number
  description: string
  icon: string
  city: string
  country: string
}

// ─── App Mode ─────────────────────────────────────────────────────────────────

export type AppMode = 'family' | 'personal'
