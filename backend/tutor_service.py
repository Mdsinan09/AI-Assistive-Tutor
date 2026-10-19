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
                model_name = "gemini-3.8-flash"
                self.model = genai.GenerativeModel(model_name)
                print(f"[TutorService] Gemini API connected successfully ({model_name}).")
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
You are an assistive academic tutor for a visually impaired student.
The response will be read aloud via Text-to-Speech:
1. Speak in direct, friendly, and concise spoken sentences (under 4 sentences by default).
2. NEVER use markdown symbols, asterisks, bullet points, headers, or formatting that sounds strange when spoken aloud.
3. CONTEXT USAGE:
   - If the student asks about their physical workspace, surroundings, or what is in front of or around them, answer using the Live Environment (Detected Objects) context.
   - If the student asks to explain, summarize, or asks questions about "this", use the Attached Scanned Text context.
   - For follow-up questions (e.g., "give me an example", "what are the advantages"), maintain context from the Recent Conversation history.
   - If the student asks a general educational question, answer directly with accurate foundational knowledge.
4. If asked for a quiz, ask 1 or 2 quick questions without giving away answers immediately.

Available Context:
\"\"\"{context_text}\"\"\"

Student Question:
\"{question}\"
"""
        try:
            res = self.model.generate_content(system_prompt)
            clean_ans = re.sub(r'[*#_`~>]', '', res.text)
            clean_ans = re.sub(r'\s+', ' ', clean_ans).strip()
            return clean_ans
        except Exception as e:
            err_str = str(e)
            print(f"[TutorService] Gemini generation error: {err_str}")
            # If rate limit or temporary issue, fallback to contextual extractor
            if "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                return "The live AI service reached its temporary request limit. Please try again in a few moments."
            return f"The academic tutor encountered an issue: {err_str}"

    def summarize_text(self, text: str) -> str:
        """
        P5.1 - P5.2 Strict Summary Contract:
        Input: OCR text ONLY.
        Output: Concise 2-sentence academic summary.
        Never describes image or camera frame.
        """
        clean = (text or "").strip()
        words = clean.split()
        if len(words) < 5:
            return "Not enough readable text was detected to create a reliable summary. Please hold your document closer and scan again."

        if self.model:
            prompt = f"""
You are an assistive tutor for a visually impaired student.
Summarize the following extracted document text in 2 to 3 concise, clear sentences.
Identify the main subject, key ideas, and important facts.

RULES:
1. Base the summary EXCLUSIVELY on the provided document text.
2. Do NOT describe the image, camera frame, or paper background.
3. Do NOT invent information not present in the text.
4. Do NOT use bullet points, asterisks, or markdown symbols as this will be read aloud.

DOCUMENT TEXT:
\"\"\"{clean}\"\"\"
"""
            try:
                res = self.model.generate_content(prompt)
                return res.text.replace("*", "").replace("#", "").strip()
            except Exception as e:
                print(f"[TutorService] Gemini summarize error: {e}")

        # Intelligent deterministic fallback extraction
        sentences = [s.strip() for s in re.split(r'[.\n]+', clean) if len(s.strip()) > 15]
        if sentences:
            lead = sentences[0]
            if not lead.endswith("."):
                lead += "."
            if len(sentences) > 1:
                second = sentences[1]
                if not second.endswith("."):
                    second += "."
                return f"Summary of your notes: {lead} Furthermore, {second}"
            return f"Summary of your notes: {lead}"

        sample = " ".join(words[:45])
        return f"Summary: {sample}."

    def explain_text(self, text: str) -> str:
        """
        P5.3 Explanation Contract:
        Explains extracted text simply and accurately without visual hallucinations.
        """
        clean = (text or "").strip()
        words = clean.split()
        if len(words) < 3:
            return "Not enough readable text was detected to explain. Please point your camera at the study page and try again."

        if self.model:
            prompt = f"""
You are an assistive tutor for a visually impaired student.
Explain the meaning and core concepts of the following extracted study text in simple, clear language.

RULES:
1. Explain the concepts present in the text directly.
2. Do NOT describe the camera or image.
3. Do NOT use markdown symbols, asterisks, or bullet points.
4. Keep the explanation under 4 sentences so it is comfortable to hear spoken aloud.

STUDY TEXT:
\"\"\"{clean}\"\"\"
"""
            try:
                res = self.model.generate_content(prompt)
                return res.text.replace("*", "").replace("#", "").strip()
            except Exception as e:
                print(f"[TutorService] Gemini explain error: {e}")

        # Fallback explanation
        lead_sentence = clean.split(".")[0].strip()
        return f"This passage discusses: {lead_sentence}. It explains the essential principles and details outlined in your study material."


if __name__ == "__main__":
    tutor = TutorService()
    ctx = "Mitochondria are membrane-bound cell organelles that generate most of the chemical energy needed to power the biochemical reactions."
    q = "What is the powerhouse of the cell?"
    print("Answer:", tutor.ask(ctx, q))
