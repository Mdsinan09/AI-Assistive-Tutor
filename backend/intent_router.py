import re


def route_intent(text: str) -> dict:
    raw = (text or "").strip()
    cmd = raw.lower()
    if not cmd:
        return {
            "intent": "UNKNOWN",
            "action": "none",
            "spoken_response": "I didn't hear anything. How can I assist you?",
            "payload": None
        }

    # Normalize punctuation and extra spaces
    cleaned_cmd = re.sub(r"[^\w\s]", " ", cmd)
    tokens = cleaned_cmd.split()

    # Helper: checks if any phrase matches substring or full match
    def matches_any(phrases):
        for p in phrases:
            if " " in p:
                if p in cmd:
                    return True
            else:
                if p in tokens:
                    return True
        return False

    # 1. STOP / PAUSE Intent
    if matches_any([
        "stop", "pause", "halt", "freeze", "silence", "be quiet", "shut up",
        "stop speaking", "stop reading", "pause detection", "stop listening",
        "pause camera", "quiet", "mute"
    ]):
        return {
            "intent": "STOP_PAUSE",
            "action": "pause_detection",
            "spoken_response": "Detection paused.",
            "payload": None
        }

    # 2. RESUME Intent
    if matches_any([
        "resume", "unpause", "continue",
        "resume detection", "start detection", "continue detection",
        "start camera", "keep going", "unpause detection"
    ]):
        return {
            "intent": "RESUME",
            "action": "resume_detection",
            "spoken_response": "Detection resumed.",
            "payload": None
        }

    # 3. REPEAT Intent
    if matches_any([
        "repeat", "repeat that", "say that again", "say it again",
        "what did you say", "pardon", "repeat last", "say again",
        "repeat the previous", "one more time", "again"
    ]):
        return {
            "intent": "REPEAT",
            "action": "repeat_last",
            "spoken_response": "",
            "payload": None
        }

    # 4. HELP Intent
    if matches_any([
        "help", "commands", "options", "instructions", "what can you do",
        "show commands", "help me", "how to use", "voice commands",
        "what are the commands"
    ]):
        return {
            "intent": "HELP",
            "action": "speak_help",
            "spoken_response": (
                "You can say: 'Read page' to scan textbooks, 'Detect objects' or "
                "'What is in front of me' to scan your desk, 'Pause' or 'Resume', "
                "'Dark mode' or 'Light mode', 'Faster' or 'Slower', or ask any academic question like 'Explain photosynthesis'."
            ),
            "payload": None
        }

    # 5. SETTINGS / PREFERENCES Intent
    if matches_any([
        "black mode", "dark mode", "night mode", "theme black", "dark theme",
        "switch to dark", "switch to black", "pure black mode"
    ]):
        return {
            "intent": "SETTINGS",
            "action": "set_theme_black",
            "spoken_response": "Switched to Black Mode.",
            "payload": {"setting": "theme", "value": "black"}
        }

    if matches_any([
        "white mode", "light mode", "day mode", "theme white", "light theme",
        "switch to white", "switch to light"
    ]):
        return {
            "intent": "SETTINGS",
            "action": "set_theme_white",
            "spoken_response": "Switched to White Mode.",
            "payload": {"setting": "theme", "value": "white"}
        }

    if matches_any([
        "faster", "speed up", "increase speed", "increase rate",
        "faster speech", "increase speech speed", "talk faster", "speak faster"
    ]):
        return {
            "intent": "SETTINGS",
            "action": "increase_speed",
            "spoken_response": "Speech rate increased.",
            "payload": {"setting": "speech_rate", "delta": 0.2}
        }

    if matches_any([
        "slower", "slow down", "decrease speed", "decrease rate",
        "slower speech", "decrease speech speed", "talk slower", "speak slower"
    ]):
        return {
            "intent": "SETTINGS",
            "action": "decrease_speed",
            "spoken_response": "Speech rate decreased.",
            "payload": {"setting": "speech_rate", "delta": -0.2}
        }

    # 6. READ_PAGE / OCR Intent
    if matches_any([
        "read page", "read the page", "read book", "read notes", "read my notes",
        "read text", "read this", "read document", "scan page", "scan text",
        "scan document", "scan notes", "scan book", "ocr", "extract text",
        "what does this say", "what does it say", "read aloud", "read"
    ]):
        return {
            "intent": "READ_PAGE",
            "action": "trigger_ocr",
            "spoken_response": "Scanning study material for reading.",
            "payload": raw
        }

    # 7. DETECT_OBJECTS Intent
    if matches_any([
        "detect objects", "detect object", "detect", "around me", "what is around me",
        "what's around me", "what is near me", "what's near me", "what is in front of me",
        "what's in front of me", "describe surroundings", "look around", "scan room",
        "scan surroundings", "identify objects", "what do you see", "check desk"
    ]):
        return {
            "intent": "DETECT_OBJECTS",
            "action": "trigger_detection",
            "spoken_response": "Scanning your surroundings.",
            "payload": raw
        }

    # 8. ASK_TUTOR / GENERAL_QUESTION Intent
    question_starters = [
        "explain", "what is", "what are", "why", "how does", "how do",
        "who", "when", "where", "define", "summarize", "teach me",
        "tell me about", "solve", "calculate", "can you explain", "tutor"
    ]
    for starter in question_starters:
        if cmd.startswith(starter):
            topic = re.sub(rf"^{starter}\s*", "", cmd).strip()
            return {
                "intent": "ASK_TUTOR",
                "action": "consult_tutor",
                "spoken_response": f"Consulting AI tutor about {topic or raw}.",
                "payload": raw
            }

    if "?" in raw or any(w in tokens for w in ["what", "why", "how", "who", "when", "where", "can", "is", "are"]):
        return {
            "intent": "GENERAL_QUESTION",
            "action": "consult_tutor",
            "spoken_response": "Consulting AI tutor for your question.",
            "payload": raw
        }

    # Default multi-word utterances route to academic tutor query
    if len(tokens) >= 2:
        return {
            "intent": "GENERAL_QUESTION",
            "action": "consult_tutor",
            "spoken_response": f"Consulting AI tutor regarding {raw}.",
            "payload": raw
        }

    return {
        "intent": "UNKNOWN",
        "action": "none",
        "spoken_response": f"I heard: {raw}. Try saying 'Read this page', 'What is in front of me', 'Help', or ask an academic question.",
        "payload": raw
    }
