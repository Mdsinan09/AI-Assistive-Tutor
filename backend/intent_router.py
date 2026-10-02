import re
import json

OBJECT_EXPLANATIONS = {
    "laptop": "A laptop is a portable personal computer used for writing code, studying course material, browsing academic resources, and coursework.",
    "bottle": "A water bottle is a container used to carry drinking water and keep you hydrated during classes.",
    "chair": "A chair is classroom or study seating designed to support your posture while working at a desk.",
    "book": "A book or textbook contains printed academic literature, chapter exercises, and reference notes.",
    "notebook": "A notebook is used for handwriting study notes, equations, and lecture summaries.",
    "cell_phone": "A mobile smartphone used for assistive voice communication, audio recording, and portable computing.",
    "phone": "A phone is a handheld device used for communication and assistive applications.",
    "cup": "A cup is a small container used for drinking beverages like tea, coffee, or water.",
    "keyboard": "A keyboard is a computer input device featuring keys to enter text, commands, and shortcuts.",
    "mouse": "A computer mouse is a pointing peripheral used to navigate interfaces on a computer screen.",
    "backpack": "A backpack is a bag carried on the back, used by students to carry textbooks, laptops, and stationery.",
    "person": "A person, likely a fellow student, study peer, or classroom instructor nearby.",
    "pen": "A writing instrument used for taking handwritten notes or completing written exams.",
}


def parse_context(context_raw) -> dict:
    if isinstance(context_raw, dict):
        return context_raw
    if isinstance(context_raw, str) and context_raw.strip():
        try:
            return json.loads(context_raw)
        except Exception:
            return {"text": context_raw}
    return {}


def format_spatial_description(objects: list) -> str:
    if not objects:
        return "I don't see any supported objects clearly in front of you right now."

    left = [o["label"].replace("_", " ") for o in objects if o.get("position") == "left"]
    center = [o["label"].replace("_", " ") for o in objects if o.get("position") == "center"]
    right = [o["label"].replace("_", " ") for o in objects if o.get("position") == "right"]

    parts = []
    if left:
        parts.append(f"{', '.join(left)} on your left")
    if center:
        parts.append(f"{', '.join(center)} near the center")
    if right:
        parts.append(f"{', '.join(right)} on your right")

    if not parts:
        names = [o["label"].replace("_", " ") for o in objects]
        return f"I can see {', '.join(names)} in front of you."

    if len(parts) == 1:
        return f"I can see a {parts[0]}."
    if len(parts) == 2:
        return f"I can see a {parts[0]}, and a {parts[1]}."
    return f"I can see a {parts[0]}, a {parts[1]}, and a {parts[2]}."


def route_intent(text: str, context: dict | str = None) -> dict:
    raw = (text or "").strip()
    cmd = raw.lower()
    ctx = parse_context(context)
    objects = ctx.get("objects", []) or []
    ocr_text = ctx.get("ocr_text", "") or ""

    if not cmd:
        return {
            "intent": "UNKNOWN",
            "action": "none",
            "spoken_response": "I didn't hear a command. Tap the mic and ask what is in front of you, or say 'Read this'.",
            "payload": None,
        }

    cleaned_cmd = re.sub(r"[^\w\s]", " ", cmd)
    tokens = cleaned_cmd.split()

    def matches_any(phrases):
        for p in phrases:
            if " " in p:
                if p in cmd:
                    return True
            else:
                if p in tokens:
                    return True
        return False

    # 1. STOP / SILENCE / PAUSE Intent
    if matches_any([
        "stop", "pause", "halt", "freeze", "silence", "be quiet", "shut up",
        "stop speaking", "stop reading", "pause detection", "stop listening",
        "pause camera", "quiet", "mute"
    ]):
        return {
            "intent": "STOP_PAUSE",
            "action": "pause_detection",
            "spoken_response": "Detection paused.",
            "payload": None,
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
            "payload": None,
        }

    # 3. REPEAT Intent
    if matches_any([
        "repeat", "repeat that", "say that again", "say it again",
        "what did you say", "pardon", "repeat last", "say again",
        "repeat previous", "again"
    ]):
        return {
            "intent": "REPEAT",
            "action": "repeat_last",
            "spoken_response": "",
            "payload": None,
        }

    # 4. OCR / READ THIS Intent
    if matches_any([
        "read this", "read page", "read the page", "read book", "read notes",
        "read text", "read document", "scan page", "scan text", "scan document",
        "what does this say", "what does it say", "tell me what this says",
        "what's written here", "whats written here", "can you read this",
        "read aloud", "read"
    ]):
        return {
            "intent": "READ_PAGE",
            "action": "trigger_ocr",
            "spoken_response": "Capturing frame and reading text.",
            "payload": raw,
        }

    # 5. EXPLAIN / SUMMARIZE OCR CONTEXT Intent
    if matches_any([
        "summarize this", "summarize that", "summarize the page", "summarize",
        "give me a summary", "brief summary", "summarize what you read"
    ]):
        return {
            "intent": "SUMMARIZE_OCR",
            "action": "summarize_ocr",
            "spoken_response": "Generating summary of captured text.",
            "payload": ocr_text or raw,
        }

    if matches_any([
        "explain this", "explain that", "explain what you just read", "what does this mean",
        "explain the text", "explain page"
    ]):
        if ocr_text:
            return {
                "intent": "EXPLAIN_OCR",
                "action": "explain_ocr",
                "spoken_response": "Analyzing and explaining the document text.",
                "payload": ocr_text,
            }

    # 6. "WHERE IS MY <OBJECT>?" / "IS THERE A <OBJECT>?" Query
    where_match = re.search(r"\b(?:where\s+is|where's|find|locate|do\s+i\s+have|is\s+there)\s+(?:a|an|my|the)?\s*([a-zA-Z_\s]+)\b", cmd)
    if where_match:
        target_name = where_match.group(1).strip()
        # Find matching object in current visual detections
        matched_obj = None
        for obj in objects:
            lbl = obj.get("label", "").lower().replace("_", " ")
            if target_name in lbl or lbl in target_name:
                matched_obj = obj
                break

        if matched_obj:
            pos = matched_obj.get("position", "in front of you")
            lbl_clean = matched_obj["label"].replace("_", " ")
            if pos == "left":
                spoken = f"Your {lbl_clean} is slightly to your left."
            elif pos == "right":
                spoken = f"Your {lbl_clean} is slightly to your right."
            elif pos == "center":
                spoken = f"Your {lbl_clean} is right in the center of your view."
            else:
                spoken = f"Your {lbl_clean} is {pos}."

            return {
                "intent": "LOCATE_OBJECT",
                "action": "locate_object",
                "spoken_response": spoken,
                "payload": matched_obj,
            }
        else:
            return {
                "intent": "LOCATE_OBJECT",
                "action": "locate_object",
                "spoken_response": f"I don't see a {target_name} in front of the camera right now.",
                "payload": None,
            }

    # 7. "WHAT IS ON MY LEFT / RIGHT / CENTER?"
    if "left" in tokens and ("what" in tokens or "anything" in tokens or "is there" in cmd):
        left_objs = [o["label"].replace("_", " ") for o in objects if o.get("position") == "left"]
        spoken = f"On your left, I see a {', '.join(left_objs)}." if left_objs else "Your left side looks clear."
        return {
            "intent": "SPATIAL_QUERY",
            "action": "spatial_query",
            "spoken_response": spoken,
            "payload": {"zone": "left", "objects": left_objs},
        }

    if "right" in tokens and ("what" in tokens or "anything" in tokens or "is there" in cmd):
        right_objs = [o["label"].replace("_", " ") for o in objects if o.get("position") == "right"]
        spoken = f"On your right, I see a {', '.join(right_objs)}." if right_objs else "Your right side looks clear."
        return {
            "intent": "SPATIAL_QUERY",
            "action": "spatial_query",
            "spoken_response": spoken,
            "payload": {"zone": "right", "objects": right_objs},
        }

    # 8. "WHAT IS IN FRONT OF ME?" / "WHAT'S AROUND ME?" / "WHAT DO YOU SEE?"
    if matches_any([
        "what is in front of me", "what's in front of me", "whats in front of me",
        "what is on my desk", "what's on my desk", "whats on my desk",
        "what is around me", "what's around me", "whats around me",
        "what do you see", "what can you see", "look around", "describe surroundings",
        "scan surroundings", "tell me what's around", "tell me whats around",
        "identify objects", "detect objects", "detect", "around me"
    ]):
        spatial_desc = format_spatial_description(objects)
        return {
            "intent": "DETECT_OBJECTS",
            "action": "describe_surroundings",
            "spoken_response": spatial_desc,
            "payload": objects,
        }

    # 9. "WHAT IS THIS USED FOR?" / "WHAT IS THIS THING?"
    if matches_any(["what is this used for", "what is it used for", "how do i use this", "what is this"]):
        # Check if pointing at an active OCR document
        if ocr_text and len(ocr_text.split()) > 3:
            first_words = " ".join(ocr_text.split()[:12])
            return {
                "intent": "EXPLAIN_OBJECT",
                "action": "explain_object",
                "spoken_response": f"You are looking at a document. The text begins: {first_words}...",
                "payload": ocr_text,
            }

        # Otherwise check the primary detected object (center or highest confidence)
        if objects:
            center_obj = next((o for o in objects if o.get("position") == "center"), objects[0])
            lbl_key = center_obj["label"].lower()
            explanation = OBJECT_EXPLANATIONS.get(lbl_key)
            if not explanation:
                lbl_clean = lbl_key.replace("_", " ")
                explanation = f"You are looking at a {lbl_clean} in front of you."
            return {
                "intent": "EXPLAIN_OBJECT",
                "action": "explain_object",
                "spoken_response": explanation,
                "payload": center_obj,
            }

        return {
            "intent": "EXPLAIN_OBJECT",
            "action": "explain_object",
            "spoken_response": "I don't see an object clearly. Try centering the object in the camera view.",
            "payload": None,
        }

    # 10. SETTINGS / PREFERENCES
    if matches_any(["black mode", "dark mode", "night mode", "dark theme"]):
        return {
            "intent": "SETTINGS",
            "action": "set_theme_black",
            "spoken_response": "Switched to Black Mode.",
            "payload": {"setting": "theme", "value": "black"},
        }

    if matches_any(["white mode", "light mode", "day mode", "light theme"]):
        return {
            "intent": "SETTINGS",
            "action": "set_theme_white",
            "spoken_response": "Switched to White Mode.",
            "payload": {"setting": "theme", "value": "white"},
        }

    if matches_any(["faster", "speed up", "speak faster", "talk faster"]):
        return {
            "intent": "SETTINGS",
            "action": "increase_speed",
            "spoken_response": "Speech rate increased.",
            "payload": {"delta": 0.2},
        }

    if matches_any(["slower", "slow down", "speak slower", "talk slower"]):
        return {
            "intent": "SETTINGS",
            "action": "decrease_speed",
            "spoken_response": "Speech rate decreased.",
            "payload": {"delta": -0.2},
        }

    # 11. GENERAL / ACADEMIC QUESTION (Fallback to Tutor Service)
    return {
        "intent": "GENERAL_QUESTION",
        "action": "consult_tutor",
        "spoken_response": f"Looking into that for you.",
        "payload": raw,
    }
