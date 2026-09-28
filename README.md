# 🎓 AI Assistive Tutor for Visually Impaired Students (with Digital Twin)

An end-to-end, multimodal, voice-first assistive learning platform built for visually impaired students. The platform combines real-time spatial object detection (**FieldNet V3**), printed study material extraction (**OpenCV + Tesseract OCR**), contextual academic tutoring (**Google Gemini 1.5 Flash**), and an interactive **2D Digital Twin** representation of the student's physical study desk.

---

## 🌟 Key Features

1. **Continuous Real-Time Object Detection (FieldNet V3)**
   - Custom PyTorch implementation using a ResNet-34 backbone trained on study environment objects.
   - Zero-click automatic detection loop upon login with intelligent frame-throttling to prevent compute/speech spam.
   - **Spatial Reasoning Engine:** Translates 2D bounding boxes into directional audio cues (*"In front of you: notebook and pen. To your left: water bottle"*).

2. **Interactive 2D Digital Twin**
   - Renders a live, real-time spatial layout of the student's desk in the browser.
   - Synchronizes detected study items in relation to the student's seated position.

3. **Printed Textbook & Notes Reader (OCR)**
   - Multistage image preprocessing pipeline: contour-based auto-deskewing ($\pm30^\circ$), CLAHE adaptive histogram equalization, bilateral filtering, and image quality diagnostics (Laplacian blur and darkness detection).
   - Dual-thresholding (Adaptive Gaussian + Otsu fallback) with Tesseract OCR (PSM 3).
   - Scanned Study Document Card with word count badge, blur warnings, TTS read aloud, and image upload support.

4. **Contextual AI Academic Tutor**
   - Powered by Google Gemini 1.5 Flash with fallback to an offline extractive QA engine.
   - Directly links user questions with the scanned textbook text.
   - Spoken-friendly formatting (strips markdown asterisks, hashes, and formatting that sounds unnatural via TTS).

5. **Voice-First Navigation & Multimodal Intent Router**
   - Full Web Speech API integration with microphone visualizer.
   - Token-aware intent router parsing 8 intents: `READ_PAGE`, `DETECT_OBJECTS`, `STOP_PAUSE`, `RESUME`, `REPEAT`, `HELP`, `SETTINGS`, `ASK_TUTOR`.
   - **Accessible Keyboard Shortcuts:**
     - `V`: Activate voice assistant / open command prompt
     - `P`: Pause / Resume continuous camera detection
     - `S`: Stop speaking immediately
     - `R`: Repeat last spoken announcement

6. **Apple-Inspired SaaS Interface (No Permanent Sidebar)**
   - Clean, top-header SaaS navigation (`Dashboard`, `Statistics`, `Recent Activity`, `Settings`, `About`).
   - True OLED **Pure Black Mode** (`#09090b`) and **White Mode** toggle.
   - Dynamic font size scaling and speech rate controls.

7. **Verified Session Analytics & Audit Trail**
   - 100% genuine SQLite database metrics (`detections_count`, `ocr_count`, `qa_count`, `total_actions`).
   - Chronological activity log with JSON export and log clearance.
   - PBKDF2-HMAC-SHA256 salted password hashing (100,000 iterations).

---

## 🏗️ Architecture

```
                          ┌──────────────────────────────────────────────┐
                          │   Browser Frontend (index.html / Port 8000)  │
                          │   • Top Navigation Bar (No Permanent Sidebar) │
                          │   • Auto-Starting Webcam + Digital Twin Desk │
                          │   • Scanned Study Document Card (OCR Reader) │
                          │   • Voice Assistant (Web Speech + Hotkeys)   │
                          └──────────────────────┬───────────────────────┘
                                                 │ HTTP / JSON / FormData
                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Integration Hub (backend/main.py)                       │
├────────────────────┬────────────────────┬────────────────────┬─────────────────────────┤
│ Auth & Sessions    │ Object Detection   │ Study OCR Reader   │ AI Academic Tutor       │
│ • PBKDF2 100k hash │ • FieldNet V3      │ • OpenCV bilateral │ • Gemini 1.5 Flash      │
│ • Bearer token mgmt│ • Spatial Engine   │ • CLAHE & deskew   │ • Extractive Fallback   │
│ • Session tracking │ • 2D Twin Mapping  │ • Tesseract PSM 3  │ • Spoken-friendly text  │
└─────────┬──────────┴─────────┬──────────┴─────────┬──────────┴────────────┬────────────┘
          │                    │                    │                       │
          ▼                    ▼                    ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     SQLite Database (backend/app.db - Zero Mock Data)                  │
│   • users           • user_sessions      • sessions (interactive study sessions)       │
│   • detections      • ocr_history        • qa_history                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
Major project/
├── backend/
│   ├── config.py                 # Paths & environment configuration
│   ├── db.py                     # SQLite database schema, PBKDF2 hashing, analytics
│   ├── detection_service.py      # FieldNet V3 PyTorch model wrapper & spatial engine
│   ├── intent_router.py          # Multimodal voice command intent routing
│   ├── main.py                   # FastAPI application & API endpoints
│   ├── ocr_service.py            # OpenCV preprocessing & Tesseract OCR pipeline
│   ├── speech_service.py         # Speech recognition fallback service
│   ├── tts_service.py            # Text-to-speech fallback service
│   ├── tutor_service.py          # Academic Tutor (Gemini 1.5 Flash + extractive fallback)
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Sample environment variables
├── frontend/
│   ├── index.html                # Single-page Apple-style SaaS application
│   ├── style.css                 # Supplementary styles
│   └── app.js                    # Supplementary client scripts
├── objectdetection-main/         # FieldNet V3 model codebase
│   ├── outputs/v3_ft_mask/
│   │   └── best_ema.pt           # Pretrained ResNet-34 model weights
│   ├── src/                      # Model architecture, data loaders & postprocessing
│   └── scripts/                  # Model training and validation scripts
├── .gitignore                    # Git ignore file
└── README.md                     # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Tesseract OCR Engine:**
  - **macOS:** `brew install tesseract`
  - **Ubuntu/Debian:** `sudo apt update && sudo apt install tesseract-ocr`
  - **Windows:** Download and install from [UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)

### 2. Install Python Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Configure Environment (Optional)
To enable live conversational Gemini LLM responses, copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and add your Google Gemini API key:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: If no API key is provided, the tutor runs in smart extractive fallback mode based on your scanned study notes).*

### 4. Run the Application
Start the FastAPI server:
```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Access the Web Dashboard
Open your web browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🔑 Default Credentials
- **Quick Sign In:** Click the **`⚡ One-Click Demo Student Sign In`** button on the login screen.
- **Manual Credentials:**
  - **Username:** `student`
  - **Password:** `student123`
*(You can also register a new account directly from the Sign In tab).*

---

## ⌨️ Accessibility Keyboard Shortcuts

| Shortcut | Action |
|:---:|:---|
| **`V`** | Activate Voice Assistant (starts microphone or opens command prompt) |
| **`P`** | Toggle Pause / Resume environmental detection |
| **`S`** | Stop speech output immediately (`window.speechSynthesis.cancel()`) |
| **`R`** | Repeat the last spoken narration |

---

## 🗣️ Supported Voice Commands

| Voice Utterance | Resulting Action |
|:---|:---|
| *"read page"* / *"read notes"* / *"scan text"* | Captures study material, runs OCR, and reads text aloud |
| *"what is in front of me"* / *"detect objects"* | Scans desk with FieldNet V3 and speaks object positions |
| *"pause"* / *"be quiet"* / *"stop speaking"* | Pauses detection and halts current speech playback |
| *"resume"* / *"continue"* / *"start detection"* | Resumes automated continuous detection |
| *"repeat"* / *"say that again"* | Repeats the previous spatial or tutor narration |
| *"dark mode"* / *"black mode"* | Switches interface to pure black high-contrast mode |
| *"white mode"* / *"light mode"* | Switches interface to clean white mode |
| *"faster"* / *"speed up"* | Increases speech synthesis rate |
| *"slower"* / *"slow down"* | Decreases speech synthesis rate |
| *"explain [topic]"* / *"what is [concept]"* | Queries the AI Academic Tutor with context |
| *"help"* / *"commands"* | Speaks instructions for all voice controls |

---

## 🧪 Tech Stack

- **Backend:** FastAPI, PyTorch, Torchvision, OpenCV, Pytesseract, SQLite3, Google Generative AI
- **Frontend:** Vanilla HTML5 / Modern CSS (Apple Design Tokens) / Vanilla JavaScript (Web Speech API, Canvas 2D, Fetch)
- **Computer Vision:** FieldNet V3 (ResNet-34 backbone, 128 channels, 416x416 resolution)
- **OCR Engine:** Tesseract 5.x with Bilateral filtering & CLAHE equalization
- **AI/LLM:** Google Gemini 1.5 Flash (with smart extractive context fallback)

---

## 📄 License
This project is licensed under the MIT License.
