import axios from 'axios'
import { User, TimeEntry, WeeklyStatistics, MonthlyStatistics, UserAnnualStatistics } from '../types'

// In Production wird die API über denselben Server ausgeliefert
const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://localhost:8000' : ''
)

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    
    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },
}

export const usersAPI = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me')
    return response.data
  },
  
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/users/')
    return response.data
  },
  
  createUser: async (userData: Omit<User, 'id' | 'is_active'> & { password: string }): Promise<User> => {
    const response = await api.post('/users/', userData)
    return response.data
  },
}

export const timeEntriesAPI = {
  getTimeEntries: async (params?: {
    user_id?: number
    start_date?: string
    end_date?: string
  }): Promise<TimeEntry[]> => {
    const response = await api.get('/time-entries/', { params })
    return response.data
  },
  
  createTimeEntry: async (entry: Omit<TimeEntry, 'id' | 'user_id' | 'is_locked'>): Promise<TimeEntry> => {
    const response = await api.post('/time-entries/', entry)
    return response.data
  },
  
  updateTimeEntry: async (id: number, entry: Omit<TimeEntry, 'id' | 'user_id' | 'is_locked'>): Promise<TimeEntry> => {
    const response = await api.put(`/time-entries/${id}`, entry)
    return response.data
  },
  
  deleteTimeEntry: async (id: number): Promise<void> => {
    await api.delete(`/time-entries/${id}`)
  },
}

export const statisticsAPI = {
  getWeeklyStatistics: async (weekStart: string): Promise<WeeklyStatistics[]> => {
    const response = await api.get('/statistics/weekly', {
      params: { week_start: weekStart }
    })
    return response.data
  },
  
  getMonthlyStatistics: async (year: number, month: number): Promise<MonthlyStatistics[]> => {
    const response = await api.get('/statistics/monthly', {
      params: { year, month }
    })
    return response.data
  },
  
  getUserAnnualStatistics: async (userId: number, year: number): Promise<UserAnnualStatistics> => {
    const response = await api.get(`/statistics/annual/${userId}`, {
      params: { year }
    })
    return response.data
  },
}

export default api