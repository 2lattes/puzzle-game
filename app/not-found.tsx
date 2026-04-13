"use client";

import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-natural-gradient">
      {/* Decorative floating elements */}
      <div className="absolute top-[10%] left-[10%] w-32 h-32 bg-white/20 rounded-2xl rotate-12 blur-sm animate-float hidden md:block" />
      <div className="absolute bottom-[15%] right-[12%] w-40 h-40 bg-puzzle-accent/20 rounded-[3rem] -rotate-12 blur-md animate-float-delayed hidden md:block" />
      
      <div className="z-10 text-center px-6 py-12 glass-morphism rounded-[2.5rem] max-w-lg w-full mx-auto animate-in fade-in zoom-in duration-700">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Mina Puzzle Logo"
            width={200}
            height={200}
            className="w-32 h-auto opacity-50 grayscale"
          />
        </div>

        <h1 className="text-6xl font-black text-puzzle-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-puzzle-text mb-6">Oups ! Page introuvable</h2>
        <p className="text-puzzle-secondary/80 mb-10 font-medium">
          Il semble que cette pièce du puzzle soit manquante ou que le lien soit rompu.
        </p>

        <Link
          href="/"
          className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-300 bg-puzzle-primary rounded-full hover:bg-puzzle-primaryDark hover:scale-105 active:scale-95 shadow-lg"
        >
          <svg 
            className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Retourner au menu
        </Link>
      </div>

      <footer className="absolute bottom-8 text-sm text-puzzle-secondary/70 font-medium tracking-wide">
        Mina Puzzle • 2025
      </footer>
    </div>
  );
}
