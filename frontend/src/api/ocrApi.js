import { request } from "./client";

export const ocrApi = {
  async extractText(fileOrBlob, sessionId = null, filename = "document.jpg") {
    const formData = new FormData();
    formData.append("file", fileOrBlob, filename);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    return await request("/ocr", {
      method: "POST",
      body: formData,
    });
  },
};
