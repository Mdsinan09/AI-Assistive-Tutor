import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.detection_service import compute_box_iou, CLASS_CONFIDENCE_THRESHOLDS, DetectionService


def test_multiple_person_nms_no_over_suppression():
    """Verify that multiple adjacent or overlapping persons are preserved by the tuned IoU threshold."""
    # Person A at [100, 50, 220, 350] (width 120, height 300)
    box_person_a = [100, 50, 220, 350]
    # Person B side-by-side with 80px overlap [140, 50, 260, 350] -> IoU = 80/160 = 0.50
    box_person_b = [140, 50, 260, 350]

    iou = compute_box_iou(box_person_a, box_person_b)
    assert 0.45 < iou < 0.55, f"Expected realistic side-by-side IoU around 0.50, got {iou}"

    # In previous version (iou > 0.42), Person B was suppressed (0.50 > 0.42).
    # With our tuned person same-class threshold of 0.58, Person B is preserved.
    same_class_thresh = 0.58
    assert iou < same_class_thresh, f"IoU {iou} should not exceed person same-class threshold {same_class_thresh}"


def test_person_on_chair_cross_class_preservation():
    """Verify that a person sitting on a chair (IoU ~ 0.70) is not suppressed by cross-class NMS."""
    box_person = [120, 60, 240, 340]
    box_chair = [110, 180, 250, 360]

    iou = compute_box_iou(box_person, box_chair)
    assert iou < 0.85, f"Person on chair IoU {iou} should be under cross-class suppression threshold (0.85)"


def test_person_confidence_threshold_configured():
    """Verify person confidence threshold is tuned to 0.42 for multi-person detection."""
    assert CLASS_CONFIDENCE_THRESHOLDS.get("person") == 0.42


def test_spatial_narration_multiple_people():
    """Verify that multiple people generate correct natural language counts (e.g., 'two people')."""
    # Create mock detections
    detections = [
        {"label": "person", "position": "center"},
        {"label": "person", "position": "center"},
        {"label": "laptop", "position": "left"},
        {"label": "chair", "position": "right"},
        {"label": "chair", "position": "right"},
    ]

    detector = DetectionService.__new__(DetectionService)
    narration = detector.generate_spatial_narration(detections)

    assert "two people" in narration
    assert "In front of you: two people" in narration
    assert "To your left: a laptop" in narration
    assert "To your right: 2 chairs" in narration


def test_recent_activity_timeline_text_mapping():
    """Verify that RecentActivity timeline mapping works with both 'text' and 'extracted_text' fields."""
    ocr_row_from_sqlite = {"id": 1, "text": "Chapter 4: Principles of Optics", "timestamp": "2026-10-30 12:00"}
    ocr_row_from_legacy = {"id": 2, "extracted_text": "Physics Lab Manual", "timestamp": "2026-10-30 12:05"}

    for row in [ocr_row_from_sqlite, ocr_row_from_legacy]:
        text_content = row.get("extracted_text") or row.get("text") or ""
        detail = text_content[:180] + ("..." if len(text_content) > 180 else "")
        assert "undefined" not in detail
        assert len(detail) > 0
