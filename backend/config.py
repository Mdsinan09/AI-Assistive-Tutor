import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DETECTION_REPO_DIR = BASE_DIR / "objectdetection-main"
CHECKPOINT_PATH = DETECTION_REPO_DIR / "outputs" / "v3_ft_mask" / "best_ema.pt"
DATABASE_PATH = BASE_DIR / "backend" / "database" / "assistive_tutor.db"
STATIC_DIR = BASE_DIR / "frontend"

# Model Hyperparameters
FIELDNET_IMAGE_SIZE = 416
FIELDNET_CHANNELS = 128
FIELDNET_BACKBONE = "resnet34"
DETECTION_CONF_THRESHOLD = 0.30
DETECTION_NMS_IOU = 0.60

# OCR Executable Path (Standard on macOS Homebrew)
TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "/usr/local/bin/tesseract")

# AI Tutor Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
