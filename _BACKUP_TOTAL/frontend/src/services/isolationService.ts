import api from "../lib/api";

export interface IsolationAlly {
  id: string;
  username: string;
  avatar_url: string;
  level: number;
  status_ends_at: string | null;
}

export const isolationService = {
  bribe: async () => {
    const response = await api.post("/isolation/bribe");
    return response.data;
  },

  instantEscape: async () => {
    const response = await api.post("/isolation/instant-escape");
    return response.data;
  },

  helpAlly: async (allyId: string) => {
    const response = await api.post("/isolation/help-ally", { allyId });
    return response.data;
  },

  getAllies: async (): Promise<IsolationAlly[]> => {
    const response = await api.get("/isolation/allies");
    return response.data;
  }
};
