import api from "../lib/api";

export const marketService = {
  async getItems() {
    const response = await api.get("/market/items");
    return response.data;
  },

  async buyItem(itemCode: string, quantity: number) {
    const response = await api.post("/market/buy", { itemCode, quantity });
    return response.data;
  },

  async sellItem(itemCode: string, quantity: number) {
    const response = await api.post("/market/sell", { itemCode, quantity });
    return response.data;
  },
};
