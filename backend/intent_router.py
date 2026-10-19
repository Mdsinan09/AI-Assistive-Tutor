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

# Known recognizable brands for visual/OCR cross-referencing
KNOWN_BRANDS = [
    "pilot", "bic", "parker", "camlin", "reynolds", "classmate", "uniball", "faber castell",
    "apple", "dell", "hp", "lenovo", "asus", "acer", "samsung", "logitech",
    "milton", "tupperware", "nike", "adidas", "casio", "sony", "boat", "noise"
]

ORDINAL_MAP = {
    "first": 1, "1st": 1,
    "second": 2, "2nd": 2,
    "third": 3, "3rd": 3,
    "fourth": 4, "4th": 4,
    "fifth": 5, "5th": 5,
    "sixth": 6, "6th": 6,
    "last": -1,
}


def parse_context(context_raw) -> dict:
    if isinstance(context_raw, dict):
        return context_raw
    if isinstance(context_raw, str) and context_raw.strip():
        try:
            parsed = json.loads(context_raw)
            if isinstance(parsed, dict):
                return parsed
            return {"text": str(parsed), "ocr_text": str(parsed)}
        except Exception:
            return {"text": context_raw, "ocr_text": context_raw}
    return {}


def split_paragraphs(text: str) -> list[str]:
    """Split text into distinct non-empty paragraphs."""
    if not text:
        return []
    # Split on double newlines or distinct multi-space paragraph breaks
    raw_paras = re.split(r'\n\s*\n+', text.strip())
    paras = [p.strip() for p in raw_paras if len(p.strip()) > 5]
    if len(paras) <= 1 and len(text.strip()) > 100:
        # If no double newline, group sentences into paragraphs
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text.strip()) if s.strip()]
        if len(sentences) >= 4:
            paras = [
                " ".join(sentences[:len(sentences)//2]),
                " ".join(sentences[len(sentences)//2:])
            ]
    return paras or ([text.strip()] if text.strip() else [])


def format_spatial_description(objects: list) -> str:
    if not objects:
        return "I don't see any supported objects clearly in front of you right now."

    def desc_item(o):
        lbl = o.get("label", "object").replace("_", " ")
        conf = o.get("confidence")
        if conf is not None:
            pct = int(conf * 100) if conf <= 1.0 else int(conf)
            return f"a {lbl} ({pct}% confidence)"
        return f"a {lbl}"

    left = [desc_item(o) for o in objects if o.get("position") == "left"]
    center = [desc_item(o) for o in objects if o.get("position") == "center"]
    right = [desc_item(o) for o in objects if o.get("position") == "right"]

    parts = []
    if left:
        parts.append(f"{', '.join(left)} on your left")
    if center:
        parts.append(f"{', '.join(center)} near the center")
    if right:
        parts.append(f"{', '.join(right)} on your right")

    if not parts:
        items = [desc_item(o) for o in objects]
        return f"I can see {', '.join(items)} in front of you."

    if len(parts) == 1:
        return f"I can see {parts[0]}."
    if len(parts) == 2:
        return f"I can see {parts[0]}, and {parts[1]}."
    return f"I can see {parts[0]}, {parts[1]}, and {parts[2]}."


def route_intent(text: str, context: dict | str = None) -> dict:
    raw = (text or "").strip()
    cmd = raw.lower()
    ctx = parse_context(context)
    objects = ctx.get("objects") or ctx.get("detections") or ctx.get("last_detections") or []
    ocr_text = ctx.get("ocr_text", "") or ctx.get("text", "") or ctx.get("last_ocr_text", "") or ""

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

    # 2.5 CAMERA FLIP Intent
    if matches_any([
        "flip camera", "switch camera", "change camera", "front camera",
        "back camera", "turn camera", "switch to front camera", "switch to back camera",
        "toggle camera", "reverse camera", "flip the camera"
    ]):
        return {
            "intent": "FLIP_CAMERA",
            "action": "flip_camera",
            "spoken_response": "Switching camera view.",
            "payload": None,
        }

    # 2.8 NAVIGATION Intent
    if matches_any([
        "open assistive tutor", "open tutor", "go to tutor", "switch to tutor",
        "take me to tutor", "start tutoring", "open ai tutor"
    ]):
        return {
            "intent": "NAVIGATION_QUERY",
            "action": "navigate_tutor",
            "spoken_response": "Opening Assistive Tutor.",
            "payload": "/assistive-tutor",
        }

    if matches_any([
        "open dashboard", "go to dashboard", "take me to dashboard",
        "open camera", "back to camera"
    ]):
        return {
            "intent": "NAVIGATION_QUERY",
            "action": "navigate_dashboard",
            "spoken_response": "Opening Dashboard.",
            "payload": "/dashboard",
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

    # 4. BRAND / COMPANY / MANUFACTURER INQUIRY (Evidence-based without hallucination)
    brand_query = matches_any([
        "what company", "who made", "what brand", "who manufactured",
        "which company", "which brand", "maker of"
    ])
    if brand_query:
        target_obj = None
        for obj in objects:
            lbl = obj.get("label", "").lower().replace("_", " ")
            if lbl in cmd:
                target_obj = lbl
                break
        if not target_obj and objects:
            target_obj = objects[0].get("label", "object").replace("_", " ")

        obj_label = target_obj or "item"

        # Check if any brand name is visibly detected in OCR text
        found_brand = None
        ocr_lower = ocr_text.lower()
        for brand in KNOWN_BRANDS:
            if re.search(r'\b' + re.escape(brand) + r'\b', ocr_lower):
                found_brand = brand.title()
                break

        if found_brand:
            return {
                "intent": "BRAND_IDENTIFICATION",
                "action": "brand_identified",
                "spoken_response": f"Based on the visible label text '{found_brand}', this {obj_label} appears to be made by {found_brand}.",
                "payload": {"brand": found_brand, "object": obj_label},
            }
        else:
            return {
                "intent": "BRAND_IDENTIFICATION",
                "action": "brand_uncertain",
                "spoken_response": f"I can see a {obj_label}, but the brand name or logo is not visible. Please hold it closer with the brand label facing the camera.",
                "payload": {"object": obj_label, "status": "insufficient_evidence"},
            }

    # 5. PARAGRAPH SPECIFIC EXPLANATION ("Explain the second paragraph", "Read the 1st paragraph")
    para_match = re.search(r"\b(explain|read|tell me about|summarize)\s+(?:the\s+)?(first|second|third|fourth|fifth|sixth|1st|2nd|3rd|4th|5th|6th|last)\s+paragraph\b", cmd)
    if para_match:
        ordinal_word = para_match.group(2).lower()
        target_idx = ORDINAL_MAP.get(ordinal_word, 1)

        if not ocr_text:
            return {
                "intent": "EXPLAIN_PARAGRAPH",
                "action": "trigger_ocr",
                "spoken_response": "I haven't scanned a document yet. Please point your camera at the text and say 'Read this'.",
                "payload": None,
            }

        paragraphs = split_paragraphs(ocr_text)
        if not paragraphs:
            return {
                "intent": "EXPLAIN_PARAGRAPH",
                "action": "none",
                "spoken_response": "No readable paragraphs were found in the scanned text. Please hold the document steady and scan again.",
                "payload": None,
            }

        idx = len(paragraphs) - 1 if target_idx == -1 else target_idx - 1
        if 0 <= idx < len(paragraphs):
            selected_para = paragraphs[idx]
            display_num = len(paragraphs) if target_idx == -1 else target_idx
            return {
                "intent": "EXPLAIN_PARAGRAPH",
                "action": "explain_ocr",
                "spoken_response": f"Analyzing paragraph {display_num}.",
                "payload": selected_para,
                "paragraph_index": display_num,
            }
        else:
            return {
                "intent": "EXPLAIN_PARAGRAPH",
                "action": "none",
                "spoken_response": f"The scanned document only has {len(paragraphs)} paragraph(s). Please ask for paragraph 1 through {len(paragraphs)}.",
                "payload": None,
            }

    # 6. OCR / READ THIS / READ NOTEBOOK Intent
    if matches_any([
        "read this", "read page", "read the page", "read book", "read notes",
        "read text", "read document", "scan page", "scan text", "scan document",
        "what does this say", "what does it say", "tell me what this says",
        "what's written here", "whats written here", "can you read this",
        "read aloud", "read", "read the text on my notebook", "read notebook",
        "read my notebook", "read the text"
    ]):
        spoken = "Capturing frame and reading text from your notebook." if "notebook" in cmd else "Capturing frame and reading text."
        return {
            "intent": "READ_PAGE",
            "action": "trigger_ocr",
            "spoken_response": spoken,
            "payload": raw,
        }

    # 7. QUESTIONS ABOUT PREVIOUSLY SCANNED TEXT ("Tell me about what I just scanned")
    if matches_any([
        "tell me about what i just scanned", "explain what i scanned",
        "explain what i just scanned", "what did i just scan",
        "tell me what i scanned", "explain scanned text", "what did you read"
    ]):
        if ocr_text:
            return {
                "intent": "EXPLAIN_OCR",
                "action": "explain_ocr",
                "spoken_response": "Analyzing what you just scanned.",
                "payload": ocr_text,
            }
        else:
            return {
                "intent": "EXPLAIN_OCR",
                "action": "trigger_ocr",
                "spoken_response": "You haven't scanned a document yet. Please point your camera at your study notes and say 'Read this'.",
                "payload": None,
            }

    # 8. EXPLAIN / SUMMARIZE OCR CONTEXT Intent
    if matches_any([
        "summarize this", "summarize that", "summarize the page", "summarize",
        "give me a summary", "brief summary", "summarize what you read"
    ]):
        if ocr_text:
            return {
                "intent": "SUMMARIZE_OCR",
                "action": "summarize_ocr",
                "spoken_response": "Generating summary of captured text.",
                "payload": ocr_text,
            }
        return {
            "intent": "SUMMARIZE_OCR",
            "action": "trigger_ocr",
            "spoken_response": "No document text is available to summarize. Please scan a page first.",
            "payload": None,
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

    # 9. "WHERE IS MY <OBJECT>?" / "IS THERE A <OBJECT>?" Query
    where_match = re.search(r"\b(?:where\s+is|where's|find|locate|do\s+i\s+have|is\s+there)\s+(?:a|an|my|the)?\s*([a-zA-Z_\s]+)\b", cmd)
    if where_match:
        target_name = where_match.group(1).strip()
        matched_obj = None
        for obj in objects:
            lbl = obj.get("label", "").lower().replace("_", " ")
            if target_name in lbl or lbl in target_name:
                matched_obj = obj
                break

        if matched_obj:
            pos = matched_obj.get("position", "in front of you")
            lbl_clean = matched_obj["label"].replace("_", " ")
            conf = matched_obj.get("confidence")
            conf_str = f" with {int(conf * 100)}% confidence" if conf else ""

            if pos == "left":
                spoken = f"Your {lbl_clean} is slightly to your left{conf_str}."
            elif pos == "right":
                spoken = f"Your {lbl_clean} is slightly to your right{conf_str}."
            elif pos == "center":
                spoken = f"Your {lbl_clean} is right in the center of your view{conf_str}."
            else:
                spoken = f"Your {lbl_clean} is {pos}{conf_str}."

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

    # 10. "WHAT IS ON MY LEFT / RIGHT / CENTER?"
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

    # 11. "WHAT IS IN FRONT OF ME?" / "WHAT'S AROUND ME?" / "WHAT DO YOU SEE?"
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

    # 12. "WHAT IS THIS USED FOR?" / "WHAT IS THIS THING?"
    if matches_any(["what is this used for", "what is it used for", "how do i use this", "what is this"]):
        if ocr_text and len(ocr_text.split()) > 3:
            first_words = " ".join(ocr_text.split()[:12])
            return {
                "intent": "EXPLAIN_OBJECT",
                "action": "explain_object",
                "spoken_response": f"You are looking at a document. The text begins: {first_words}...",
                "payload": ocr_text,
            }

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

    # 13. SETTINGS / PREFERENCES
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

    # 14. GENERAL / ACADEMIC QUESTION (Fallback to Tutor Service)
    return {
        "intent": "GENERAL_QUESTION",
        "action": "consult_tutor",
        "spoken_response": "Looking into that for you.",
        "payload": raw,
    }
