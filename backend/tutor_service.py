import os
import re
from pathlib import Path
from dotenv import load_dotenv

# Load .env
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

try:
    import google.generativeai as genai
except ImportError:
    genai = None


class TutorService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(TutorService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.model = None
        if self.api_key and genai:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                print("[TutorService] Gemini API connected successfully.")
            except Exception as e:
                print(f"[TutorService] Gemini config warning: {e}")
        else:
            print("[TutorService] Running in fallback mode. (Set GEMINI_API_KEY in backend/.env for live LLM)")
        self._initialized = True

    def ask(self, context_text: str, question: str) -> str:
        q_clean = (question or "").strip()
        if not q_clean:
            return "Please ask an academic question about your study material."

        if not self.model:
            # Smart contextual extractor + foundational knowledge fallback
            q_lower = q_clean.lower()
            q_words = set(re.findall(r'\b\w{3,}\b', q_lower))

            # 1. Try to extract directly from scanned study text
            if context_text and context_text.strip():
                if "summar" in q_lower:
                    sample = " ".join(context_text.strip().split())
                    if len(sample) > 220:
                        sample = sample[:220] + "..."
                    return f"Here is a summary of your scanned study notes: {sample}"

                sentences = re.split(r'[.\n]+', context_text)
                best_sentence = ""
                best_score = 0
                for s in sentences:
                    s_clean = s.strip()
                    if len(s_clean) < 10:
                        continue
                    s_words = set(re.findall(r'\b\w{3,}\b', s_clean.lower()))
                    overlap = len(q_words & s_words)
                    if overlap > best_score:
                        best_score = overlap
                        best_sentence = s_clean

                if best_score >= 1 and best_sentence:
                    return f"According to your scanned notes: {best_sentence}."

            # 2. Foundational academic explanations
            kb = {
                "photosynthesis": "Photosynthesis is the biological process by which green plants use sunlight, carbon dioxide, and water to synthesize glucose and release oxygen.",
                "mitochondria": "Mitochondria are the powerhouses of the cell, generating adenosine triphosphate, or ATP, through cellular respiration.",
                "mitosis": "Mitosis is the process of cell division where a single cell divides into two genetically identical daughter cells.",
                "meiosis": "Meiosis is a specialized form of cell division that produces four genetically diverse gametes, each with half the chromosomes of the parent cell.",
                "krebs cycle": "The Krebs cycle, also called the citric acid cycle, occurs in the mitochondrial matrix to produce energy-carrying molecules like NADH and FADH2.",
                "cellular respiration": "Cellular respiration converts biochemical energy from nutrients into ATP through glycolysis, the citric acid cycle, and oxidative phosphorylation.",
                "newton": "Newton's laws of motion describe the relationship between a body and the forces acting upon it, governing inertia, acceleration, and action-reaction.",
                "gravity": "Gravity is the fundamental attractive force between masses, mathematically formulated by Newton and described geometrically by Einstein's general relativity.",
                "atom": "An atom consists of a dense nucleus of protons and neutrons surrounded by an electron cloud.",
                "dna": "DNA, or deoxyribonucleic acid, is the double-helix molecule carrying genetic instructions for development, functioning, and reproduction in living organisms."
            }

            for key, explanation in kb.items():
                if key in q_lower:
                    return explanation

            if context_text:
                first_few = context_text.strip().replace('\n', ' ')[:150]
                return f"From your study material: '{first_few}'. To enable full conversational explanations on any topic, add a Gemini API key in backend/.env."

            return f"You asked about '{q_clean}'. Please hold your textbook in front of the camera and click 'Read Text Aloud', or configure GEMINI_API_KEY in backend/.env for comprehensive live answers."

        system_prompt = f"""
You are a patient academic tutor for a visually impaired student.
The answer will be read aloud via Text-to-Speech:
1. Keep the answer direct, concise, and easy to understand (under 4 sentences).
2. Avoid bullet points, asterisks, math formulas, or formatting symbols that sound strange when spoken.
3. Reference the student's study material context if relevant.

Study Material Scanned:
\"\"\"{context_text}\"\"\"

Student Question:
\"{question}\"
"""
        try:
            res = self.model.generate_content(system_prompt)
            return res.text.replace("*", "").replace("#", "").strip()
        except Exception as e:
            return f"The academic tutor encountered an issue: {str(e)}"


if __name__ == "__main__":
    tutor = TutorService()
    ctx = "Mitochondria are membrane-bound cell organelles that generate most of the chemical energy needed to power the biochemical reactions."
    q = "What is the powerhouse of the cell?"
    print("Answer:", tutor.ask(ctx, q))
