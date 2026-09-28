import cv2
import numpy as np
import pytesseract
import re
from backend.config import TESSERACT_CMD

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

class OCREngine:
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        # 1. Grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 2. Denoise with bilateral filter (preserves text edges)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # 3. Adaptive thresholding (handles uneven lighting across page)
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 31, 11
        )
        return binary

    def extract_text(self, image: np.ndarray) -> dict:
        processed = self.preprocess_image(image)
        
        # PSM 3: Fully automatic page segmentation mode
        custom_config = r'--oem 3 --psm 3'
        try:
            raw_text = pytesseract.image_to_string(processed, config=custom_config)
        except Exception as e:
            print(f"[OCR] pytesseract error: {e}")
            raw_text = ""
        
        # Clean text: remove excessive whitespace and isolated weird symbols
        cleaned = re.sub(r'\n+', '\n', raw_text)
        cleaned = re.sub(r'[ \t]+', ' ', cleaned).strip()
        
        # Word count and summary
        words = cleaned.split()
        summary = cleaned if len(words) < 60 else " ".join(words[:60]) + "..."
        
        return {
            "raw_text": raw_text,
            "cleaned_text": cleaned,
            "word_count": len(words),
            "summary": summary
        }
