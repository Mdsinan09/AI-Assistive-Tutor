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

  async transcribeAudio(audioBlob, filename = "voice_recording.webm") {
    const formData = new FormData();
    formData.append("file", audioBlob, filename);
    return await request("/api/voice/transcribe", {
      method: "POST",
      body: formData,
    });
  },
};
