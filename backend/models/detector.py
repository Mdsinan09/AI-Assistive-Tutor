import os
import sys
import torch
import cv2
import numpy as np
from pathlib import Path

# Add objectdetection-main/src to path
OD_DIR = Path(__file__).resolve().parent.parent.parent / "objectdetection-main"
sys.path.insert(0, str(OD_DIR / "src"))

from models.fieldnet_v3 import FieldNetV3
from postprocess.decode_v3 import decode_batch, DecodeConfig
from data.taxonomy import canonical_classes
from backend.config import (
    CHECKPOINT_PATH, FIELDNET_IMAGE_SIZE, FIELDNET_CHANNELS,
    FIELDNET_BACKBONE, DETECTION_CONF_THRESHOLD, DETECTION_NMS_IOU
)

class ObjectDetector:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.class_names = canonical_classes(merge=True)
        self.num_classes = len(self.class_names)
        self.image_size = FIELDNET_IMAGE_SIZE
        self.model = self._load_model()
        self.decode_config = DecodeConfig(
            mode="peak",
            peak_kernel=3,
            score_thresh=DETECTION_CONF_THRESHOLD,
            nms_iou=DETECTION_NMS_IOU,
            max_detections=50,
            image_size=self.image_size,
        )

    def _load_model(self):
        if not CHECKPOINT_PATH.is_file():
            print(f"[Detector] Checkpoint not found at {CHECKPOINT_PATH}. Running in mock mode.")
            return None
        try:
            model = FieldNetV3(
                num_classes=self.num_classes,
                channels=FIELDNET_CHANNELS,
                backbone=FIELDNET_BACKBONE,
                pretrained=False,
            )
            checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)
            state = checkpoint.get("ema_state_dict") or checkpoint.get("model_state_dict") or checkpoint
            model.load_state_dict(state, strict=False)
            model.to(self.device)
            model.eval()
            print("[Detector] FieldNet V3 loaded successfully!")
            return model
        except Exception as e:
            print(f"[Detector] Failed to load model weights: {e}. Running in mock mode.")
            return None

    def preprocess(self, frame_bgr: np.ndarray):
        h, w = frame_bgr.shape[:2]
        scale = min(self.image_size / h, self.image_size / w)
        nh, nw = int(round(h * scale)), int(round(w * scale))
        
        resized = cv2.resize(frame_bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
        canvas = np.full((self.image_size, self.image_size, 3), 114, dtype=np.uint8)
        
        pad_y = (self.image_size - nh) // 2
        pad_x = (self.image_size - nw) // 2
        canvas[pad_y:pad_y + nh, pad_x:pad_x + nw] = resized
        
        rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (rgb - mean) / std
        
        tensor = torch.from_numpy(normalized).permute(2, 0, 1).unsqueeze(0).to(self.device)
        return tensor, scale, pad_x, pad_y

    def detect(self, frame_bgr: np.ndarray):
        h_orig, w_orig = frame_bgr.shape[:2]
        if self.model is None:
            # Fallback mock detector if weights are missing or not loaded
            return self._mock_detect(w_orig, h_orig)
        
        tensor, scale, pad_x, pad_y = self.preprocess(frame_bgr)
        
        with torch.no_grad():
            outputs = self.model(tensor)
            decoded = decode_batch(outputs, self.decode_config)
            
        detections = []
        if decoded and len(decoded) > 0:
            boxes = decoded[0].get("boxes", [])
            scores = decoded[0].get("scores", [])
            labels = decoded[0].get("labels", [])
            for box, score, label in zip(boxes, scores, labels):
                if float(score) < DETECTION_CONF_THRESHOLD:
                    continue
                # Unpad and scale back to original resolution
                x1 = max(0, int((float(box[0]) - pad_x) / scale))
                y1 = max(0, int((float(box[1]) - pad_y) / scale))
                x2 = min(w_orig, int((float(box[2]) - pad_x) / scale))
                y2 = min(h_orig, int((float(box[3]) - pad_y) / scale))
                cls_idx = int(label)
                cls_name = self.class_names[cls_idx] if cls_idx < len(self.class_names) else f"class_{cls_idx}"
                
                # Spatial positioning
                cx = (x1 + x2) / 2
                if cx < w_orig * 0.35:
                    position = "left"
                elif cx > w_orig * 0.65:
                    position = "right"
                else:
                    position = "center"
                    
                detections.append({
                    "label": cls_name.replace("_", " "),
                    "confidence": round(float(score), 2),
                    "box": [x1, y1, x2, y2],
                    "position": position
                })
                
        spatial_narration = self.generate_spatial_narration(detections)
        return {
            "detections": detections,
            "spatial_narration": spatial_narration
        }

    def generate_spatial_narration(self, detections: list) -> str:
        if not detections:
            return "No obstacles or classroom study objects detected in front of you."
        left = [d["label"] for d in detections if d["position"] == "left"]
        center = [d["label"] for d in detections if d["position"] == "center"]
        right = [d["label"] for d in detections if d["position"] == "right"]
        parts = []
        if center:
            parts.append(f"In front of you: {', '.join(set(center))}")
        if left:
            parts.append(f"To your left: {', '.join(set(left))}")
        if right:
            parts.append(f"To your right: {', '.join(set(right))}")
        return ". ".join(parts) + "."

    def _mock_detect(self, w: int, h: int):
        return {
            "detections": [
                {"label": "book notebook", "confidence": 0.92, "box": [int(w*0.3), int(h*0.4), int(w*0.7), int(h*0.8)], "position": "center"},
                {"label": "pen", "confidence": 0.85, "box": [int(w*0.75), int(h*0.6), int(w*0.85), int(h*0.75)], "position": "right"}
            ],
            "spatial_narration": "In front of you: a book. To your right: a pen."
        }
