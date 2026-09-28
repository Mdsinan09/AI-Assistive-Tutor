import React, { useEffect, useRef } from "react";
import { useAccessibility } from "../../context/AccessibilityContext";

export function ShaderCanvas({ className = "" }) {
  const canvasRef = useRef(null);
  const { theme, reducedMotion } = useAccessibility();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Liquid ambient orbs
    const orbs = [
      { x: width * 0.2, y: height * 0.25, vx: 0.25, vy: 0.18, r: 240 },
      { x: width * 0.8, y: height * 0.35, vx: -0.22, vy: 0.15, r: 300 },
      { x: width * 0.5, y: height * 0.85, vx: 0.15, vy: -0.25, r: 280 },
    ];

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isBlack = theme === "black";
      const colors = isBlack
        ? [
            "rgba(41, 151, 255, 0.08)", // subtle blue
            "rgba(167, 139, 250, 0.06)", // purple
            "rgba(52, 211, 153, 0.05)",  // emerald
          ]
        : [
            "rgba(0, 113, 227, 0.08)",  // apple blue
            "rgba(139, 92, 246, 0.06)",  // violet
            "rgba(16, 185, 129, 0.05)",  // mint
          ];

      orbs.forEach((orb, i) => {
        if (!reducedMotion) {
          orb.x += orb.vx;
          orb.y += orb.vy;

          if (orb.x < -100 || orb.x > width + 100) orb.vx *= -1;
          if (orb.y < -100 || orb.y > height + 100) orb.vy *= -1;
        }

        const gradient = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          orb.r
        );
        gradient.addColorStop(0, colors[i % colors.length]);
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reducedMotion) {
        t += 0.01;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [theme, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`ambient-canvas ${className}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: theme === "black" ? 0.75 : 0.85,
        filter: "blur(60px)",
      }}
    />
  );
}

export default ShaderCanvas;
