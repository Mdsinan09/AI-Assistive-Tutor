import { request } from "./client";

export const voiceApi = {
  async processCommand(transcript, context = "", sessionId = null) {
    return await request("/api/voice/process", {
      method: "POST",
      body: JSON.stringify({
        transcript,
        context,
        session_id: sessionId,
      }),
    });
  },
};
