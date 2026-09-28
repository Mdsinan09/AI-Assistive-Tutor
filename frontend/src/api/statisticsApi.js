import { request } from "./client";

export const statisticsApi = {
  async getStatistics() {
    return await request("/api/statistics", {
      method: "GET",
    });
  },
};
