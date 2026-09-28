import { request } from "./client";

export const authApi = {
  async login(username, password) {
    return await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async register(username, password, full_name) {
    return await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, full_name }),
    });
  },

  async logout() {
    try {
      return await request("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      return { status: "success" };
    }
  },

  async getProfile() {
    return await request("/api/auth/profile", {
      method: "GET",
    });
  },

  async startSession() {
    return await request("/api/session/start", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
