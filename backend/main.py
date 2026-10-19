# ============================================================
# RUN COMMAND:
# python3 -m uvicorn backend.main:app --reload --port 8000
# ============================================================
import os
import time
import re
import json
import cv2
import numpy as np
import sys
from pathlib import Path
CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from typing import Any
from pydantic import BaseModel, Field

try:
    from backend.db import (
        init_db,
        create_session,
        create_user,
        authenticate_user,
        create_user_session,
        validate_session_token,
        invalidate_session_token,
        log_detection,
        log_ocr,
        log_qa,
        get_history,
        clear_history,
        get_statistics,
        create_tutor_conversation,
        list_tutor_conversations,
        get_tutor_conversation,
        add_tutor_message,
        update_tutor_conversation_title,
        delete_tutor_conversation,
    )
    from backend.detection_service import DetectionService
    from backend.ocr_service import OCRService
    from backend.tts_service import TTSService
    from backend.speech_service import SpeechService
    from backend.intent_router import route_intent
    from backend.tutor_service import TutorService
except ImportError:
    from db import (
        init_db,
        create_session,
        create_user,
        authenticate_user,
        create_user_session,
        validate_session_token,
        invalidate_session_token,
        log_detection,
        log_ocr,
        log_qa,
        get_history,
        clear_history,
        get_statistics,
        create_tutor_conversation,
        list_tutor_conversations,
        get_tutor_conversation,
        add_tutor_message,
        update_tutor_conversation_title,
        delete_tutor_conversation,
    )
    from detection_service import DetectionService
    from ocr_service import OCRService
    from tts_service import TTSService
    from speech_service import SpeechService
    from intent_router import route_intent
    from tutor_service import TutorService

app = FastAPI(title="AI Assistive Tutor API", version="2.1")

# Configure CORS: allow explicit origins with credentials, or configure via CORS_ORIGINS env
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
if cors_origins_env:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "http://localhost:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://.*" if "*" in allowed_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database and Singletons at Startup
init_db()

print("\n--- Initializing Assistive AI Services ---")
detection_svc = DetectionService()
ocr_svc = OCRService()
tts_svc = TTSService()
speech_svc = SpeechService()
tutor_svc = TutorService()
print("--- All Services Loaded Successfully ---\n")

# Digital Twin Live State
digital_twin_state = {
    "status": "ready",
    "last_detections": [],
    "last_detections_time": None,
    "last_narration": "System standing by.",
    "last_ocr_text": "",
    "last_ocr_time": None,
    "last_scan_status": "ready",
    "last_tutor_qa": None,
}


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    username: str
    password: str


class SpeakRequest(BaseModel):
    text: str


class AskRequest(BaseModel):
    question: str
    context: str | dict | None = None
    session_id: int | None = None


class VoiceProcessRequest(BaseModel):
    transcript: str
    context: str | dict | None = None
    session_id: int | None = None


class CreateConversationRequest(BaseModel):
    title: Any = "New Conversation"
    context_source: str = "none"
    context_text: str = ""
    ocr_context: str | None = None

    def get_title(self) -> str:
        if isinstance(self.title, dict):
            return str(self.title.get("title") or "New Conversation").strip()
        if self.title is None:
            return "New Conversation"
        return str(self.title).strip() or "New Conversation"

    def get_context(self) -> str:
        if isinstance(self.title, dict):
            ctx = self.title.get("ocr_context") or self.title.get("context_text") or ""
            if ctx:
                return str(ctx).strip()
        return (self.ocr_context or self.context_text or "").strip()


class SendMessageRequest(BaseModel):
    question: str | None = ""
    message: str | None = None
    query_text: str | None = None
    query: str | None = None
    context: str | None = None
    context_text: str | None = None

    def get_query(self) -> str:
        return (self.question or self.message or self.query_text or self.query or "").strip()

    def get_context(self) -> str:
        return (self.context or self.context_text or "").strip()


# ==========================================
# AUTHENTICATION HELPERS
# ==========================================

def get_token_from_header(authorization: str | None = None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user_optional(authorization: str | None = Header(None)) -> dict | None:
    token = get_token_from_header(authorization)
    if not token:
        return None
    return validate_session_token(token)


def get_current_user_required(authorization: str | None = Header(None)) -> dict:
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def decode_image_file(file_bytes: bytes) -> np.ndarray:
    if not file_bytes or len(file_bytes) < 100:
        raise HTTPException(status_code=400, detail="Uploaded file is empty or corrupted.")
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds maximum 15MB limit.")

    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding. Provide a valid JPEG or PNG.")
    return img


# ==========================================
# AUTH ROUTES (PHASE 1)
# ==========================================

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    try:
        user = create_user(req.username, req.password, req.full_name)
        token = create_user_session(user["id"])
        return {
            "status": "success",
            "message": "User registered successfully.",
            "token": token,
            "user": user,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    token = create_user_session(user["id"])
    return {
        "status": "success",
        "message": "Login successful.",
        "token": token,
        "user": user,
    }


@app.post("/api/auth/logout")
async def logout(authorization: str | None = Header(None)):
    token = get_token_from_header(authorization)
    if token:
        invalidate_session_token(token)
    return {"status": "success", "message": "Logged out successfully."}


@app.get("/api/auth/me")
async def get_me(user: dict = Header(None)):
    # Handled via header
    pass


@app.get("/api/auth/profile")
async def get_profile(authorization: str | None = Header(None)):
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return {"status": "success", "user": user}


@app.post("/api/session/start")
async def start_study_session(authorization: str | None = Header(None)):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    session_id = create_session(user_id)
    return {"status": "success", "session_id": session_id}


# ==========================================
# CORE AI / ML PIPELINE (OFFLOADED ASYNC)
# ==========================================

@app.post("/detect")
async def detect_endpoint(
    file: UploadFile = File(...),
    session_id: int | None = Form(None),
    log_to_db: bool = Form(True),
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    if not session_id and log_to_db:
        session_id = create_session(user_id)

    file_bytes = await file.read()
    img = decode_image_file(file_bytes)

    # Run heavy PyTorch model inference in threadpool to avoid event loop blockage
    result = await run_in_threadpool(detection_svc.detect, img)

    if log_to_db and session_id:
        for item in result["detections"]:
            log_detection(session_id, item["label"], item["confidence"], user_id=user_id)

    digital_twin_state["last_detections"] = result["detections"]
    digital_twin_state["last_detections_time"] = time.time()
    digital_twin_state["last_narration"] = result["spatial_narration"]
    digital_twin_state["status"] = "detecting"

    return result


@app.post("/ocr")
async def ocr_endpoint(
    file: UploadFile = File(...),
    session_id: int | None = Form(None),
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    if not session_id:
        session_id = create_session(user_id)

    file_bytes = await file.read()
    img = decode_image_file(file_bytes)

    # Run OCR with quality metrics in threadpool
    result = await run_in_threadpool(ocr_svc.extract_text_details, img)
    text = result["text"]

    if text and text.strip():
        log_ocr(session_id, text.strip(), user_id=user_id)
        digital_twin_state["last_scan_status"] = "success"
    else:
        digital_twin_state["last_scan_status"] = "empty"

    digital_twin_state["last_ocr_text"] = text
    digital_twin_state["last_ocr_time"] = time.time()
    digital_twin_state["status"] = "reading"

    return result


@app.post("/speak")
async def speak_endpoint(req: SpeakRequest):
    if req.text:
        await run_in_threadpool(tts_svc.speak, req.text)
    return {"status": "ok"}


@app.get("/listen")
async def listen_endpoint():
    recognized = await run_in_threadpool(speech_svc.listen)
    intent = route_intent(recognized)
    return {"recognized_text": recognized, "intent": intent}


@app.post("/api/voice/transcribe")
async def transcribe_voice_endpoint(
    file: UploadFile = File(...),
):
    """
    Accepts uploaded audio blob (webm, ogg, wav) from browser client and performs
    server-side speech transcription, serving as a reliable fallback provider.
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        return {"transcript": ""}
    transcript = await run_in_threadpool(
        speech_svc.transcribe_audio_bytes,
        audio_bytes,
        file.filename or "audio.webm",
    )
    return {"transcript": transcript}


@app.post("/api/voice/process")
async def process_voice_command(
    req: VoiceProcessRequest,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None

    # Prepare effective context for intent routing
    eff_context = req.context
    live_objs = digital_twin_state.get("last_detections", [])
    last_ocr = digital_twin_state.get("last_ocr_text", "")
    if isinstance(eff_context, dict):
        if not eff_context.get("objects") and live_objs:
            eff_context = {**eff_context, "objects": live_objs}
        if not eff_context.get("ocr_text") and last_ocr:
            eff_context = {**eff_context, "ocr_text": last_ocr}
    elif not eff_context:
        eff_context = {"objects": live_objs, "ocr_text": last_ocr}

    routed = route_intent(req.transcript, eff_context)
    intent = routed["intent"]

    if intent == "EXPLAIN_PARAGRAPH" and routed.get("action") == "explain_ocr":
        para_text = routed.get("payload") or ""
        answer = await run_in_threadpool(tutor_svc.explain_text, para_text)
        routed["tutor_answer"] = answer
        routed["spoken_response"] = answer
        session_id = req.session_id or create_session(user_id)
        log_qa(session_id, req.transcript, answer, user_id=user_id)
        digital_twin_state["last_tutor_qa"] = {"question": req.transcript, "answer": answer}
        digital_twin_state["status"] = "tutoring"

    elif intent in ("SUMMARIZE_OCR", "EXPLAIN_OCR"):
        ctx_text = ""
        if isinstance(eff_context, dict):
            ctx_text = eff_context.get("ocr_text", "") or eff_context.get("text", "")
        elif isinstance(eff_context, str):
            ctx_text = eff_context

        if intent == "SUMMARIZE_OCR":
            answer = await run_in_threadpool(tutor_svc.summarize_text, ctx_text)
        else:
            answer = await run_in_threadpool(tutor_svc.explain_text, ctx_text)

        routed["tutor_answer"] = answer
        routed["spoken_response"] = answer
        session_id = req.session_id or create_session(user_id)
        log_qa(session_id, req.transcript, answer, user_id=user_id)
        digital_twin_state["last_tutor_qa"] = {"question": req.transcript, "answer": answer}
        digital_twin_state["status"] = "tutoring"

    elif intent in ("ASK_TUTOR", "GENERAL_QUESTION"):
        question = req.transcript
        ctx_str = eff_context if isinstance(eff_context, str) else json.dumps(eff_context) if eff_context else ""
        answer = await run_in_threadpool(tutor_svc.ask, ctx_str, question)
        session_id = req.session_id or create_session(user_id)
        log_qa(session_id, question, answer, user_id=user_id)
        routed["tutor_answer"] = answer
        routed["spoken_response"] = answer
        digital_twin_state["last_tutor_qa"] = {"question": question, "answer": answer}
        digital_twin_state["status"] = "tutoring"

    # Priority 5: Ensure spoken_response is stripped of markdown symbols and raw debugging formatting
    if routed.get("spoken_response"):
        clean_speech = re.sub(r'[*#_`~>]', '', str(routed["spoken_response"]))
        routed["spoken_response"] = re.sub(r'\s+', ' ', clean_speech).strip()

    return routed


class TextSummaryRequest(BaseModel):
    text: str
    session_id: int | None = None


@app.post("/api/tutor/summarize")
async def summarize_endpoint(
    req: TextSummaryRequest,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    summary = await run_in_threadpool(tutor_svc.summarize_text, req.text)
    if req.session_id and summary:
        log_qa(req.session_id, "Summarize OCR text", summary, user_id=user_id)
    return {"summary": summary, "answer": summary}


@app.post("/api/tutor/explain")
async def explain_endpoint(
    req: TextSummaryRequest,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    explanation = await run_in_threadpool(tutor_svc.explain_text, req.text)
    if req.session_id and explanation:
        log_qa(req.session_id, "Explain OCR text", explanation, user_id=user_id)
    return {"explanation": explanation, "answer": explanation}


@app.post("/api/ocr/scan")
@app.post("/api/ocr/extract")
async def ocr_alias_endpoint(
    file: UploadFile = File(...),
    session_id: int | None = Form(None),
    authorization: str | None = Header(None),
):
    return await ocr_endpoint(file=file, session_id=session_id, authorization=authorization)


# ==========================================
# TUTOR CONVERSATIONS & CHAT HISTORY ENDPOINTS
# ==========================================

@app.get("/api/tutor/conversations")
async def list_conversations_endpoint(authorization: str | None = Header(None)):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    return list_tutor_conversations(user_id=user_id)


@app.post("/api/tutor/conversations")
async def create_conversation_endpoint(
    req: CreateConversationRequest,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    return create_tutor_conversation(
        user_id=user_id,
        title=req.get_title(),
        context_source=req.context_source,
        context_text=req.get_context(),
    )


@app.get("/api/tutor/conversations/{conv_id}")
async def get_conversation_endpoint(
    conv_id: int,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    conv = get_tutor_conversation(conv_id, user_id=user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@app.post("/api/tutor/conversations/{conv_id}/messages")
async def send_conversation_message_endpoint(
    conv_id: int,
    req: SendMessageRequest,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    conv = get_tutor_conversation(conv_id, user_id=user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    query_text = req.get_query()
    if not query_text:
        raise HTTPException(status_code=400, detail="Message text is required")

    # Record user message
    user_msg = add_tutor_message(conv_id, "user", query_text)

    # Build context: explicit OCR text or saved context
    effective_context = req.get_context() or conv.get("context_text") or ""
    if effective_context:
        effective_context = f"Attached Scanned Text:\n{effective_context}".strip()

    # Include recent dialogue turns for conversational memory (follow-up questions)
    prev_turns = []
    for m in conv.get("messages", [])[-4:]:
        prev_turns.append(f"{m['role'].capitalize()}: {m['content']}")
    if prev_turns:
        dialog_history = "\n".join(prev_turns)
        effective_context = f"{effective_context}\n\nRecent Conversation:\n{dialog_history}".strip()

    # Multimodal connectivity: Include live spatial environment from camera detections
    live_objs = digital_twin_state.get("last_detections", [])
    if live_objs:
        obj_summary = ", ".join([f"{o.get('label', '').replace('_', ' ')} ({o.get('position', 'center')})" for o in live_objs])
        effective_context = f"{effective_context}\n\nLive Environment (Detected Objects in view): {obj_summary}".strip()

    answer = await run_in_threadpool(tutor_svc.ask, effective_context, query_text)
    assistant_msg = add_tutor_message(conv_id, "assistant", answer)

    # Auto-generate a concise title if this was the first message or titled 'New Conversation'
    current_title = conv.get("title", "")
    if current_title in ("New Conversation", "Untitled Chat", "Scanned Text Inquiry") or len(conv.get("messages", [])) <= 1:
        words = query_text.strip().split()
        short_title = " ".join(words[:4]).title()
        if len(short_title) > 30:
            short_title = short_title[:30] + "..."
        update_tutor_conversation_title(conv_id, short_title)
        conv["title"] = short_title

    return {
        "user_message": user_msg,
        "assistant_message": assistant_msg,
        "answer": answer,
        "title": conv.get("title"),
    }


@app.delete("/api/tutor/conversations/{conv_id}")
async def delete_conversation_endpoint(
    conv_id: int,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    delete_tutor_conversation(conv_id, user_id=user_id)
    return {"status": "success", "message": "Conversation deleted successfully."}


@app.post("/ask")
async def ask_endpoint(
    req: AskRequest,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    session_id = req.session_id or create_session(user_id)

    answer = await run_in_threadpool(tutor_svc.ask, req.context, req.question)
    log_qa(session_id, req.question, answer, user_id=user_id)

    digital_twin_state["last_tutor_qa"] = {"question": req.question, "answer": answer}
    digital_twin_state["status"] = "tutoring"

    return {"answer": answer}


@app.get("/history")
async def history_endpoint(authorization: str | None = Header(None)):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    return get_history(user_id=user_id, limit=30)


@app.post("/api/history/clear")
async def clear_history_endpoint(authorization: str | None = Header(None)):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    clear_history(user_id=user_id)
    return {"status": "success", "message": "Activity history cleared."}


@app.get("/api/statistics")
async def statistics_endpoint(authorization: str | None = Header(None)):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None
    return get_statistics(user_id=user_id)


@app.get("/digital-twin/state")
async def digital_twin_endpoint():
    return digital_twin_state


@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI Assistive Tutor API",
        "model": "FieldNet V3 (PyTorch)",
        "ocr": "Tesseract OCR",
        "speech": "Native macOS say + Web Speech API",
    }


# Serve Frontend static directory (Vite dist bundle with SPA fallback)
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"
SERVE_DIR = DIST_DIR if DIST_DIR.is_dir() else FRONTEND_DIR

if (SERVE_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(SERVE_DIR / "assets")), name="assets")

if SERVE_DIR.is_dir():
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve exact file if exists
        target = SERVE_DIR / full_path
        if target.is_file():
            return FileResponse(target)
        # Serve SPA index.html for client-side routing
        index_file = SERVE_DIR / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="File not found")
