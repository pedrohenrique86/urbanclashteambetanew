// API Client para comunicação com o backend local

/**
 * Erro customizado para representar uma falha de requisição HTTP.
 * Contém o status code da resposta, permitindo um tratamento de erro mais inteligente.
 */
class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("auth_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  getToken() {
    return this.token || localStorage.getItem("auth_token");
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `/api${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (response.status === 304) {
        return {
          __notModified: true,
          __etag: response.headers.get("ETag") || undefined,
        };
      }

      // Verificar se a resposta tem conteúdo antes de fazer o parsing
      const text = await response.text();
      let data;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          console.error("Invalid JSON response:", text);
          throw new Error("Resposta inválida do servidor");
        }
      } else {
        data = {};
      }

      if (!response.ok) {
        const errorMessage =
          data?.error || `HTTP error! status: ${response.status}`;
        // Lança nosso erro customizado que carrega o status code.
        throw new HttpError(errorMessage, response.status);
      }

      const etag = response.headers.get("ETag") || undefined;
      return etag ? { ...data, __etag: etag } : data;
    } catch (error: unknown) {
      // Verificamos se o erro é a nossa classe customizada HttpError.
      if (error instanceof HttpError) {
        // Erros de negócio (401, 409) são esperados e tratados pela UI.
        // Não vamos poluir o console com eles.
        const isHandledBusinessError =
          error.status === 401 || // Unauthorized (login)
          error.status === 409; // Conflict (e.g., user exists)

        if (!isHandledBusinessError) {
          // Para outros erros HTTP (500, 404, etc.), logamos no console.
          console.error("API request failed:", error);
        }
      } else {
        // Se for qualquer outro tipo de erro (falha de rede, erro de JS),
        // ele deve ser logado, pois é inesperado.
        console.error("An unexpected error occurred:", error);
      }

      // Relançamos o erro em todos os casos para que a camada da UI possa
      // reagir a ele (ex: mostrar a mensagem de erro ao usuário).
      throw error;
    }
  }

  // Time synchronization
  async getServerTime() {
    return this.request("/time");
  }

  // Admin methods
  async scheduleGameStart(startTime: string) {
    return this.request("/admin/schedule", {
      method: "POST",
      body: JSON.stringify({ startTime }),
    });
  }

  async stopGameTime() {
    return this.request("/admin/stop-time", {
      method: "POST",
    });
  }

  // Game settings
  async getGameSettings() {
    return this.request("/game/settings");
  }

  // Auth methods
  async register(
    email: string,
    username: string,
    password: string,
    birthDate?: string,
    country?: string,
  ) {
    const body: Record<string, string> = { email, username, password };

    if (birthDate) {
      body.birth_date = birthDate;
    }

    if (country) {
      body.country = country;
    }

    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async login(email: string, password: string) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    try {
      // O endpoint /auth/me já retorna um objeto { user: { ... } }
      // Retornamos diretamente a resposta para manter a consistência.
      const response = await this.request("/auth/me");
      return {
        data: { user: response.user }, // Acessa o objeto aninhado
        error: null,
      };
    } catch (error) {
      return {
        data: { user: null },
        error: error,
      };
    }
  }

  async confirmEmail(token: string) {
    return this.request("/auth/confirm-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async resendConfirmation(email: string) {
    return this.request("/auth/resend-confirmation", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async checkEmail(
    email: string,
  ): Promise<{ exists: boolean; confirmed: boolean }> {
    return this.request("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  // User methods
  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async updateProfile(id: string, profileData: Record<string, unknown>) {
    return this.request(`/users/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    return this.request(`/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getUsers(params: Record<string, string> = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users?${queryString}`);
  }

  async getLeaderboard(faction?: string) {
    const params = faction ? `?faction=${faction}` : "";
    return this.request(`/users/leaderboard${params}`);
  }

  // Clan methods
  async getClans(params: Record<string, string> = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/clans?${queryString}`);
  }

  async getClansByFaction(faction: string) {
    return this.request(`/clans/by-faction/${faction}`);
  }

  async getClan(id: string) {
    return this.request(`/clans/${id}`);
  }

  async createClan(clanData: Record<string, unknown>) {
    return this.request("/clans", {
      method: "POST",
      body: JSON.stringify(clanData),
    });
  }

  async updateClan(id: string, clanData: Record<string, unknown>) {
    return this.request(`/clans/${id}`, {
      method: "PUT",
      body: JSON.stringify(clanData),
    });
  }

  async joinClan(id: string) {
    return this.request(`/clans/${id}/join`, {
      method: "POST",
    });
  }

  async leaveClan(id: string) {
    return this.request(`/clans/${id}/leave`, {
      method: "POST",
    });
  }

  async kickMember(clanId: string, userId: string) {
    return this.request(`/clans/${clanId}/kick/${userId}`, {
      method: "POST",
    });
  }

  async promoteMember(clanId: string, userId: string, role: string) {
    return this.request(`/clans/${clanId}/promote/${userId}`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  }

  async deleteClan(id: string) {
    return this.request(`/clans/${id}`, {
      method: "DELETE",
    });
  }

  // Clan members
  async getClanMembers(id: string) {
    return this.request(`/clans/${id}/members`);
  }

  // Clan chat (optional backend support)
  async getClanChat(id: string, since?: string) {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    return this.request(`/clans/${id}/chat${qs}`);
  }

  async sendClanChat(
    id: string,
    payload: { content?: string; message?: string },
  ) {
    return this.request(`/clans/${id}/chat`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // User Profile methods
  async getUserProfile() {
    return this.request("/users/profile");
  }

  async updateUserProfile(
    userId: string,
    profileData: Record<string, unknown>,
  ) {
    return this.request(`/users/${userId}/profile`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async createUserProfile(profileData: Record<string, unknown>) {
    return this.request("/users/profile", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  }

  // Password methods
  async updatePassword(password: string) {
    return this.request("/auth/update-password", {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
  }

  // Ranking methods
  async getPlayerRankings(faction?: string) {
    const params = faction ? `?faction=${faction}` : "";
    return this.request(`/users/rankings${params}`);
  }

  async getClanRankings() {
    return this.request("/clans/rankings");
  }
}

export const apiClient = new ApiClient();

// Não há mais compatibilidade com Supabase - removido
