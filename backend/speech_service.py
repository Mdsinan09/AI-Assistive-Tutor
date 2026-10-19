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

    def transcribe_audio_bytes(self, audio_bytes: bytes, filename: str = "audio.webm") -> str:
        """
        Converts uploaded audio bytes (webm/ogg/wav/mp3) to 16kHz mono WAV and transcribes
        using Google STT via SpeechRecognition, with graceful fallback.
        """
        if not audio_bytes or len(audio_bytes) < 100:
            return ""

        import io
        import pydub

        wav_bytes = None
        try:
            audio_seg = pydub.AudioSegment.from_file(io.BytesIO(audio_bytes))
            # Resample to 16kHz mono PCM for optimal speech recognition
            audio_seg = audio_seg.set_frame_rate(16000).set_channels(1)
            buf = io.BytesIO()
            audio_seg.export(buf, format="wav")
            wav_bytes = buf.getvalue()
        except Exception as conv_err:
            print(f"[SpeechService] Audio conversion error: {conv_err}")
            # If conversion fails and it's already a wav, use original bytes
            if filename.lower().endswith(".wav"):
                wav_bytes = audio_bytes

        if not wav_bytes:
            return ""

        try:
            with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
                audio_data = self.recognizer.record(source)
                recognized = self.recognizer.recognize_google(audio_data)
                clean_text = (recognized or "").strip()
                print(f"[SpeechService] Transcribed from audio bytes: '{clean_text}'")
                return clean_text
        except sr.UnknownValueError:
            # Audio was clear of speech or silence
            return ""
        except Exception as stt_err:
            print(f"[SpeechService] Google STT error: {stt_err}")

        # Secondary fallback: Gemini audio model if available
        try:
            from backend.tutor_service import TutorService
            tutor = TutorService()
            if tutor.model:
                prompt = "Listen to this audio recording of a visually impaired student. Transcribe the exact words spoken. Return ONLY the transcribed text with no preamble or explanation. If no speech is present, return an empty response."
                response = tutor.model.generate_content([
                    {"mime_type": "audio/wav", "data": wav_bytes},
                    prompt
                ])
                gemini_text = (response.text or "").strip()
                if gemini_text:
                    print(f"[SpeechService] Gemini transcribed: '{gemini_text}'")
                    return gemini_text
        except Exception as gemini_err:
            print(f"[SpeechService] Gemini audio fallback error: {gemini_err}")

        return ""


if __name__ == "__main__":
    svc = SpeechService()
    print("Speak something into your microphone now...")
    res = svc.listen()
    print(f"Recognized result: '{res}'")
