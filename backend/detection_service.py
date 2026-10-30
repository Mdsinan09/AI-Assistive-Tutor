import os
import sys
from pathlib import Path
import cv2
import numpy as np
import torch

# Dynamically link objectdetection-main/src
CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent
OD_SRC = REPO_ROOT / "objectdetection-main" / "src"
sys.path.insert(0, str(OD_SRC))

try:
    from models.fieldnet_v3 import FieldNetV3
    from postprocess.decode_v3 import decode_batch, DecodeConfig
    from data.taxonomy import canonical_classes
except ImportError as err:
    raise ImportError(
        f"Failed to import FieldNet from {OD_SRC}. Ensure objectdetection-main exists."
    ) from err

CKPT_PATH = REPO_ROOT / "objectdetection-main" / "outputs" / "v3_ft_mask" / "best_ema.pt"


# Configurable Minimum Detection Confidence Thresholds (Sections 5.1 & 5.2)
DEFAULT_MIN_CONFIDENCE = 0.56

CLASS_CONFIDENCE_THRESHOLDS = {
    "person": 0.42,
    "laptop": 0.54,
    "book_notebook": 0.54,
    "book": 0.54,
    "notebook": 0.54,
    "mobile_phone": 0.58,
    "phone": 0.58,
    "bottle": 0.63,
    "water_bottle": 0.63,
    "chair": 0.54,
    "cup": 0.60,
    "mug": 0.60,
    "backpack": 0.56,
    "bag": 0.56,
    "keyboard": 0.55,
    "mouse": 0.58,
    "clock": 0.58,
    "pen": 0.60,
    "pencil": 0.60,
}


def compute_box_iou(boxA: list[int], boxB: list[int]) -> float:
    """Computes Intersection over Union between two [x1, y1, x2, y2] boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    inter_w = max(0, xB - xA)
    inter_h = max(0, yB - yA)
    inter_area = inter_w * inter_h
    if inter_area <= 0:
        return 0.0

    areaA = max(0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    areaB = max(0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))
    union = areaA + areaB - inter_area
    return float(inter_area) / float(union) if union > 0 else 0.0


class DetectionService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DetectionService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, checkpoint_path=str(CKPT_PATH), conf_thresh=DEFAULT_MIN_CONFIDENCE):
        if self._initialized:
            return
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.class_names = canonical_classes(merge=True)
        self.num_classes = len(self.class_names)
        self.image_size = 416
        self.channels = 128
        self.backbone = "resnet34"
        self.conf_thresh = conf_thresh

        print(f"[DetectionService] Loading FieldNet V3 on {self.device}...")
        if not os.path.isfile(checkpoint_path):
            raise FileNotFoundError(
                f"[DetectionService] Checkpoint missing at: {checkpoint_path}\n"
                "Please download best_ema.pt and place it in outputs/v3_ft_mask/"
            )

        self.model = FieldNetV3(
            num_classes=self.num_classes,
            channels=self.channels,
            backbone=self.backbone,
            pretrained=False,
        )
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        state_dict = (
            checkpoint.get("ema_state_dict")
            or checkpoint.get("model_state_dict")
            or checkpoint.get("state_dict")
            or checkpoint
        )
        self.model.load_state_dict(state_dict, strict=False)
        self.model.to(self.device)
        self.model.eval()

        # Set decode threshold slightly permissive so class-specific filters can make final decision
        self.decode_cfg = DecodeConfig(
            mode="peak",
            peak_kernel=3,
            score_thresh=0.30,
            nms_iou=0.60,
            max_detections=60,
            image_size=self.image_size,
        )
        self._initialized = True
        print("[DetectionService] Initialized and ready with robust false-positive filtering.")

    def preprocess(self, frame_bgr: np.ndarray):
        h, w = frame_bgr.shape[:2]
        scale = min(self.image_size / h, self.image_size / w)
        nh, nw = int(round(h * scale)), int(round(w * scale))
        resized = cv2.resize(frame_bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
        canvas = np.full((self.image_size, self.image_size, 3), 114, dtype=np.uint8)
        pad_y = (self.image_size - nh) // 2
        pad_x = (self.image_size - nw) // 2
        canvas[pad_y : pad_y + nh, pad_x : pad_x + nw] = resized

        rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (rgb - mean) / std

        tensor = torch.from_numpy(normalized).permute(2, 0, 1).unsqueeze(0).to(self.device)
        return tensor, scale, pad_x, pad_y

    def detect(self, frame_bgr: np.ndarray) -> dict:
        h_orig, w_orig = frame_bgr.shape[:2]
        frame_area = max(1, h_orig * w_orig)
        tensor, scale, pad_x, pad_y = self.preprocess(frame_bgr)

        with torch.no_grad():
            outputs = self.model(tensor)
            decoded = decode_batch(outputs, self.decode_cfg)

        raw_candidates = []
        if decoded and len(decoded) > 0:
            boxes = decoded[0].get("boxes", [])
            scores = decoded[0].get("scores", [])
            labels = decoded[0].get("labels", [])

            for box, score, label in zip(boxes, scores, labels):
                s = float(score)
                cls_id = int(label)
                cls_name = self.class_names[cls_id] if cls_id < len(self.class_names) else f"class_{cls_id}"

                # 5.1 & 5.2: Class-specific confidence filtering
                required_conf = CLASS_CONFIDENCE_THRESHOLDS.get(cls_name, self.conf_thresh)
                if s < required_conf:
                    continue

                x1 = max(0, int((float(box[0]) - pad_x) / scale))
                y1 = max(0, int((float(box[1]) - pad_y) / scale))
                x2 = min(w_orig, int((float(box[2]) - pad_x) / scale))
                y2 = min(h_orig, int((float(box[3]) - pad_y) / scale))

                bw = x2 - x1
                bh = y2 - y1
                box_area = bw * bh

                # 5.6: Minimum box quality & edge artifact rejection
                if bw < 14 or bh < 14:
                    continue
                # Reject boxes smaller than 0.18% of the frame (dust/noise artifacts)
                if box_area < 0.0018 * frame_area:
                    continue
                # Reject unreasonable aspect ratios (extreme slivers)
                aspect_ratio = float(bw) / float(max(1, bh))
                if aspect_ratio < 0.12 or aspect_ratio > 7.5:
                    continue

                raw_candidates.append({
                    "label": cls_name,
                    "confidence": s,
                    "box": [x1, y1, x2, y2],
                    "area": box_area,
                })

        # 5.5: Non-Maximum Suppression (NMS) to eliminate duplicate overlapping boxes
        raw_candidates.sort(key=lambda d: d["confidence"], reverse=True)
        suppressed_flags = [False] * len(raw_candidates)
        filtered_candidates = []

        for i in range(len(raw_candidates)):
            if suppressed_flags[i]:
                continue
            candA = raw_candidates[i]
            filtered_candidates.append(candA)

            for j in range(i + 1, len(raw_candidates)):
                if suppressed_flags[j]:
                    continue
                candB = raw_candidates[j]
                iou = compute_box_iou(candA["box"], candB["box"])

                # Same class overlap suppression
                if candA["label"] == candB["label"]:
                    # Person bounding boxes naturally overlap when people stand or sit near each other
                    same_class_thresh = 0.58 if candA["label"] == "person" else 0.45
                    if iou > same_class_thresh:
                        suppressed_flags[j] = True
                # Severe general overlap across different classes (e.g. nested duplicate boxes)
                # Keep threshold high (0.85) so people sitting on chairs or holding items are not suppressed
                elif iou > 0.85:
                    suppressed_flags[j] = True

        # Construct final detection structures with normalized coordinates & spatial positioning
        detections = []
        for idx, item in enumerate(filtered_candidates):
            x1, y1, x2, y2 = item["box"]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2

            # Spatial positioning relative to student / observer
            if cx < w_orig * 0.35:
                pos = "left"
            elif cx > w_orig * 0.65:
                pos = "right"
            else:
                pos = "center"

            norm_x1 = max(0.0, min(1.0, float(x1) / w_orig)) if w_orig > 0 else 0.0
            norm_y1 = max(0.0, min(1.0, float(y1) / h_orig)) if h_orig > 0 else 0.0
            norm_x2 = max(0.0, min(1.0, float(x2) / w_orig)) if w_orig > 0 else 0.0
            norm_y2 = max(0.0, min(1.0, float(y2) / h_orig)) if h_orig > 0 else 0.0
            norm_cx = (norm_x1 + norm_x2) / 2
            norm_cy = (norm_y1 + norm_y2) / 2

            detections.append({
                "id": f"det-{idx+1}",
                "label": item["label"],
                "confidence": round(item["confidence"], 2),
                "box": [x1, y1, x2, y2],
                "normalized_box": [round(norm_x1, 4), round(norm_y1, 4), round(norm_x2, 4), round(norm_y2, 4)],
                "center": [round(norm_cx, 4), round(norm_cy, 4)],
                "position": pos,
                "confirmed": True,
            })

        narration = self.generate_spatial_narration(detections)
        return {
            "detections": detections,
            "count": len(detections),
            "spatial_narration": narration,
            "image_width": w_orig,
            "image_height": h_orig,
        }

    def generate_spatial_narration(self, detections: list) -> str:
        if not detections:
            return "No obstacles or classroom study objects detected in front of you."

        def format_items(labels: list[str]) -> str:
            from collections import Counter
            counts = Counter(labels)
            parts = []
            for item, count in counts.items():
                if count == 1:
                    article = "an" if item[0].lower() in "aeiou" else "a"
                    parts.append(f"{article} {item}")
                elif item == "person":
                    num_word = {2: "two", 3: "three", 4: "four", 5: "five"}.get(count, str(count))
                    parts.append(f"{num_word} people")
                else:
                    parts.append(f"{count} {item}s")
            if not parts:
                return ""
            if len(parts) == 1:
                return parts[0]
            return ", ".join(parts[:-1]) + " and " + parts[-1]

        left = [d["label"].replace("_", " ") for d in detections if d["position"] == "left"]
        center = [d["label"].replace("_", " ") for d in detections if d["position"] == "center"]
        right = [d["label"].replace("_", " ") for d in detections if d["position"] == "right"]

        phrases = []
        if center:
            phrases.append(f"In front of you: {format_items(center)}")
        if left:
            phrases.append(f"To your left: {format_items(left)}")
        if right:
            phrases.append(f"To your right: {format_items(right)}")

        return ". ".join(phrases) + "."


if __name__ == "__main__":
    print("[Test] Initializing DetectionService and capturing frame...")
    detector = DetectionService()
    try:
        cap = cv2.VideoCapture(0)
        ret, frame = cap.read()
        cap.release()
    except Exception:
        ret, frame = False, None

    if not ret or frame is None:
        print("[Warning] Could not capture from webcam. Generating synthetic test frame...")
        frame = np.zeros((480, 640, 3), dtype=np.uint8)

    results = detector.detect(frame)
    print(f"Found {results['count']} objects:")
    for obj in results["detections"]:
        print(f"  {obj['label']:<15} conf={obj['confidence']:.2f}  pos={obj['position']:<6}  bbox={obj['box']}")
    print(f"\nNarration: {results['spatial_narration']}")
