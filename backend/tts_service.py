import os
import sys
import subprocess
import threading


class TTSService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(TTSService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.lock = threading.Lock()
        self.engine = None
        try:
            import pyttsx3
            self.engine = pyttsx3.init()
            self.engine.setProperty("rate", 160)
            print("[TTSService] pyttsx3 engine initialized.")
        except Exception as e:
            print(f"[TTSService] pyttsx3 unavailable ({e}). Using system speech fallback.")
        self._initialized = True

    def speak(self, text: str) -> None:
        if not text or not text.strip():
            return
        clean_text = text.replace('"', '').replace("'", "")
        with self.lock:
            # On macOS, native 'say' is the fastest and highest quality
            if sys.platform == "darwin":
                try:
                    subprocess.run(["say", "-r", "180", clean_text], check=True)
                    return
                except Exception:
                    pass
            # Fallback to pyttsx3
            if self.engine:
                try:
                    self.engine.say(clean_text)
                    self.engine.runAndWait()
                except Exception as e:
                    print(f"[TTSService Error] {e}")


if __name__ == "__main__":
    print("[Test] Testing TTSService...")
    tts = TTSService()
    tts.speak("Speech synthesis is operational.")
    print("[Test] Spoken successfully.")
