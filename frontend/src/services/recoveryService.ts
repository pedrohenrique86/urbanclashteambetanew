import api from "../lib/api";

export interface RecoveryActionResponse {
  message: string;
}

export const recoveryService = {
  buyAntidote: async (): Promise<RecoveryActionResponse> => {
    const { data } = await api.post("/recovery/antidote");
    return data;
  },

  rescueAlly: async (allyId: string): Promise<RecoveryActionResponse> => {
    const { data } = await api.post("/recovery/rescue-ally", { allyId });
    return data;
  },

  getAllies: async (): Promise<any[]> => {
    const { data } = await api.get("/recovery/allies");
    return data;
  }
};
