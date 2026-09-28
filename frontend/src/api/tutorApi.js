import { request } from "./client";

export const tutorApi = {
  async ask(question, context = "", sessionId = null) {
    return await request("/ask", {
      method: "POST",
      body: JSON.stringify({
        question,
        context,
        session_id: sessionId,
      }),
    });
  },
};
