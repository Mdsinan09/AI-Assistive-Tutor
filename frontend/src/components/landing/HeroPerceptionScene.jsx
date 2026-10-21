import React, { useEffect, useRef, useState } from "react";

/**
 * Perception Iris — an organic contour ring for the landing hero.
 * It suggests a camera iris, visual focus, and expanding understanding rather
 * than an orbiting planet system.
 */
export default function HeroPerceptionScene({ className = "" }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(media.matches);
    syncMotion();
    media.addEventListener("change", syncMotion);
    return () => media.removeEventListener("change", syncMotion);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let frame = 0;
    let scrollProgress = 0;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onScroll = () => { scrollProgress = Math.min(1, window.scrollY / Math.max(window.innerHeight, 1)); };

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // Efficient typed-like model data: one canvas, no per-particle React work.
    const coreParticles = Array.from({ length: 420 }, (_, index) => ({
      angle: (index / 420) * Math.PI * 2,
      drift: Math.sin(index * 78.233) * 0.5 + 0.5,
      size: 0.25 + (index % 5) * 0.12,
    }));
    const orbit1 = Array.from({ length: 102 }, (_, index) => ({ phase: index * 0.39, depth: index / 101 - 0.5 }));
    const orbit2 = Array.from({ length: 68 }, (_, index) => ({ phase: index * 0.59, depth: index / 67 - 0.5 }));

    const hueForAngle = (angle) => {
      const topness = (1 - Math.sin(angle)) / 2;
      const rightness = (Math.cos(angle) + 1) / 2;
      return Math.round(218 - topness * 210 + rightness * 34);
    };

    const drawStrands = (strands, radius, centreX, centreY, scale, time, opacity) => {
      strands.forEach((strand, index) => {
        context.beginPath();
        for (let segment = 0; segment <= 136; segment += 1) {
          const angle = (segment / 136) * Math.PI * 2;
          const wobble = Math.sin(angle * 5 + strand.phase + time * 0.74) * (6 + strand.drift * 8) * scale;
          const fold = Math.sin(angle * 2 - time * 0.37 + strand.phase * 0.35) * strand.depth * 34 * scale;
          const ringRadius = radius + strand.depth * 26 * scale + wobble + fold;
          const x = centreX + Math.cos(angle) * ringRadius;
          const y = centreY + Math.sin(angle) * ringRadius * 0.9;
          if (segment === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        const hue = hueForAngle((index / strands.length) * Math.PI * 2 + strand.phase * 0.1);
        context.strokeStyle = `hsla(${hue}, 94%, 70%, ${opacity})`;
        context.lineWidth = index % 11 === 0 ? 1.05 : 0.46;
        context.stroke();
      });
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;
      const time = reducedMotion ? 0 : frame * 0.012;
      const scale = Math.min(width, height) / 720;
      const centreX = width * (0.535 + pointer.x * 0.025 + scrollProgress * 0.035);
      const centreY = height * (0.51 + pointer.y * 0.02 - scrollProgress * 0.065);
      const radius = Math.min(width, height) * 0.38;

      const halo = context.createRadialGradient(centreX, centreY, radius * 0.3, centreX, centreY, radius * 1.25);
      halo.addColorStop(0, "rgba(4, 7, 12, 0)");
      halo.addColorStop(0.52, "rgba(65, 103, 255, .045)");
      halo.addColorStop(0.78, "rgba(255, 97, 74, .065)");
      halo.addColorStop(1, "rgba(4, 7, 12, 0)");
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      drawStrands(orbit2, radius * 1.07, centreX, centreY, scale, time * 0.6, 0.16);
      drawStrands(orbit1, radius, centreX, centreY, scale, time, 0.22);

      // Sparkling focal points turn the contour ring into a living perception field.
      coreParticles.forEach((particle, index) => {
        const wave = Math.sin(particle.angle * 7 + time + particle.drift * 4) * 14 * scale;
        const r = radius + wave + (particle.drift - 0.5) * 30 * scale;
        const x = centreX + Math.cos(particle.angle) * r;
        const y = centreY + Math.sin(particle.angle) * r * 0.9;
        const hue = hueForAngle(particle.angle);
        context.fillStyle = `hsla(${hue}, 100%, ${74 + (index % 3) * 7}%, ${0.26 + particle.drift * 0.42})`;
        context.beginPath();
        context.arc(x, y, particle.size + particle.drift * 0.5, 0, Math.PI * 2);
        context.fill();
      });

      const innerHalo = context.createRadialGradient(centreX, centreY, 0, centreX, centreY, radius * 0.23);
      innerHalo.addColorStop(0, "rgba(255,255,255,.1)");
      innerHalo.addColorStop(0.2, "rgba(150,227,255,.045)");
      innerHalo.addColorStop(1, "rgba(5,8,13,0)");
      context.fillStyle = innerHalo;
      context.beginPath();
      context.arc(centreX, centreY, radius * 0.27, 0, Math.PI * 2);
      context.fill();

      frame += 1;
      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }} />;
}
