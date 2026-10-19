import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  Menu,
  X,
  HelpCircle,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import GlassButton from "../components/glass/GlassButton";
import VoiceWaveformOverlay from "../components/voice/VoiceWaveformOverlay";
import { tutorApi } from "../api/tutorApi";
import { useVoice } from "../context/VoiceContext";

/**
 * Strips raw markdown syntax for clean, natural-sounding Text-to-Speech.
 */
function cleanSpeechText(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[*\-•]\s+/gm, "")
    .replace(/\n+/g, ". ")
    .trim();
}

export default function AssistiveTutor() {
  const location = useLocation();
  const {
    voiceState,
    isVoiceSessionOpen,
    transcript: voiceTranscript,
    interimTranscript,
    startListening,
    stopListening,
    cancelListening,
    closeVoiceSession,
    speak,
    stopSpeaking,
    isSpeaking,
    registerHandler,
    setVoiceState,
  } = useVoice();

  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  // Multimodal contexts
  const [activeContext, setActiveContext] = useState(null); // OCR text
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [visualContext, setVisualContext] = useState(null); // Environmental objects

  // Input & loading state
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [isSpeakingMsgId, setIsSpeakingMsgId] = useState(null);

  // Error retry state
  const [lastFailedQuery, setLastFailedQuery] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load existing conversations on mount
  useEffect(() => {
    loadConversationList();
    // Check if recent visual detections are available from camera session
    try {
      const savedDetections = sessionStorage.getItem("ai_assistive_active_detections");
      if (savedDetections) {
        setVisualContext(savedDetections);
      }
    } catch (_) {}
  }, []);

  // Handle incoming OCR or Visual context from Navigation State
  useEffect(() => {
    const passedContext = location.state?.initialContext;
    const passedVisual = location.state?.visualContext;

    if (passedVisual && typeof passedVisual === "string") {
      setVisualContext(passedVisual);
    }

    if (passedContext && typeof passedContext === "string" && passedContext.trim()) {
      initiateConversationWithContext(passedContext.trim());
    }
  }, [location.state]);

  const loadConversationList = async () => {
    try {
      const list = await tutorApi.listConversations();
      setConversations(list || []);
    } catch (err) {
      console.warn("Failed to load conversation history:", err);
    }
  };

  const initiateConversationWithContext = async (contextText) => {
    try {
      setIsLoading(true);
      setActiveContext(contextText);
      setIsContextExpanded(false);

      const titleSnippet = contextText.slice(0, 32).trim() || "Scanned Study Text";
      const newConv = await tutorApi.createConversation({
        title: titleSnippet,
        context_source: "ocr",
        ocr_context: contextText,
      });

      setActiveConversationId(newConv.id);
      setActiveConversation(newConv);

      const greetingMsg = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `I've attached your scanned text. What would you like to explore? You can ask me to explain it simply, give real-world examples, summarize key takeaways, or quiz you for exams!`,
        created_at: new Date().toISOString(),
      };
      setMessages([greetingMsg]);
      await loadConversationList();
    } catch (err) {
      console.warn("Could not initiate conversation with context:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (convId) => {
    if (convId === activeConversationId) {
      setMobileHistoryOpen(false);
      return;
    }
    setIsLoading(true);
    setMobileHistoryOpen(false);
    stopSpeaking();
    try {
      const conv = await tutorApi.getConversation(convId);
      setActiveConversationId(conv.id);
      setActiveConversation(conv);
      setActiveContext(conv.ocr_context || null);
      setMessages(conv.messages || []);
      setLastFailedQuery(null);
    } catch (err) {
      console.warn("Failed to load conversation details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    stopSpeaking();
    setActiveConversationId(null);
    setActiveConversation(null);
    setActiveContext(null);
    setMessages([]);
    setLastFailedQuery(null);
    setMobileHistoryOpen(false);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await tutorApi.deleteConversation(convId);
      if (activeConversationId === convId) {
        handleNewChat();
      }
      await loadConversationList();
    } catch (err) {
      console.warn("Failed to delete conversation:", err);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText("");
    stopSpeaking();
    setLastFailedQuery(null);

    // Optimistic user message in UI
    const userMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let currentConvId = activeConversationId;
      // Auto-create conversation if none is selected
      if (!currentConvId) {
        const created = await tutorApi.createConversation({
          title: text.slice(0, 36),
          context_source: activeContext ? "ocr" : visualContext ? "vision" : "general",
          ocr_context: activeContext || "",
        });
        currentConvId = created.id;
        setActiveConversationId(created.id);
        setActiveConversation(created);
      }

      // Check if user is asking about visual environment ("what is in front of me", "what is around me")
      let effectiveContext = activeContext || "";
      const lowerText = text.toLowerCase();
      const isVisualQuery =
        lowerText.includes("in front of") ||
        lowerText.includes("around me") ||
        lowerText.includes("what is this") ||
        lowerText.includes("surroundings") ||
        lowerText.includes("what do you see") ||
        lowerText.includes("to my left") ||
        lowerText.includes("to my right");

      if (isVisualQuery && visualContext) {
        effectiveContext = effectiveContext
          ? `${effectiveContext}\n\nCurrent Visual Environment Detections: ${visualContext}`
          : `Current Visual Environment Detections: ${visualContext}`;
      }

      const res = await tutorApi.sendMessage(currentConvId, text, effectiveContext);
      if (res && res.assistant_message) {
        setMessages((prev) => [...prev, res.assistant_message]);
        loadConversationList();
      } else {
        throw new Error(res?.error || "Empty response received from tutor service");
      }
    } catch (err) {
      console.warn("Tutor send error:", err);
      const errMsg = err.message || "";
      let structuredError = "Tutor connection failed. The AI service could not be reached.";
      let errorCode = "UNKNOWN";

      if (errMsg.includes("401") || errMsg.includes("GEMINI_AUTH_ERROR") || errMsg.includes("API_KEY")) {
        structuredError = "Gemini API key is invalid or missing in backend/.env. Please verify backend configuration.";
        errorCode = "GEMINI_AUTH_ERROR";
      } else if (errMsg.includes("404") || errMsg.includes("GEMINI_MODEL_ERROR") || errMsg.includes("not found")) {
        structuredError = "The configured Gemini model is unavailable. Backend model fallback required.";
        errorCode = "GEMINI_MODEL_ERROR";
      } else if (errMsg.includes("429") || errMsg.includes("GEMINI_RATE_LIMIT") || errMsg.includes("quota")) {
        structuredError = "AI rate limit or quota exceeded. Please wait a moment and tap Retry.";
        errorCode = "GEMINI_RATE_LIMIT";
      } else if (errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError")) {
        structuredError = "Backend unreachable. Ensure FastAPI backend is running on port 8000.";
        errorCode = "BACKEND_UNREACHABLE";
      }

      setLastFailedQuery({ text, context: activeContext, convId: activeConversationId });

      const assistantErrorMsg = {
        id: `err-${Date.now()}`,
        role: "assistant",
        isError: true,
        errorCode,
        content: structuredError,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantErrorMsg]);
    } finally {
      setIsLoading(false);
      if (setVoiceState) {
        setVoiceState("idle");
      }
    }
  };

  const handleSendMessageRef = useRef(handleSendMessage);
  handleSendMessageRef.current = handleSendMessage;

  // Listen for voice-recognized utterances to auto-send as chat message
  useEffect(() => {
    if (!registerHandler) return;
    const unregister = registerHandler("onVoiceTranscript", (transcript) => {
      if (transcript && transcript.trim()) {
        handleSendMessageRef.current(transcript.trim());
      }
    });
    return () => {
      if (unregister) unregister();
    };
  }, [registerHandler]);

  const handleRetryLastQuery = () => {
    if (!lastFailedQuery) return;
    const { text } = lastFailedQuery;
    // Remove the trailing error message
    setMessages((prev) => prev.filter((m) => !m.isError));
    handleSendMessage(text);
  };

  const handleReadMessage = (msgId, content) => {
    if (isSpeakingMsgId === msgId) {
      stopSpeaking();
      setIsSpeakingMsgId(null);
    } else {
      stopSpeaking();
      setIsSpeakingMsgId(msgId);
      const spokenContent = cleanSpeechText(content);
      speak(spokenContent);
    }
  };

  const quickPrompts = [
    activeContext ? "Explain this simply" : "What is photosynthesis?",
    activeContext ? "Give me a real-world example" : "Explain quantum physics simply",
    activeContext ? "What are the key points for exams?" : "Quiz me on science",
    activeContext ? "Summarize this into 3 bullets" : "What is in front of me?",
  ];

  return (
    <div className="tutor-container-root">
      {/* Mobile Drawer Backdrop */}
      {mobileHistoryOpen && (
        <div
          className="tutor-mobile-backdrop"
          onClick={() => setMobileHistoryOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* History Drawer / Sidebar */}
      <aside
        id="tutor-history-sidebar"
        className={`glass-panel tutor-sidebar ${mobileHistoryOpen ? "open" : ""}`}
        aria-label="Tutor Conversation History"
      >
        {/* Drawer Header */}
        <div className="tutor-sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Recent Chats</span>
          </div>
          {/* Top-Right Touch-Friendly Close X */}
          <button
            onClick={() => setMobileHistoryOpen(false)}
            className="tutor-sidebar-close-btn"
            aria-label="Close history drawer"
            title="Close history"
          >
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <GlassButton
          variant="primary"
          onClick={handleNewChat}
          style={{
            width: "100%",
            marginBottom: "1rem",
            justifyContent: "center",
            padding: "0.65rem",
            fontWeight: 650,
          }}
        >
          <Plus size={16} />
          <span>New Chat</span>
        </GlassButton>

        {/* Conversation List */}
        <div className="tutor-sidebar-list">
          {conversations.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.85rem", marginTop: "2rem" }}>
              No previous chats yet. Start learning below!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isOcr = conv.context_source === "ocr";
              const isVision = conv.context_source === "vision";

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`tutor-history-item ${isActive ? "active" : ""}`}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    <div className="tutor-history-title">
                      {conv.title || "Untitled Session"}
                    </div>
                    <div className="tutor-history-badge">
                      {isOcr ? (
                        <>
                          <FileText size={11} color="var(--accent-amber)" />
                          <span style={{ color: "var(--accent-amber)" }}>Scanned OCR</span>
                        </>
                      ) : isVision ? (
                        <>
                          <Eye size={11} color="var(--accent-teal, #14b8a6)" />
                          <span style={{ color: "var(--accent-teal, #14b8a6)" }}>Vision</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} color="var(--accent-primary)" />
                          <span>General Chat</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="tutor-history-delete-btn"
                    title="Delete conversation"
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Workstation */}
      <main className="glass-panel tutor-main-workstation">
        {/* Header Bar */}
        <header className="tutor-header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileHistoryOpen(true)}
              className="tutor-mobile-menu-trigger"
              aria-label="Open Chat History"
              title="Recent Chats"
            >
              <Menu size={20} />
            </button>

            <div className="tutor-brand-icon">
              <Bot size={20} />
            </div>

            <div>
              <h1 className="tutor-header-title">Assistive Tutor</h1>
              <p className="tutor-header-sub">
                Multimodal learning companion • Text, vision & voice
              </p>
            </div>
          </div>

          {/* Context Badge in Header */}
          <div className="tutor-header-context-badge">
            {activeContext ? (
              <div className="glass-pill tutor-pill-ocr">
                <FileText size={13} />
                <span>Text Attached</span>
              </div>
            ) : visualContext ? (
              <div className="glass-pill tutor-pill-vision">
                <Eye size={13} />
                <span>Camera Aware</span>
              </div>
            ) : (
              <div className="glass-pill tutor-pill-general">
                <HelpCircle size={13} />
                <span>General Study</span>
              </div>
            )}
          </div>
        </header>

        {/* Message Stream */}
        <div className="tutor-messages-scroll-area" aria-live="polite">
          {messages.length === 0 ? (
            <div className="tutor-empty-welcome">
              <div className="tutor-welcome-sparkle-icon">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)", margin: "0 0 0.4rem" }}>
                  How can I help you learn today?
                </h3>
                <p style={{ fontSize: "0.85rem", margin: 0, maxWidth: "440px", color: "var(--text-secondary)" }}>
                  Ask anything about your coursework, inquire about your environment, or select a suggested topic below.
                </p>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="tutor-quick-prompts-container">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="glass-panel tutor-quick-prompt-btn"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const isSpeaking = isSpeakingMsgId === msg.id;
              const isError = msg.isError;

              return (
                <div
                  key={msg.id}
                  className={`tutor-msg-row ${isUser ? "user" : "assistant"}`}
                >
                  <div className={`tutor-avatar ${isUser ? "user" : isError ? "error" : "assistant"}`}>
                    {isUser ? <User size={16} /> : isError ? <X size={16} /> : <Bot size={16} />}
                  </div>

                  <div className={`tutor-bubble ${isUser ? "user" : isError ? "error" : "assistant"}`}>
                    <div className="tutor-bubble-content">{msg.content}</div>

                    {/* Retry button for errors */}
                    {isError && lastFailedQuery && (
                      <div className="tutor-error-action-row">
                        <button
                          onClick={handleRetryLastQuery}
                          className="tutor-retry-btn"
                        >
                          <RotateCcw size={13} />
                          <span>Retry Question</span>
                        </button>
                      </div>
                    )}

                    {/* Speech / Audio read aloud button */}
                    {!isUser && !isError && (
                      <div className="tutor-tts-row">
                        <button
                          onClick={() => handleReadMessage(msg.id, msg.content)}
                          className="tutor-tts-btn"
                          aria-label={isSpeaking ? "Stop reading" : "Read message aloud"}
                        >
                          {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          <span>{isSpeaking ? "Stop" : "Read Aloud"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="tutor-msg-row assistant">
              <div className="tutor-avatar assistant">
                <Bot size={16} />
              </div>
              <div className="tutor-bubble assistant thinking">
                <div className="pulsing-dot" />
                <span>Thinking & synthesizing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Composer Area with Attachment Chip */}
        <footer className="tutor-composer-area">
          {/* ATTACHMENT CHIP: Placed directly above the composer input */}
          {activeContext && (
            <div className="tutor-attachment-chip-bar">
              <div className="tutor-attachment-chip">
                <div className="tutor-attachment-icon">
                  <FileText size={15} />
                </div>
                <div className="tutor-attachment-content">
                  <div className="tutor-attachment-header">
                    <span className="tutor-attachment-title">📄 Scanned Text Attached</span>
                    <button
                      type="button"
                      onClick={() => setIsContextExpanded(!isContextExpanded)}
                      className="tutor-attachment-toggle-btn"
                    >
                      {isContextExpanded ? (
                        <>
                          <span>Collapse</span>
                          <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          <span>Expand</span>
                          <ChevronDown size={12} />
                        </>
                      )}
                    </button>
                  </div>
                  <div className={`tutor-attachment-preview ${isContextExpanded ? "expanded" : "collapsed"}`}>
                    "{activeContext}"
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveContext(null)}
                  className="tutor-attachment-detach-btn"
                  title="Detach OCR context"
                  aria-label="Detach scanned text"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Primary Voice Assistant Microphone & Dialogue Panel */}
          {isVoiceSessionOpen && (
            <div style={{ marginBottom: "0.5rem" }}>
              <VoiceWaveformOverlay
                position="inline"
                onStop={() => stopListening()}
                onCancel={() => closeVoiceSession()}
              />
            </div>
          )}

          {/* Chat Composer Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="tutor-input-form"
          >
            <button
              type="button"
              onClick={() => {
                if (voiceState === "listening" || voiceState === "requesting_permission") {
                  stopListening();
                } else if (isVoiceSessionOpen) {
                  closeVoiceSession();
                } else {
                  startListening(activeContext || "", "Tutor Question");
                }
              }}
              className={`tutor-mic-btn ${
                isVoiceSessionOpen ? "listening" : ""
              }`}
              title={
                isVoiceSessionOpen
                  ? "Voice assistant open... Tap to close"
                  : "Speak question (Microphone)"
              }
              aria-label={
                isVoiceSessionOpen ? "Voice assistant open... Tap to close" : "Start voice input"
              }
            >
              <Mic size={20} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeContext
                  ? "Ask about this text (e.g. 'Explain this', 'Give an example')..."
                  : "Ask your tutor anything or what's in front of you..."
              }
              className="tutor-text-input"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="tutor-send-btn"
              aria-label="Send query"
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
      </main>

      <style>{`
        .tutor-container-root {
          display: flex;
          height: calc(100vh - 4.5rem);
          height: calc(100dvh - 4.5rem);
          position: relative;
          overflow: hidden;
          gap: 1rem;
          padding: 0.5rem 0;
          box-sizing: border-box;
        }

        /* Mobile Drawer Backdrop */
        .tutor-mobile-backdrop {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        /* Sidebar */
        .tutor-sidebar {
          width: 290px;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          padding: 1rem;
          flex-shrink: 0;
          background: var(--glass-bg-subtle);
          border: 1px solid var(--glass-border-subtle);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .tutor-sidebar-header {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          margin-bottom: 1rem;
        }

        .tutor-sidebar-close-btn {
          display: none;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .tutor-sidebar-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding-right: 0.2rem;
        }

        .tutor-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-md);
          background-color: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        body.theme-black .tutor-history-item {
          background-color: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.06);
        }

        .tutor-history-item:hover {
          background-color: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.25);
        }

        .tutor-history-item.active {
          background-color: var(--accent-primary-subtle);
          border-color: var(--accent-primary);
        }

        .tutor-history-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tutor-history-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          color: var(--text-tertiary);
          margin-top: 2px;
        }

        .tutor-history-delete-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          opacity: 0.6;
          transition: opacity 0.15s ease;
        }

        .tutor-history-delete-btn:hover {
          opacity: 1;
          color: var(--accent-rose, #f43f5e);
        }

        /* Main Workstation */
        .tutor-main-workstation {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--glass-bg-base);
          border: 1px solid var(--glass-border-subtle);
          min-width: 0;
        }

        .tutor-header-bar {
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid var(--glass-border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--glass-bg-subtle);
          flex-shrink: 0;
        }

        .tutor-mobile-menu-trigger {
          display: none;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--glass-border-subtle);
          color: var(--text-primary);
          width: 38px;
          height: 38px;
          border-radius: 10px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .tutor-brand-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-blue-deep, #1d4ed8));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          flex-shrink: 0;
        }

        .tutor-header-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        .tutor-header-sub {
          font-size: 0.75rem;
          margin: 0;
          color: var(--text-tertiary);
        }

        .tutor-header-context-badge {
          flex-shrink: 0;
        }

        .tutor-pill-ocr {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          background: var(--accent-amber-subtle);
          color: var(--accent-amber);
          border: 1px solid rgba(245, 158, 11, 0.3);
          font-weight: 600;
        }

        .tutor-pill-vision {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          background: rgba(20, 184, 166, 0.12);
          color: var(--accent-teal, #14b8a6);
          border: 1px solid rgba(20, 184, 166, 0.3);
          font-weight: 600;
        }

        .tutor-pill-general {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          color: var(--text-tertiary);
        }

        /* Message Scroll Area */
        .tutor-messages-scroll-area {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-height: 0;
        }

        .tutor-empty-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-tertiary);
          text-align: center;
          gap: 1rem;
          padding: 1rem;
        }

        .tutor-welcome-sparkle-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--accent-primary-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }

        .tutor-quick-prompts-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          max-width: 520px;
          justify-content: center;
          margin-top: 0.5rem;
        }

        .tutor-quick-prompt-btn {
          padding: 0.55rem 0.95rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          color: var(--text-secondary);
          cursor: pointer;
          border: 1px solid var(--glass-border-subtle);
          background: var(--glass-bg-subtle);
          transition: all 0.15s ease;
        }

        .tutor-quick-prompt-btn:hover {
          color: var(--text-primary);
          border-color: var(--accent-primary);
          background: var(--accent-primary-subtle);
        }

        /* Message Bubbles */
        .tutor-msg-row {
          display: flex;
          gap: 0.75rem;
          max-width: 85%;
        }

        .tutor-msg-row.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .tutor-msg-row.assistant {
          align-self: flex-start;
          flex-direction: row;
        }

        .tutor-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tutor-avatar.user {
          background: var(--accent-primary);
          color: #ffffff;
        }

        .tutor-avatar.assistant {
          background: var(--glass-bg-subtle);
          color: var(--accent-primary);
          border: 1px solid var(--glass-border-subtle);
        }

        .tutor-avatar.error {
          background: rgba(244, 63, 94, 0.2);
          color: var(--accent-rose, #f43f5e);
          border: 1px solid rgba(244, 63, 94, 0.4);
        }

        .tutor-bubble {
          padding: 0.85rem 1.15rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        .tutor-bubble.user {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-blue-deep, #1d4ed8));
          color: #ffffff;
          border-radius: 16px 16px 2px 16px;
        }

        .tutor-bubble.assistant {
          background: var(--glass-bg-subtle);
          color: var(--text-primary);
          border-radius: 16px 16px 16px 2px;
          border: 1px solid var(--glass-border-subtle);
        }

        .tutor-bubble.assistant.thinking {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .tutor-bubble.error {
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 16px 16px 16px 2px;
          color: var(--text-primary);
        }

        .tutor-bubble-content {
          font-size: 0.95rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .tutor-error-action-row {
          margin-top: 0.65rem;
          display: flex;
          gap: 0.5rem;
        }

        .tutor-retry-btn {
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.35);
          color: var(--text-primary);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm, 6px);
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .tutor-retry-btn:hover {
          background: rgba(244, 63, 94, 0.3);
        }

        .tutor-tts-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding-top: 0.4rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tutor-tts-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          transition: color 0.15s ease;
        }

        .tutor-tts-btn:hover {
          color: var(--text-primary);
        }

        /* Composer Area & Attachment Chip */
        .tutor-composer-area {
          padding: 0.75rem 1.25rem;
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 12px));
          background: var(--glass-bg-subtle);
          border-top: 1px solid var(--glass-border-subtle);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        /* The Attachment Chip */
        .tutor-attachment-chip-bar {
          display: flex;
          width: 100%;
        }

        .tutor-attachment-chip {
          display: flex;
          align-items: flex-start;
          width: 100%;
          gap: 0.6rem;
          padding: 0.6rem 0.85rem;
          border-radius: var(--radius-md, 8px);
          background: rgba(245, 158, 11, 0.09);
          border: 1px solid rgba(245, 158, 11, 0.28);
        }

        .tutor-attachment-icon {
          color: var(--accent-amber);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .tutor-attachment-content {
          flex: 1;
          min-width: 0;
        }

        .tutor-attachment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
        }

        .tutor-attachment-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--accent-amber);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .tutor-attachment-toggle-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 0.72rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0;
        }

        .tutor-attachment-toggle-btn:hover {
          color: var(--text-primary);
        }

        .tutor-attachment-preview {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .tutor-attachment-preview.collapsed {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tutor-attachment-preview.expanded {
          max-height: 140px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .tutor-attachment-detach-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          flex-shrink: 0;
          transition: color 0.15s ease;
        }

        .tutor-attachment-detach-btn:hover {
          color: var(--accent-rose, #f43f5e);
        }

        /* Composer Input Form */
        .tutor-input-form {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
        }

        .tutor-mic-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--glass-bg-base);
          color: var(--text-primary);
          border: 1px solid var(--glass-border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .tutor-mic-btn.listening {
          background: #10b981;
          color: #ffffff;
          border-color: #059669;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.45);
          animation: tutor-mic-pulse 1.5s infinite ease-in-out;
        }

        @keyframes tutor-mic-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(16, 185, 129, 0.4); }
          50% { transform: scale(1.06); box-shadow: 0 0 20px rgba(16, 185, 129, 0.7); }
        }

        .tutor-text-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-full);
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.16);
          color: #0f172a;
          font-size: 0.95rem;
          outline: none;
          min-width: 0;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .tutor-text-input::placeholder {
          color: #64748b;
        }

        .tutor-text-input:focus {
          border-color: var(--accent-primary, #6366f1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
        }

        body.theme-black .tutor-text-input {
          background: #0f172a;
          border-color: rgba(255, 255, 255, 0.18);
          color: #f8fafc;
        }

        body.theme-black .tutor-text-input::placeholder {
          color: #94a3b8;
        }

        .tutor-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .tutor-send-btn:disabled {
          background: var(--glass-bg-subtle);
          color: var(--text-tertiary);
          cursor: not-allowed;
        }

        .pulsing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--accent-primary);
          animation: pulse-dot 1.2s infinite ease-in-out;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        /* Mobile Layout Queries */
        @media (max-width: 768px) {
          .tutor-container-root {
            height: calc(100dvh - 4rem);
            padding: 0;
            gap: 0;
          }

          .tutor-main-workstation {
            border-radius: 0;
            border-left: none;
            border-right: none;
          }

          .tutor-mobile-menu-trigger {
            display: flex;
          }

          .tutor-sidebar-close-btn {
            display: flex;
          }

          .tutor-msg-row {
            max-width: 92%;
          }

          #tutor-history-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(85vw, 360px);
            z-index: 100;
            transform: translateX(-105%);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
            background: #ffffff;
            border-right: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 0 16px 16px 0;
            border-left: none;
            padding: 1.25rem 1rem;
            color: #0f172a;
          }

          body.theme-black #tutor-history-sidebar {
            background: #0b0f19;
            border-right-color: rgba(255, 255, 255, 0.14);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.85);
            color: #f8fafc;
          }

          #tutor-history-sidebar.open {
            transform: translateX(0);
          }

          .tutor-header-bar {
            padding: 0.75rem 1rem;
          }

          .tutor-composer-area {
            padding: 0.65rem 0.85rem;
            padding-bottom: max(0.65rem, env(safe-area-inset-bottom, 12px));
          }
        }
      `}</style>
    </div>
  );
}
