import React, { useEffect, useRef, useState } from "react";

/**
 * HeroPerceptionScene
 * 
 * Luminous 3D Particle Sculpture representing machine perception & assistive intelligence.
 * - Central radiant sphere of intelligence
 * - Dual tilted orbital information rings
 * - 3D depth-projected perceptual particle field
 * - Smooth pointer/touch parallax with inertia
 * - Full DPR scaling, performance throttling, and prefers-reduced-motion compliance
 */
export default function HeroPerceptionScene({ className = "" }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // Mouse / Touch Parallax Target
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouse.targetX = ((e.clientX - cx) / (rect.width / 2)) * 0.45;
      mouse.targetY = ((e.clientY - cy) / (rect.height / 2)) * 0.45;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // Generate 3D Particle Field
    const NUM_CORE = 240;
    const NUM_ORBIT_1 = 180;
    const NUM_ORBIT_2 = 140;
    const NUM_AMBIENT = 380;

    // Core Sphere Particles
    const coreParticles = [];
    for (let i = 0; i < NUM_CORE; i++) {
      const phi = Math.acos(-1 + (2 * i) / NUM_CORE);
      const theta = Math.sqrt(NUM_CORE * Math.PI) * phi;
      const radius = 60 + Math.random() * 20;
      coreParticles.push({
        baseX: radius * Math.cos(theta) * Math.sin(phi),
        baseY: radius * Math.sin(theta) * Math.sin(phi),
        baseZ: radius * Math.cos(phi),
        size: Math.random() * 1.8 + 0.8,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulseOffset: Math.random() * Math.PI * 2,
        color: i % 4 === 0 ? "rgba(255, 255, 255, " : i % 2 === 0 ? "rgba(56, 189, 248, " : "rgba(41, 151, 255, ",
      });
    }

    // Orbit Ring 1 (Tilted Ellipse)
    const orbit1 = [];
    for (let i = 0; i < NUM_ORBIT_1; i++) {
      const angle = (i / NUM_ORBIT_1) * Math.PI * 2;
      const r = 135 + Math.sin(angle * 3) * 6;
      orbit1.push({
        angle,
        radius: r,
        size: Math.random() * 2.0 + 0.8,
        speed: 0.007 + Math.random() * 0.003,
        color: i % 3 === 0 ? "rgba(255, 255, 255, " : "rgba(41, 151, 255, ",
      });
    }

    // Orbit Ring 2 (Counter-tilted Outer Ellipse)
    const orbit2 = [];
    for (let i = 0; i < NUM_ORBIT_2; i++) {
      const angle = (i / NUM_ORBIT_2) * Math.PI * 2;
      const r = 185 + Math.cos(angle * 2) * 8;
      orbit2.push({
        angle,
        radius: r,
        size: Math.random() * 2.2 + 0.9,
        speed: -0.005 - Math.random() * 0.003,
        color: i % 4 === 0 ? "rgba(255, 255, 255, " : "rgba(56, 189, 248, ",
      });
    }

    // Ambient Depth Dust
    const ambient = [];
    for (let i = 0; i < NUM_AMBIENT; i++) {
      ambient.push({
        x: (Math.random() - 0.5) * 650,
        y: (Math.random() - 0.5) * 650,
        z: (Math.random() - 0.5) * 600,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        vz: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.55 + 0.15,
      });
    }

    let time = 0;
    const fov = 380;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const rotY = reducedMotion ? 0.2 : time * 0.004 + mouse.x;
      const rotX = reducedMotion ? 0.3 : Math.sin(time * 0.002) * 0.15 + mouse.y;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Central Ambient Halo Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.min(width, height) * 0.42
      );
      glowGrad.addColorStop(0, "rgba(41, 151, 255, 0.15)");
      glowGrad.addColorStop(0.35, "rgba(56, 189, 248, 0.06)");
      glowGrad.addColorStop(0.75, "rgba(10, 15, 26, 0.02)");
      glowGrad.addColorStop(1, "rgba(5, 6, 8, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.min(width, height) * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Array to collect all projectable particles for depth sorting
      const renderQueue = [];

      // A. Ambient Dust
      ambient.forEach((p) => {
        if (!reducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          if (p.x > 325) p.x = -325;
          if (p.x < -325) p.x = 325;
          if (p.y > 325) p.y = -325;
          if (p.y < -325) p.y = 325;
          if (p.z > 300) p.z = -300;
          if (p.z < -300) p.z = 300;
        }

        // Rotate
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        const scale = fov / (fov + z2);
        if (scale > 0) {
          const px = centerX + x1 * scale;
          const py = centerY + y1 * scale;
          const distAlpha = Math.max(0.08, Math.min(0.65, (scale - 0.4) * 0.7));
          renderQueue.push({
            x: px,
            y: py,
            z: z2,
            size: p.size * scale,
            color: `rgba(180, 215, 255, ${distAlpha * p.alpha})`,
          });
        }
      });

      // B. Core Sphere Particles (Breathing & Rotating)
      const breath = 1.0 + Math.sin(time * 0.03) * 0.06;
      coreParticles.forEach((p) => {
        const bx = p.baseX * breath;
        const by = p.baseY * breath;
        const bz = p.baseZ * breath;

        const x1 = bx * cosY - bz * sinY;
        const z1 = bz * cosY + bx * sinY;
        const y1 = by * cosX - z1 * sinX;
        const z2 = z1 * cosX + by * sinX;

        const scale = fov / (fov + z2);
        if (scale > 0) {
          const px = centerX + x1 * scale;
          const py = centerY + y1 * scale;
          const pulse = 0.5 + 0.5 * Math.sin(time * p.pulseSpeed + p.pulseOffset);
          const alpha = Math.max(0.2, Math.min(1.0, (scale - 0.3) * (0.4 + pulse * 0.6)));
          renderQueue.push({
            x: px,
            y: py,
            z: z2,
            size: p.size * scale * (0.85 + pulse * 0.3),
            color: `${p.color}${alpha})`,
            glow: alpha > 0.65,
          });
        }
      });

      // C. Orbit Ring 1 (Tilted ~40 deg)
      const tilt1 = 0.65;
      const cosT1 = Math.cos(tilt1);
      const sinT1 = Math.sin(tilt1);
      orbit1.forEach((p) => {
        if (!reducedMotion) p.angle += p.speed;
        const ox = Math.cos(p.angle) * p.radius;
        const oz = Math.sin(p.angle) * p.radius;
        const oy = oz * sinT1;
        const ozTilted = oz * cosT1;

        const x1 = ox * cosY - ozTilted * sinY;
        const z1 = ozTilted * cosY + ox * sinY;
        const y1 = oy * cosX - z1 * sinX;
        const z2 = z1 * cosX + oy * sinX;

        const scale = fov / (fov + z2);
        if (scale > 0) {
          const px = centerX + x1 * scale;
          const py = centerY + y1 * scale;
          const alpha = Math.max(0.15, Math.min(0.9, (scale - 0.3) * 0.85));
          renderQueue.push({
            x: px,
            y: py,
            z: z2,
            size: p.size * scale,
            color: `${p.color}${alpha})`,
            glow: true,
          });
        }
      });

      // D. Orbit Ring 2 (Opposite tilt ~-45 deg)
      const tilt2 = -0.75;
      const cosT2 = Math.cos(tilt2);
      const sinT2 = Math.sin(tilt2);
      orbit2.forEach((p) => {
        if (!reducedMotion) p.angle += p.speed;
        const ox = Math.cos(p.angle) * p.radius;
        const oz = Math.sin(p.angle) * p.radius;
        const oy = oz * sinT2;
        const ozTilted = oz * cosT2;

        const x1 = ox * cosY - ozTilted * sinY;
        const z1 = ozTilted * cosY + ox * sinY;
        const y1 = oy * cosX - z1 * sinX;
        const z2 = z1 * cosX + oy * sinX;

        const scale = fov / (fov + z2);
        if (scale > 0) {
          const px = centerX + x1 * scale;
          const py = centerY + y1 * scale;
          const alpha = Math.max(0.12, Math.min(0.85, (scale - 0.3) * 0.8));
          renderQueue.push({
            x: px,
            y: py,
            z: z2,
            size: p.size * scale,
            color: `${p.color}${alpha})`,
            glow: alpha > 0.5,
          });
        }
      });

      // Depth sort: render farthest (most positive z) first
      renderQueue.sort((a, b) => b.z - a.z);

      // Render points
      for (let i = 0; i < renderQueue.length; i++) {
        const item = renderQueue[i];
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, Math.max(0.5, item.size), 0, Math.PI * 2);
        ctx.fill();

        // Selective delicate glow pass for front-facing prominent nodes
        if (item.glow && item.size > 1.4) {
          ctx.fillStyle = "rgba(41, 151, 255, 0.12)";
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      time++;
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [reducedMotion]);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{ minHeight: "380px" }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
