import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HeroPerceptionScene from "../components/landing/HeroPerceptionScene";
import "../styles/landing.css";
import {
  Eye,
  BookOpen,
  Mic,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Volume2,
  ScanLine,
  Compass,
  Zap,
  CheckCircle2,
  Menu,
  X,
  Keyboard,
  Layers,
  HelpCircle,
  Activity,
  Maximize2
} from "lucide-react";

export default function LandingPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position for navbar glass effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine destination: if user already has an active session, navigate directly to dashboard
  const primaryCtaDestination = token ? "/dashboard" : "/login";
  const primaryCtaLabel = token ? "Launch Workspace" : "Use Now";

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-container">
      {/* Dynamic Background Grid and Ambient Glows */}
      <div className="landing-grid-lines" />
      <div
        className="landing-ambient-glow"
        style={{
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(41, 151, 255, 0.12) 0%, rgba(56, 189, 248, 0.04) 50%, transparent 70%)",
        }}
      />
      <div
        className="landing-ambient-glow"
        style={{
          top: "45%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 65%)",
        }}
      />
      <div
        className="landing-ambient-glow"
        style={{
          top: "75%",
          left: "-10%",
          width: "550px",
          height: "550px",
          background: "radial-gradient(circle, rgba(41, 151, 255, 0.09) 0%, transparent 65%)",
        }}
      />

      {/* =========================================================================
          1. MINIMAL TOP NAVIGATION
          ========================================================================= */}
      <header
        role="banner"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
          transition: "all var(--duration-fast) var(--ease-apple)",
          backgroundColor: scrolled ? "rgba(5, 6, 8, 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid var(--lp-border)" : "1px solid transparent",
        }}
      >
        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand Mark */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              color: "var(--lp-text-primary)",
            }}
            aria-label="Assistive Tutor Home"
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0071e3 0%, #2997ff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 0 16px rgba(41, 151, 255, 0.4)",
              }}
            >
              <Eye size={20} />
            </div>
            <div>
              <span style={{ fontWeight: 750, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
                Assistive Tutor
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.68rem",
                  color: "var(--lp-text-tertiary)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginTop: "-1px",
                }}
              >
                Vision & Voice AI
              </span>
            </div>
          </Link>

          {/* Desktop Center Links */}
          <nav
            role="navigation"
            aria-label="Main Navigation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2rem",
            }}
            className="desktop-nav"
          >
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              style={{
                color: "var(--lp-text-secondary)",
                fontSize: "0.88rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color var(--duration-fast)",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--lp-text-primary)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--lp-text-secondary)")}
            >
              How it works
            </a>
            <a
              href="#experience"
              onClick={(e) => scrollToSection(e, "experience")}
              style={{
                color: "var(--lp-text-secondary)",
                fontSize: "0.88rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color var(--duration-fast)",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--lp-text-primary)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--lp-text-secondary)")}
            >
              The Experience
            </a>
            <a
              href="#capabilities"
              onClick={(e) => scrollToSection(e, "capabilities")}
              style={{
                color: "var(--lp-text-secondary)",
                fontSize: "0.88rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color var(--duration-fast)",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--lp-text-primary)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--lp-text-secondary)")}
            >
              Capabilities
            </a>
            <a
              href="#accessibility"
              onClick={(e) => scrollToSection(e, "accessibility")}
              style={{
                color: "var(--lp-text-secondary)",
                fontSize: "0.88rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color var(--duration-fast)",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--lp-text-primary)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--lp-text-secondary)")}
            >
              Accessibility
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {token ? (
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--lp-accent-cyan)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                }}
                className="desktop-nav"
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "var(--lp-accent-cyan)",
                    boxShadow: "0 0 8px var(--lp-accent-cyan)",
                  }}
                />
                Session Active
              </span>
            ) : (
              <Link
                to="/login"
                style={{
                  color: "var(--lp-text-secondary)",
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  padding: "0.45rem 0.85rem",
                  transition: "color var(--duration-fast)",
                }}
                className="desktop-nav"
                onMouseEnter={(e) => (e.target.style.color = "var(--lp-text-primary)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--lp-text-secondary)")}
              >
                Sign In
              </Link>
            )}

            <Link
              to={primaryCtaDestination}
              className="landing-btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.88rem" }}
              id="nav-use-now-btn"
              aria-label={`${primaryCtaLabel} - Launch Assistive Tutor`}
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight size={15} />
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="mobile-menu-btn"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--lp-text-primary)",
                padding: "0.45rem",
                cursor: "pointer",
                display: "none",
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: "1.25rem 1.5rem 2rem",
              background: "rgba(5, 6, 8, 0.98)",
              borderBottom: "1px solid var(--lp-border)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              style={{ color: "var(--lp-text-primary)", textDecoration: "none", fontSize: "1.05rem" }}
            >
              How it works
            </a>
            <a
              href="#experience"
              onClick={(e) => scrollToSection(e, "experience")}
              style={{ color: "var(--lp-text-primary)", textDecoration: "none", fontSize: "1.05rem" }}
            >
              The Experience
            </a>
            <a
              href="#capabilities"
              onClick={(e) => scrollToSection(e, "capabilities")}
              style={{ color: "var(--lp-text-primary)", textDecoration: "none", fontSize: "1.05rem" }}
            >
              Capabilities
            </a>
            <a
              href="#accessibility"
              onClick={(e) => scrollToSection(e, "accessibility")}
              style={{ color: "var(--lp-text-primary)", textDecoration: "none", fontSize: "1.05rem" }}
            >
              Accessibility
            </a>
            <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--lp-border)", display: "flex", gap: "1rem" }}>
              <Link
                to={primaryCtaDestination}
                className="landing-btn-primary"
                style={{ width: "100%" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{primaryCtaLabel}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION — THE PERCEPTION SCULPTURE & EDITORIAL HEADLINE
          ========================================================================= */}
      <section
        aria-label="Hero Introduction"
        style={{
          position: "relative",
          minHeight: "calc(100vh - 72px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3.5rem 1.5rem 5rem",
          maxWidth: "1240px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Interactive Background Particle Perception Sculpture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: 0.85,
            pointerEvents: "none",
          }}
        >
          <HeroPerceptionScene />
        </div>

        {/* Foreground Content Stack */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: "860px", margin: "0 auto" }}>
          {/* Eyebrow Pill */}
          <div style={{ marginBottom: "1.75rem" }}>
            <span className="landing-eyebrow">
              <Sparkles size={13} style={{ color: "var(--lp-accent-cyan)" }} />
              <span>Intelligence That Makes The World More Accessible</span>
            </span>
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
              fontWeight: 750,
              lineHeight: 1.1,
              letterSpacing: "-0.035em",
              color: "#ffffff",
              margin: "0 0 1.5rem 0",
              textWrap: "balance",
            }}
          >
            Understand the world.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #ffffff 30%, #38bdf8 70%, #2997ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              One interaction at a time.
            </span>
          </h1>

          {/* Supporting Copy */}
          <p
            style={{
              fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
              lineHeight: 1.65,
              color: "var(--lp-text-secondary)",
              maxWidth: "680px",
              margin: "0 auto 2.5rem",
              textWrap: "pretty",
            }}
          >
            An AI-powered assistive companion that helps visually impaired students explore
            their surroundings, read printed text and learn through natural conversation.
          </p>

          {/* Hero CTAs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              to={primaryCtaDestination}
              className="landing-btn-primary"
              id="hero-use-now-btn"
              aria-label={`${primaryCtaLabel} - Launch Live Assistive Tutor`}
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight size={17} />
            </Link>

            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="landing-btn-secondary"
              aria-label="Explore the experience - jump to how it works"
            >
              <span>Explore the experience</span>
            </a>
          </div>

          {/* Understated Descriptor Pill */}
          <div
            style={{
              marginTop: "3.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "1.25rem",
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              color: "var(--lp-text-tertiary)",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            <span>Vision</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>Text</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>Voice</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>Learning</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SECTION TWO — HOW IT WORKS (THREE CONNECTED MODES)
          ========================================================================= */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-title"
        style={{
          padding: "6rem 1.5rem",
          maxWidth: "1240px",
          margin: "0 auto",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 4.5rem" }}>
          <span className="landing-eyebrow" style={{ marginBottom: "1rem" }}>
            A More Intuitive Way To Learn
          </span>
          <h2
            id="how-it-works-title"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 750,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: "0.75rem 0 1rem",
            }}
          >
            See. Read. Ask. Understand.
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "var(--lp-text-secondary)",
              margin: 0,
            }}
          >
            Move naturally between understanding your surroundings, reading printed information
            and asking questions about what matters to you.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2rem",
          }}
        >
          {/* Card 1: Vision Mode */}
          <div className="landing-card" style={{ padding: "2.25rem", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(41, 151, 255, 0.12)",
                color: "var(--lp-accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                border: "1px solid rgba(41, 151, 255, 0.25)",
              }}
            >
              <Compass size={24} />
            </div>

            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--lp-accent-cyan)", fontWeight: 700, marginBottom: "0.4rem" }}>
              Mode 01 · Vision
            </div>

            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.85rem" }}>
              Understand your surroundings
            </h3>

            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--lp-text-secondary)", marginBottom: "2rem", flexGrow: 1 }}>
              Use the camera and object detection to identify supported objects in the visible
              environment and receive spoken descriptions.
            </p>

            {/* Interactive Visual: Viewfinder Simulation */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                position: "relative",
                overflow: "hidden",
                minHeight: "180px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--lp-accent-green)", display: "flex", alignItems: "center", gap: "5px", fontWeight: 700 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--lp-accent-green)" }} />
                  LIVE SPATIAL MAP
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--lp-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  24 FPS · 42ms
                </span>
              </div>

              {/* Bounding Box Visuals */}
              <div style={{ position: "relative", height: "90px", margin: "0.5rem 0" }}>
                <div
                  style={{
                    position: "absolute",
                    top: "10%",
                    left: "8%",
                    width: "48%",
                    height: "80%",
                    border: "1.5px solid var(--lp-accent-blue)",
                    borderRadius: "6px",
                    background: "rgba(41, 151, 255, 0.08)",
                    padding: "4px 8px",
                  }}
                >
                  <span style={{ fontSize: "0.68rem", color: "#ffffff", fontWeight: 650, background: "var(--lp-accent-blue)", padding: "1px 5px", borderRadius: "3px" }}>
                    Textbook 96%
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: "22%",
                    right: "10%",
                    width: "30%",
                    height: "65%",
                    border: "1.5px dashed rgba(56, 189, 248, 0.7)",
                    borderRadius: "6px",
                    background: "rgba(56, 189, 248, 0.06)",
                    padding: "4px 6px",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", color: "var(--lp-accent-cyan)", fontWeight: 650 }}>
                    Study Lamp
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--lp-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Volume2 size={13} style={{ color: "var(--lp-accent-cyan)" }} />
                <span>"Textbook in front, lamp to your upper right."</span>
              </div>
            </div>
          </div>

          {/* Card 2: Text Mode */}
          <div className="landing-card" style={{ padding: "2.25rem", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(56, 189, 248, 0.12)",
                color: "var(--lp-accent-cyan)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                border: "1px solid rgba(56, 189, 248, 0.25)",
              }}
            >
              <ScanLine size={24} />
            </div>

            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--lp-accent-cyan)", fontWeight: 700, marginBottom: "0.4rem" }}>
              Mode 02 · OCR
            </div>

            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.85rem" }}>
              Turn printed words into knowledge
            </h3>

            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--lp-text-secondary)", marginBottom: "2rem", flexGrow: 1 }}>
              Scan a notebook, book or printed document, recognize its text, and use the result
              as context for reading and learning.
            </p>

            {/* Interactive Visual: Document Scanner Simulation */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                position: "relative",
                overflow: "hidden",
                minHeight: "180px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--lp-accent-cyan)", display: "flex", alignItems: "center", gap: "5px", fontWeight: 700 }}>
                  <ScanLine size={12} />
                  GOOGLE LENS-STYLE OCR
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--lp-text-tertiary)" }}>
                  28 Words Extracted
                </span>
              </div>

              {/* Scanning Laser Beam */}
              <div
                className="animate-laser"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(90deg, transparent, #38bdf8, transparent)",
                  boxShadow: "0 0 10px #38bdf8",
                  zIndex: 2,
                }}
              />

              {/* Document Text Mockup */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "0.6rem 0" }}>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(41, 151, 255, 0.25)", color: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                    Theorem 4.1
                  </span>
                  <span style={{ background: "rgba(255, 255, 255, 0.08)", color: "#94a3b8", padding: "1px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>
                    Continuous
                  </span>
                  <span style={{ background: "rgba(255, 255, 255, 0.08)", color: "#94a3b8", padding: "1px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>
                    Functions
                  </span>
                </div>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(41, 151, 255, 0.25)", color: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                    Every differentiable function
                  </span>
                  <span style={{ background: "rgba(41, 151, 255, 0.25)", color: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                    is continuous.
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--lp-accent-cyan)", display: "flex", alignItems: "center", gap: "5px" }}>
                <CheckCircle2 size={13} />
                <span>Text selected & ready for explanation</span>
              </div>
            </div>
          </div>

          {/* Card 3: Assistive Tutor */}
          <div className="landing-card" style={{ padding: "2.25rem", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--lp-accent-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <Mic size={24} />
            </div>

            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--lp-accent-green)", fontWeight: 700, marginBottom: "0.4rem" }}>
              Mode 03 · Tutor
            </div>

            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.85rem" }}>
              Ask naturally. Learn deeply.
            </h3>

            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--lp-text-secondary)", marginBottom: "2rem", flexGrow: 1 }}>
              Ask spoken or typed questions, request explanations and continue with follow-up
              questions grounded in the relevant scanned text and available context.
            </p>

            {/* Interactive Visual: Tutor Dialogue Simulation */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                position: "relative",
                overflow: "hidden",
                minHeight: "180px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--lp-accent-green)", display: "flex", alignItems: "center", gap: "5px", fontWeight: 700 }}>
                  <Sparkles size={12} />
                  CONTEXTUAL TUTOR
                </span>
                {/* Live Waveform Indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "14px" }}>
                  <div className="voice-bar" style={{ width: "3px", height: "14px", background: "var(--lp-accent-green)", borderRadius: "2px" }} />
                  <div className="voice-bar" style={{ width: "3px", height: "10px", background: "var(--lp-accent-green)", borderRadius: "2px", animationDelay: "0.2s" }} />
                  <div className="voice-bar" style={{ width: "3px", height: "16px", background: "var(--lp-accent-green)", borderRadius: "2px", animationDelay: "0.4s" }} />
                  <div className="voice-bar" style={{ width: "3px", height: "8px", background: "var(--lp-accent-green)", borderRadius: "2px", animationDelay: "0.1s" }} />
                </div>
              </div>

              {/* Dialogue Bubble */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "0.5rem 0" }}>
                <div style={{ alignSelf: "flex-end", background: "rgba(255, 255, 255, 0.08)", padding: "5px 10px", borderRadius: "10px 10px 2px 10px", fontSize: "0.75rem", color: "#ffffff" }}>
                  "Can you explain Theorem 4.1 simply?"
                </div>
                <div style={{ alignSelf: "flex-start", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "6px 10px", borderRadius: "10px 10px 10px 2px", fontSize: "0.75rem", color: "var(--lp-text-primary)", lineHeight: 1.4 }}>
                  "It means if a curve has a smooth slope at every point, it cannot have any sudden jumps or breaks."
                </div>
              </div>

              <div style={{ fontSize: "0.72rem", color: "var(--lp-text-tertiary)" }}>
                Audio spoken via natural voice synthesis
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. SECTION THREE — SHOW THE CONNECTED EXPERIENCE
          ========================================================================= */}
      <section
        id="experience"
        aria-labelledby="experience-title"
        style={{
          padding: "6rem 1.5rem",
          maxWidth: "1240px",
          margin: "0 auto",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 4.5rem" }}>
          <span className="landing-eyebrow" style={{ marginBottom: "1rem" }}>
            Continuous Experience
          </span>
          <h2
            id="experience-title"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 750,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: "0.75rem 0 1rem",
            }}
          >
            Observe. Scan. Ask. Understand.
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "var(--lp-text-secondary)",
              margin: 0,
            }}
          >
            Real assistive intelligence never isolates features into disconnected silos. Watch how
            one natural student interaction flows into the next without losing context.
          </p>
        </div>

        {/* Narrative Flow Grid (Horizontal Sequence) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
            position: "relative",
          }}
        >
          {/* Step 1 */}
          <div className="landing-card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--lp-accent-blue)", fontFamily: "var(--font-mono)" }}>
                PHASE 01
              </span>
              <Eye size={18} style={{ color: "var(--lp-accent-blue)" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.6rem" }}>
              Observe
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--lp-text-secondary)", lineHeight: 1.55, margin: 0 }}>
              The student points their smartphone camera at their desk and asks what is in front of them. The system confirms nearby objects and spatial locations through spoken voice.
            </p>
          </div>

          {/* Step 2 */}
          <div className="landing-card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--lp-accent-cyan)", fontFamily: "var(--font-mono)" }}>
                PHASE 02
              </span>
              <ScanLine size={18} style={{ color: "var(--lp-accent-cyan)" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.6rem" }}>
              Scan
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--lp-text-secondary)", lineHeight: 1.55, margin: 0 }}>
              The student taps "Read Text" or uses the single-key trigger. High-resolution OCR analyzes the page, detecting document boundaries and organizing words into readable segments.
            </p>
          </div>

          {/* Step 3 */}
          <div className="landing-card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--lp-accent-green)", fontFamily: "var(--font-mono)" }}>
                PHASE 03
              </span>
              <Mic size={18} style={{ color: "var(--lp-accent-green)" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.6rem" }}>
              Ask
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--lp-text-secondary)", lineHeight: 1.55, margin: 0 }}>
              The student taps the microphone and asks to clarify an ambiguous equation or paragraph. The question is streamed directly alongside the active scanned document context.
            </p>
          </div>

          {/* Step 4 */}
          <div className="landing-card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                PHASE 04
              </span>
              <Sparkles size={18} style={{ color: "var(--lp-accent-cyan)" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.6rem" }}>
              Understand
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--lp-text-secondary)", lineHeight: 1.55, margin: 0 }}>
              The conversational tutor provides a clear, grounded explanation tailored to student learning, followed by audible answers to follow-up inquiries.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. SECTION FOUR — PRODUCT CAPABILITIES
          ========================================================================= */}
      <section
        id="capabilities"
        aria-labelledby="capabilities-title"
        style={{
          padding: "6rem 1.5rem",
          maxWidth: "1240px",
          margin: "0 auto",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 4.5rem" }}>
          <span className="landing-eyebrow" style={{ marginBottom: "1rem" }}>
            Product Capabilities
          </span>
          <h2
            id="capabilities-title"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 750,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: "0.75rem 0 1rem",
            }}
          >
            Engineered for tactile independence.
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "var(--lp-text-secondary)",
              margin: 0,
            }}
          >
            Explore the specialized capabilities that empower students to navigate both physical
            environments and complex academic materials.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "1.5rem",
          }}
        >
          {/* Bento Item 1 (Wide): FieldNet Neural Vision */}
          <div
            className="landing-card"
            style={{
              gridColumn: "span 12",
              padding: "2.5rem",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "2rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: "580px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--lp-accent-blue)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                <Cpu size={14} />
                <span>FieldNet V3 Neural Engine</span>
              </div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.85rem" }}>
                Real-Time Spatial Detection & False-Positive Filtering
              </h3>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--lp-text-secondary)", margin: 0 }}>
                Continuous video perception backed by temporal box confirmation and spatial mapping. Filters transient noise and false positives, ensuring spoken announcements reflect stable, confirmed objects in the student's study perimeter.
              </p>
            </div>
            <div
              style={{
                background: "rgba(0, 0, 0, 0.65)",
                padding: "1.25rem 1.75rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                minWidth: "240px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--lp-text-secondary)" }}>Temporal Filter</span>
                <span style={{ color: "var(--lp-accent-green)", fontWeight: 600 }}>Active (0.65)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--lp-text-secondary)" }}>Spatial Map</span>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>Front-Center</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--lp-text-secondary)" }}>Confidence Threshold</span>
                <span style={{ color: "var(--lp-accent-blue)", fontWeight: 600 }}>&gt; 50%</span>
              </div>
            </div>
          </div>

          {/* Bento Item 2: OCR */}
          <div
            className="landing-card bento-col-6"
            style={{
              gridColumn: "span 6",
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--lp-accent-cyan)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
              <ScanLine size={14} />
              <span>In-Camera OCR</span>
            </div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.75rem" }}>
              Word & Paragraph Segmentation
            </h3>
            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--lp-text-secondary)", margin: 0, flexGrow: 1 }}>
              Extracts high-resolution text with perspective compensation. Enables students to select individual words or entire paragraphs with tactile feedback for instant speech synthesis or tutor explanation.
            </p>
          </div>

          {/* Bento Item 3: Voice Dialogue */}
          <div
            className="landing-card bento-col-6"
            style={{
              gridColumn: "span 6",
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--lp-accent-green)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
              <Mic size={14} />
              <span>Unified Voice Interface</span>
            </div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.75rem" }}>
              Live Audio Waveform & Dialogue
            </h3>
            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--lp-text-secondary)", margin: 0, flexGrow: 1 }}>
              Hands-free voice recognition with real-time audio frequency visualization. Automatically halts background object narration during questioning so students hear answers without audio collisions.
            </p>
          </div>

          {/* Bento Item 4: AI Tutor */}
          <div
            className="landing-card bento-col-4"
            style={{
              gridColumn: "span 4",
              padding: "2rem",
            }}
          >
            <Sparkles size={20} style={{ color: "var(--lp-accent-blue)", marginBottom: "1rem" }} />
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.5rem" }}>
              Conversational Tutor
            </h4>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.55, color: "var(--lp-text-secondary)", margin: 0 }}>
              Grounded in current camera and OCR context to answer educational questions, simplify complex readings, and summarize chapters.
            </p>
          </div>

          {/* Bento Item 5: Tactile Controls */}
          <div
            className="landing-card bento-col-4"
            style={{
              gridColumn: "span 4",
              padding: "2rem",
            }}
          >
            <Keyboard size={20} style={{ color: "var(--lp-accent-cyan)", marginBottom: "1rem" }} />
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.5rem" }}>
              Tactile Key Hotkeys
            </h4>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.55, color: "var(--lp-text-secondary)", margin: 0 }}>
              Single-key shortcuts: 'V' to speak, 'S' to silence speech, 'P' to pause vision, and 'R' to repeat the last spoken narration.
            </p>
          </div>

          {/* Bento Item 6: Digital Twin */}
          <div
            className="landing-card bento-col-4"
            style={{
              gridColumn: "span 4",
              padding: "2rem",
            }}
          >
            <Activity size={20} style={{ color: "var(--lp-accent-green)", marginBottom: "1rem" }} />
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.5rem" }}>
              Digital Twin Map
            </h4>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.55, color: "var(--lp-text-secondary)", margin: 0 }}>
              Maintains an active 2D top-down environment representation of nearby objects and provides a session audit trail.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. SECTION FIVE — ACCESSIBILITY IS THE PRODUCT'S FOUNDATION
          ========================================================================= */}
      <section
        id="accessibility"
        aria-labelledby="accessibility-title"
        style={{
          padding: "6rem 1.5rem",
          maxWidth: "1240px",
          margin: "0 auto",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div
          className="landing-card"
          style={{
            padding: "clamp(2.5rem, 5vw, 4.5rem)",
            background: "linear-gradient(180deg, rgba(15, 20, 32, 0.8) 0%, rgba(10, 14, 24, 0.95) 100%)",
            border: "1px solid rgba(41, 151, 255, 0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
            <span className="landing-eyebrow" style={{ marginBottom: "1.25rem" }}>
              <ShieldCheck size={14} style={{ color: "var(--lp-accent-cyan)" }} />
              <span>Accessibility First</span>
            </span>

            <h2
              id="accessibility-title"
              style={{
                fontSize: "clamp(2.1rem, 4.5vw, 3.2rem)",
                fontWeight: 750,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                margin: "0.85rem 0 1.25rem",
                textWrap: "balance",
              }}
            >
              Technology should open doors, not add barriers.
            </h2>

            <p
              style={{
                fontSize: "1.1rem",
                lineHeight: 1.7,
                color: "var(--lp-text-secondary)",
                marginBottom: "3.5rem",
              }}
            >
              Designed around voice interaction, readable information and a more natural way
              to engage with the world. Built to provide dignity, autonomy, and non-visual control.
            </p>
          </div>

          {/* Pillars List */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2rem",
              textAlign: "left",
            }}
          >
            <div>
              <div style={{ color: "var(--lp-accent-blue)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                Voice-Led Interaction
              </div>
              <p style={{ color: "var(--lp-text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                Every critical capability can be triggered via spoken speech commands or single tactile keyboard shortcuts.
              </p>
            </div>

            <div>
              <div style={{ color: "var(--lp-accent-cyan)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                Auditory Feedback
              </div>
              <p style={{ color: "var(--lp-text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                Spoken descriptions, speech rate adjustments, and ARIA live announcements keep students fully informed without visual feedback.
              </p>
            </div>

            <div>
              <div style={{ color: "var(--lp-accent-green)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                High-Contrast Ergonomics
              </div>
              <p style={{ color: "var(--lp-text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                Deep black backgrounds and curated luminous typography ensure comfortable reading for low-vision and photophobic users.
              </p>
            </div>

            <div>
              <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                Responsive Mobile Access
              </div>
              <p style={{ color: "var(--lp-text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                Operates smoothly on mobile phones directly over local WiFi, providing portable camera vision wherever students study.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. SECTION SIX — FINAL CTA & FOOTER
          ========================================================================= */}
      <section
        aria-label="Get Started"
        style={{
          padding: "7rem 1.5rem 5rem",
          maxWidth: "1240px",
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
              fontWeight: 750,
              letterSpacing: "-0.035em",
              color: "#ffffff",
              margin: "0 0 1.25rem",
              lineHeight: 1.15,
            }}
          >
            A more accessible way to explore, read and learn.
          </h2>

          <p
            style={{
              fontSize: "1.15rem",
              color: "var(--lp-text-secondary)",
              lineHeight: 1.6,
              maxWidth: "580px",
              margin: "0 auto 2.5rem",
            }}
          >
            Start with your surroundings. Continue with your curiosity.
          </p>

          <Link
            to={primaryCtaDestination}
            className="landing-btn-primary"
            style={{ padding: "0.95rem 2.25rem", fontSize: "1.05rem" }}
            id="bottom-use-now-btn"
            aria-label={`${primaryCtaLabel} - Enter Assistive Tutor`}
          >
            <span>{primaryCtaLabel}</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        role="contentinfo"
        style={{
          borderTop: "1px solid var(--lp-border)",
          padding: "3.5rem 1.5rem 4rem",
          maxWidth: "1240px",
          margin: "0 auto",
          color: "var(--lp-text-tertiary)",
          fontSize: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "var(--lp-accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <Eye size={16} />
            </div>
            <span style={{ fontWeight: 700, color: "var(--lp-text-primary)", fontSize: "0.95rem" }}>
              Assistive Tutor
            </span>
          </div>

          <div style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap" }}>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, "how-it-works")} style={{ color: "var(--lp-text-secondary)", textDecoration: "none" }}>
              How it works
            </a>
            <a href="#experience" onClick={(e) => scrollToSection(e, "experience")} style={{ color: "var(--lp-text-secondary)", textDecoration: "none" }}>
              The Experience
            </a>
            <a href="#capabilities" onClick={(e) => scrollToSection(e, "capabilities")} style={{ color: "var(--lp-text-secondary)", textDecoration: "none" }}>
              Capabilities
            </a>
            <a href="#accessibility" onClick={(e) => scrollToSection(e, "accessibility")} style={{ color: "var(--lp-text-secondary)", textDecoration: "none" }}>
              Accessibility
            </a>
            <Link to="/about" style={{ color: "var(--lp-text-secondary)", textDecoration: "none" }}>
              About Project
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
            paddingTop: "1.5rem",
            fontSize: "0.8rem",
          }}
        >
          <div>
            AI Assistive Tutor for Visually Impaired Students · Computer Vision & Natural Voice AI
          </div>
          <div>
            Pure OLED Dark Aesthetics · Accessibility First
          </div>
        </div>
      </footer>

      {/* Responsive Style Overrides */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .bento-col-6 {
            grid-column: span 12 !important;
          }
          .bento-col-4 {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}
