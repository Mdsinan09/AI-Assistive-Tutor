# AI ASSISTIVE TUTOR — DESIGN SYSTEM SPECIFICATION (DESIGN.md)

## 1. Brand & Design Philosophy
The AI Assistive Tutor landing page follows a **cinematic, editorial, accessibility-first** design system inspired by the visual language of modern high-end perceptual computing and tactile accessibility tools.

- **Canvas**: Near-black OLED canvas (`#050608` to `#0a0d14`).
- **Atmosphere**: Deep optical space, volumetric light scatter, luminous particle point-clouds.
- **Typographic Scale**: Confident editorial proportions using clean sans-serif typography with strict hierarchy and deliberate line breaks.
- **Accents**: Cool electric blue (`#2997ff` / `#0071e3`), luminous cyan (`#38bdf8`), soft silver white (`#f8fafc`), restrained amber/emerald for functional signals.
- **Motion Principle**: Organic, slow, physics-driven breathing and orbital rotations. Instant reduction when `prefers-reduced-motion` is active.

---

## 2. Color Palette & Tokens

| Token | Hex / CSS Value | Semantic Role |
| :--- | :--- | :--- |
| `--landing-bg` | `#050608` | Primary deep black canvas |
| `--landing-bg-surface` | `rgba(16, 20, 30, 0.65)` | Translucent glass surface |
| `--landing-bg-elevated` | `rgba(22, 28, 44, 0.82)` | Elevated interactive cards |
| `--landing-border` | `rgba(255, 255, 255, 0.08)` | Ultra-fine structural hairline border |
| `--landing-border-active` | `rgba(41, 151, 255, 0.40)` | Focused / active state highlight |
| `--landing-text-primary` | `#f8fafc` | High-contrast body & headline text |
| `--landing-text-secondary` | `#94a3b8` | Muted editorial body & captions |
| `--landing-text-tertiary` | `#64748b` | Eyebrow labels, timestamps, metadata |
| `--landing-accent-blue` | `#2997ff` | Primary CTA, particle highlights |
| `--landing-accent-cyan` | `#38bdf8` | Secondary perception glows |
| `--landing-accent-glow` | `rgba(41, 151, 255, 0.18)` | Ambient volumetric lighting |

---

## 3. Typography Hierarchy
- **Display 1 (Hero Title)**: `clamp(2.5rem, 5.5vw, 4.25rem)`, `font-weight: 750`, `letter-spacing: -0.035em`, `line-height: 1.1`.
- **Display 2 (Section Headings)**: `clamp(1.85rem, 3.8vw, 2.75rem)`, `font-weight: 700`, `letter-spacing: -0.025em`, `line-height: 1.2`.
- **Eyebrow / Pill Label**: `0.72rem - 0.78rem`, `text-transform: uppercase`, `letter-spacing: 0.12em`, `font-weight: 650`.
- **Body Large**: `clamp(1.05rem, 1.8vw, 1.25rem)`, `line-height: 1.6`, `color: var(--landing-text-secondary)`.
- **Body Standard**: `0.95rem`, `line-height: 1.65`, `color: var(--landing-text-secondary)`.

---

## 4. Layout & Spacing
- **Container Max-Width**: `1200px` with responsive gutters (`1.25rem` mobile, `2.5rem` desktop).
- **Section Rhythm**: Generous vertical rhythm with `clamp(5rem, 10vw, 8.5rem)` between major thematic chapters.
- **Grid Variance**: Asymmetric and horizontal flow layouts to avoid the "repetitive 3-card template" anti-pattern.

---

## 5. Accessibility & Inclusivity
- **WCAG 2.1 AA Contrast**: All text elements adhere to minimum 4.5:1 contrast against `#050608`.
- **Keyboard Navigation**: Explicit focus rings (`2px solid #2997ff`, offset `3px`) on all interactive buttons, links, and drawers.
- **Screen Reader Support**: Semantic HTML (`<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`), ARIA labels, and live regions.
- **Reduced Motion**: Disables particle orbital animation and replaces scroll translates with crisp opacity transitions when `prefers-reduced-motion: reduce` is detected.
