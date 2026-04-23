import api from "../lib/api";

export interface TrainingGains {
  attack: number;
  defense: number;
  focus: number;
  xp: number;
}

export interface TrainingStartResponse {
  message: string;
  training: {
    type: string;
    endsAt: string;
    durationMinutes: number;
  };
}

export interface TrainingCompleteResponse {
  message: string;
  gains: TrainingGains;
}

export const trainingService = {
  startTraining: async (type: string): Promise<TrainingStartResponse> => {
    const { data } = await api.post("/training/start", { type });
    return data;
  },

  completeTraining: async (): Promise<TrainingCompleteResponse> => {
    const { data } = await api.post("/training/complete");
    return data;
  },
};
