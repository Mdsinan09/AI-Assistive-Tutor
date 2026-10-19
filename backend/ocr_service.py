import os
import re
import cv2
import numpy as np
import pytesseract

TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "/usr/local/bin/tesseract")
if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def order_points(pts: np.ndarray) -> np.ndarray:
    """Orders 4 points as: [top-left, top-right, bottom-right, bottom-left]."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


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
        print("[OCRService] Initialized with document boundary detection, perspective deskew, and word-level filtering.")

    def check_quality(self, gray: np.ndarray) -> dict:
        """Evaluates sharpness, lighting, contrast, and provides user guidance."""
        variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        mean_brightness = float(np.mean(gray))
        contrast = float(np.std(gray))

        is_blurry = bool(variance < 38.0)
        is_dark = bool(mean_brightness < 45.0)
        is_low_contrast = bool(contrast < 30.0)

        guidance = []
        if is_blurry:
            guidance.append("Hold steady")
        if is_dark:
            guidance.append("More light / turn on flash")
        if is_low_contrast:
            guidance.append("Move closer to the text")

        quality_warning = None
        if is_blurry and is_dark:
            quality_warning = "Page is dark and blurry. Hold steady and improve lighting."
        elif is_blurry:
            quality_warning = "Hold the camera steady and move closer to the page."
        elif is_dark:
            quality_warning = "Lighting is dim. Turn on flashlight or improve lighting."
        elif is_low_contrast:
            quality_warning = "Move closer to ensure text is clear."

        return {
            "blur_variance": round(variance, 2),
            "brightness": round(mean_brightness, 2),
            "contrast": round(contrast, 2),
            "is_blurry": is_blurry,
            "is_dark": is_dark,
            "is_low_contrast": is_low_contrast,
            "warning": quality_warning,
            "guidance": " • ".join(guidance) if guidance else "Good quality",
        }

    def detect_document_contour(self, frame: np.ndarray) -> tuple[np.ndarray, bool, list | None]:
        """
        P2.1 Document Detection:
        Locates the textbook or paper page quadrilateral boundary and applies
        four-point perspective transform to deskew and flatten the page.
        Falls back to original frame if no confident quad is detected.
        """
        try:
            h, w = frame.shape[:2]
            scale = 800.0 / max(h, w)
            small_w = int(w * scale)
            small_h = int(h * scale)
            resized = cv2.resize(frame, (small_w, small_h), interpolation=cv2.INTER_AREA)

            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            edges = cv2.Canny(blurred, 35, 130)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

            contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            min_area = (small_w * small_h) * 0.10  # Detect documents occupying >= 10% of frame

            best_quad = None
            max_area = 0

            for c in contours:
                area = cv2.contourArea(c)
                if area < min_area:
                    continue
                peri = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.025 * peri, True)
                if len(approx) == 4 and cv2.isContourConvex(approx):
                    if area > max_area:
                        max_area = area
                        best_quad = approx

            if best_quad is None:
                return frame, False, None

            pts = best_quad.reshape(4, 2).astype("float32") / scale
            doc_nx1 = max(0.0, min(1.0, float(np.min(pts[:, 0])) / w))
            doc_ny1 = max(0.0, min(1.0, float(np.min(pts[:, 1])) / h))
            doc_nx2 = max(0.0, min(1.0, float(np.max(pts[:, 0])) / w))
            doc_ny2 = max(0.0, min(1.0, float(np.max(pts[:, 1])) / h))
            doc_bbox = [round(doc_nx1, 4), round(doc_ny1, 4), round(doc_nx2, 4), round(doc_ny2, 4)]

            rect = order_points(pts)
            (tl, tr, br, bl) = rect

            width_a = np.linalg.norm(br - bl)
            width_b = np.linalg.norm(tr - tl)
            max_width = max(int(width_a), int(width_b))

            height_a = np.linalg.norm(tr - br)
            height_b = np.linalg.norm(tl - bl)
            max_height = max(int(height_a), int(height_b))

            if max_width < 120 or max_height < 120:
                return frame, False, None

            dst = np.array([
                [0, 0],
                [max_width - 1, 0],
                [max_width - 1, max_height - 1],
                [0, max_height - 1]
            ], dtype="float32")

            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(frame, M, (max_width, max_height), flags=cv2.INTER_CUBIC)
            return warped, True, doc_bbox
        except Exception as e:
            print(f"[OCRService] Document contour warp exception: {e}")
            return frame, False, None

    def deskew_affine(self, image: np.ndarray) -> np.ndarray:
        """Corrects minor page slant/tilt when perspective quad is not active."""
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

            if abs(angle) < 0.6 or abs(angle) > 28:
                return image

            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            return cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
        except Exception:
            return image

    def build_preprocessing_candidates(self, frame: np.ndarray) -> list[tuple[str, np.ndarray]]:
        """
        Multi-candidate preprocessing pipeline for diverse mobile lighting and distances:
        Candidate 1: Normalized high-contrast grayscale with CLAHE + unsharp mask
        Candidate 2: Otsu binarization with bilateral noise suppression
        Candidate 3: Background division / shadow normalization (handles hand/camera shadows)
        Candidate 4: 2x Upscaling + Sharpening (vital for distant textbook text / small mobile fonts)
        Candidate 5: Morphological background subtraction + adaptive thresholding
        """
        h, w = frame.shape[:2]
        if h < 400 or w < 400:
            scale = max(400 / h, 400 / w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
            h, w = frame.shape[:2]

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame

        # Candidate 1: CLAHE + Unsharp Masking (Baseline)
        clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
        eq = clahe.apply(gray)
        blurred1 = cv2.GaussianBlur(eq, (0, 0), 3)
        sharpened = cv2.addWeighted(eq, 1.45, blurred1, -0.45, 0)

        # Candidate 2: Bilateral Denoise + Otsu
        denoised = cv2.bilateralFilter(gray, 7, 50, 50)
        _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Candidate 3: Shadow / Illumination Normalization (division by blurred background)
        bg_blur = cv2.GaussianBlur(gray, (51, 51), 0)
        norm_div = cv2.divide(gray, bg_blur, scale=255)
        norm_div_eq = clahe.apply(norm_div)

        # Candidate 4: 2x Upscaling + Sharpening for small / distant fonts
        up_w = min(2400, int(w * 1.8))
        up_h = min(2400, int(h * 1.8))
        upscaled_gray = cv2.resize(eq, (up_w, up_h), interpolation=cv2.INTER_CUBIC)
        up_blur = cv2.GaussianBlur(upscaled_gray, (0, 0), 2)
        up_sharp = cv2.addWeighted(upscaled_gray, 1.4, up_blur, -0.4, 0)

        # Candidate 5: Morphological background subtraction + adaptive threshold
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        morph_bg = cv2.morphologyEx(gray, cv2.MORPH_DILATE, kernel)
        diff = cv2.absdiff(morph_bg, gray)
        diff_norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)
        _, morph_thresh = cv2.threshold(diff_norm, 35, 255, cv2.THRESH_BINARY)

        return [
            ("clahe_sharpened", sharpened),
            ("shadow_normalized", norm_div_eq),
            ("upscaled_sharp", up_sharp),
            ("otsu_binary", otsu),
            ("morph_adaptive", morph_thresh),
        ]

    def extract_words_and_reconstruct(
        self, image: np.ndarray, config: str = "--oem 3 --psm 3"
    ) -> dict:
        """
        Extracts words with spatial bounding boxes and sorts lines in true top-down,
        left-to-right reading order with vertical grouping tolerance.
        """
        try:
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config=config)
        except Exception as e:
            print(f"[OCRService] image_to_data error with {config}: {e}")
            return {
                "text": "",
                "words": [],
                "lines": [],
                "paragraphs": [],
                "confidence": 0.0,
            }

        n_boxes = len(data.get("text", []))
        confidences = []
        raw_words = []
        h_img, w_img = image.shape[:2]

        for i in range(n_boxes):
            raw_word = (data["text"][i] or "").strip()
            conf_val = data["conf"][i]
            try:
                conf = float(conf_val)
            except (ValueError, TypeError):
                continue

            # Drop low-confidence noise artifacts
            if conf < 30.0 or not raw_word:
                continue

            # Drop isolated single noise characters (preserve legitimate single-character words 'a', 'I' and digits)
            if len(raw_word) == 1 and not (raw_word.lower() in ("a", "i") or raw_word.isdigit()):
                continue

            # Drop pure punctuation/symbol noise
            if re.fullmatch(r"^[^\w\s]+$", raw_word):
                continue

            confidences.append(conf)
            rx1 = max(0.0, min(1.0, data["left"][i] / w_img))
            ry1 = max(0.0, min(1.0, data["top"][i] / h_img))
            rx2 = max(0.0, min(1.0, (data["left"][i] + data["width"][i]) / w_img))
            ry2 = max(0.0, min(1.0, (data["top"][i] + data["height"][i]) / h_img))
            cy = (ry1 + ry2) / 2.0
            cx = (rx1 + rx2) / 2.0
            h_box = ry2 - ry1

            raw_words.append({
                "text": raw_word,
                "confidence": round(conf / 100.0, 2),
                "bbox": [data["left"][i], data["top"][i], data["width"][i], data["height"][i]],
                "normalized_box": [round(rx1, 4), round(ry1, 4), round(rx2, 4), round(ry2, 4)],
                "cx": cx,
                "cy": cy,
                "h_box": h_box,
            })

        if not raw_words:
            return {
                "text": "",
                "words": [],
                "lines": [],
                "paragraphs": [],
                "confidence": 0.0,
            }

        # Reconstruct reading order: Group words vertically into lines by Y-coordinate
        # Sort words primarily by vertical position
        sorted_by_y = sorted(raw_words, key=lambda w: w["cy"])
        avg_line_h = max(0.015, np.median([w["h_box"] for w in raw_words]))
        line_tolerance = avg_line_h * 0.65

        lines = []
        current_line = []
        current_y = None

        for w in sorted_by_y:
            if current_y is None:
                current_line = [w]
                current_y = w["cy"]
            elif abs(w["cy"] - current_y) < line_tolerance:
                current_line.append(w)
                current_y = np.mean([item["cy"] for item in current_line])
            else:
                lines.append(current_line)
                current_line = [w]
                current_y = w["cy"]
        if current_line:
            lines.append(current_line)

        # Within each line, sort words horizontally from left to right
        ordered_words = []
        lines_list = []
        paragraphs_map = {}
        line_idx = 0
        p_idx = 0

        prev_line_y = None
        paragraph_y_gap = avg_line_h * 2.2

        for line in lines:
            line_sorted = sorted(line, key=lambda w: w["cx"])
            line_str = " ".join([w["text"] for w in line_sorted])
            line_conf = sum([w["confidence"] for w in line_sorted]) / len(line_sorted)
            line_nx1 = min([w["normalized_box"][0] for w in line_sorted])
            line_ny1 = min([w["normalized_box"][1] for w in line_sorted])
            line_nx2 = max([w["normalized_box"][2] for w in line_sorted])
            line_ny2 = max([w["normalized_box"][3] for w in line_sorted])

            line_cy = (line_ny1 + line_ny2) / 2.0
            if prev_line_y is not None and (line_cy - prev_line_y) > paragraph_y_gap:
                p_idx += 1
            prev_line_y = line_cy

            p_id = f"p-{p_idx}"
            l_id = f"l-{line_idx}"

            for w in line_sorted:
                w["line_id"] = l_id
                w["paragraph_id"] = p_id
                del w["cx"]
                del w["cy"]
                del w["h_box"]
                ordered_words.append(w)

            line_obj = {
                "line_id": l_id,
                "paragraph_id": p_id,
                "text": line_str,
                "confidence": round(line_conf, 2),
                "normalized_box": [round(line_nx1, 4), round(line_ny1, 4), round(line_nx2, 4), round(line_ny2, 4)],
            }
            lines_list.append(line_obj)

            if p_id not in paragraphs_map:
                paragraphs_map[p_id] = []
            paragraphs_map[p_id].append(line_obj)
            line_idx += 1

        paragraphs_list = []
        paragraph_texts = []

        for p_id, p_lines in paragraphs_map.items():
            p_text = " ".join([l["text"] for l in p_lines])
            p_nx1 = min([l["normalized_box"][0] for l in p_lines])
            p_ny1 = min([l["normalized_box"][1] for l in p_lines])
            p_nx2 = max([l["normalized_box"][2] for l in p_lines])
            p_ny2 = max([l["normalized_box"][3] for l in p_lines])

            paragraphs_list.append({
                "paragraph_id": p_id,
                "text": p_text,
                "normalized_box": [round(p_nx1, 4), round(p_ny1, 4), round(p_nx2, 4), round(p_ny2, 4)],
            })
            paragraph_texts.append(p_text)

        full_text = "\n\n".join(paragraph_texts).strip()
        avg_conf = round(sum(confidences) / len(confidences), 1) if confidences else 0.0

        return {
            "text": full_text,
            "words": ordered_words,
            "lines": lines_list,
            "paragraphs": paragraphs_list,
            "confidence": avg_conf,
        }

    def extract_text_details(self, frame: np.ndarray) -> dict:
        """
        P2 Document OCR Pipeline with spatial extraction for Google Lens-style interaction.
        """
        if frame is None or frame.size == 0:
            return {
                "text": "",
                "confidence": 0.0,
                "confidence_score": 0,
                "word_count": 0,
                "words": [],
                "lines": [],
                "paragraphs": [],
                "document_detected": False,
                "document_bbox": None,
                "text_regions": [],
                "quality": {
                    "is_blurry": False,
                    "is_dark": False,
                    "score": 0.0,
                    "warning": "No image frame received.",
                },
                "quality_warning": "No image frame received.",
            }

        # 1. Document Detection + Perspective Rectification
        rectified_frame, doc_detected, doc_bbox = self.detect_document_contour(frame)

        # 2. Deskew affine fallback
        if not doc_detected:
            rectified_frame = self.deskew_affine(rectified_frame)

        # 3. Quality Analysis
        gray = cv2.cvtColor(rectified_frame, cv2.COLOR_BGR2GRAY) if len(rectified_frame.shape) == 3 else rectified_frame
        quality = self.check_quality(gray)

        # 4. Generate candidate preprocessed images
        candidates = self.build_preprocessing_candidates(rectified_frame)

        best_res = None
        best_words_count = 0

        # Run OCR with block-oriented PSM 3, then fall back to uniform block PSM 6
        for name, img_cand in candidates:
            res = self.extract_words_and_reconstruct(img_cand, config="--oem 3 --psm 3")
            w_count = len(res["words"])
            if w_count > best_words_count:
                best_res = res
                best_words_count = w_count
                if w_count >= 15 and res["confidence"] > 70.0:
                    break

        # Fallback to PSM 6 (uniform block) if extraction was sparse
        if best_words_count < 5:
            for name, img_cand in candidates[:2]:
                res = self.extract_words_and_reconstruct(img_cand, config="--oem 3 --psm 6")
                w_count = len(res["words"])
                if w_count > best_words_count:
                    best_res = res
                    best_words_count = w_count

        if not best_res or best_words_count < 3:
            return {
                "text": "",
                "confidence": 0.0,
                "confidence_score": 0,
                "word_count": 0,
                "words": [],
                "lines": [],
                "paragraphs": [],
                "document_detected": doc_detected,
                "document_bbox": doc_bbox,
                "text_regions": [],
                "quality": {
                    "is_blurry": quality["is_blurry"],
                    "is_dark": quality["is_dark"],
                    "score": 0.0,
                    "warning": quality["warning"] or "I couldn't read the page clearly. Please move closer or improve lighting.",
                },
                "quality_warning": quality["warning"] or "I couldn't read the page clearly. Please move closer or improve lighting.",
            }

        quality_score = round(best_res["confidence"] / 100.0, 2)
        return {
            "text": best_res["text"],
            "confidence": quality_score,
            "confidence_score": round(best_res["confidence"]),
            "word_count": len(best_res["words"]),
            "words": best_res["words"],
            "lines": best_res["lines"],
            "paragraphs": best_res["paragraphs"],
            "document_detected": doc_detected,
            "document_bbox": doc_bbox,
            "text_regions": best_res["words"],
            "quality": {
                "is_blurry": quality["is_blurry"],
                "is_dark": quality["is_dark"],
                "is_low_contrast": quality.get("is_low_contrast", False),
                "score": quality_score,
                "warning": quality["warning"],
                "guidance": quality.get("guidance", "Good quality"),
            },
            "quality_warning": quality["warning"],
            "quality_guidance": quality.get("guidance", "Good quality"),
        }

    def extract_text(self, frame: np.ndarray) -> str:
        res = self.extract_text_details(frame)
        return res["text"]


if __name__ == "__main__":
    print("[Test] OCRService comprehensive test suite...")
    ocr = OCRService()

    # Test 1: Synthetic document page
    test_img = np.full((350, 800, 3), 255, dtype=np.uint8)
    cv2.putText(test_img, "Chapter 4: The Water Cycle and Ecosystems", (40, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (10, 10, 10), 2)
    cv2.putText(test_img, "The water cycle describes how water continuously moves through", (40, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(test_img, "evaporation, condensation, precipitation, and ground collection.", (40, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(test_img, "Solar energy powers evaporation from oceans, lakes, and rivers.", (40, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)

    res1 = ocr.extract_text_details(test_img)
    print("--- Test 1 (High Quality Page) ---")
    print(f"Words: {res1['word_count']}, Conf: {res1['confidence_score']}%, Doc Detected: {res1['document_detected']}")
    print(f"Text:\n{res1['text']}")

    # Test 2: Low-quality empty frame
    empty_img = np.zeros((200, 200, 3), dtype=np.uint8)
    res2 = ocr.extract_text_details(empty_img)
    print("\n--- Test 2 (Empty/Dark Frame) ---")
    print(f"Text: '{res2['text']}', Warning: {res2['quality_warning']}")

    print("\nALL OCR TESTS COMPLETED SUCCESSFULLY!")
