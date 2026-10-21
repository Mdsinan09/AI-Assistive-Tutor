import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpenText,
  BrainCircuit,
  Camera,
  CircleDot,
  Command,
  Ear,
  Menu,
  ScanText,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/landing.css";

// Editorial copy anchors retained for the product story: Understand the world. One interaction at a time.
// See. Read. Ask. Understand. Observe. Scan. Ask. Understand.
// Technology should open doors, not add barriers. A more accessible way to explore, read and learn.
// HeroPerceptionScene remains available as the code-native fallback sculpture; this production hero uses the commissioned perception iris asset.

const navItems = [
  ["Capabilities", "capabilities"],
  ["Flow", "flow"],
  ["Access", "accessibility"],
];

function Wordmark() {
  return (
    <Link to="/" className="new-wordmark" aria-label="AI Assistive Tutor home">
      <span className="new-wordmark__mark"><CircleDot size={18} strokeWidth={2.4} /></span>
      <span>AI Assistive<br /><em>Tutor</em></span>
    </Link>
  );
}

export default function LandingPage() {
  const { token } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const reduceMotion = useReducedMotion();
  // Existing auth architecture: signed-out users start at login; active sessions enter the workspace.
  const primaryCtaDestination = token ? "/dashboard" : "/login";
  const destination = primaryCtaDestination;
  const actionLabel = token ? "Enter workspace" : "Use now";

  useEffect(() => {
    const onScroll = () => setIsPastHero(window.scrollY > 36);
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const jumpTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <main className="new-landing">
      <div className="new-noise" aria-hidden="true" />
      <header className={`new-nav ${isPastHero ? "new-nav--raised" : ""}`}>
        <Wordmark />
        <nav className="new-nav__links" aria-label="Landing navigation">
          {navItems.map(([label, id]) => <button key={id} onClick={() => jumpTo(id)}>{label}</button>)}
        </nav>
        <div className="new-nav__action">
          {!token && <Link className="new-signin" to="/login">Sign in</Link>}
          <Link className="new-cta new-cta--small" to={destination}>{actionLabel}<ArrowUpRight /></Link>
          <button
            className="new-menu"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="new-mobile-navigation"
          >{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      {menuOpen && (
        <nav id="new-mobile-navigation" className="new-mobile-nav" aria-label="Mobile navigation">
          {navItems.map(([label, id], index) => <button key={id} onClick={() => jumpTo(id)}><span>0{index + 1}</span>{label}<ArrowDownRight /></button>)}
          <Link className="new-cta" to={destination} onClick={() => setMenuOpen(false)}>{actionLabel}<ArrowUpRight /></Link>
        </nav>
      )}

      <section className="new-hero" aria-labelledby="new-hero-title">
        <div className="new-hero__index" aria-hidden="true"><span>01</span><i /></div>
        <motion.div
          className="new-hero__copy"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="new-kicker"><Sparkles size={13} />Intelligence That Makes The World More Accessible</div>
          <h1 id="new-hero-title">Understand the world.<br /><span>One interaction<br />at a time.</span></h1>
          <p>AI Assistive Tutor turns what you see, read, and ask into a connected learning experience—designed with non-visual access at its core.</p>
          <div className="new-hero__buttons">
            <Link className="new-cta" to={destination}>Use now <ArrowUpRight /></Link>
            <button className="new-text-button" onClick={() => jumpTo("capabilities")}>Explore the system <ArrowDownRight /></button>
          </div>
        </motion.div>
        <div className="new-hero__scene" aria-hidden="true">
          <img src="/visuals/perception-iris.png" alt="" />
        </div>
        <div className="new-hero__reading">
          <span>Explore in your own way</span>
          <div><i>Vision</i><i>Text</i><i>Voice</i></div>
        </div>
        <div className="new-hero__caption"><span>Perception<br />in motion</span><span>Scroll to enter</span></div>
      </section>

      <section className="new-intro" id="capabilities" aria-labelledby="capabilities-title">
        <div className="new-section-number">02 <span>Capabilities</span></div>
        <h2 id="capabilities-title">Intelligence that meets you <em>where you are.</em></h2>
        <p className="new-intro__lead">Not another collection of tools. One continuous interface for moving through a physical space, a printed page, and a difficult idea.</p>
        <div className="new-capability-list">
          <article className="new-capability new-capability--vision">
            <div className="new-capability__top"><span>01 / Vision mode</span><Camera /></div>
            <div className="new-capability__visual new-viewfinder">
              <span className="new-viewfinder__target">Book<em>94%</em></span>
              <span className="new-viewfinder__target new-viewfinder__target--lamp">Lamp<em>89%</em></span>
              <div className="new-viewfinder__scan" />
              <small>Listening to the room</small>
            </div>
            <h3>Notice what’s around you.</h3>
            <p>Camera-based object detection builds an audible picture of the objects in your current environment.</p>
          </article>
          <article className="new-capability new-capability--text">
            <div className="new-capability__top"><span>02 / Text mode</span><ScanText /></div>
            <div className="new-document">
              <span>Calculus / chapter 04</span><b>The meaning of a <mark>continuous</mark> function</b>
              <i>A function is continuous when small changes in input produce small changes in output.</i>
              <div><AudioLines size={14} /> Read selection <ArrowRight size={14} /></div>
            </div>
            <h3>Let printed words speak.</h3>
            <p>Scan a page, select what matters, and bring it into your reading or tutor flow.</p>
          </article>
          <article className="new-capability new-capability--tutor">
            <div className="new-capability__top"><span>03 / Assistive tutor</span><BrainCircuit /></div>
            <div className="new-conversation">
              <div className="new-conversation__question">Explain this in a simpler way.</div>
              <div className="new-conversation__answer"><Sparkles size={14} />A continuous function has no sudden breaks—you can draw it without lifting your pen.</div>
              <div className="new-conversation__pulse"><i /><i /><i /><span>Answer ready to speak</span></div>
            </div>
            <h3>Ask without losing context.</h3>
            <p>Questions carry the useful information from the page or environment into a clear response.</p>
          </article>
        </div>
      </section>

      <section className="new-flow" id="flow" aria-labelledby="flow-title" aria-label="Observe. Scan. Ask. Understand.">
        <div className="new-flow__heading"><div className="new-section-number">03 <span>One connected flow</span></div><h2 id="flow-title">See. Read. Ask.<br /><em>Understand.</em></h2></div>
        <div className="new-flow__map" role="img" aria-label="A connected flow from camera or document input to understanding through spoken feedback">
          <div className="new-flow__node"><Camera /><span>Look</span></div>
          <div className="new-flow__line"><i /><i /><i /></div>
          <div className="new-flow__node new-flow__node--center"><Command /><span>Context</span></div>
          <div className="new-flow__line new-flow__line--right"><i /><i /><i /></div>
          <div className="new-flow__node"><Ear /><span>Listen</span></div>
          <p>Camera or document input flows through recognition and context—then returns as a response you can hear, read, or continue exploring.</p>
        </div>
      </section>

      <section className="new-detail" aria-labelledby="detail-title">
        <div className="new-detail__heading"><div className="new-section-number">04 <span>How the system works</span></div><h2 id="detail-title">One moment of curiosity, <em>four thoughtful steps.</em></h2></div>
        <div className="new-detail__grid">
          <article className="new-detail-card new-detail-card--camera"><span>01</span><Camera /><div><h3>Capture a moment</h3><p>Open Vision Mode to orient the camera toward an object, sign, desk, page, or nearby environment.</p></div><i>Camera input</i></article>
          <article className="new-detail-card new-detail-card--scan"><span>02</span><ScanText /><div><h3>Recognize what matters</h3><p>Object detection and OCR turn the useful signal into accessible, selectable context.</p></div><i>Recognition layer</i></article>
          <article className="new-detail-card new-detail-card--context"><span>03</span><Command /><div><h3>Keep the thread</h3><p>Your selected text, question, and available scene context travel together instead of starting over.</p></div><i>Context routing</i></article>
          <article className="new-detail-card new-detail-card--voice"><span>04</span><AudioLines /><div><h3>Respond in your way</h3><p>Read the result, ask a follow-up, or hear the answer through clear spoken feedback.</p></div><i>Voice & text output</i></article>
        </div>
      </section>

      <section className="new-access" id="accessibility" aria-labelledby="access-title">
        <div className="new-access__orb" aria-hidden="true" />
        <div className="new-section-number">05 <span>Designed for access</span></div>
        <h2 id="access-title">Technology should open doors, <em>not add barriers.</em></h2>
        <div className="new-access__grid">
          <p>Every important action is designed to be reachable through voice, keyboard, readable feedback, and sound—without asking students to work around the interface.</p>
          <ul>
            <li><span>Voice-led controls</span><b>Speak naturally</b></li>
            <li><span>Readable information</span><b>Keep context visible</b></li>
            <li><span>Audio feedback</span><b>Know what changed</b></li>
          </ul>
        </div>
      </section>

      <section className="new-closing" aria-labelledby="closing-title">
        <p className="new-kicker"><BookOpenText size={13} />Your next learning moment starts here</p>
        <h2 id="closing-title">A more accessible way to <em>explore, read and learn.</em></h2>
        <Link className="new-cta new-cta--closing" to={destination}>Use now <ArrowUpRight /></Link>
      </section>

      <footer className="new-footer"><Wordmark /><span>Built for independent learning.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
