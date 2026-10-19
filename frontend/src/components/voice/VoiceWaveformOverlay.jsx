import React, { useEffect, useRef, useState } from "react";
import { Mic, X, Check, Sparkles, Loader2, Volume2, User, AlertCircle, RotateCcw } from "lucide-react";
import { useVoice } from "../../context/VoiceContext";

/**
 * Primary Voice Assistant Microphone & Dialogue Panel
 * - Primary conversation interface housing both user input & assistant output in one panel
 * - Visualizes live microphone audio frequency/amplitude using Web Audio API AnalyserNode
 * - Displays live speech transcript distinguishing finalized vs interim text as words arrive
 * - Submits utterance on Done, transitions to processing, and displays assistant response beneath
 * - Remains open after response so visually impaired students can review and ask follow-ups
 * - Dismissed only when the user explicitly clicks the Close (X) button
 * - Safe audio resource management without stopping parent media tracks
 * - Respects prefers-reduced-motion for accessibility
 */
export default function VoiceWaveformOverlay({
  voiceState: propVoiceState,
  transcript: propTranscript,
  interimTranscript: propInterimTranscript,
  audioStream: propAudioStream,
  onStop,
  onCancel,
  compact = false,
  position = "bottom", // bottom | top | inline
  targetContextName = "",
}) {
  const voiceContext = useVoice();
  const isVoiceSessionOpen = voiceContext.isVoiceSessionOpen;
  const voiceState = propVoiceState || voiceContext.voiceState || "idle";
  const transcript = propTranscript !== undefined ? propTranscript : voiceContext.transcript;
  const interimTranscript = propInterimTranscript !== undefined ? propInterimTranscript : voiceContext.interimTranscript;
  const assistantResponse = voiceContext.assistantResponse || voiceContext.lastSpokenResponse || "";
  const errorMessage = voiceContext.errorMessage || "";
  const audioStream = propAudioStream || voiceContext.audioStream;
  const cancelListening = voiceContext.cancelListening;
  const stopListening = voiceContext.stopListening;
  const closeVoiceSession = voiceContext.closeVoiceSession;
  const listenAgain = voiceContext.listenAgain;
  const repeatLast = voiceContext.repeatLast;
  const speak = voiceContext.speak;

  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [localWarning, setLocalWarning] = useState("");

  const isListening =
    voiceState === "listening" ||
    voiceState === "requesting_permission" ||
    voiceState === "LISTENING";
  const isProcessing =
    voiceState === "processing" ||
    voiceState === "processing_speech" ||
    voiceState === "thinking" ||
    voiceState === "PROCESSING";
  const isResponding =
    voiceState === "responding" ||
    voiceState === "speaking" ||
    voiceState === "SPEAKING";

  // Check user reduced motion preference
  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e) => setReducedMotion(e.matches);
      mediaQuery.addEventListener?.("change", listener);
      return () => mediaQuery.removeEventListener?.("change", listener);
    } catch (_) {}
  }, []);

  // Connect Web Audio API AnalyserNode to the shared audioStream from VoiceContext
  useEffect(() => {
    if (!isListening || !audioStream) {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(audioStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch (err) {
      console.debug("[VoiceWaveform] AudioContext notice:", err.message);
    }

    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [isListening, audioStream]);

  // Render canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 16;
      const barWidth = 4;
      const gap = 4;
      const totalWidth = numBars * barWidth + (numBars - 1) * gap;
      const startX = (width - totalWidth) / 2;

      let freqData = null;
      if (analyserRef.current) {
        try {
          freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(freqData);
        } catch (_) {}
      }

      phase += 0.08;

      // Google Assistant brand-inspired harmonious palette
      const colors = [
        "#4285F4", // Google Blue
        "#34A853", // Google Green
        "#FBBC05", // Google Yellow
        "#EA4335", // Google Red
      ];

      for (let i = 0; i < numBars; i++) {
        let barHeight = 6;
        if (reducedMotion) {
          barHeight = 10;
        } else if (freqData && freqData.length > 0) {
          const binIndex = Math.floor((i / numBars) * (freqData.length / 2));
          const val = freqData[binIndex] || 0;
          barHeight = Math.max(6, (val / 255) * (height * 0.85));
        } else {
          const wave = Math.sin(phase + i * 0.45) * 0.5 + 0.5;
          barHeight = 6 + wave * (height * 0.55);
        }

        const color = colors[i % colors.length];
        ctx.fillStyle = color;

        const x = startX + i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isListening) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    if (isListening) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isListening, reducedMotion]);

  // Keep panel open whenever voice session is active, or during listening/processing/responding
  if (!isVoiceSessionOpen && !isListening && !isProcessing && !isResponding) {
    return null;
  }

  // Done button handler: finalize current speech and submit
  const handleDone = () => {
    setLocalWarning("");
    const currentWords = (transcript || interimTranscript || "").trim();
    if (!currentWords) {
      setLocalWarning("Please speak your question, then press Done.");
      return;
    }
    if (onStop) {
      onStop();
    } else if (stopListening) {
      stopListening();
    }
  };

  // Close X button handler: cleanly ends voice session and closes the panel
  const handleClose = () => {
    setLocalWarning("");
    if (onCancel) {
      onCancel();
    } else if (closeVoiceSession) {
      closeVoiceSession();
    } else if (cancelListening) {
      cancelListening();
    }
  };

  // Listen Again handler: starts recording the next utterance while keeping the panel open
  const handleListenAgain = () => {
    setLocalWarning("");
    if (listenAgain) {
      listenAgain();
    }
  };

  // Repeat assistant response
  const handleRepeat = () => {
    if (assistantResponse) {
      speak(assistantResponse);
    } else if (repeatLast) {
      repeatLast();
    }
  };

  return (
    <div
      className={`voice-waveform-overlay ${position} ${compact ? "compact" : ""}`}
      role="region"
      aria-live="polite"
      aria-label="Voice Assistant Interaction Panel"
    >
      <div className="waveform-card">
        {/* Header / Status Badge & Close X Action */}
        <div className="waveform-header">
          <div className="waveform-status-badge">
            {isListening ? (
              <div className="status-indicator listening">
                <span className="pulsing-mic-icon">
                  <Mic size={14} />
                </span>
                <span className="status-text">
                  {voiceState === "requesting_permission" ? "Requesting Microphone..." : "Listening to your voice..."}
                </span>
              </div>
            ) : isProcessing ? (
              <div className="status-indicator processing">
                <Loader2 size={13} className="animate-spin text-amber-400" />
                <span className="status-text">Understanding & Thinking...</span>
              </div>
            ) : isResponding ? (
              <div className="status-indicator responding">
                <Volume2 size={13} className="text-emerald-400" />
                <span className="status-text">Speaking Response...</span>
              </div>
            ) : errorMessage ? (
              <div className="status-indicator error">
                <AlertCircle size={13} className="text-rose-400" />
                <span className="status-text">Voice Assistant</span>
              </div>
            ) : (
              <div className="status-indicator ready">
                <Sparkles size={13} color="var(--accent-blue)" />
                <span className="status-text">Voice Assistant</span>
              </div>
            )}

            {targetContextName && (
              <span className="context-chip">
                <span>{targetContextName}</span>
              </span>
            )}
          </div>

          {/* Controls: Done (while listening) & Close (X) */}
          <div className="waveform-actions">
            {isListening && (
              <button
                type="button"
                onClick={handleDone}
                disabled={isProcessing}
                className="waveform-action-btn done-btn"
                aria-label="Finish speaking and submit query"
                title="Finish speaking and submit"
              >
                <Check size={14} />
                <span>Done</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="waveform-action-btn close-x-btn"
              aria-label="Close voice assistant"
              title="Close voice assistant (X)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Live Audio Waveform Canvas / Thinking Indicators */}
        <div className="waveform-canvas-container">
          {isListening ? (
            <canvas ref={canvasRef} width={200} height={34} className="waveform-canvas" />
          ) : isProcessing ? (
            <div className="thinking-bars">
              <span className="bar b1" />
              <span className="bar b2" />
              <span className="bar b3" />
              <span className="bar b4" />
            </div>
          ) : isResponding ? (
            <div className="responding-wave">
              <span className="r-bar r1" />
              <span className="r-bar r2" />
              <span className="r-bar r3" />
              <span className="r-bar r4" />
            </div>
          ) : null}
        </div>

        {/* USER INPUT SECTION */}
        <div className="waveform-input-section">
          {isListening ? (
            transcript || interimTranscript ? (
              <p className="waveform-transcript-text">
                {transcript && <span className="waveform-final-text">{transcript} </span>}
                {interimTranscript && (
                  <span className="waveform-interim-text">
                    {interimTranscript}
                    <span className="typing-cursor">|</span>
                  </span>
                )}
              </p>
            ) : (
              <p className="waveform-transcript-hint">
                Speak your question (e.g. 'What is around me?' or 'Read this')...
              </p>
            )
          ) : (
            transcript && (
              <div className="waveform-user-query-card">
                <span className="query-tag">
                  <User size={12} />
                  <span>You asked:</span>
                </span>
                <span className="query-text">"{transcript}"</span>
              </div>
            )
          )}
        </div>

        {/* ASSISTANT RESPONSE SECTION (Beneath User Input in Same Panel) */}
        {isProcessing && (
          <div className="waveform-processing-hint">
            <Loader2 size={13} className="animate-spin text-blue-400" />
            <span>Consulting tutor and analyzing camera context...</span>
          </div>
        )}

        {assistantResponse && !isListening && (
          <div className="waveform-assistant-card" tabIndex={0} aria-label="Assistant Response">
            <div className="assistant-card-header">
              <div className="assistant-badge">
                <Sparkles size={13} className="text-emerald-400" />
                <span>Assistant Response</span>
              </div>
              {isResponding && (
                <span className="speaking-badge">
                  <Volume2 size={11} className="animate-pulse" />
                  <span>Reading aloud</span>
                </span>
              )}
            </div>
            <div className="assistant-card-content">
              {assistantResponse}
            </div>
          </div>
        )}

        {/* Error / Warning Notice */}
        {(errorMessage || localWarning) && (
          <div className="waveform-error-card" role="alert">
            <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
            <span>{errorMessage || localWarning}</span>
          </div>
        )}

        {/* FOOTER ACTIONS (When not currently listening: Ask Another Question, Repeat, Close) */}
        {!isListening && (
          <div className="waveform-footer-actions">
            <button
              type="button"
              onClick={handleListenAgain}
              className="waveform-action-btn listen-again-btn"
              aria-label="Ask another question"
            >
              <Mic size={14} />
              <span>Ask Another Question</span>
            </button>

            {assistantResponse && (
              <button
                type="button"
                onClick={handleRepeat}
                className="waveform-action-btn repeat-btn"
                aria-label="Repeat assistant response"
                title="Repeat response aloud"
              >
                <RotateCcw size={13} />
                <span>Repeat</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="waveform-action-btn close-panel-btn"
              aria-label="Close voice assistant"
            >
              <X size={14} />
              <span>Close</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        .voice-waveform-overlay {
          position: absolute;
          z-index: 35;
          pointer-events: auto;
          transition: all var(--duration-fast, 200ms) var(--ease-apple, ease);
          max-width: 94%;
          width: 420px;
        }

        .voice-waveform-overlay.bottom {
          bottom: 4.8rem;
          left: 50%;
          transform: translateX(-50%);
        }

        .voice-waveform-overlay.top {
          top: 3.8rem;
          left: 50%;
          transform: translateX(-50%);
        }

        .voice-waveform-overlay.inline {
          position: relative;
          width: 100%;
          max-width: 100%;
          bottom: auto;
          left: auto;
          transform: none;
          margin-bottom: 0.5rem;
        }

        .waveform-card {
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-lg, 18px);
          padding: 0.85rem 1rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(66, 133, 244, 0.25);
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          max-height: 80vh;
          overflow-y: auto;
        }

        .waveform-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .waveform-status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
          overflow: hidden;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 650;
          color: #ffffff;
        }

        .status-indicator.listening {
          color: #34A853;
        }

        .status-indicator.processing {
          color: #FBBC05;
        }

        .status-indicator.responding {
          color: #10B981;
        }

        .status-indicator.error {
          color: #F87171;
        }

        .status-indicator.ready {
          color: #60A5FA;
        }

        .pulsing-mic-icon {
          display: inline-flex;
          animation: pulse 1.5s infinite;
        }

        .context-chip {
          font-size: 0.68rem;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.85);
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .waveform-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
        }

        .waveform-action-btn {
          border: none;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.74rem;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 32px;
        }

        .waveform-action-btn.done-btn {
          background: #34A853;
          color: #ffffff;
          padding: 0.25rem 0.7rem;
          box-shadow: 0 2px 8px rgba(52, 168, 83, 0.4);
        }

        .waveform-action-btn.done-btn:hover {
          background: #2d9448;
        }

        .waveform-action-btn.close-x-btn {
          background: rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          justify-content: center;
          padding: 0;
        }

        .waveform-action-btn.close-x-btn:hover {
          background: rgba(239, 68, 68, 0.4);
          color: #ffffff;
        }

        .waveform-canvas-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 24px;
        }

        .waveform-canvas {
          display: block;
        }

        .waveform-input-section {
          max-height: 85px;
          overflow-y: auto;
          text-align: center;
          padding: 0.15rem 0.3rem;
        }

        .waveform-transcript-text {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.4;
          word-break: break-word;
        }

        .waveform-final-text {
          color: #ffffff;
          font-weight: 600;
        }

        .waveform-interim-text {
          color: #93c5fd;
          font-style: italic;
          opacity: 0.95;
        }

        .typing-cursor {
          display: inline-block;
          color: #60a5fa;
          animation: blink 1s step-end infinite;
          margin-left: 2px;
          font-style: normal;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .waveform-transcript-hint {
          margin: 0;
          font-size: 0.78rem;
          color: #94a3b8;
          font-style: italic;
        }

        .waveform-user-query-card {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-sm, 10px);
          padding: 0.4rem 0.6rem;
          font-size: 0.82rem;
          text-align: left;
        }

        .query-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: #93c5fd;
          font-weight: 700;
          font-size: 0.75rem;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .query-text {
          color: #e2e8f0;
          line-height: 1.35;
          word-break: break-word;
        }

        .waveform-processing-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: #93c5fd;
          padding: 0.35rem 0;
        }

        .waveform-assistant-card {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: var(--radius-md, 12px);
          padding: 0.6rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          text-align: left;
          max-height: 160px;
          overflow-y: auto;
        }

        .assistant-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #34d399;
          letter-spacing: 0.02em;
        }

        .assistant-badge {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .speaking-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #6ee7b7;
          font-size: 0.68rem;
        }

        .assistant-card-content {
          font-size: 0.86rem;
          line-height: 1.45;
          color: #f8fafc;
          word-break: break-word;
        }

        .waveform-error-card {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: var(--radius-sm, 8px);
          padding: 0.4rem 0.6rem;
          font-size: 0.78rem;
          color: #fca5a5;
          text-align: left;
        }

        .waveform-footer-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
          margin-top: 0.2rem;
          flex-wrap: wrap;
        }

        .waveform-action-btn.listen-again-btn {
          background: var(--accent-primary, #0071e3);
          color: #ffffff;
          padding: 0.35rem 0.75rem;
        }

        .waveform-action-btn.listen-again-btn:hover {
          background: #005bb5;
        }

        .waveform-action-btn.repeat-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          padding: 0.35rem 0.65rem;
        }

        .waveform-action-btn.repeat-btn:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        .waveform-action-btn.close-panel-btn {
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          padding: 0.35rem 0.65rem;
        }

        .waveform-action-btn.close-panel-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #ffffff;
        }

        .thinking-bars, .responding-wave {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 22px;
        }

        .thinking-bars .bar {
          width: 4px;
          height: 18px;
          border-radius: 999px;
          animation: assistant-bounce 1s infinite ease-in-out;
        }

        .thinking-bars .b1 { background: #4285F4; animation-delay: 0s; }
        .thinking-bars .b2 { background: #EA4335; animation-delay: 0.15s; }
        .thinking-bars .b3 { background: #FBBC05; animation-delay: 0.3s; }
        .thinking-bars .b4 { background: #34A853; animation-delay: 0.45s; }

        .responding-wave .r-bar {
          width: 3px;
          height: 16px;
          border-radius: 999px;
          background: #10B981;
          animation: assistant-bounce 0.8s infinite ease-in-out;
        }
        .responding-wave .r1 { animation-delay: 0s; }
        .responding-wave .r2 { animation-delay: 0.15s; }
        .responding-wave .r3 { animation-delay: 0.3s; }
        .responding-wave .r4 { animation-delay: 0.45s; }

        @keyframes assistant-bounce {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50% { transform: scaleY(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
