"use client";

import { useEffect, useRef } from "react";

const COLORS = [
  "#A8655D", // puzzle.primary — terracotta
  "#C9897F", // puzzle.accent — soft coral
  "#96703D", // puzzle.tertiary — warm gold-brown
  "#7D3F37", // puzzle.primaryDark — deep terracotta
  "#E2C0BB", // puzzle.bg — warm blush
  "#F5C5BB", // light coral
  "#E8A87C", // warm amber
];

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  friction: number;
  gravity: number;
  decay: number;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    
    // Explosion direction and speed
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 8 + 2;
    this.vx = Math.cos(angle) * force;
    this.vy = Math.sin(angle) * force;
    
    this.alpha = 1;
    this.friction = 0.95;
    this.gravity = 0.15;
    this.decay = Math.random() * 0.015 + 0.01;
    this.size = Math.random() * 3 + 1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }
}

class Firework {
  particles: Particle[];
  constructor(x: number, y: number) {
    this.particles = [];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const particleCount = 40 + Math.floor(Math.random() * 20);
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update() {
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.alpha > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => p.draw(ctx));
  }
}

export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireworksRef = useRef<Firework[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    const loop = () => {
      // Create trailing effect
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Randomly spawn fireworks in the center area
      if (Math.random() < 0.08) {
        const x = canvas.width / 2 + (Math.random() - 0.5) * (canvas.width * 0.4);
        const y = canvas.height / 2 + (Math.random() - 0.5) * (canvas.height * 0.4);
        fireworksRef.current.push(new Firework(x, y));
      }

      fireworksRef.current.forEach(f => {
        f.update();
        f.draw(ctx);
      });

      fireworksRef.current = fireworksRef.current.filter(f => f.particles.length > 0);
      
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none w-full h-full"
      style={{ mixBlendMode: 'multiply', opacity: 0.8 }}
    />
  );
}
