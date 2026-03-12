// API Client para comunicação com o backend local
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken() {
    return this.token || localStorage.getItem('auth_token')
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const token = this.getToken()

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      // Verificar se a resposta tem conteúdo antes de fazer o parsing
      const text = await response.text()
      let data
      
      if (text) {
        try {
          data = JSON.parse(text)
        } catch (jsonError) {
          console.error('Invalid JSON response:', text)
          throw new Error('Resposta inválida do servidor')
        }
      } else {
        data = {}
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error: any) {
      // Não logar erros 404 para rotas de perfil, pois são esperados para novos usuários
      const is404Error = error.message?.includes('404') || error.message?.includes('Perfil não encontrado')
      const isProfileRoute = url.includes('/users/profile')
      
      if (!(is404Error && isProfileRoute)) {
        console.error('API request failed:', error)
      }
      
      throw error
    }
  }

  // Auth methods
  async register(email: string, username: string, password: string, birthDate?: string, country?: string) {
    const body: any = { email, username, password };
    
    if (birthDate) {
      body.birth_date = birthDate;
    }
    
    if (country) {
      body.country = country;
    }
    
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    if (response.token) {
      this.setToken(response.token)
    }
    
    return response
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } finally {
      this.setToken(null)
    }
  }

  async getCurrentUser() {
    try {
      const userData = await this.request('/auth/me')
      return {
        data: { user: userData },
        error: null
      }
    } catch (error) {
      return {
        data: { user: null },
        error: error
      }
    }
  }

  async confirmEmail(token: string) {
    return this.request(`/auth/confirm-email/${token}`)
  }

  async resendConfirmation(email: string) {
    return this.request('/auth/resend-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }

  // User methods
  async getUser(id: string) {
    return this.request(`/users/${id}`)
  }

  async updateProfile(id: string, profileData: any) {
    return this.request(`/users/${id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    return this.request(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  async getUsers(params: any = {}) {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/users?${queryString}`)
  }

  async getLeaderboard(faction?: string) {
    const params = faction ? `?faction=${faction}` : ''
    return this.request(`/users/leaderboard${params}`)
  }

  // Clan methods
  async getClans(params: any = {}) {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/clans?${queryString}`)
  }

  async getClan(id: string) {
    return this.request(`/clans/${id}`)
  }

  async createClan(clanData: any) {
    return this.request('/clans', {
      method: 'POST',
      body: JSON.stringify(clanData),
    })
  }

  async updateClan(id: string, clanData: any) {
    return this.request(`/clans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clanData),
    })
  }

  async joinClan(id: string) {
    return this.request(`/clans/${id}/join`, {
      method: 'POST',
    })
  }

  async leaveClan(id: string) {
    return this.request(`/clans/${id}/leave`, {
      method: 'POST',
    })
  }

  async kickMember(clanId: string, userId: string) {
    return this.request(`/clans/${clanId}/kick/${userId}`, {
      method: 'POST',
    })
  }

  async promoteMember(clanId: string, userId: string, role: string) {
    return this.request(`/clans/${clanId}/promote/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }

  async deleteClan(id: string) {
    return this.request(`/clans/${id}`, {
      method: 'DELETE',
    })
  }

  // User Profile methods
  async getUserProfile() {
    return this.request('/users/profile')
  }

  async updateUserProfile(profileData: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  async createUserProfile(profileData: any) {
    return this.request('/users/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
  }

  // Password methods
  async updatePassword(password: string) {
    return this.request('/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    })
  }

  // Ranking methods
  async getPlayerRankings(faction?: string) {
    const params = faction ? `?faction=${faction}` : ''
    return this.request(`/users/rankings${params}`)
  }

  async getClanRankings() {
    return this.request('/clans/rankings')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

// Não há mais compatibilidade com Supabase - removido
