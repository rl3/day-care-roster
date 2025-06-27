export interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: 'fachkraft' | 'leitung' | 'admin'
  is_active: boolean
  weekly_hours: number
  additional_hours: number
  work_days_per_week: number
  vacation_days_per_year: number
}

export interface TimeEntry {
  id: number
  user_id: number
  date: string
  entry_type: 'arbeitszeit' | 'krank' | 'kindkrank' | 'urlaub' | 'bildungsurlaub' | 'hospitation' | 'praktikum'
  subtype?: 'stunden_am_kind' | 'vorbereitungsstunden' | 'elterngespraech' | 'konferenz' | 'kleinteam' | 'anleitung' | 'leitung' | 'geschaeftsfuehrung' | 'sprachfoerderung' | 'fortbildung' | 'teamentwicklung'
  hours: number
  days: number
  description?: string
  is_locked: boolean
}

export interface WeeklyStatistics {
  user_id: number
  user_name: string
  week_start: string
  total_hours: number
  target_hours: number
  overtime: number
}

export interface MonthlyStatistics {
  user_id: number
  user_name: string
  year: number
  month: number
  worked_hours: number
  target_hours: number
  overtime: number
  sick_days: number
  vacation_days: number
}

export interface UserAnnualStatistics {
  user_id: number
  user_name: string
  year: number
  anleitung_hours: number
  fortbildung_days: number
  bildungsurlaub_days: number
  sick_days: number
  child_sick_days: number
  vacation_days: number
  vacation_days_previous_year: number
  praktikum_days: number
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}