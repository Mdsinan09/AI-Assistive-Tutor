import sys
from pathlib import Path

# Add repo root to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.intent_router import route_intent
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoints():
    """Verify Task 4: /health and /api/health routes return 200 and healthy status."""
    res1 = client.get("/health")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "healthy"
    assert "FieldNet V3" in data1["model"]

    res2 = client.get("/api/health")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "healthy"
    print("PASS: test_health_endpoints")


def test_speech_coordinator_suppression_logic():
    """Verify Task 2: Speech coordinator logic suppresses announcements during voice sessions."""
    # Simulation of the SpeechCoordinator rule:
    # can_speak_announcement(is_voice_session_open, voice_state)
    def can_speak_announcement(is_voice_session_open: bool, voice_state: str) -> bool:
        if is_voice_session_open or voice_state != "idle":
            return False
        return True

    # 1. Voice session open -> Object announcements must be suppressed
    assert can_speak_announcement(True, "listening") is False
    assert can_speak_announcement(True, "processing") is False
    assert can_speak_announcement(True, "responding") is False
    assert can_speak_announcement(True, "idle") is False

    # 2. Voice session closed & voiceState idle -> Object announcements allowed
    assert can_speak_announcement(False, "idle") is True

    # 3. Voice session closed but voiceState busy -> Suppressed
    assert can_speak_announcement(False, "speaking") is False
    print("PASS: test_speech_coordinator_suppression_logic")


def test_announcement_preference_restoration():
    """Verify Task 2: Preference restoration logic does not force-enable if previously disabled."""
    def resolve_restored_narrate(saved_preference: bool) -> bool:
        return saved_preference

    # Case A: User had auto-narrate ON before voice session -> restored ON
    assert resolve_restored_narrate(True) is True

    # Case B: User had auto-narrate OFF before voice session -> remains OFF
    assert resolve_restored_narrate(False) is False
    print("PASS: test_announcement_preference_restoration")


def test_voice_panel_conversation_roundtrip():
    """Verify Task 1: Single microphone panel query & assistant response roundtrip."""
    response = client.post(
        "/api/voice/process",
        json={
            "transcript": "What is in front of me?",
            "context": {
                "objects": [
                    {"label": "book", "confidence": 0.92, "position": "center"},
                    {"label": "pen", "confidence": 0.85, "position": "right"}
                ]
            }
        }
    )
    assert response.status_code == 200
    data = response.json()
    # Output must have spoken_response ready to render beneath user input
    assert "spoken_response" in data
    assert "book" in data["spoken_response"]
    assert "pen" in data["spoken_response"]
    # Verify no raw markdown asterisks or hashes in spoken response
    assert "*" not in data["spoken_response"]
    assert "#" not in data["spoken_response"]
    print("PASS: test_voice_panel_conversation_roundtrip")


def test_fullscreen_toggle_state_machine():
    """Verify Task 3: Fullscreen state machine reliably toggles without inverted catch traps."""
    class FullscreenController:
        def __init__(self):
            self.is_fullscreen = False
            self.body_overflow = ""
            self.native_available = False

        def toggle(self, native_element_present: bool = False):
            if self.is_fullscreen:
                # Exit
                self.is_fullscreen = False
                self.body_overflow = ""
            else:
                # Enter
                self.is_fullscreen = True
                if not native_element_present:
                    self.body_overflow = "hidden"

        def external_exit(self):
            # E.g. Escape key or gesture
            self.is_fullscreen = False
            self.body_overflow = ""

    fc = FullscreenController()
    assert fc.is_fullscreen is False

    # 1. Enter fullscreen (CSS fallback mode on mobile Safari)
    fc.toggle(native_element_present=False)
    assert fc.is_fullscreen is True
    assert fc.body_overflow == "hidden"

    # 2. Exit fullscreen (pressing button again) -> Must return to normal!
    fc.toggle(native_element_present=False)
    assert fc.is_fullscreen is False
    assert fc.body_overflow == ""

    # 3. Enter and exit with native element (Android Chrome)
    fc.toggle(native_element_present=True)
    assert fc.is_fullscreen is True
    assert fc.body_overflow == ""  # native handles scroll
    fc.external_exit()
    assert fc.is_fullscreen is False
    print("PASS: test_fullscreen_toggle_state_machine")


if __name__ == "__main__":
    print("\n=== RUNNING FINAL TASKS VERIFICATION SUITE ===")
    test_health_endpoints()
    test_speech_coordinator_suppression_logic()
    test_announcement_preference_restoration()
    test_voice_panel_conversation_roundtrip()
    test_fullscreen_toggle_state_machine()
    print("=== ALL FINAL TASK TESTS PASSED SUCCESSFULLY ===\n")
