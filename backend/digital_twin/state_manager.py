from datetime import datetime

class DigitalTwinState:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DigitalTwinState, cls).__new__(cls)
            cls._instance.state = {
                "status": "ready",
                "last_active": datetime.now().isoformat(),
                "active_command": "",
                "detections": [],
                "spatial_narration": "System initialized and waiting for student.",
                "current_ocr_text": "",
                "tutor_response": ""
            }
        return cls._instance

    def update_detection(self, detections: list, narration: str):
        self.state["detections"] = detections
        self.state["spatial_narration"] = narration
        self.state["last_active"] = datetime.now().isoformat()
        self.state["status"] = "detecting"

    def update_ocr(self, text: str):
        self.state["current_ocr_text"] = text
        self.state["last_active"] = datetime.now().isoformat()
        self.state["status"] = "reading"

    def update_tutor(self, query: str, answer: str):
        self.state["active_command"] = query
        self.state["tutor_response"] = answer
        self.state["last_active"] = datetime.now().isoformat()
        self.state["status"] = "tutoring"

    def get_state(self):
        return self.state
