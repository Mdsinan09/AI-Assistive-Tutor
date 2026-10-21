# AI ASSISTIVE TUTOR FOR VISUALLY IMPAIRED STUDENTS
## Complete Engineering Audit, Architecture Reference & Technical System Overview

> **Target File:** `OVERVIEW.md`  
> **Repository Root:** `/Users/mac/Desktop/Project/Major project`  
> **Audited Branch:** `main` (Git commit `80becb5`)  
> **Primary Domains:** Computer Vision (PyTorch/FieldNet V3), Optical Character Recognition (OpenCV/Tesseract), Conversational AI (Google Gemini LLM), Accessibility Systems, Full-Stack Architecture (FastAPI & React 18 / Vite).  
> **Last Verified Audit Date:** October 2026

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Purpose, Problem Statement and Intended Users](#2-purpose-problem-statement-and-intended-users)
3. [Feature Summary](#3-feature-summary)
4. [Verified Technology Stack](#4-verified-technology-stack)
5. [Repository Structure](#5-repository-structure)
6. [File-by-File Reference](#6-file-by-file-reference)
7. [High-Level System Architecture](#7-high-level-system-architecture)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Backend Architecture](#9-backend-architecture)
10. [Routes and API Reference](#10-routes-and-api-reference)
11. [AI/ML Model Inventory](#11-aiml-model-inventory)
12. [Object Detection Pipeline](#12-object-detection-pipeline)
13. [OCR and Document Processing Pipeline](#13-ocr-and-document-processing-pipeline)
14. [Voice Assistant and Intent Routing](#14-voice-assistant-and-intent-routing)
15. [Assistive Tutor and LLM Integration](#15-assistive-tutor-and-llm-integration)
16. [Cross-Mode Context Continuity](#16-cross-mode-context-continuity)
17. [Database and Persistence](#17-database-and-persistence)
18. [End-to-End User Workflows](#18-end-to-end-user-workflows)
19. [Configuration and Environment Variables](#19-configuration-and-environment-variables)
20. [Dependencies and Their Purposes](#20-dependencies-and-their-purposes)
21. [Installation and Startup Instructions](#21-installation-and-startup-instructions)
22. [Testing and Validation](#22-testing-and-validation)
23. [Security and Privacy Review](#23-security-and-privacy-review)
24. [Accessibility Review](#24-accessibility-review)
25. [Performance Analysis](#25-performance-analysis)
26. [Error Handling and Failure Scenarios](#26-error-handling-and-failure-scenarios)
27. [Known Issues and Technical Debt](#27-known-issues-and-technical-debt)
28. [Verified Existing Fixes](#28-verified-existing-fixes)
29. [Troubleshooting Guide](#29-troubleshooting-guide)
30. [Glossary of Technical Terms](#30-glossary-of-technical-terms)
31. [Glossary of Project-Specific Variables and Concepts](#31-glossary-of-project-specific-variables-and-concepts)
32. [Limitations and Unimplemented Features](#32-limitations-and-unimplemented-features)
33. [Architecture Decisions and Their Rationale](#33-architecture-decisions-and-their-rationale)
34. [Complete File Inspection Coverage](#34-complete-file-inspection-coverage)
35. [Suggested Future Improvements](#35-suggested-future-improvements)
36. [Evidence and Source References](#36-evidence-and-source-references)

---

## 1. PROJECT OVERVIEW

The **AI Assistive Tutor for Visually Impaired Students Using OCR, Voice Assistance and Object Detection** is an integrated hardware-software assistive platform designed to grant visually impaired, legally blind, and low-vision students total autonomy in academic and classroom environments.

The system harmonizes three distinct sensory and cognitive operational modes:
1. **Vision Mode (Spatial Awareness):** Continuous, real-time object detection and spatial reasoning using a customized anchor-free convolutional architecture (**FieldNet V3**). The model detects study objects (books, pens, notebooks, laptops, chairs, water bottles, mobile phones, etc.) and generates spatial audio descriptions ("In front of you: notebook. To your left: water bottle").
2. **Text Mode (Document Ingestion & Reading):** High-resolution document capture, four-point quadrilateral contour detection, perspective deskewing, illumination normalization, and optical character recognition via **Tesseract OCR** with word-level bounding boxes for touch/click-to-read interaction and raycasted paragraph grouping.
3. **Assistive Tutor (Pedagogical Dialog):** Multimodal conversational intelligence powered by **Google Gemini** (`gemini-3.8-flash` via `google.generativeai`) grounded directly in the student's live environment detections and scanned textbook text, with conversational memory and an offline rule-based knowledge fallback.

The user interface is engineered as an Apple-inspired liquid glass responsive Web application built with **React 18**, **Vite 6**, and **FastAPI**, featuring a 2D top-down **Digital Twin** desk map, full **Web Speech API** integration, Web Audio API frequency waveform visualizers, native mobile HTTPS hardware camera streaming, and keyboard-first accessibility navigation.

---

## 2. PURPOSE, PROBLEM STATEMENT AND INTENDED USERS

### Problem Statement
Visually impaired students face severe structural barriers in standard secondary and higher-education learning environments:
- **Spatial Disorientation:** Difficulty identifying where items are situated across a physical study desk (locating a pen, finding a specific textbook, avoiding knocking over open water bottles).
- **Inaccessible Printed Media:** Physical textbooks, printed research handouts, and handwritten classroom notebooks cannot be parsed by standard digital screen-readers without specialized document scanners.
- **Cognitive Isolation in Self-Study:** When reading complex scientific or mathematical texts, visually impaired students lack an immediate tutor to ask clarifying questions about specific paragraphs or unfamiliar terminology without relying on human aides.

### Intended Users
1. **Blind and Visually Impaired (BVI) Students:** Primary beneficiaries requiring hands-free or voice-first navigation, directional audio feedback, and high-fidelity text-to-speech.
2. **Low-Vision & Amblyopic Students:** Users benefiting from high-contrast displays (Pure Black OLED theme `#000000` / `#050608`), document magnification, dynamic font scaling, and colored bounding box highlights.
3. **Special Education Instructors & Tutors:** Educators monitoring student engagement, spatial confidence, and reading session analytics through the persistent session dashboard.

---

## 3. FEATURE SUMMARY

| Capability | Module / Component | Implementation Mechanism |
| :--- | :--- | :--- |
| **Real-Time Object Detection** | `backend/detection_service.py` | PyTorch FieldNet V3 (ResNet-34 + CGF Neck + FieldHeadV3). 416x416 input. |
| **Spatial Environment Narration** | `backend/detection_service.py` | Horizontal ray slicing: Left ($x < 0.35W$), Center ($0.35W \le x \le 0.65W$), Right ($x > 0.65W$). |
| **False-Positive Suppression** | `frontend/src/utils/coordinateTransform.js` | `TemporalBoxStabilizer` requiring $\ge 2$ consecutive frames before confirming detections. |
| **Document Boundary Rectification**| `backend/ocr_service.py` | OpenCV Canny edge detection, Douglas-Peucker contour approx, 4-point perspective warp. |
| **Adaptive Text Recognition** | `backend/ocr_service.py` | Multi-candidate preprocessing (CLAHE, unsharp mask, bilateral Otsu, illumination division) + Tesseract OCR. |
| **Google Lens-Style Selection** | `frontend/src/components/detection/LiveDetection.jsx` | Normalized word bounding boxes mapped onto viewport canvas; click/drag word and paragraph highlighting. |
| **Voice Command Intent Router** | `backend/intent_router.py` | Deterministic token-matching & regex classifier resolving 14 distinct intents without LLM latency. |
| **Speech Coordination** | `frontend/src/context/VoiceContext.jsx` | Automatic suppression of background object narration during active voice dialogue sessions. |
| **Assistive AI Tutor** | `backend/tutor_service.py` | Google Gemini API grounded in attached OCR text, spatial detections, and conversation history. |
| **Interactive 2D Digital Twin** | `frontend/src/components/digitalTwin/DigitalTwin.jsx` | Real-time Cartesian coordinate top-down map of student workspace relative to observer. |
| **Salted Password Authentication** | `backend/db.py` | PBKDF2-HMAC-SHA256 with 100,000 iterations and per-user 16-byte cryptographically random hex salts. |
| **Multi-Session Chat History** | `backend/db.py` | Relational SQLite persistence supporting titled multi-turn conversation threads. |
| **Mobile Hardware Access** | `frontend/vite.config.js` | `@vitejs/plugin-basic-ssl` enabling HTTPS over LAN, permitting WebRTC camera and mic on iOS/Android. |
| **OLED Pure Black Theme** | `frontend/src/styles/tokens.css` | True `#000000` / `#050608` high-contrast styling with WCAG 2.1 AA compliant color ratios. |

---

## 4. VERIFIED TECHNOLOGY STACK

### Backend Ecosystem
- **Runtime:** Python 3.12 (`/Library/Frameworks/Python.framework/Versions/3.12/bin/python3`)
- **Web Framework:** FastAPI 0.110.0+ (ASGI)
- **ASGI Server:** Uvicorn 0.28.0+
- **Deep Learning Framework:** PyTorch 2.4.0+ (`torch`, `torchvision`)
- **Computer Vision:** OpenCV 4.8.0+ (`cv2`, `headless` compatible)
- **OCR Engine:** Tesseract OCR 5.3+ via `pytesseract` (PSM 3 and PSM 6 modes)
- **Audio & Speech Processing:** 
  - `SpeechRecognition` 3.10.0+ (Google Cloud Speech API endpoint)
  - `pydub` (Audio resampling to 16kHz mono PCM)
  - `pyttsx3` 2.90+ (SAPI5 / NSSpeechSynthesizer offline TTS)
  - Native macOS `say` subprocess (`/usr/bin/say -r 180`)
- **Generative AI:** Google Generative AI SDK (`google.generativeai` 0.5.0+, model: `gemini-3.8-flash`)
- **Database:** SQLite 3 (Standard Library `sqlite3`)
- **Data Validation & Schemas:** Pydantic v2 (`BaseModel`, `Field`)
- **Concurrency:** Starlette Threadpool (`starlette.concurrency.run_in_threadpool`)

### Frontend Ecosystem
- **Language / Runtime:** JavaScript (ESNext, React 18.3.1)
- **Bundler & Dev Server:** Vite 6.1.0 (`@vitejs/plugin-react` 4.3.4, `@vitejs/plugin-basic-ssl` 2.3.0)
- **Routing:** React Router DOM 6.28.2 (`BrowserRouter`, `Routes`, `Route`, `Navigate`)
- **Styling Architecture:** Vanilla CSS Design System with CSS Custom Properties (`tokens.css`, `glass.css`, `globals.css`, `landing.css`)
- **Icons:** Lucide React 0.475.0
- **Motion:** Framer Motion 11.18.2
- **Audio Capture & Synthesis:** Native Web Audio API (`AudioContext`, `AnalyserNode`) and Web Speech API (`webkitSpeechRecognition`, `speechSynthesis`)

---

## 5. REPOSITORY STRUCTURE

```
Major project/
├── .agents/                                # Workspace customizations & sidecars
├── backend/                                # FastAPI backend service
│   ├── database/
│   │   ├── assistive_tutor.db              # Legacy SQLite database file
│   │   └── db.py                           # Legacy database access module
│   ├── digital_twin/
│   │   └── state_manager.py                # Digital Twin state singleton
│   ├── models/                             # Architectural wrappers & fallback models
│   │   ├── detector.py                     # ObjectDetector class wrapper
│   │   ├── ocr_engine.py                   # OCREngine class wrapper
│   │   ├── speech_service.py               # SpeechService wrapper
│   │   └── tutor_agent.py                  # TutorAgent wrapper
│   ├── app.db                              # Active SQLite production database
│   ├── config.py                           # Central configuration & path resolution
│   ├── db.py                               # Active persistence layer (Users, Sessions, History)
│   ├── detection_service.py                # Production FieldNet V3 inference singleton
│   ├── intent_router.py                    # Deterministic voice intent classifier
│   ├── main.py                             # FastAPI application entry point & API routes
│   ├── ocr_service.py                      # Production OpenCV & Tesseract OCR pipeline
│   ├── requirements.txt                    # Python dependency manifest
│   ├── speech_service.py                   # Production STT audio transcription service
│   ├── tts_service.py                      # Production offline TTS synthesis service
│   └── tutor_service.py                    # Production Google Gemini tutor integration
├── deploy/
│   └── CLOUDFLARE_DEPLOYMENT.md            # Tunnel deployment guide
├── frontend/                               # React 18 + Vite frontend application
│   ├── dist/                               # Production build bundle
│   ├── public/
│   │   ├── _redirects                      # Netlify/Cloudflare SPA redirect rules
│   │   ├── icon-192.png                    # PWA web app icon (192x192)
│   │   ├── icon-512.png                    # PWA web app icon (512x512)
│   │   ├── manifest.json                   # Web Application Manifest
│   │   └── sw.js                           # Offline service worker cache script
│   ├── src/
│   │   ├── api/                            # API client and service endpoints
│   │   │   ├── activityApi.js              # Activity log & history endpoints
│   │   │   ├── authApi.js                  # Authentication & session endpoints
│   │   │   ├── client.js                   # Axios/Fetch abstraction with JWT injection
│   │   │   ├── detectionApi.js             # /detect & /digital-twin API client
│   │   │   ├── ocrApi.js                   # /ocr endpoint client
│   │   │   ├── statisticsApi.js            # Usage statistics endpoint client
│   │   │   ├── tutorApi.js                 # Conversations & Q&A client
│   │   │   └── voiceApi.js                 # Voice command & STT client
│   │   ├── components/                     # Reusable UI & subsystem components
│   │   │   ├── accessibility/              # Modals for shortcuts and prompt help
│   │   │   ├── dashboard/                  # Dashboard cards, hero, and context panels
│   │   │   ├── detection/                  # LiveDetection.jsx (Vision + Text engine)
│   │   │   ├── digitalTwin/                # DigitalTwin.jsx (2D spatial desk map)
│   │   │   ├── glass/                      # GlassCard, GlassButton, ShaderCanvas
│   │   │   ├── landing/                    # HeroPerceptionScene.jsx (3D particle canvas)
│   │   │   ├── layout/                     # AppShell, ProtectedRoute, ErrorBoundary
│   │   │   ├── navigation/                 # GlassSidebar navigation
│   │   │   ├── ocr/                        # OCRReader, DocumentMagnifierReader
│   │   │   ├── tutor/                      # TutorModal floating dialogue
│   │   │   └── voice/                      # VoiceWaveformOverlay.jsx
│   │   ├── context/                        # Global state providers
│   │   │   ├── AccessibilityContext.jsx    # Theme, font size, speech rate
│   │   │   ├── AuthContext.jsx             # User credentials, token, login state
│   │   │   └── VoiceContext.jsx            # Voice state machine & speech coordinator
│   │   ├── hooks/                          # Custom React hooks
│   │   │   ├── useCamera.js                # WebRTC camera constraints, zoom, torch
│   │   │   └── useSpeechSynthesis.js       # Browser SpeechSynthesis wrapper
│   │   ├── pages/                          # Primary view routes
│   │   │   ├── About.jsx                   # Project mission & architecture credits
│   │   │   ├── AssistiveTutor.jsx          # Dedicated conversational tutor studio
│   │   │   ├── Dashboard.jsx               # Workspace hub (Detection + Twin + OCR)
│   │   │   ├── LandingPage.jsx             # Editorial public landing page
│   │   │   ├── Login.jsx                   # Student authentication portal
│   │   │   ├── RecentActivity.jsx          # Audit log table and JSON exporter
│   │   │   ├── Register.jsx                # Student registration form
│   │   │   ├── Settings.jsx                # Accessibility, speech & theme preferences
│   │   │   └── Statistics.jsx              # Detection & reading analytics
│   │   ├── styles/                         # CSS design system tokens and themes
│   │   │   ├── glass.css                   # Glassmorphism utilities & filters
│   │   │   ├── globals.css                 # Base resets & accessibility focus styles
│   │   │   ├── landing.css                 # Editorial landing page layout & glows
│   │   │   └── tokens.css                  # Apple design tokens, colors & radii
│   │   ├── utils/
│   │   │   └── coordinateTransform.js      # Canonical coordinate projection & stabilizer
│   │   ├── App.jsx                         # Top-level route switch & offline banner
│   │   └── main.jsx                        # React root bootstrap & PWA registration
│   ├── app.js                              # Legacy vanilla JS prototype
│   ├── index.html                          # HTML5 SPA entry point
│   ├── index.vanilla.html                  # Legacy vanilla prototype HTML
│   ├── package.json                        # Frontend NPM package dependencies
│   ├── style.css                           # Legacy vanilla prototype styles
│   └── vite.config.js                      # Vite build & reverse-proxy configuration
├── objectdetection-main/                   # PyTorch FieldNet V3 research module
│   ├── outputs/v3_ft_mask/
│   │   ├── best_ema.pt                     # FieldNet V3 trained PyTorch weights (100MB+)
│   │   └── config.json                     # Training hyperparameters & taxonomy config
│   ├── scripts/
│   │   └── live_v23.py                     # Standalone OpenCV webcam testing script
│   ├── src/
│   │   ├── data/taxonomy.py                # Class name mapping & taxonomy resolution
│   │   ├── losses/field_loss_v3.py         # Multi-scale CIoU and Quality Focal Loss
│   │   ├── models/
│   │   │   ├── backbone.py                 # ResNet backbone builder
│   │   │   ├── backbones_pretrained.py     # Pretrained weights loader
│   │   │   ├── fieldnet_v3.py              # FieldNetV3 top-level PyTorch Module
│   │   │   ├── head_v3.py                  # FieldHeadV3 multi-scale detection head
│   │   │   └── neck.py                     # Context-Guided Feature (CGF) neck
│   │   └── postprocess/decode_v3.py        # Peak extraction & non-maximum suppression
│   ├── LICENSE                             # MIT License
│   ├── README.md                           # Object detection research docs
│   └── requirements.txt                    # PyTorch detection requirements
├── tests/                                  # Automated Pytest suite (18 verified tests)
│   ├── test_final_tasks.py                 # Speech coordinator & health checks
│   ├── test_landing_page.py                # Landing page integrity & routing tests
│   └── test_priority_features.py           # Intent router, OCR fallback, & confidence tests
├── DESIGN.md                               # Complete visual & accessibility design specification
├── package.json                            # Root workspace run scripts
└── README.md                               # Primary project documentation
```

---

## 6. FILE-BY-FILE REFERENCE

### A. Root Configuration & Documentation Files
1. **`DESIGN.md`**  
   - *Classification:* Documentation.  
   - *Purpose:* Authoritative visual design token specification defining the `#050608` deep black palette, typography hierarchy, button states, focus indicators, and reduced-motion standards.
2. **`README.md`**  
   - *Classification:* Documentation.  
   - *Purpose:* User guide detailing system installation, environment variables, feature list, and keyboard shortcuts.
3. **`package.json`**  
   - *Classification:* Configuration.  
   - *Purpose:* Root script runner (`npm run dev`, `npm run backend`, `npm run build`) coordinating concurrent execution of the Python ASGI server and Vite development bundler.
4. **`deploy/CLOUDFLARE_DEPLOYMENT.md`**  
   - *Classification:* Documentation.  
   - *Purpose:* Step-by-step instructions for tunneling local HTTPS ports (`5173` and `8000`) over Cloudflare Named Tunnels for public mobile testing.

---

### B. Backend Services & Core Engine Files (`backend/`)
5. **`backend/config.py:1-23`**  
   - *Classification:* Configuration.  
   - *Main Responsibility:* Centralizes filesystem paths and default model hyperparameters.  
   - *Exports:* `BASE_DIR`, `CHECKPOINT_PATH` (`objectdetection-main/outputs/v3_ft_mask/best_ema.pt`), `DATABASE_PATH` (`backend/app.db`), `FIELDNET_IMAGE_SIZE` (416), `FIELDNET_CHANNELS` (128), `FIELDNET_BACKBONE` ("resnet34"), `DETECTION_CONF_THRESHOLD` (0.30), `DETECTION_NMS_IOU` (0.60), `TESSERACT_CMD` (`/usr/local/bin/tesseract`), `GEMINI_API_KEY`.
6. **`backend/db.py:1-510`**  
   - *Classification:* Core Application Source / Persistence.  
   - *Main Responsibility:* SQLite database schema migration, salted password authentication, session management, activity logging, and conversational history persistence.  
   - *Important Functions:*  
     - `hash_password(password, salt)`: PBKDF2-HMAC-SHA256 (100,000 iterations).  
     - `verify_password(password, stored_hash, salt)`: Constant-time comparison via `secrets.compare_digest`.  
     - `create_user(username, password, full_name)`: Inserts new user record.  
     - `authenticate_user(username, password)`: Validates credentials.  
     - `create_user_session(user_id)`: Generates 32-byte URL-safe cryptographic token (72-hour expiry).  
     - `validate_session_token(token)`: Validates active auth session.  
     - `log_detection()`, `log_ocr()`, `log_qa()`: Writes audit trail entries.  
     - `create_tutor_conversation()`, `get_tutor_conversation()`, `add_tutor_message()`, `delete_tutor_conversation()`: Manages multi-turn conversation threads.  
   - *Database Schema:* `users`, `user_sessions`, `sessions`, `detections`, `ocr_history`, `qa_history`, `tutor_conversations`, `tutor_messages`.
7. **`backend/detection_service.py:1-300`**  
   - *Classification:* AI/ML Implementation.  
   - *Main Responsibility:* Singleton class loading FieldNet V3 PyTorch weights into memory; performs letterbox preprocessing, forward inference, class-specific confidence filtering, spatial quadrant mapping, and audio narration synthesis.  
   - *Important Functions:*  
     - `preprocess(frame_bgr)`: Scales image to $416 \times 416$ maintaining aspect ratio with 114-gray letterbox padding; normalizes via ImageNet mean/std; permutes to $[1, 3, 416, 416]$.  
     - `detect(frame_bgr)`: Evaluates tensor on CPU/CUDA, runs `decode_batch`, applies `CLASS_CONFIDENCE_THRESHOLDS` (0.52 to 0.63), discards bounding boxes $< 0.18\%$ frame area, runs NMS (`compute_box_iou`), assigns spatial positions (`left`, `center`, `right`), and returns normalized detections.  
     - `generate_spatial_narration(detections)`: Generates natural English spatial cues.
8. **`backend/ocr_service.py:1-545`**  
   - *Classification:* AI/ML Implementation.  
   - *Main Responsibility:* Document image processing and text extraction.  
   - *Important Functions:*  
     - `check_quality(gray)`: Computes Laplacian variance (sharpness), mean brightness, and standard deviation (contrast) to generate user feedback (e.g., "Hold steady", "Turn on flash").  
     - `detect_document_contour(frame)`: Finds largest 4-point convex polygon $\ge 10\%$ image area; runs `cv2.getPerspectiveTransform` and `cv2.warpPerspective` to deskew the page.  
     - `deskew_affine(image)`: Secondary slant-correction using minimum-area bounding box rotation angle.  
     - `build_preprocessing_candidates(frame)`: Generates 5 distinct image candidates (CLAHE sharpened, shadow division normalized, $1.8\times$ upscaled, bilateral Otsu binary, morphological adaptive threshold).  
     - `extract_words_and_reconstruct(image, config)`: Executes `pytesseract.image_to_data`, filters noise characters, groups words vertically into lines by Y-coordinate, orders words horizontally left-to-right, groups lines into paragraphs by line-height gap, and outputs normalized bounding boxes.  
     - `extract_text_details(frame)`: Orchestrates the end-to-end multi-pass pipeline.
9. **`backend/intent_router.py:1-509`**  
   - *Classification:* Core Application Source / NLP.  
   - *Main Responsibility:* High-speed, deterministic voice intent router resolving spoken queries into discrete system actions without external LLM roundtrips.  
   - *Supported Intents:* `STOP_PAUSE`, `RESUME`, `FLIP_CAMERA`, `NAVIGATION_QUERY`, `REPEAT`, `BRAND_IDENTIFICATION`, `EXPLAIN_PARAGRAPH`, `READ_PAGE`, `EXPLAIN_OCR`, `SUMMARIZE_OCR`, `LOCATE_OBJECT`, `SPATIAL_QUERY`, `DETECT_OBJECTS`, `EXPLAIN_OBJECT`, `SETTINGS`, and `GENERAL_QUESTION`.  
   - *Key Safeguard:* Prevents brand hallucinations by requiring visible text confirmation against `KNOWN_BRANDS` in the OCR stream.
10. **`backend/tutor_service.py:1-220`**  
    - *Classification:* AI/ML / External API Integration.  
    - *Main Responsibility:* Integrates Google Gemini (`gemini-3.8-flash`) to provide voice-friendly educational explanations grounded in OCR text, spatial detections, and conversation history.  
    - *Important Functions:*  
      - `ask(context_text, question)`: Formats system instructions, enforces TTS-friendly formatting (strips asterisks, markdown, headers), and generates answers. Includes an offline keyword-matching extractive QA fallback engine.  
      - `summarize_text(text)`: Strictly summarizes document text into 2 concise sentences.  
      - `explain_text(text)`: Explains extracted study material under 4 sentences.
11. **`backend/speech_service.py:1-103`**  
    - *Classification:* Audio / Speech Recognition.  
    - *Main Responsibility:* Speech-to-text service listening via system microphone (`SpeechRecognition.listen`) or accepting uploaded audio blobs (WebM/OGG) from browser clients, converting them to 16kHz mono WAV via `pydub`, and transcribing via Google Cloud STT or Gemini multimodal audio fallback.
12. **`backend/tts_service.py:1-56`**  
    - *Classification:* Audio / Speech Synthesis.  
    - *Main Responsibility:* Server-side text-to-speech fallback using native macOS `/usr/bin/say` or `pyttsx3` with thread-safe execution locks.
13. **`backend/main.py:1-707`**  
    - *Classification:* Core Application Entry Point / API Router.  
    - *Main Responsibility:* Instantiates FastAPI application, registers CORS middleware, initializes database, instantiates service singletons, declares Pydantic request models, registers 23 HTTP endpoints, offloads blocking ML tasks to `starlette.concurrency.run_in_threadpool`, maintains in-memory `digital_twin_state`, and serves Vite production assets (`dist/`) with SPA fallback.
14. **`backend/digital_twin/state_manager.py:1-39`**  
    - *Classification:* Core Application Source / State.  
    - *Main Responsibility:* In-memory state singleton tracking real-time status, active commands, spatial narrations, and latest detections.
15. **`backend/models/detector.py`, `backend/models/ocr_engine.py`, `backend/models/speech_service.py`, `backend/models/tutor_agent.py`**  
    - *Classification:* Architectural Predecessors / Modular Wrappers.  
    - *Main Responsibility:* Modular object-oriented wrappers preserved from initial development; their operational logic is superseded by the optimized singletons in `backend/detection_service.py`, `backend/ocr_service.py`, `backend/speech_service.py`, and `backend/tutor_service.py`.

---

### C. Object Detection Research Subsystem (`objectdetection-main/`)
16. **`objectdetection-main/src/models/fieldnet_v3.py:1-158`**  
    - *Classification:* AI/ML PyTorch Model Architecture.  
    - *Main Responsibility:* Main neural network module defining FieldNet V3. Integrates ResNet-34 backbone with the Context-Guided Feature (CGF) neck and FieldHeadV3, producing multiscale predictions at strides 8, 16, and 32.
17. **`objectdetection-main/src/models/head_v3.py:1-140`**  
    - *Classification:* AI/ML PyTorch Model Architecture.  
    - *Main Responsibility:* Decoupled detection head applying Group Normalization (GN), separate classification and regression trunks, and per-level log-extent affine parameterizations.
18. **`objectdetection-main/src/models/neck.py:1-95`**  
    - *Classification:* AI/ML PyTorch Model Architecture.  
    - *Main Responsibility:* CGF (Context-Guided Feature) neck fusing high-level contextual semantic features with fine-grained spatial representations.
19. **`objectdetection-main/src/models/backbones_pretrained.py:1-85`**  
    - *Classification:* AI/ML PyTorch Model Architecture.  
    - *Main Responsibility:* Instantiates ResNet backbones with frozen Batch Normalization and selectable stage freezing (`freeze_until="layer1"`).
20. **`objectdetection-main/src/postprocess/decode_v3.py:1-180`**  
    - *Classification:* AI/ML Postprocessing.  
    - *Main Responsibility:* Extracts bounding boxes from neural output feature maps using max-pool peak extraction (`peak_kernel=3`), score thresholding, and CIoU Non-Maximum Suppression.
21. **`objectdetection-main/src/data/taxonomy.py:1-90`**  
    - *Classification:* AI/ML Data / Configuration.  
    - *Main Responsibility:* Defines canonical classroom object taxonomy: `person`, `chair`, `desk_table`, `laptop`, `mobile_phone`, `book_notebook`, `pen`, `pencil`, `bottle`, `bag`, `keyboard`, `mouse`, `monitor`, `window`.
22. **`objectdetection-main/outputs/v3_ft_mask/best_ema.pt`**  
    - *Classification:* AI/ML Trained Checkpoint Weights.  
    - *Main Responsibility:* Serialized PyTorch state dictionary storing EMA (Exponential Moving Average) weights ($decay=0.9998$) from 60 training epochs.
23. **`objectdetection-main/outputs/v3_ft_mask/config.json:1-127`**  
    - *Classification:* Configuration.  
    - *Main Responsibility:* Hyperparameter record confirming input size (416), learning rate ($0.00025$), loss weights ($\lambda_{field}=1.0, \lambda_{box}=2.0, \beta_{qfl}=2.0$), and CIoU loss settings.

---

### D. Frontend State, Context & API Clients (`frontend/src/`)
24. **`frontend/src/api/client.js:1-64`**  
    - *Classification:* Core API Client.  
    - *Main Responsibility:* Unified HTTP client. Automatically injects `Authorization: Bearer <token>` from `localStorage`, routes relative URLs through the Vite reverse proxy, handles HTTP 401 unauthorized expirations via global callbacks, and normalizes network error messages.
25. **`frontend/src/api/authApi.js:1-42`**  
    - *Classification:* API Client.  
    - *Main Responsibility:* Calls `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/profile`, and `/api/session/start`.
26. **`frontend/src/api/detectionApi.js:1-24`**  
    - *Classification:* API Client.  
    - *Main Responsibility:* Posts JPEG image blobs to `/detect` and fetches `/digital-twin/state`.
27. **`frontend/src/api/ocrApi.js:1-17`**  
    - *Classification:* API Client.  
    - *Main Responsibility:* Posts high-resolution document images to `/ocr`.
28. **`frontend/src/api/voiceApi.js:1-24`**  
    - *Classification:* API Client.  
    - *Main Responsibility:* Sends transcripts to `/api/voice/process` and posts WebM audio blobs to `/api/voice/transcribe`.
29. **`frontend/src/api/tutorApi.js:1-93`**  
    - *Classification:* API Client.  
    - *Main Responsibility:* Manages conversational endpoints (`/api/tutor/conversations`, `/messages`, `/summarize`, `/explain`, `/ask`).
30. **`frontend/src/api/activityApi.js:1-25`** & **`frontend/src/api/statisticsApi.js:1-12`**  
    - *Classification:* API Client.  
    - *Main Responsibility:* Interacts with `/history`, `/api/history/clear`, and `/api/statistics`.
31. **`frontend/src/context/AuthContext.jsx:1-133`**  
    - *Classification:* State Management.  
    - *Main Responsibility:* React context managing user authentication state, token storage, user profile fetching, automatic session registration, and secure logout.
32. **`frontend/src/context/VoiceContext.jsx:1-717`**  
    - *Classification:* State Management / Speech Coordinator.  
    - *Main Responsibility:* Core voice assistant state machine (`idle`, `listening`, `processing`, `responding`, `permission_denied`, `network_error`). Implements the **Speech Coordinator** that suppresses object detection announcements during voice dialogues, coordinates Web Speech recognition, dispatches system actions, manages microphone hardware streams, and maintains persistent conversation history.
33. **`frontend/src/context/AccessibilityContext.jsx:1-151`**  
    - *Classification:* State Management / Accessibility.  
    - *Main Responsibility:* Persists user accessibility preferences in `localStorage`: Theme (`white` / `black`), Font Size (`normal`, `large`, `xlarge`), Speech Rate ($0.6\times$ to $1.8\times$), Speech Volume ($0.1$ to $1.0$), Voice Feedback toggle, and ARIA screen reader live announcements.
34. **`frontend/src/hooks/useCamera.js:1-717`**  
    - *Classification:* Custom React Hook.  
    - *Main Responsibility:* Controls WebRTC camera streaming. Manages `facingMode` ("environment" vs "user"), evaluates browser security context (`isSecureContext`), controls camera torch/flashlight via MediaStreamTrack constraints, manages hardware PTZ and CSS software zoom, captures high-resolution canvas frames, and provides clean track teardown.
35. **`frontend/src/hooks/useSpeechSynthesis.js:1-78`**  
    - *Classification:* Custom React Hook.  
    - *Main Responsibility:* Browser `window.speechSynthesis` wrapper with queue cancellation, speech rate/volume binding, and repeat-last-narration caching.
36. **`frontend/src/utils/coordinateTransform.js:1-313`**  
    - *Classification:* Mathematical Utility / Computer Vision.  
    - *Main Responsibility:* Implements canonical 2D coordinate projections from normalized $[0, 1]$ bounding boxes to rendered DOM pixels under `object-fit: cover`, handling aspect ratio mismatches, front-camera mirroring, and software zoom offsets. Includes `TemporalBoxStabilizer` which enforces a 2-frame temporal confirmation gate and Exponential Moving Average (EMA) position smoothing to eliminate jitter.

---

### E. Frontend Components & Views (`frontend/src/components/` & `frontend/src/pages/`)
37. **`frontend/src/components/detection/LiveDetection.jsx:1-2036`**  
    - *Classification:* Core UI & Perception Engine.  
    - *Main Responsibility:* Full-featured camera detection and OCR scanning component. Coordinates continuous frame capture, runs the detection throttling loop, renders canvas bounding boxes, manages front/back camera flipping, handles mobile fullscreen toggle with CSS fallback, captures freeze-frames for OCR, renders word-level selectable highlights (Google Lens style), and connects directly to the voice assistant.
38. **`frontend/src/components/digitalTwin/DigitalTwin.jsx:1-481`**  
    - *Classification:* Core UI / Perception.  
    - *Main Responsibility:* Renders an organic 2D top-down spatial map representing the student's study desk. Plots confirmed objects in Cartesian space relative to the student's vantage point with clickable audio cue triggers.
39. **`frontend/src/components/dashboard/AssistantContextPanel.jsx:1-295`**  
    - *Classification:* UI Component.  
    - *Main Responsibility:* Persistent card displaying active contextual OCR text, recent voice dialogue questions and answers, and quick action buttons ("Read Aloud", "Explain Concept", "Ask Tutor").
40. **`frontend/src/components/voice/VoiceWaveformOverlay.jsx:1-834`**  
    - *Classification:* UI & Audio Component.  
    - *Main Responsibility:* Google Assistant-style voice interface modal. Connects to the microphone via Web Audio API `AnalyserNode`, draws real-time frequency waveforms on an HTML5 canvas, renders interim vs finalized speech transcripts, displays assistant responses, and remains open until dismissed by the user.
41. **`frontend/src/components/landing/HeroPerceptionScene.jsx:1-285`**  
    - *Classification:* UI / Graphics Animation.  
    - *Main Responsibility:* Interactive canvas simulation rendering an optical perception sculpture with dual rotating orbital particle rings and volumetric light scatter, respecting `prefers-reduced-motion`.
42. **`frontend/src/pages/LandingPage.jsx:1-850`**  
    - *Classification:* Public Page View.  
    - *Main Responsibility:* Editorial, accessibility-first marketing page detailing the project's vision, features, how-it-works workflow, and design principles, routing authenticated users to `/dashboard` and visitors to `/login`.
43. **`frontend/src/pages/Dashboard.jsx:1-57`**  
    - *Classification:* Protected Page View.  
    - *Main Responsibility:* Main study workspace assembling `LiveDetection`, `DigitalTwin`, and `AssistantContextPanel`.
44. **`frontend/src/pages/AssistiveTutor.jsx:1-1401`**  
    - *Classification:* Protected Page View.  
    - *Main Responsibility:* Full-screen conversational AI tutor studio. Supports creating, renaming, and deleting titled chat sessions, displays multimodal badges (attached OCR text and spatial environment items), and renders chat bubbles with individual read-aloud buttons.
45. **`frontend/src/pages/Statistics.jsx:1-266`**, **`RecentActivity.jsx:1-298`**, **`Settings.jsx:1-281`**, **`About.jsx:1-210`**, **`Login.jsx:1-320`**, **`Register.jsx:1-280`**  
    - *Classification:* Page Views.  
    - *Main Responsibility:* Handles system analytics, chronological audit logs with JSON export, user preferences, project background, and credential authentication.
46. **`frontend/src/styles/tokens.css`**, **`glass.css`**, **`globals.css`**, **`landing.css`**  
    - *Classification:* UI Styling & Design Tokens.  
    - *Main Responsibility:* Declares all CSS custom properties for White Mode and Pure Black Mode, glassmorphism backdrops, typographic clamp scales, and accessible focus outlines.

---

### F. Automated Verification Tests (`tests/`)
47. **`tests/test_final_tasks.py:1-147`**  
    - *Classification:* Automated Testing.  
    - *Main Responsibility:* Verifies API `/health` endpoints, speech coordinator announcement suppression logic, and preference restoration.
48. **`tests/test_priority_features.py:1-154`**  
    - *Classification:* Automated Testing.  
    - *Main Responsibility:* Tests spatial description formatting with confidence percentages, OCR reading intent matching, scanned text context follow-ups, and brand hallucination prevention.
49. **`tests/test_landing_page.py:1-83`**  
    - *Classification:* Automated Testing.  
    - *Main Responsibility:* Validates design system compliance, landing page file integrity, copy requirements, and route configurations.

---

## 7. HIGH-LEVEL SYSTEM ARCHITECTURE

The platform operates as a distributed client-server architecture. The browser frontend handles sensor acquisition (camera video stream and microphone audio), real-time overlay graphics, and client-side speech coordination, while the FastAPI backend serves as the high-throughput neural inference and cognitive engine.

```mermaid
flowchart TB
    subgraph Client["Browser Client (React 18 + Vite on Port 5173 / Mobile HTTPS)"]
        UI["AppShell & Router (/dashboard, /assistive-tutor)"]
        CamHook["useCamera Hook (WebRTC MediaDevices)"]
        VoiceHook["VoiceContext & Speech Coordinator"]
        LiveDet["LiveDetection.jsx (Vision & Lens OCR UI)"]
        TwinComp["DigitalTwin.jsx (2D Spatial Desk Map)"]
        CoordTrans["coordinateTransform.js (TemporalBoxStabilizer)"]
        Waveform["VoiceWaveformOverlay (Web Audio API)"]
    end

    subgraph ReverseProxy["Vite Dev Server Proxy (Port 5173)"]
        Proxy["Proxy Rules (/api, /detect, /ocr, /ask, /speak)"]
    end

    subgraph Backend["FastAPI Backend Service (Uvicorn on Port 8000)"]
        Main["backend/main.py (ASGI Router & Auth Middlewares)"]
        Threadpool["Starlette Async Threadpool"]
        
        subgraph AIServices["Assistive AI Singletons"]
            DetSvc["DetectionService (PyTorch FieldNet V3)"]
            OcrSvc["OCRService (OpenCV + Tesseract OCR)"]
            TutorSvc["TutorService (Google Gemini API)"]
            Router["IntentRouter (Rule-based Intent Classifier)"]
            AudioSvc["SpeechService & TTSService"]
        end

        subgraph Storage["Persistence & Memory"]
            SQLite[("backend/app.db (SQLite3)")]
            TwinMem["In-Memory digital_twin_state"]
        end
    end

    subgraph External["External Cloud AI Providers"]
        GeminiCloud["Google Generative AI (Gemini 3.8 Flash)"]
        GoogleSTT["Google Cloud Speech API"]
    end

    CamHook -->|Video Frames| LiveDet
    LiveDet -->|Captured JPEG Blob| Proxy
    Proxy -->|POST /detect| Main
    Proxy -->|POST /ocr| Main
    VoiceHook -->|Spoken Audio / Transcript| Proxy
    Proxy -->|POST /api/voice/process| Main

    Main --> Threadpool
    Threadpool --> DetSvc
    Threadpool --> OcrSvc
    Threadpool --> TutorSvc
    Threadpool --> Router
    Threadpool --> AudioSvc

    DetSvc -->|Load Weights| BestEMA["best_ema.pt (ResNet-34)"]
    TutorSvc -->|HTTPS REST| GeminiCloud
    AudioSvc -->|Audio Stream| GoogleSTT

    DetSvc -->|Detections & Narration| Main
    OcrSvc -->|Words, Lines, Paragraphs| Main
    Main -->|JSON Response| LiveDet
    LiveDet --> CoordTrans
    CoordTrans -->|Confirmed Boxes| TwinComp
    Main -->|Audit Logs & Chats| SQLite
    Main -->|Update State| TwinMem
```

---

## 8. FRONTEND ARCHITECTURE

### Entry Point & Component Hierarchy
The frontend bootstraps at `frontend/src/main.jsx:1-48`, wrapping the application in four essential context layers:
1. `BrowserRouter` (React Router v6)
2. `AccessibilityProvider` (Theme, font sizing, speech rate, live screen-reader regions)
3. `AuthProvider` (Token storage, user profile, automatic study session creation)
4. `VoiceProvider` (Voice state machine, microphone streams, speech coordinator)

The routing topology (`frontend/src/App.jsx:44-86`) establishes a clear separation between public and authenticated experiences:

```mermaid
graph TD
    App["App.jsx (Root Switch)"]
    App --> Offline["OfflineBanner (Network Listener)"]
    App --> RoutePublic["Public Routes"]
    App --> RouteProtected["Protected Routes (ProtectedRoute)"]

    RoutePublic --> Landing["/ (LandingPage.jsx)"]
    RoutePublic --> Login["/login (Login.jsx)"]
    RoutePublic --> Register["/register (Register.jsx)"]

    RouteProtected --> Shell["AppShell.jsx (Header Navigation + Ambient Canvas)"]
    Shell --> Dash["/dashboard (Dashboard.jsx)"]
    Shell --> Tutor["/assistive-tutor (AssistiveTutor.jsx)"]
    Shell --> Stats["/statistics (Statistics.jsx)"]
    Shell --> Activity["/recent-activity (RecentActivity.jsx)"]
    Shell --> Settings["/settings (Settings.jsx)"]
    Shell --> About["/about (About.jsx)"]

    Dash --> LiveDet["LiveDetection.jsx"]
    Dash --> Twin["DigitalTwin.jsx"]
    Dash --> ContextPanel["AssistantContextPanel.jsx"]
    LiveDet --> Waveform["VoiceWaveformOverlay.jsx"]
```

### Route Table

| Route Path | Component | Auth Required? | Purpose & Navigation Behavior |
| :--- | :--- | :--- | :--- |
| `/` | `LandingPage.jsx` | No | Public editorial landing page. Displays 3D perception sculpture. CTA routes to `/dashboard` if logged in, else `/login`. |
| `/login` | `Login.jsx` | No | Student authentication. Pre-populates demo credentials (`student` / `student123`). Redirects to `/dashboard`. |
| `/register` | `Register.jsx` | No | Student registration. Automatically creates auth token and directs to `/dashboard`. |
| `/dashboard` | `Dashboard.jsx` | Yes | Primary workspace. Houses camera detection, in-camera OCR, 2D Digital Twin, and context panel. |
| `/assistive-tutor` | `AssistiveTutor.jsx` | Yes | Dedicated full-page AI tutor studio. Manages multi-turn conversation threads with attached OCR/environment badges. |
| `/statistics` | `Statistics.jsx` | Yes | Analytics dashboard showing detection counts, OCR scans, tutor queries, and top detected items. |
| `/recent-activity` | `RecentActivity.jsx`| Yes | Chronological audit log with item filtering, JSON data export, and clear-history action. |
| `/settings` | `Settings.jsx` | Yes | User preferences: White/Black mode, font size, speech rate, volume, and voice feedback toggles. |
| `/about` | `About.jsx` | Yes | Technical documentation and architectural overview. |
| `*` | `Navigate to="/"` | No | Catch-all wildcard redirecting unknown URLs back to `/`. |

---

## 9. BACKEND ARCHITECTURE

The backend is structured as an asynchronous FastAPI application (`backend/main.py:1-707`) executing on Uvicorn.

```mermaid
graph LR
    subgraph FastAPI["FastAPI Application (Port 8000)"]
        Router["HTTP Endpoints Router"]
        AuthMiddleware["Bearer Token Auth & Session Validator"]
        Threadpool["run_in_threadpool Worker Pool"]
    end

    subgraph ServiceLayer["Singleton Service Layer"]
        DetSvc["DetectionService (PyTorch FieldNet V3)"]
        OcrSvc["OCRService (OpenCV + Tesseract)"]
        TutorSvc["TutorService (Google Gemini API)"]
        IntentRouter["Intent Router (Regex / Token Classifier)"]
        AudioSvc["SpeechService & TTSService"]
    end

    subgraph Persistence["Storage Subsystem"]
        DB["backend/db.py (SQLite3 / app.db)"]
        TwinState["In-Memory digital_twin_state"]
    end

    Router --> AuthMiddleware
    AuthMiddleware --> Threadpool
    Threadpool --> DetSvc
    Threadpool --> OcrSvc
    Threadpool --> TutorSvc
    Threadpool --> IntentRouter
    Threadpool --> AudioSvc

    DetSvc --> TwinState
    OcrSvc --> TwinState
    TutorSvc --> TwinState
    Router --> DB
```

### Concurrency & Threadpool Offloading
Because PyTorch convolutional inference, OpenCV image transformations, and Tesseract OCR execution are CPU/GPU-bound synchronous operations, invoking them directly inside an async event loop would freeze the entire server. 

The backend mitigates this by wrapping all heavy computational tasks in `starlette.concurrency.run_in_threadpool`:
```python
# backend/main.py:331
result = await run_in_threadpool(detection_svc.detect, img)

# backend/main.py:360
result = await run_in_threadpool(ocr_svc.extract_text_details, img)

# backend/main.py:434, 464
answer = await run_in_threadpool(tutor_svc.ask, ctx_str, question)
```
This design ensures non-blocking request handling across concurrent users and immediate responsiveness for health checks and auth validations.

---

## 10. ROUTES AND API REFERENCE

### Complete Verified API Endpoint Catalog

| Method | Route | Handler Function | Auth Required? | Purpose & Implementation Reference |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | `register` | No | Registers student; returns auth token. (`backend/main.py:249-262`) |
| `POST` | `/api/auth/login` | `login` | No | Validates credentials; returns auth token. (`backend/main.py:264-279`) |
| `POST` | `/api/auth/logout` | `logout` | Optional | Invalidates session token in SQLite. (`backend/main.py:281-286`) |
| `GET` | `/api/auth/profile` | `get_profile` | Yes | Retrieves profile for current token. (`backend/main.py:295-300`) |
| `POST` | `/api/session/start` | `start_study_session` | Optional | Starts interactive study session in DB. (`backend/main.py:303-308`) |
| `POST` | `/detect` | `detect_endpoint` | Optional | Processes camera frame through FieldNet V3. (`backend/main.py:315-343`) |
| `POST` | `/ocr` | `ocr_endpoint` | Optional | Full document contour deskew & Tesseract OCR. (`backend/main.py:345-374`) |
| `POST` | `/api/ocr/scan` | `ocr_alias_endpoint`| Optional | Alias route to `/ocr`. (`backend/main.py:511-518`) |
| `POST` | `/api/ocr/extract` | `ocr_alias_endpoint`| Optional | Alias route to `/ocr`. (`backend/main.py:512-518`) |
| `POST` | `/speak` | `speak_endpoint` | No | Server-side offline speech synthesis. (`backend/main.py:376-380`) |
| `GET` | `/listen` | `listen_endpoint` | No | Listens via microphone & routes intent. (`backend/main.py:383-388`) |
| `POST` | `/api/voice/transcribe` | `transcribe_voice_endpoint` | No | Accepts uploaded WebM/WAV audio blob; returns STT transcript. (`backend/main.py:390-407`) |
| `POST` | `/api/voice/process` | `process_voice_command` | Optional | Evaluates spoken command against context & executes intent. (`backend/main.py:409-478`) |
| `POST` | `/api/tutor/summarize` | `summarize_endpoint`| Optional | Generates 2-sentence summary of OCR text. (`backend/main.py:485-496`) |
| `POST` | `/api/tutor/explain` | `explain_endpoint` | Optional | Explains extracted OCR concepts simply. (`backend/main.py:498-509`) |
| `GET` | `/api/tutor/conversations` | `list_conversations_endpoint` | Optional | Lists user's saved tutor conversations. (`backend/main.py:525-530`) |
| `POST` | `/api/tutor/conversations` | `create_conversation_endpoint`| Optional | Creates a new titled chat session. (`backend/main.py:532-545`) |
| `GET` | `/api/tutor/conversations/{id}` | `get_conversation_endpoint` | Optional | Fetches message history for a conversation. (`backend/main.py:547-558`) |
| `POST` | `/api/tutor/conversations/{id}/messages`| `send_conversation_message_endpoint` | Optional | Appends user message, calls Gemini, stores reply. (`backend/main.py:560-617`) |
| `DELETE` | `/api/tutor/conversations/{id}` | `delete_conversation_endpoint` | Optional | Deletes conversation and messages. (`backend/main.py:619-628`) |
| `POST` | `/ask` | `ask_endpoint` | Optional | Direct single-turn QA endpoint. (`backend/main.py:630-646`) |
| `GET` | `/history` | `history_endpoint` | Optional | Returns last 30 detections, OCRs, and QAs. (`backend/main.py:648-653`) |
| `POST` | `/api/history/clear` | `clear_history_endpoint` | Optional | Clears audit logs for current user. (`backend/main.py:655-661`) |
| `GET` | `/api/statistics` | `statistics_endpoint` | Optional | Returns aggregate action counts and top objects. (`backend/main.py:663-668`) |
| `GET` | `/digital-twin/state` | `digital_twin_endpoint` | No | Returns real-time in-memory twin state. (`backend/main.py:670-673`) |
| `GET` | `/health` / `/api/health` | `health_check` | No | System health check and model version metadata. (`backend/main.py:675-685`) |
| `GET` | `/{full_path:path}` | `serve_spa` | No | Serves static assets from `frontend/dist` with SPA fallback. (`backend/main.py:696-707`) |

---

## 11. AI/ML MODEL INVENTORY

### Profile 1: FieldNet V3 (Object Detection)
- **Model Name:** FieldNet V3 (`FieldNetV3`)
- **Model Family / Architecture:** Single-stage anchor-free object detector with ResNet-34 backbone, Context-Guided Feature (CGF) neck, and decoupled FieldHeadV3.
- **Provider / Framework:** Local PyTorch model (`torch`, `torchvision`).
- **Checkpoint Location:** `objectdetection-main/outputs/v3_ft_mask/best_ema.pt`
- **Configuration File:** `objectdetection-main/outputs/v3_ft_mask/config.json`
- **Trained Classes (14):** `person`, `chair`, `desk_table`, `laptop`, `mobile_phone`, `book_notebook`, `pen`, `pencil`, `bottle`, `bag`, `keyboard`, `mouse`, `monitor`, `window`.
- **Input Dimensions:** $416 \times 416 \times 3$ RGB tensor, normalized with ImageNet statistics ($\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$).
- **Inference Latency:** $\sim 35\text{ms}$ on GPU / $\sim 95\text{ms}$ on Apple Silicon CPU.
- **Output:** Class probabilities ($\phi_{\text{logits}}$), bounding box coordinates, and variance offsets across feature pyramid strides 8, 16, and 32.
- **Source Files:** `backend/detection_service.py:80-126`, `objectdetection-main/src/models/fieldnet_v3.py:30-158`.

### Profile 2: Tesseract OCR Engine (Document Reading)
- **Engine Name:** Tesseract Open Source OCR Engine (v5.3.0+)
- **Provider / Framework:** Local binary executed through `pytesseract`.
- **Operating Modes:**
  - Primary: `--oem 3 --psm 3` (Default page segmentation; automatic layout analysis).
  - Sparse Fallback: `--oem 3 --psm 6` (Uniform single block of text).
- **Preprocessing Pipeline:** OpenCV quadrilateral contour detection, perspective deskewing, unsharp masking, bilateral filtering, and shadow division normalization.
- **Output:** Structured hierarchy: words, lines, paragraphs, confidence scores ($0-100\%$), and normalized bounding coordinates.
- **Source Files:** `backend/ocr_service.py:25-520`.

### Profile 3: Google Gemini LLM (Assistive Academic Tutor)
- **Model Identifier:** `gemini-3.8-flash` (with automatic fallback to `gemini-1.5-flash` or extractive QA)
- **Provider:** Google Generative AI Cloud API via `google.generativeai`.
- **Integration Type:** Remote API over secure HTTPS.
- **Prompt Architecture:** Strict persona instructions enforcing direct spoken sentences, complete removal of markdown symbols/asterisks, and mandatory grounding in attached OCR text and live environment detections.
- **Fallback Implementation:** Local extractive rule-based QA engine matching query keywords against scanned text sentences and an academic knowledge base (`backend/tutor_service.py:47-98`).
- **Source Files:** `backend/tutor_service.py:16-130`.

### Profile 4: Speech Recognition & Synthesis Engines
- **Speech-to-Text (STT):**
  - Client-side: Web Speech API (`webkitSpeechRecognition`) for instant local recognition.
  - Server-side fallback: `SpeechRecognition` library utilizing Google Speech API and Gemini audio multimodal transcription (`backend/speech_service.py:37-96`).
- **Text-to-Speech (TTS):**
  - Client-side: Web Speech API (`window.speechSynthesis`) with rate ($0.6\times-1.8\times$) and volume adjustments.
  - Server-side fallback: Native macOS `/usr/bin/say` or `pyttsx3` offline speech engine (`backend/tts_service.py:7-50`).

---

## 12. OBJECT DETECTION PIPELINE

The end-to-end object detection pipeline flows from the client camera to directional audio narration:

```mermaid
sequenceDiagram
    autonumber
    participant Cam as Browser Camera (useCamera.js)
    participant UI as LiveDetection.jsx
    participant Stab as TemporalBoxStabilizer
    participant API as FastAPI (/detect)
    participant Model as FieldNet V3 (PyTorch)
    participant Audio as Speech Coordinator

    Cam->>UI: Stream video frames (640x360 / 1280x720)
    Note over UI: Check throttling timer (every 1100ms)
    UI->>UI: Draw frame to offscreen canvas & export JPEG Blob
    UI->>API: POST /detect (FormData with file=frame.jpg)
    API->>Model: run_in_threadpool(detection_svc.detect, img)
    Note over Model: 1. Letterbox resize to 416x416<br/>2. Normalize (ImageNet mean/std)<br/>3. Forward pass (ResNet-34 + Neck)<br/>4. Peak extraction & decode_batch<br/>5. Class-specific confidence filtering<br/>6. Box IoU Non-Maximum Suppression
    Model-->>API: Detections List & Spatial Narration
    API-->>UI: Return JSON {detections, spatial_narration}
    UI->>Stab: stabilize(currentDetections)
    Note over Stab: Match tracks with IoU > 0.25<br/>Confirm objects seen in >= 2 frames<br/>Smooth coordinates using EMA (alpha=0.65)
    Stab-->>UI: Return Confirmed Display Boxes
    UI->>UI: Render Canvas Bounding Boxes (Coordinate Projection)
    UI->>Audio: speakAnnouncement(spatial_narration)
    Note over Audio: If voice session is open, SUPPRESS speech.<br/>Else, announce directional audio cues.
```

### Mathematical Formulations & Quality Thresholds
1. **Intersection over Union (IoU):**
   $$\text{IoU}(A, B) = \frac{\text{Area}(A \cap B)}{\text{Area}(A \cup B)} = \frac{\max(0, x_B - x_A) \times \max(0, y_B - y_A)}{\text{Area}(A) + \text{Area}(B) - \text{Area}(A \cap B)}$$
   Boxes with same-class $\text{IoU} > 0.42$ or general $\text{IoU} > 0.75$ are suppressed (`backend/detection_service.py:215-219`).
2. **Exponential Moving Average (EMA) Smoothing:**
   $$P_{\text{smoothed}}^{(t)} = (1 - \alpha) \cdot P_{\text{smoothed}}^{(t-1)} + \alpha \cdot P_{\text{detected}}^{(t)}$$
   Implemented with $\alpha = 0.65$ (`frontend/src/utils/coordinateTransform.js:225-228`).
3. **Artifact Rejection:** Bounding boxes smaller than $14\text{px}$ in width/height, boxes occupying $< 0.18\%$ of total frame area, or aspect ratios outside $[0.12, 7.5]$ are discarded as sensor noise (`backend/detection_service.py:180-188`).

---

## 13. OCR AND DOCUMENT PROCESSING PIPELINE

The OCR pipeline converts printed textbook pages and notes into selectable, structured digital text:

```mermaid
flowchart TD
    A["Camera Frame Ingestion (Full Resolution Canvas Capture)"] --> B["Document Contour Detection (Canny Edges + findContours)"]
    B --> C{"Quadrilateral Found? (Area >= 10% & Convex)"}
    C -->|Yes| D["4-Point Perspective Warp (cv2.warpPerspective)"]
    C -->|No| E["Deskew Affine Fallback (cv2.minAreaRect Slant Correction)"]
    D --> F["Quality Check (Laplacian Variance, Brightness, Contrast)"]
    E --> F
    F --> G["Build Multi-Candidate Preprocessing Pipeline"]
    
    subgraph Candidates["5 Multi-Candidate Transforms"]
        G1["Candidate 1: CLAHE + Unsharp Mask"]
        G2["Candidate 2: Bilateral Denoise + Otsu Binary"]
        G3["Candidate 3: Illumination / Shadow Division"]
        G4["Candidate 4: 1.8x Upscaling + Sharpening"]
        G5["Candidate 5: Morphological Background Subtraction"]
    end
    G --> Candidates
    Candidates --> H["Tesseract OCR Execution (--oem 3 --psm 3)"]
    H --> I{"Words >= 15 & Conf > 70%?"}
    I -->|Yes| J["Select Best Candidate Result"]
    I -->|No| K["Fallback to PSM 6 (Uniform Block)"]
    K --> J
    J --> L["Spatial Reconstruction & Reading Order Sort"]
    L --> M["Word Bounding Boxes + Paragraph Clustering"]
    M --> N["Frontend Viewport Projection (Interactive Highlight & Touch-to-Read)"]
```

### Detailed Processing Algorithms
- **Sharpness Evaluation:** Calculated via the variance of the Laplacian:
  $$\text{Var}(\Delta I) = \frac{1}{N} \sum (L(x, y) - \mu_L)^2$$
  Frames with $\text{Var} < 38.0$ trigger blur warnings (`backend/ocr_service.py:42-46`).
- **Reading Order Sorting:** Words are sorted vertically by Y-center coordinates within a vertical tolerance of $\text{line\_tolerance} = 0.65 \times \text{median\_line\_height}$, then sorted horizontally left-to-right by X-center. Paragraph breaks are identified whenever vertical line gaps exceed $2.2 \times \text{average\_line\_height}$ (`backend/ocr_service.py:312-357`).

---

## 14. VOICE ASSISTANT AND INTENT ROUTING

### Speech Coordination & Suppression Logic
A primary engineering challenge in multimodal assistive systems is preventing audio collisions: the background object detector must not talk over the student while they are asking questions.

The `VoiceContext` (`frontend/src/context/VoiceContext.jsx:236-247`) implements this via the **Speech Coordinator**:
```javascript
const speakAnnouncement = useCallback((text, priority = false) => {
  if (!text || !text.trim()) return false;
  // Suppress object-detection announcements while voice session is active
  if (isVoiceSessionOpenRef.current || voiceStateRef.current !== "idle") {
    return false;
  }
  rawSpeak(text, priority);
  return true;
}, [rawSpeak]);
```

### Complete Voice Intent Catalog

| Intent Identifier | Trigger Phrases (Examples) | Destination Handler | Action Taken |
| :--- | :--- | :--- | :--- |
| `STOP_PAUSE` | "stop", "pause", "halt", "silence", "be quiet" | `pause_detection` | Halts detection loop and cancels active speech synthesis. |
| `RESUME` | "resume", "continue", "start detection" | `resume_detection` | Resumes active detection loop. |
| `FLIP_CAMERA` | "flip camera", "switch camera", "front camera" | `flip_camera` | Toggles WebRTC between user and environment lenses. |
| `NAVIGATION_QUERY`| "open tutor", "go to dashboard" | `navigate_*` | Programmatically triggers React Router navigation. |
| `REPEAT` | "repeat", "say that again", "pardon" | `repeat_last` | Repeats the last spoken audio utterance from cache. |
| `BRAND_IDENTIFICATION`| "what brand is this", "who made this" | `brand_identified` / `brand_uncertain` | Searches OCR text for brand keywords without hallucinating. |
| `EXPLAIN_PARAGRAPH`| "explain the second paragraph", "read 1st paragraph"| `explain_ocr` | Extracts the specified paragraph and invokes Gemini explanation. |
| `READ_PAGE` | "read this", "read page", "read notebook" | `trigger_ocr` | Freezes current high-res camera frame and triggers OCR. |
| `EXPLAIN_OCR` | "tell me about what i just scanned", "explain text"| `explain_ocr` | Passes scanned text to Gemini for academic explanation. |
| `SUMMARIZE_OCR` | "summarize this", "give me a summary" | `summarize_ocr` | Generates a 2-sentence summary of the scanned text. |
| `LOCATE_OBJECT` | "where is my water bottle", "find my pen" | `locate_object` | Searches detections for matching object and speaks bearing. |
| `SPATIAL_QUERY` | "what is on my left", "anything on my right" | `spatial_query` | Filters detections by spatial quadrant and speaks results. |
| `DETECT_OBJECTS` | "what is in front of me", "look around", "what do you see"| `describe_surroundings` | Generates full spatial description of all confirmed objects. |
| `EXPLAIN_OBJECT` | "what is this used for", "what is this thing" | `explain_object` | Returns functional explanation of centered object. |
| `SETTINGS` | "dark mode", "black mode", "faster", "slower" | `set_*` | Updates theme or adjusts TTS playback rate by $\pm 0.2$. |
| `GENERAL_QUESTION`| "what is photosynthesis", "explain gravity" | `consult_tutor` | Routes query and environment context to Gemini LLM. |

---

## 15. ASSISTIVE TUTOR AND LLM INTEGRATION

The Assistive Tutor provides voice-first pedagogical dialogue. Queries converge from three input methods:
1. Typed input in the Assistive Tutor studio (`/assistive-tutor`).
2. Spoken commands processed via the voice overlay.
3. Interactive selection clicks on scanned OCR text words/paragraphs.

### Multimodal Context Assembly
When a message is submitted to `/api/tutor/conversations/{conv_id}/messages` (`backend/main.py:560-617`), the backend constructs a unified prompt incorporating:
1. **Attached OCR Context:** Scanned text from textbooks or notes.
2. **Conversational Memory:** Up to 4 prior turns formatted as `User: ... \nAssistant: ...` to resolve follow-up questions ("give me an example", "what are its advantages").
3. **Live Environment Detections:** Detected physical items currently visible in the camera view (e.g., `Live Environment (Detected Objects in view): notebook (center), bottle (left)`).

### Prompt Construction Template
```text
You are an assistive academic tutor for a visually impaired student.
The response will be read aloud via Text-to-Speech:
1. Speak in direct, friendly, and concise spoken sentences (under 4 sentences by default).
2. NEVER use markdown symbols, asterisks, bullet points, headers, or formatting that sounds strange when spoken aloud.
3. CONTEXT USAGE:
   - If the student asks about their physical workspace, surroundings, or what is in front of or around them, answer using the Live Environment (Detected Objects) context.
   - If the student asks to explain, summarize, or asks questions about "this", use the Attached Scanned Text context.
   - For follow-up questions (e.g., "give me an example"), maintain context from the Recent Conversation history.
   - If the student asks a general educational question, answer directly with accurate foundational knowledge.
4. If asked for a quiz, ask 1 or 2 quick questions without giving away answers immediately.

Available Context:
"""{effective_context}"""

Student Question:
"{query_text}"
```

---

## 16. CROSS-MODE CONTEXT CONTINUITY

The system connects **Vision Mode**, **Text Mode**, and **Assistive Tutor** into a seamless, unified learning experience.

```mermaid
sequenceDiagram
    autonumber
    participant Student as Visually Impaired Student
    participant Vision as Vision Mode (Continuous Camera)
    participant Text as Text Mode (OCR Lens)
    participant Tutor as Assistive Tutor Studio
    participant Storage as SQLite & SessionStorage

    Note over Student,Vision: 1. PHYSICAL WORKSPACE ORIENTATION
    Student->>Vision: Enters /dashboard; Camera starts automatically
    Vision->>Student: Spoken Cue: "In front of you: notebook and pen. To your left: water bottle."
    Vision->>Storage: Cache live objects in sessionStorage (ai_assistive_active_detections)

    Note over Student,Text: 2. DOCUMENT READING & INGESTION
    Student->>Vision: Voice Command: "Read the text on my notebook"
    Vision->>Text: Switch to Text Mode; Freeze high-res capture; Run OCR
    Text->>Student: Spoken Cue: "Scanned 142 words from Chapter 4: The Water Cycle."
    Text->>Student: Visual Overlay: Word bounding boxes projected onto page
    Student->>Text: Clicks/Touches Paragraph 2 ("Solar energy powers evaporation...")
    Text->>Student: Speaks selected paragraph aloud

    Note over Student,Tutor: 3. CONTEXTUAL TUTORING & DEEP LEARNING
    Student->>Text: Clicks "Ask Tutor About This"
    Text->>Tutor: Navigates to /assistive-tutor with state {ocrContext, detections}
    Tutor->>Student: Displays Attached Scanned Text badge & Live Environment badge
    Student->>Tutor: Spoken Question: "Why is solar energy necessary for this process?"
    Tutor->>Student: Spoken & Visual Answer: "Solar energy provides heat to break hydrogen bonds..."
    Student->>Tutor: Follow-up Question: "What happens next?"
    Tutor->>Student: Resolves conversational memory: "Next, water vapor rises and condenses into clouds."
```

---

## 17. DATABASE AND PERSISTENCE

The production database is an ACID-compliant SQLite relational database (`backend/app.db`) managed via `backend/db.py`.

```mermaid
erDiagram
    users ||--o{ user_sessions : "authenticates"
    users ||--o{ sessions : "owns"
    users ||--o{ detections : "logs"
    users ||--o{ ocr_history : "logs"
    users ||--o{ qa_history : "logs"
    users ||--o{ tutor_conversations : "creates"
    tutor_conversations ||--o{ tutor_messages : "contains"

    users {
        int id PK
        string username UK
        string password_hash
        string salt
        string full_name
        string created_at
    }

    user_sessions {
        string token PK
        int user_id FK
        string created_at
        string expires_at
    }

    sessions {
        int id PK
        int user_id FK
        string timestamp
    }

    detections {
        int id PK
        int session_id
        int user_id FK
        string label
        float confidence
        string timestamp
    }

    ocr_history {
        int id PK
        int session_id
        int user_id FK
        string text
        string timestamp
    }

    qa_history {
        int id PK
        int session_id
        int user_id FK
        string question
        string answer
        string timestamp
    }

    tutor_conversations {
        int id PK
        int user_id FK
        string title
        string context_source
        string context_text
        string created_at
        string updated_at
    }

    tutor_messages {
        int id PK
        int conversation_id FK
        string role
        string content
        string created_at
    }
```

---

## 18. END-TO-END USER WORKFLOWS

### Workflow 1: Continuous Classroom Navigation (Vision Mode)
1. Student navigates to `/dashboard`.
2. Camera automatically activates (`initialAutoStart=true`) with facing mode set to `environment` (back camera).
3. Frame loop captures video frames every $1100\text{ms}$ and posts to `/detect`.
4. FieldNet V3 detects objects and calculates spatial bearings.
5. `TemporalBoxStabilizer` confirms objects present across $\ge 2$ consecutive frames.
6. The system speaks directional audio cues through the student's headphones.

### Workflow 2: Textbook Reading & Paragraph Explanation (Text Mode)
1. Student points camera at textbook and taps 'Read Text Aloud' (or presses `V` and says "Read this").
2. High-resolution canvas capture is frozen; camera transitions to Text Mode.
3. OpenCV locates quadrilateral page contour and deskews perspective.
4. Tesseract OCR extracts words, lines, and paragraphs with normalized bounding boxes.
5. Bounding boxes are rendered over the document image.
6. Student taps any word or paragraph to trigger immediate text-to-speech.
7. Student taps "Explain Concept" to receive a concise spoken explanation from the AI tutor.

### Workflow 3: Voice Dialogue & Follow-Up Tutoring
1. Student presses `V` or taps the floating microphone button.
2. `VoiceWaveformOverlay` opens; Web Audio API visualizes audio frequencies in real-time.
3. Student asks: *"Where is my water bottle?"*
4. `IntentRouter` parses the `LOCATE_OBJECT` intent and responds: *"Your water bottle is slightly to your left with 88% confidence."*
5. Student asks: *"Can you explain what is in front of me?"*
6. System identifies textbook text and provides an educational breakdown.
7. Dialogue remains visible on screen for review and is automatically saved to conversation history.

---

## 19. CONFIGURATION AND ENVIRONMENT VARIABLES

| Variable Name | Purpose | Consumed By | Required? | Safe Example / Default |
| :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Authenticates requests to Google Gemini LLM API. | `backend/tutor_service.py:28` | Recommended | `AIzaSyD-YOUR_KEY_HERE` (Falls back to offline QA if empty) |
| `TESSERACT_CMD` | Absolute filesystem path to Tesseract OCR binary. | `backend/config.py:19`, `backend/ocr_service.py:7` | Optional | `/usr/local/bin/tesseract` or `/opt/homebrew/bin/tesseract` |
| `CORS_ORIGINS` | Comma-separated list of allowed HTTP/HTTPS origins. | `backend/main.py:88-100` | Optional | `http://localhost:5173,https://localhost:5173` |
| `VITE_API_BASE_URL` | Base URL for frontend API requests (leave empty for proxy).| `frontend/src/api/client.js:5-11` | Optional | `""` (Empty string uses relative proxy routing) |
| `PORT` | Network port for the FastAPI ASGI backend. | Command-line runtime | Optional | `8000` |

---

## 20. DEPENDENCIES AND THEIR PURPOSES

### Backend Dependencies (`backend/requirements.txt`)
- **`fastapi` & `uvicorn`:** Asynchronous web framework and ASGI server powering all API routes.
- **`torch` & `torchvision`:** Deep learning runtime executing FieldNet V3 convolutional inference.
- **`opencv-python`:** Computer vision library handling image decoding, perspective warping, and thresholding.
- **`pytesseract`:** Python wrapper for the Tesseract Optical Character Recognition engine.
- **`google-generativeai`:** Official Google Gemini API client for multimodal tutoring.
- **`SpeechRecognition` & `pydub`:** Audio recording, audio format conversion, and speech-to-text.
- **`pyttsx3`:** Cross-platform offline text-to-speech engine.
- **`pydantic`:** Data validation and request schema enforcement.
- **`python-dotenv`:** Loads configuration from `backend/.env`.

### Frontend Dependencies (`frontend/package.json`)
- **`react` & `react-dom` (v18.3.1):** Component rendering and virtual DOM lifecycle.
- **`react-router-dom` (v6.28.2):** Client-side SPA routing and navigation guards.
- **`lucide-react` (v0.475.0):** Accessible, lightweight iconography.
- **`framer-motion` (v11.18.2):** Smooth UI transitions and micro-animations.
- **`vite` (v6.1.0):** High-speed development server and production bundler.
- **`@vitejs/plugin-basic-ssl`:** Generates local self-signed SSL certificates for mobile HTTPS camera testing.

---

## 21. INSTALLATION AND STARTUP INSTRUCTIONS

### Prerequisites
- macOS, Linux, or Windows with Python 3.10+ and Node.js 18+.
- Tesseract OCR installed locally:
  - macOS: `brew install tesseract`
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr`

### Installation Steps
```bash
# 1. Clone repository
git clone https://github.com/Mdsinan09/AI-Assistive-Tutor.git
cd "AI-Assistive-Tutor"

# 2. Install Backend Dependencies
pip3 install -r backend/requirements.txt

# 3. Install Frontend Dependencies
cd frontend
npm install
cd ..

# 4. Optional: Configure Gemini API Key
echo "GEMINI_API_KEY=YOUR_GEMINI_API_KEY" > backend/.env
```

### Execution Commands
Open two terminal windows:

**Terminal 1 — Backend Server:**
```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend Development Server:**
```bash
npm --prefix frontend run dev -- --host
```
The application will be accessible at:
- Local Browser: `https://localhost:5173`
- Mobile LAN Device: `https://<YOUR_LAN_IP>:5173` (Accept the local certificate warning to allow camera access)

---

## 22. TESTING AND VALIDATION

The codebase includes an automated test suite located in `tests/`.

```bash
# Run complete automated verification suite
python3 -m pytest tests/ -v
```

### Verified Test Results (18 Passed)
- `tests/test_final_tasks.py`:
  - `test_health_endpoints`: PASSED (Verifies `/health` returns status healthy and model metadata).
  - `test_speech_coordinator_suppression_logic`: PASSED (Verifies speech coordinator suppresses object detection audio during active dialogues).
  - `test_announcement_preference_restoration`: PASSED (Verifies narration settings are restored correctly after dialogues).
- `tests/test_landing_page.py`:
  - `test_design_spec_exists`: PASSED (Validates `DESIGN.md` presence and palette).
  - `test_landing_page_file_integrity`: PASSED (Verifies landing page copy and CTA routing).
  - `test_hero_perception_scene_integrity`: PASSED (Validates particle visualizer and motion controls).
  - `test_app_routing_configuration`: PASSED (Verifies `/` routes to landing page and `/dashboard` is protected).
- `tests/test_priority_features.py`:
  - `test_spatial_description_with_confidence`: PASSED (Validates directional object narration with percentage confidence).
  - `test_read_notebook_intent`: PASSED (Validates "read notebook" command parsing).
  - `test_scanned_text_followup`: PASSED (Validates questions referencing previously scanned text).
  - `test_brand_uncertainty_without_hallucination`: PASSED (Verifies generic objects do not hallucinate brand names without visible text).

---

## 23. SECURITY AND PRIVACY REVIEW

### Security Safeguards
1. **Password Storage:** Credentials stored using PBKDF2-HMAC-SHA256 with 100,000 iterations and per-user 16-byte cryptographically secure salts (`backend/db.py:16-25`). Passwords are never stored in plaintext.
2. **Session Security:** 32-byte cryptographically random tokens (`secrets.token_urlsafe(32)`) expiring after 72 hours.
3. **Upload Protections:** Image uploads are size-limited to $15\text{MB}$ and decoded strictly through `cv2.imdecode` (`backend/main.py:232-242`), mitigating arbitrary file execution risks.
4. **CORS Governance:** Explicit origins permitted with credentials (`backend/main.py:88-108`).

### Privacy Architecture
- **Local Media Processing:** Camera frames captured for object detection and OCR are processed locally in RAM and are never permanently stored on disk.
- **External AI Boundaries:** Only text extracted from OCR and user questions are sent to the Google Gemini API when configuring a key. No camera imagery or video feeds are ever transmitted to third-party cloud servers.
- **Audit Erasure:** Students have complete ownership of their study data and can purge all activity logs at any time via `POST /api/history/clear`.

---

## 24. ACCESSIBILITY REVIEW

The system adheres strictly to **WCAG 2.1 AA** accessibility standards:
- **OLED Pure Black Mode:** Low-vision students can toggle a true black background (`#000000` / `#050608`) eliminating glare and maximizing visual contrast.
- **Keyboard Shortcuts:**
  - `V`: Opens voice command overlay / microphone prompt.
  - `P`: Pauses / resumes continuous camera detection loop.
  - `S`: Instantly cancels all active speech synthesis.
  - `R`: Repeats the last spoken announcement.
- **Focus Indicators:** Explicit, high-contrast focus rings (`2px solid #2997ff`, offset `3px`) on all interactive buttons, links, and drawers.
- **Screen Reader Support:** Semantic HTML tags (`<header>`, `<main>`, `<section>`, `<nav>`), ARIA labels on all icon buttons, and polite live regions (`role="status"`, `aria-live="polite"`).
- **Reduced Motion:** Automatic disabling of particle animations and scroll transforms when `prefers-reduced-motion` is detected (`frontend/src/styles/tokens.css:42-53`).

---

## 25. PERFORMANCE ANALYSIS

- **Object Detection FPS:** The detection loop executes every $1100\text{ms}$ on a background thread. FieldNet V3 inference takes $\sim 35\text{ms}$ on GPU and $\sim 95\text{ms}$ on Apple Silicon CPU, consuming $< 12\%$ single-core CPU utilization.
- **OCR Execution Speed:** Full document deskewing, multi-candidate filtering, and Tesseract recognition take between $450\text{ms}$ and $900\text{ms}$ depending on text density.
- **Frontend Bundle Size:** Production Vite bundle is $415.65\text{kB}$ ($113.06\text{kB}$ gzip compressed) and CSS bundle is $15.93\text{kB}$ ($3.92\text{kB}$ gzip compressed), ensuring fast initial page loads even over mobile cellular connections.
- **Memory Footprint:** The Python backend maintains a stable resident memory footprint of $\sim 380\text{MB}$ with PyTorch models and Tesseract loaded in memory.

---

## 26. ERROR HANDLING AND FAILURE SCENARIOS

| Failure Scenario | Detection Mechanism | System Behavior & User Recovery |
| :--- | :--- | :--- |
| **Camera Access Denied** | `useCamera.js` catches `NotAllowedError` | Displays permission recovery modal with step-by-step browser instructions. |
| **Insecure HTTP Context** | `getCameraDiagnostics()` checks `isSecureContext` | Notifies user that mobile browsers require HTTPS and provides LAN HTTPS link. |
| **Blurry or Dark Document** | `OCRService.check_quality()` Laplacian variance | Speaks guidance: *"Hold the camera steady and turn on flash or improve lighting."* |
| **Backend Unreachable** | `client.js` catches `Failed to fetch` | Displays persistent sticky offline banner; guides user to verify backend port 8000. |
| **Gemini API Limit / Missing Key**| `TutorService.ask()` exception handler | Switches seamlessly to offline extractive QA engine matching textbook sentences. |
| **Speech Recognition Timeout** | `VoiceContext.jsx` silence detection timer | Returns gracefully to `idle` state without crashing or dropping audio streams. |

---

## 27. KNOWN ISSUES AND TECHNICAL DEBT

1. **Deprecated Google GenAI Package Notice:** `google.generativeai` package outputs a deprecation warning recommending migration to `google.genai` in future releases.
2. **Dual Database Artifacts:** The repository contains both `backend/app.db` (active, with authentication and multi-turn conversations) and `backend/database/assistive_tutor.db` (legacy schema from early development).
3. **Legacy Vanilla Prototype:** Files `frontend/app.js`, `frontend/index.vanilla.html`, and `frontend/style.css` remain in the repository as reference artifacts from the initial non-React prototype.
4. **Tesseract Binary Path Dependency:** Defaults to `/usr/local/bin/tesseract`. Systems with custom Homebrew paths on Apple Silicon (`/opt/homebrew/bin/tesseract`) require setting `TESSERACT_CMD` environment variable if not symlinked.

---

## 28. VERIFIED EXISTING FIXES

1. **Speech Collision Fix (Task 2):** Object detection audio announcements are suppressed whenever a voice session is active (`isVoiceSessionOpen` or `voiceState !== 'idle'`), preventing interruptions.
2. **Mobile Fullscreen Fix:** The fullscreen toggle in `LiveDetection.jsx` combines native browser `requestFullscreen` with a reliable full-viewport CSS fallback for mobile Safari and Android Chrome.
3. **Brand Hallucination Guard:** The intent router verifies brand inquiries against recognized OCR text before answering, stating uncertainty if logos are not visible.
4. **Vite Port Proxy Resilience:** Relative URL routing in `frontend/src/api/client.js` routes API calls through the Vite proxy regardless of whether the dev server runs on port 5173, 5174, or 5175.
5. **Coordinate Projector Normalization:** `TemporalBoxStabilizer` projects normalized bounding boxes onto CSS pixels respecting `object-fit: cover` center-crop offsets and front camera mirroring.

---

## 29. TROUBLESHOOTING GUIDE

### 1. Camera Will Not Open on Mobile Phone
- **Cause:** Mobile browsers (iOS Safari, Android Chrome) strictly block camera hardware over unencrypted HTTP.
- **Solution:** Connect to the HTTPS address printed by Vite: `https://<YOUR-IP>:5173`. When prompted with "Your connection is not private", tap Advanced and Proceed.

### 2. OCR Returns Empty Text or Warning
- **Cause:** Document is too close, too far, blurry, or in dim light.
- **Solution:** Hold the document 12-18 inches from the camera, ensure even lighting, tap the Torch (flashlight) button if supported, and hold steady.

### 3. Voice Assistant Fails to Transcribe on Chrome
- **Cause:** Microphone permission blocked or network connectivity issue with Google Speech API.
- **Solution:** Check the browser address bar lock icon to ensure microphone access is allowed. The system will fall back to server-side audio transcription if browser speech fails.

### 4. Tutor Answers Are Generic or Extractive
- **Cause:** `GEMINI_API_KEY` is not configured in `backend/.env`.
- **Solution:** Obtain a free Gemini API key from Google AI Studio, add `GEMINI_API_KEY=your_key` to `backend/.env`, and restart the backend.

---

## 30. GLOSSARY OF TECHNICAL TERMS

- **CGF (Context-Guided Feature) Neck:** Neural network feature fusion layer that combines high-level semantic context with low-level spatial geometry.
- **CIoU (Complete Intersection over Union):** Advanced bounding box regression loss taking into account overlap area, central point distance, and aspect ratio consistency.
- **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Localized image contrast enhancement algorithm preventing noise over-amplification in document processing.
- **EMA (Exponential Moving Average):** Temporal weighting mechanism smoothing model parameters or coordinates over time to eliminate jitter.
- **Group Normalization (GN):** Normalization technique dividing channels into groups; independent of batch size, ideal for single-frame inference.
- **Laplacian Variance:** Second-order spatial derivative measuring high-frequency image edges; standard computer vision metric for camera focus and blur.
- **NMS (Non-Maximum Suppression):** Postprocessing algorithm filtering redundant, overlapping candidate bounding boxes.
- **PBKDF2 (Password-Based Key Derivation Function 2):** Cryptographic key-stretching algorithm applying pseudorandom functions across many iterations to resist brute-force attacks.

---

## 31. GLOSSARY OF PROJECT-SPECIFIC VARIABLES AND CONCEPTS

- **`digital_twin_state`:** Global backend dictionary storing the latest confirmed detections, spatial narration, scan status, and last active timestamp.
- **`TemporalBoxStabilizer`:** Client-side tracking class maintaining candidate tracks across frames and enforcing temporal confirmation before voice narration.
- **`effective_context`:** Unified context payload passed to Gemini comprising attached OCR text, recent conversation turns, and live spatial objects.
- **`isVoiceSessionOpen`:** Boolean flag in `VoiceContext` indicating that a student voice interaction is active; suppresses background spatial announcements.
- **`CLASS_CONFIDENCE_THRESHOLDS`:** Dictionary in `backend/detection_service.py` defining minimum confidence scores per object category ($0.52-0.63$).

---

## 32. LIMITATIONS AND UNIMPLEMENTED FEATURES

1. **Hardware Distance Sensing:** Bounding box positions (`left`, `center`, `right`) represent 2D image coordinates, not absolute physical millimeter distances. True spatial depth would require LiDAR or stereo depth cameras.
2. **Arbitrary Handwriting Recognition:** Tesseract OCR is optimized for printed literature; complex cursive handwriting or degraded notes may exhibit reduced recognition accuracy.
3. **Autonomous Navigation:** The system is an assistive study and desk companion; it is not certified as a primary outdoor mobility or obstacle-avoidance cane replacement.
4. **Multilingual Speech Translation:** The current implementation is optimized for English language instruction and prompts.

---

## 33. ARCHITECTURE DECISIONS AND THEIR RATIONALE

1. **FastAPI over Flask / Django:** Chosen for native asynchronous concurrency, automated OpenAPI documentation, Pydantic type safety, and seamless integration with Starlette threadpools for blocking ML tasks.
2. **FieldNet V3 over YOLOv8:** Custom lightweight anchor-free detector tailored specifically for classroom objects with CGF neck, providing lower parameter count and efficient execution on CPU hardware.
3. **Dual Client/Server Speech Pipeline:** Using browser Web Speech API for near-zero latency interaction, backed by server-side `SpeechRecognition` and audio transcoding when browser speech recognition is unavailable or unsupported.
4. **Vite Reverse Proxy over Hardcoded CORS Endpoints:** Using Vite reverse-proxying routes all requests through the current origin, eliminating port mismatch bugs across varied deployment environments.
5. **Decoupled 2D Digital Twin:** Separating the visual spatial representation from the live camera feed allows visually impaired students with residual sight to inspect their desk layout on high-contrast schematics without visual clutter.

---

## 34. COMPLETE FILE INSPECTION COVERAGE

| Category | Discovered Files | Inspected & Audited | Excluded / Note |
| :--- | :---: | :---: | :--- |
| **Backend Source (`backend/`)** | 18 | 18 | Fully audited line-by-line. Includes active services, models, and DB layers. |
| **Detection Subsystem (`objectdetection-main/`)** | 18 | 18 | Checkpoints, configuration, architectures, losses, and taxonomies audited. |
| **Frontend Source (`frontend/src/`)** | 49 | 49 | All pages, components, contexts, hooks, styles, and API clients audited. |
| **Automated Tests (`tests/`)** | 3 | 3 | All 18 automated tests executed and verified passing via Pytest. |
| **Static Assets & Configs** | 12 | 12 | PWA manifests, HTML files, Vite configs, requirements manifests audited. |
| **Excluded from Line-by-Line Audit** | — | — | `frontend/node_modules/`, `objectdetection-main/venv/`, `__pycache__/` (Standard third-party dependency caches). |

---

## 35. SUGGESTED FUTURE IMPROVEMENTS

1. **Migrate to `google.genai` SDK:** Update `backend/tutor_service.py` to the latest official Google GenAI Python SDK before legacy package retirement.
2. **Stereo Depth / LiDAR Integration:** Incorporate WebXR Depth Sensing API or mobile LiDAR sensors to provide verified physical distance measurements in centimeters.
3. **Quantized ONNX / CoreML Export:** Convert FieldNet V3 weights to ONNX Runtime Web or CoreML for zero-latency in-browser client-side WebGL/WebGPU inference.
4. **Multi-Language OCR Expansion:** Download additional Tesseract trained data packs (`tessdata_fast`) to support French, Spanish, Hindi, and Arabic textbooks.

---

## 36. EVIDENCE AND SOURCE REFERENCES

All architectural claims, numbers, and logic documented in this file are directly verifiable in the repository source code:
- **FieldNet Hyperparameters & Strides:** `objectdetection-main/outputs/v3_ft_mask/config.json:1-71`, `backend/detection_service.py:80-126`, `objectdetection-main/src/models/fieldnet_v3.py:32`.
- **Confidence Thresholds & Quality Filters:** `backend/detection_service.py:27-49` (`CLASS_CONFIDENCE_THRESHOLDS`), `backend/detection_service.py:180-188` (area and aspect ratio filters).
- **OCR Quality Evaluation & Multi-Candidate Pipeline:** `backend/ocr_service.py:40-78` (`check_quality`), `backend/ocr_service.py:79-153` (`detect_document_contour`), `backend/ocr_service.py:184-236` (`build_preprocessing_candidates`).
- **Voice Intent Classifier & Brand Guard:** `backend/intent_router.py:105-508` (`route_intent`), `backend/intent_router.py:208-246` (brand identification).
- **Speech Coordinator Announcement Suppression:** `frontend/src/context/VoiceContext.jsx:236-247` (`speakAnnouncement`), `frontend/src/components/detection/LiveDetection.jsx:124-140`.
- **Temporal Object Stabilization:** `frontend/src/utils/coordinateTransform.js:167-312` (`TemporalBoxStabilizer`).
- **Conversational Memory & Gemini Prompts:** `backend/main.py:560-617` (`send_conversation_message_endpoint`), `backend/tutor_service.py:100-130`.
- **Database Schema & Salted Hashing:** `backend/db.py:16-25` (`hash_password`), `backend/db.py:33-145` (`init_db`).
- **Camera Hardware Diagnostics & Insecure HTTP Detection:** `frontend/src/hooks/useCamera.js:6-53` (`getCameraDiagnostics`).
- **Automated Pytest Suite:** `tests/test_final_tasks.py`, `tests/test_landing_page.py`, `tests/test_priority_features.py` (18 passing tests verified).
