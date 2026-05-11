import api from '../lib/api';

export interface SupplyItem {
  id: string;
  energyGained: number;
  costCash: number;
  costAP: number;
}

export const supplyService = {
  buySupply: async (itemId: string, isFieldBuy: boolean = false): Promise<{ message: string; item: SupplyItem; gainedEnergy: number }> => {
    const response = await api.post(`/supply/buy/${itemId}`, { isFieldBuy });
    return response.data;
  },
  buyAntidote: async (): Promise<{ message: string; costCash: number; clearedToxicity: number }> => {
    const response = await api.post('/supply/buy-antidote');
    return response.data;
  }
};
