let video = document.getElementById("webcam");
let canvas = document.getElementById("overlay-canvas");
let ctx = canvas.getContext("2d");
let speechLog = document.getElementById("speech-log");
let micBtn = document.getElementById("mic-trigger");
let micStatus = document.getElementById("mic-status-label");
let lastOcrText = "";

// Initialize Webcam
async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 }
    });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };
  } catch (err) {
    console.error("Camera access error:", err);
    speak("Camera access could not be established.");
  }
}
setupCamera();

// Capture snapshot from webcam as Blob
function captureFrameBlob() {
  return new Promise((resolve) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.toBlob(resolve, "image/jpeg", 0.85);
  });
}

// Spoken Feedback using Web Speech Synthesis
function speak(text) {
  if (!text) return;
  speechLog.textContent = text;
  const twinNarration = document.getElementById("twin-narration");
  if (twinNarration) {
    twinNarration.textContent = text;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// Action: Read Book / Notes (OCR)
async function triggerRead() {
  speak("Scanning study material...");
  const blob = await captureFrameBlob();
  const formData = new FormData();
  formData.append("file", blob, "scan.jpg");
  try {
    const res = await fetch("/api/ocr", { method: "POST", body: formData });
    const data = await res.json();
    lastOcrText = data.cleaned_text || "";
    document.getElementById("twin-ocr").textContent = lastOcrText || "No text detected.";
    
    if (lastOcrText) {
      speak("Page read: " + lastOcrText);
    } else {
      speak("No readable text was detected. Please reposition the book.");
    }
  } catch (e) {
    console.error(e);
    speak("OCR failed to process the image.");
  }
}

// Action: What's Around Me? (Object Detection)
async function triggerDetection() {
  speak("Scanning your desk and surroundings...");
  const blob = await captureFrameBlob();
  const formData = new FormData();
  formData.append("file", blob, "detect.jpg");
  try {
    const res = await fetch("/api/detect", { method: "POST", body: formData });
    const data = await res.json();
    renderDetections(data.detections || []);
    updateDigitalTwinStage(data.detections || []);
    speak(data.spatial_narration);
  } catch (e) {
    console.error(e);
    speak("Object detection failed.");
  }
}

// Render bounding boxes on supervisor canvas
function renderDetections(detections) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#38bdf8";
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#38bdf8";
  detections.forEach(d => {
    const [x1, y1, x2, y2] = d.box;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.fillText(`${d.label} (${Math.round(d.confidence * 100)}%)`, x1 + 5, Math.max(20, y1 - 8));
  });
}

// Render 2D desk layout in Digital Twin stage
function updateDigitalTwinStage(detections) {
  const stage = document.getElementById("twin-stage");
  // Keep student tag
  stage.innerHTML = '<div class="user-position">🧑 Student Position</div>';
  detections.forEach(d => {
    const el = document.createElement("div");
    el.className = "desk-item";
    el.textContent = d.label;
    let left = "50%";
    if (d.position === "left") left = "20%";
    if (d.position === "right") left = "80%";
    el.style.left = left;
    el.style.top = "40%";
    stage.appendChild(el);
  });
}

// Voice Recognition via Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognizer = new SpeechRecognition();
  recognizer.continuous = false;
  recognizer.lang = "en-US";
  recognizer.onstart = () => {
    micBtn.classList.add("listening");
    micStatus.textContent = "LISTENING...";
  };
  recognizer.onend = () => {
    micBtn.classList.remove("listening");
    micStatus.textContent = "TAP TO SPEAK";
  };
  recognizer.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    speak(`Heard: "${transcript}"`);
    try {
      const res = await fetch("/api/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, ocr_context: lastOcrText })
      });
      const data = await res.json();
      if (data.intent === "OCR") {
        triggerRead();
      } else if (data.intent === "OBJECT_DETECTION") {
        triggerDetection();
      } else if (data.intent === "TUTOR") {
        speak(data.tutor_answer);
        document.getElementById("twin-tutor-log").innerHTML = `
          <p><strong>Q:</strong> ${transcript}</p>
          <p><strong>Tutor:</strong> ${data.tutor_answer}</p>
        `;
      } else {
        speak(data.message);
      }
    } catch (err) {
      console.error(err);
      speak("Voice command processing failed.");
    }
  };
  micBtn.addEventListener("click", () => {
    try {
      recognizer.start();
    } catch (e) {
      console.warn("Speech recognition already active or error:", e);
    }
  });
} else {
  micStatus.textContent = "SPEECH API NOT SUPPORTED";
}

// Button Listeners
document.getElementById("btn-read").addEventListener("click", triggerRead);
document.getElementById("btn-detect").addEventListener("click", triggerDetection);
document.getElementById("btn-ask").addEventListener("click", () => {
  const q = prompt("What academic question would you like to ask the tutor?");
  if (q) {
    speak("Consulting tutor...");
    const form = new FormData();
    form.append("question", q);
    form.append("context", lastOcrText);
    fetch("/api/tutor/ask", { method: "POST", body: form })
      .then(res => res.json())
      .then(data => speak(data.answer))
      .catch(e => {
        console.error(e);
        speak("Tutor request failed.");
      });
  }
});

// Tab Switcher
document.getElementById("tab-student").addEventListener("click", () => {
  document.getElementById("tab-student").classList.add("active");
  document.getElementById("tab-twin").classList.remove("active");
  document.getElementById("student-view").classList.add("active");
  document.getElementById("twin-view").classList.remove("active");
});
document.getElementById("tab-twin").addEventListener("click", () => {
  document.getElementById("tab-twin").classList.add("active");
  document.getElementById("tab-student").classList.remove("active");
  document.getElementById("twin-view").classList.add("active");
  document.getElementById("student-view").classList.remove("active");
});
