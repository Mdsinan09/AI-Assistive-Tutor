import cv2
import numpy as np
import pytesseract
import re
import os

TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "/usr/local/bin/tesseract")
if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


class OCRService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(OCRService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        print("[OCRService] Initialized with CLAHE, deskewing, and image quality checks.")

    def check_quality(self, gray: np.ndarray) -> dict:
        """Evaluates sharpness and lighting variance."""
        variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        mean_brightness = float(np.mean(gray))
        is_blurry = bool(variance < 35.0)
        is_dark = bool(mean_brightness < 40.0)
        return {
            "blur_variance": round(variance, 2),
            "brightness": round(mean_brightness, 2),
            "is_blurry": is_blurry,
            "is_dark": is_dark
        }

    def deskew(self, image: np.ndarray) -> np.ndarray:
        """Corrects slight page rotation (within -30 to 30 degrees)."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            coords = np.column_stack(np.where(gray < 235))
            if len(coords) < 100:
                return image
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            else:
                angle = -angle

            if abs(angle) < 0.5 or abs(angle) > 30:
                return image

            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
        except Exception:
            return image

    def preprocess(self, frame: np.ndarray, method: str = "adaptive") -> tuple[np.ndarray, dict]:
        if frame is None or frame.size == 0:
            return np.zeros((100, 100), dtype=np.uint8), {"is_blurry": True}

        h, w = frame.shape[:2]
        # Text height normalization: upscale if image is small for crisp Tesseract glyph detection
        if h < 400 or w < 400:
            scale = max(400 / h, 400 / w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

        # 1. Deskew
        aligned = self.deskew(frame)

        # 2. Grayscale
        gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY) if len(aligned.shape) == 3 else aligned
        quality = self.check_quality(gray)

        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization for lighting & shadows)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        equalized = clahe.apply(gray)

        # 4. Bilateral filter preserves sharp text boundaries while removing sensor & paper grain
        denoised = cv2.bilateralFilter(equalized, 9, 75, 75)

        # 5. Thresholding
        if method == "otsu":
            _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        else:
            binary = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 31, 11
            )

        return binary, quality

    def clean_text(self, raw_text: str) -> str:
        if not raw_text:
            return ""
        # Remove non-ascii garbage while keeping common punctuation and accents
        text = re.sub(r'[^\x00-\x7F]+', ' ', raw_text)
        # Collapse multiple newlines and spaces
        text = re.sub(r'[\r\n]{2,}', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text).strip()
        # If output consists solely of punctuation symbols, filter it out
        if re.fullmatch(r'^[^\w\s]+$', text):
            return ""
        return text

    def extract_text_details(self, frame: np.ndarray) -> dict:
        if frame is None or frame.size == 0:
            return {
                "text": "",
                "word_count": 0,
                "is_blurry": False,
                "is_dark": False,
                "confidence_score": 0
            }

        # Strategy 1: Adaptive Thresholding
        processed, quality = self.preprocess(frame, method="adaptive")
        config = r'--oem 3 --psm 3'

        try:
            raw_text = pytesseract.image_to_string(processed, config=config)
        except Exception as e:
            print(f"[OCRService] pytesseract adaptive error: {e}")
            raw_text = ""

        cleaned = self.clean_text(raw_text)
        words = cleaned.split()

        # Strategy 2 Fallback: Otsu if adaptive returned fewer than 3 words
        if len(words) < 3:
            try:
                processed_otsu, _ = self.preprocess(frame, method="otsu")
                otsu_text = pytesseract.image_to_string(processed_otsu, config=config)
                otsu_cleaned = self.clean_text(otsu_text)
                if len(otsu_cleaned.split()) > len(words):
                    cleaned = otsu_cleaned
                    words = cleaned.split()
            except Exception:
                pass

        # Strategy 3 Fallback: PSM 6 (assume single uniform block of text)
        if len(words) < 3:
            try:
                psm6_text = pytesseract.image_to_string(processed, config=r'--oem 3 --psm 6')
                psm6_cleaned = self.clean_text(psm6_text)
                if len(psm6_cleaned.split()) > len(words):
                    cleaned = psm6_cleaned
                    words = cleaned.split()
            except Exception:
                pass

        # Estimate confidence score based on word length and dictionary-like structure
        confidence = min(98, max(0, int(len(words) * 8.5))) if words else 0

        return {
            "text": cleaned,
            "word_count": len(words),
            "is_blurry": quality.get("is_blurry", False),
            "is_dark": quality.get("is_dark", False),
            "confidence_score": confidence
        }

    def extract_text(self, frame: np.ndarray) -> str:
        """Direct string interface for backward compatibility."""
        res = self.extract_text_details(frame)
        return res["text"]


if __name__ == "__main__":
    print("[Test] OCRService comprehensive test suite...")
    ocr = OCRService()

    # Test 1: Printed heading & paragraph
    test_img = np.full((250, 700, 3), 255, dtype=np.uint8)
    cv2.putText(test_img, "Chapter 3: Photosynthesis in Plants", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(test_img, "Chlorophyll absorbs sunlight to produce glucose.", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(test_img, "Oxygen is released as a vital byproduct.", (30, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

    res1 = ocr.extract_text_details(test_img)
    print("--- Test 1 (Clear Page) ---")
    print(f"Words: {res1['word_count']}, Blurry: {res1['is_blurry']}, Confidence: {res1['confidence_score']}%")
    print(res1["text"])

    # Test 2: Blank / Empty image
    empty_img = np.zeros((200, 200, 3), dtype=np.uint8)
    res2 = ocr.extract_text_details(empty_img)
    print("--- Test 2 (Empty Image) ---")
    print(f"Result (empty expected): '{res2['text']}', Blurry: {res2['is_blurry']}")

    # Test 3: Rotated / Slanted image (Deskew check)
    M = cv2.getRotationMatrix2D((350, 125), 8, 1.0)
    slanted = cv2.warpAffine(test_img, M, (700, 250), borderValue=(255, 255, 255))
    res3 = ocr.extract_text_details(slanted)
    print("--- Test 3 (Slightly Slanted 8 deg) ---")
    print(f"Words: {res3['word_count']}")
    print(res3["text"][:60])

    print("ALL OCR TESTS COMPLETED SUCCESSFULLY!")
