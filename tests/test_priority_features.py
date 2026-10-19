import sys
from pathlib import Path

# Add repo root to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.intent_router import route_intent, format_spatial_description, split_paragraphs
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_spatial_description_with_confidence():
    """Verify Priority 4: Object description includes labels and confidence percentages."""
    mock_objects = [
        {"label": "notebook", "confidence": 0.94, "position": "center"},
        {"label": "bottle", "confidence": 0.88, "position": "right"},
    ]
    res = route_intent("what is around me?", {"objects": mock_objects})
    assert res["intent"] == "DETECT_OBJECTS"
    assert "notebook" in res["spoken_response"]
    assert "94% confidence" in res["spoken_response"]
    assert "bottle" in res["spoken_response"]
    assert "88% confidence" in res["spoken_response"]
    print("PASS: test_spatial_description_with_confidence")


def test_read_notebook_intent():
    """Verify Priority 4: 'Now read the text on my notebook' triggers OCR action."""
    res = route_intent("Now read the text on my notebook")
    assert res["intent"] == "READ_PAGE"
    assert res["action"] == "trigger_ocr"
    assert "notebook" in res["spoken_response"].lower()
    print("PASS: test_read_notebook_intent")


def test_scanned_text_followup():
    """Verify Priority 4: 'Tell me about what I just scanned' resolves against OCR context."""
    ocr_context = {
        "ocr_text": "Mitochondria are the powerhouses of the cell. They generate adenosine triphosphate."
    }
    res = route_intent("Tell me about what I just scanned", ocr_context)
    assert res["intent"] == "EXPLAIN_OCR"
    assert res["action"] == "explain_ocr"
    assert res["payload"] == ocr_context["ocr_text"]

    # When no scan has occurred yet:
    empty_res = route_intent("Tell me about what I just scanned", {})
    assert empty_res["action"] == "trigger_ocr"
    assert "haven't scanned" in empty_res["spoken_response"].lower()
    print("PASS: test_scanned_text_followup")


def test_brand_uncertainty_without_hallucination():
    """Verify Priority 4: Generic objects do NOT hallucinate brands without visible label text."""
    # Case 1: Generic pen without brand text in OCR
    ctx_no_brand = {
        "objects": [{"label": "pen", "confidence": 0.91, "position": "center"}],
        "ocr_text": "Notes on biology chapter 4"
    }
    res = route_intent("What company made this pen?", ctx_no_brand)
    assert res["intent"] == "BRAND_IDENTIFICATION"
    assert res["action"] == "brand_uncertain"
    assert "not visible" in res["spoken_response"].lower()
    assert "hold it closer" in res["spoken_response"].lower()

    # Case 2: Visible brand text (e.g. 'Pilot') in OCR
    ctx_with_brand = {
        "objects": [{"label": "pen", "confidence": 0.91, "position": "center"}],
        "ocr_text": "Pilot G2 0.7mm gel pen"
    }
    res_brand = route_intent("What company made this pen?", ctx_with_brand)
    assert res_brand["intent"] == "BRAND_IDENTIFICATION"
    assert res_brand["action"] == "brand_identified"
    assert "Pilot" in res_brand["spoken_response"]
    print("PASS: test_brand_uncertainty_without_hallucination")


def test_paragraph_explanation():
    """Verify Priority 4: 'Explain the second paragraph' isolates paragraph 2."""
    multi_para_doc = (
        "First paragraph discusses cell membrane structure and phospholipid bilayers.\n\n"
        "Second paragraph details ATP synthesis via cellular respiration in mitochondria.\n\n"
        "Third paragraph summarizes thermodynamic equilibrium."
    )
    paras = split_paragraphs(multi_para_doc)
    assert len(paras) == 3

    res = route_intent("Explain the second paragraph", {"ocr_text": multi_para_doc})
    assert res["intent"] == "EXPLAIN_PARAGRAPH"
    assert res["action"] == "explain_ocr"
    assert "Second paragraph details ATP synthesis" in res["payload"]
    assert res["paragraph_index"] == 2
    print("PASS: test_paragraph_explanation")


def test_voice_process_api_clean_speech():
    """Verify Priority 5: API returns spoken_response stripped of markdown asterisks/hashes."""
    response = client.post(
        "/api/voice/process",
        json={
            "transcript": "What is around me?",
            "context": {
                "objects": [{"label": "laptop", "confidence": 0.95, "position": "center"}]
            }
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "*" not in data["spoken_response"]
    assert "#" not in data["spoken_response"]
    assert "laptop" in data["spoken_response"]
    print("PASS: test_voice_process_api_clean_speech")


def test_voice_transcribe_endpoint():
    """Verify Priority 1: Backend voice transcribe fallback endpoint."""
    # Test with empty file
    res = client.post(
        "/api/voice/transcribe",
        files={"file": ("test.wav", b"", "audio/wav")}
    )
    assert res.status_code == 200
    assert "transcript" in res.json()
    print("PASS: test_voice_transcribe_endpoint")


def test_digital_twin_state():
    """Verify Priority 6: Digital twin returns live system state with timestamps."""
    res = client.get("/digital-twin/state")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "last_detections" in data
    assert "last_ocr_text" in data
    assert "last_scan_status" in data
    print("PASS: test_digital_twin_state")


if __name__ == "__main__":
    print("\n=== RUNNING PRIORITY VERIFICATION SUITE ===")
    test_spatial_description_with_confidence()
    test_read_notebook_intent()
    test_scanned_text_followup()
    test_brand_uncertainty_without_hallucination()
    test_paragraph_explanation()
    test_voice_process_api_clean_speech()
    test_voice_transcribe_endpoint()
    test_digital_twin_state()
    print("=== ALL 8 PRIORITY TESTS PASSED SUCCESSFULLY ===\n")
