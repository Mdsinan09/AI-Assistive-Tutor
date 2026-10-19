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

  async summarize(text, sessionId = null) {
    return await request("/api/tutor/summarize", {
      method: "POST",
      body: JSON.stringify({
        text,
        session_id: sessionId,
      }),
    });
  },

  async explain(text, sessionId = null) {
    return await request("/api/tutor/explain", {
      method: "POST",
      body: JSON.stringify({
        text,
        session_id: sessionId,
      }),
    });
  },

  // Conversational History APIs (Sections 25-28)
  async listConversations() {
    return await request("/api/tutor/conversations", {
      method: "GET",
    });
  },

  async createConversation(arg1 = "New Conversation", arg2 = "none", arg3 = "") {
    let title = "New Conversation";
    let context_source = "none";
    let context_text = "";
    let ocr_context = "";

    if (typeof arg1 === "object" && arg1 !== null) {
      title = arg1.title || "New Conversation";
      context_source = arg1.context_source || "none";
      context_text = arg1.context_text || arg1.ocr_context || "";
      ocr_context = arg1.ocr_context || arg1.context_text || "";
    } else {
      title = arg1 || "New Conversation";
      context_source = arg2 || "none";
      context_text = arg3 || "";
      ocr_context = arg3 || "";
    }

    return await request("/api/tutor/conversations", {
      method: "POST",
      body: JSON.stringify({
        title,
        context_source,
        context_text,
        ocr_context,
      }),
    });
  },

  async getConversation(convId) {
    return await request(`/api/tutor/conversations/${convId}`, {
      method: "GET",
    });
  },

  async sendMessage(convId, question, context = null) {
    return await request(`/api/tutor/conversations/${convId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        question,
        context,
      }),
    });
  },

  async deleteConversation(convId) {
    return await request(`/api/tutor/conversations/${convId}`, {
      method: "DELETE",
    });
  },
};
