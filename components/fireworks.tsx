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

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

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

  constructor(x: number, y: number, color: string, speedMult: number = 1) {
    this.x = x;
    this.y = y;
    this.color = color;
    
    // Direction et vitesse de l'explosion (sphère)
    const angle = Math.random() * Math.PI * 2;
    // On varie la vélocité pour un effet 3D plus naturel
    const velocity = (Math.random() * 6 + 2) * speedMult;
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    
    this.alpha = 1;
    this.friction = 0.96; // friction plus douce
    this.gravity = 0.1;   // légèrement flottant
    this.decay = Math.random() * 0.015 + 0.005;
    this.size = Math.random() * 2.5 + 1.5;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
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

class Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
  gravity: number;
  particles: Particle[];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = (canvasWidth * 0.2) + Math.random() * (canvasWidth * 0.6); // part du tiers central
    this.y = canvasHeight; // commence en bas de l'écran
    this.vx = (Math.random() - 0.5) * 3; // légère dérive horizontale
    
    // La vélocité initiale pour atteindre le haut de l'écran
    const targetHeight = canvasHeight * (0.3 + Math.random() * 0.4); 
    this.gravity = 0.15;
    this.vy = -Math.sqrt(2 * this.gravity * targetHeight) * (1 + Math.random() * 0.1); 

    this.color = randomColor();
    this.exploded = false;
    this.particles = [];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.exploded) {
      ctx.save();
      ctx.beginPath();
      // On dessine la fusée comme un petit trait avec une lueur
      ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; // La tête de la fusée est blanche/lumineuse
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    } else {
      this.particles.forEach(p => p.draw(ctx));
    }
  }

  update() {
    if (!this.exploded) {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;

      // Explose quand elle atteint son apogée (vélocité proche de 0)
      if (this.vy >= -1) {
        this.explode();
      }
    } else {
      this.particles.forEach(p => p.update());
      this.particles = this.particles.filter(p => p.alpha > 0);
    }
  }

  explode() {
    this.exploded = true;
    const particleCount = 70 + Math.floor(Math.random() * 50); // Plus de particules
    
    // On mixe parfois 2 couleurs pour une seule explosion
    const secondaryColor = Math.random() > 0.4 ? randomColor() : this.color;
    const speedMult = Math.random() * 0.5 + 0.8;

    for (let i = 0; i < particleCount; i++) {
      const pColor = Math.random() > 0.5 ? this.color : secondaryColor;
      this.particles.push(new Particle(this.x, this.y, pColor, speedMult));
    }
  }
}

export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketsRef = useRef<Rocket[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    const loop = () => {
      // Effet de traînée (fade out)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // contrôle la longueur de la traînée (plus faible = plus long)
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Reset du mode de composition pour dessiner par dessus
      ctx.globalCompositeOperation = "source-over";
      
      // Fréquence d'apparition augmentée
      if (Math.random() < 0.12) { 
        rocketsRef.current.push(new Rocket(canvas.width, canvas.height));
      }
      
      // Parfois, on lance une "salve" de plusieurs feux d'artifice
      if (Math.random() < 0.02) {
        const burstCount = Math.floor(Math.random() * 3) + 2;
        for(let i=0; i < burstCount; i++) {
          setTimeout(() => {
             if (canvasRef.current) rocketsRef.current.push(new Rocket(canvas.width, canvas.height));
          }, i * 150);
        }
      }

      rocketsRef.current.forEach(r => {
        r.update();
        r.draw(ctx);
      });

      // Nettoyage des fusées terminées
      rocketsRef.current = rocketsRef.current.filter(r => !r.exploded || r.particles.length > 0);
      
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
      className="absolute inset-0 z-10 pointer-events-none w-full h-full"
      style={{ opacity: 0.95 }}
    />
  );
}
