import api from "../lib/api";

export interface NetworkLog {
  id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: any;
  created_at: string;
}

export const logService = {
  getMyLogs: async (page: number = 1): Promise<NetworkLog[]> => {
    const { data } = await api.get(`/logs/me?page=${page}`);
    return data.data;
  }
};
