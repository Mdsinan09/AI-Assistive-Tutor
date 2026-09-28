import google.generativeai as genai
from backend.config import GEMINI_API_KEY

class AITutor:
    def __init__(self):
        if GEMINI_API_KEY:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                self.model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception as e:
                print(f"[AITutor] Failed to configure Gemini: {e}")
                self.model = None
        else:
            self.model = None

    def explain(self, question: str, context_text: str = "") -> str:
        if not self.model:
            # Fallback mock explanation if no Gemini key is provided
            if context_text:
                return (
                    f"Based on the scanned text, here is a simple explanation of {question}: "
                    f"The text focuses on key concepts. For a complete answer, configure the Gemini API key."
                )
            return f"You asked about {question}. As your assistive tutor, I am ready to explain once study material is scanned."
            
        prompt = f"""
You are an AI Assistive Tutor for a visually impaired student.
Your response will be spoken aloud to the student, so:
1. Keep the explanation concise, clear, and direct (under 4 sentences).
2. Do not use markdown symbols, bullet points, asterisks, or visual references.
3. Be supportive and encouraging.

Study Material Scanned:
\"\"\"{context_text}\"\"\"

Student Question:
\"{question}\"
"""
        try:
            response = self.model.generate_content(prompt)
            return response.text.replace("*", "").replace("#", "").strip()
        except Exception as e:
            return f"Unable to reach AI tutor service: {str(e)}"
