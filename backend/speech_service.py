import speech_recognition as sr


class SpeechService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(SpeechService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self._initialized = True
        print("[SpeechService] Initialized.")

    def listen(self, timeout: int = 5, phrase_time_limit: int = 6) -> str:
        try:
            with sr.Microphone() as source:
                print("[SpeechService] Listening for voice command...")
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
                text = self.recognizer.recognize_google(audio)
                print(f"[SpeechService] Recognized: '{text}'")
                return text
        except (sr.WaitTimeoutError, sr.UnknownValueError):
            return ""
        except Exception as e:
            print(f"[SpeechService] Error: {e}")
            return ""


if __name__ == "__main__":
    svc = SpeechService()
    print("Speak something into your microphone now...")
    res = svc.listen()
    print(f"Recognized result: '{res}'")
