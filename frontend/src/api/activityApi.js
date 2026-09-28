import { request } from "./client";

export const activityApi = {
  async getHistory() {
    return await request("/history", {
      method: "GET",
    });
  },

  async clearHistory() {
    return await request("/api/history/clear", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
