import re

class IntentRouter:
    @staticmethod
    def route(command: str) -> dict:
        cmd = command.lower().strip()
        
        # Read / OCR Intent
        if any(w in cmd for w in ["read", "scan page", "read page", "what does it say", "text"]):
            return {
                "intent": "OCR",
                "message": "Reading the text on the page for you now."
            }
            
        # Object Detection / Environment Intent
        elif any(w in cmd for w in ["around me", "what is this", "objects", "where is", "look", "surrounding"]):
            return {
                "intent": "OBJECT_DETECTION",
                "message": "Scanning your surroundings for objects and obstacles."
            }
            
        # AI Tutoring / Q&A Intent
        elif any(w in cmd for w in ["explain", "tutor", "why", "summarize", "help me understand", "question"]):
            # Extract question topic
            query = re.sub(r'^(explain|tutor|summarize|tell me about)\s*', '', cmd)
            return {
                "intent": "TUTOR",
                "query": query or cmd,
                "message": "Consulting your AI tutor on this topic."
            }
            
        # Help Intent
        elif any(w in cmd for w in ["help", "commands", "what can you do"]):
            return {
                "intent": "HELP",
                "message": "You can say: 'Read this page' to read text, 'What is around me' to detect objects, or 'Explain this concept' to ask your academic tutor."
            }
            
        else:
            return {
                "intent": "UNKNOWN",
                "message": f"I heard: {command}. Try saying 'Read this' or 'What is around me'."
            }
