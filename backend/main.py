# ============================================================
# RUN COMMAND:
# python3 -m uvicorn backend.main:app --reload --port 8000
# ============================================================
import json
import cv2
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

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
)
from backend.detection_service import DetectionService
from backend.ocr_service import OCRService
from backend.tts_service import TTSService
from backend.speech_service import SpeechService
from backend.intent_router import route_intent
from backend.tutor_service import TutorService

app = FastAPI(title="AI Assistive Tutor API", version="2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    "last_narration": "System standing by.",
    "last_ocr_text": "",
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
    digital_twin_state["last_ocr_text"] = text
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


@app.post("/api/voice/process")
async def process_voice_command(
    req: VoiceProcessRequest,
    authorization: str | None = Header(None),
):
    user = get_current_user_optional(authorization)
    user_id = user["id"] if user else None

    routed = route_intent(req.transcript, req.context)
    intent = routed["intent"]

    if intent in ("SUMMARIZE_OCR", "EXPLAIN_OCR"):
        ctx_text = ""
        if isinstance(req.context, dict):
            ctx_text = req.context.get("ocr_text", "")
        elif isinstance(req.context, str):
            ctx_text = req.context

        prompt = (
            "Summarize this study text clearly in 2 to 3 concise sentences."
            if intent == "SUMMARIZE_OCR"
            else "Explain the core concepts and meaning of this study material clearly and concisely."
        )
        answer = await run_in_threadpool(tutor_svc.ask, ctx_text, prompt)
        routed["tutor_answer"] = answer
        routed["spoken_response"] = answer
        session_id = req.session_id or create_session(user_id)
        log_qa(session_id, req.transcript, answer, user_id=user_id)
        digital_twin_state["last_tutor_qa"] = {"question": req.transcript, "answer": answer}
        digital_twin_state["status"] = "tutoring"

    elif intent in ("ASK_TUTOR", "GENERAL_QUESTION"):
        question = req.transcript
        ctx_str = req.context if isinstance(req.context, str) else json.dumps(req.context) if req.context else ""
        answer = await run_in_threadpool(tutor_svc.ask, ctx_str, question)
        session_id = req.session_id or create_session(user_id)
        log_qa(session_id, question, answer, user_id=user_id)
        routed["tutor_answer"] = answer
        routed["spoken_response"] = answer
        digital_twin_state["last_tutor_qa"] = {"question": question, "answer": answer}
        digital_twin_state["status"] = "tutoring"

    return routed


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
