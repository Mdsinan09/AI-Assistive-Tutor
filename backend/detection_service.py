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


class DetectionService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DetectionService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, checkpoint_path=str(CKPT_PATH), conf_thresh=0.30):
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

        self.decode_cfg = DecodeConfig(
            mode="peak",
            peak_kernel=3,
            score_thresh=self.conf_thresh,
            nms_iou=0.60,
            max_detections=50,
            image_size=self.image_size,
        )
        self._initialized = True
        print("[DetectionService] Initialized and ready.")

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
        tensor, scale, pad_x, pad_y = self.preprocess(frame_bgr)

        with torch.no_grad():
            outputs = self.model(tensor)
            decoded = decode_batch(outputs, self.decode_cfg)

        detections = []
        if decoded and len(decoded) > 0:
            boxes = decoded[0].get("boxes", [])
            scores = decoded[0].get("scores", [])
            labels = decoded[0].get("labels", [])

            for box, score, label in zip(boxes, scores, labels):
                s = float(score)
                if s < self.conf_thresh:
                    continue

                x1 = max(0, int((float(box[0]) - pad_x) / scale))
                y1 = max(0, int((float(box[1]) - pad_y) / scale))
                x2 = min(w_orig, int((float(box[2]) - pad_x) / scale))
                y2 = min(h_orig, int((float(box[3]) - pad_y) / scale))
                cls_id = int(label)
                cls_name = self.class_names[cls_id] if cls_id < len(self.class_names) else f"class_{cls_id}"

                # Spatial positioning
                cx = (x1 + x2) / 2
                if cx < w_orig * 0.35:
                    pos = "left"
                elif cx > w_orig * 0.65:
                    pos = "right"
                else:
                    pos = "center"

                detections.append({
                    "label": cls_name,
                    "confidence": round(s, 2),
                    "box": [x1, y1, x2, y2],
                    "position": pos
                })

        narration = self.generate_spatial_narration(detections)
        return {
            "detections": detections,
            "count": len(detections),
            "spatial_narration": narration
        }

    def generate_spatial_narration(self, detections: list) -> str:
        if not detections:
            return "No obstacles or classroom study objects detected in front of you."
        left = [d["label"].replace("_", " ") for d in detections if d["position"] == "left"]
        center = [d["label"].replace("_", " ") for d in detections if d["position"] == "center"]
        right = [d["label"].replace("_", " ") for d in detections if d["position"] == "right"]

        phrases = []
        if center:
            phrases.append(f"In front of you: {', '.join(set(center))}")
        if left:
            phrases.append(f"To your left: {', '.join(set(left))}")
        if right:
            phrases.append(f"To your right: {', '.join(set(right))}")

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
