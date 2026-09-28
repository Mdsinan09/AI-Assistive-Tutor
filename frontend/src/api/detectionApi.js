import { request } from "./client";

export const detectionApi = {
  async detect(imageBlob, sessionId = null, logToDb = true) {
    const formData = new FormData();
    formData.append("file", imageBlob, "frame.jpg");
    if (sessionId) {
      formData.append("session_id", sessionId);
    }
    formData.append("log_to_db", logToDb ? "true" : "false");

    return await request("/detect", {
      method: "POST",
      body: formData,
    });
  },

  async getDigitalTwinState() {
    return await request("/digital-twin/state", {
      method: "GET",
    });
  },
};
