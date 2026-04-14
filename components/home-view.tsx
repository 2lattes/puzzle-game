"use client";

import Image from "next/image";


export function HomeView({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-natural-gradient">
      {/* Decorative floating elements */}
      <div className="absolute top-[10%] left-[10%] w-32 h-32 bg-white/20 rounded-2xl rotate-12 blur-sm animate-float hidden md:block" />
      <div className="absolute bottom-[15%] right-[12%] w-40 h-40 bg-puzzle-accent/20 rounded-[3rem] -rotate-12 blur-md animate-float-delayed hidden md:block" />
      <div className="absolute top-[20%] right-[20%] w-24 h-24 bg-white/10 rounded-full blur-xl animate-float-delayed" />
      
      {/* Puzzle piece shape silhouette */}
      <svg
        className="absolute top-[40%] left-[15%] w-24 h-24 text-white/10 animate-float hidden lg:block"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20,11V7a2,2,0,0,0-2-2H16V3a2,2,0,0,0-2-2,2,2,0,0,0-2,2V5H8A2,2,0,0,0,6,7v4H4a2,2,0,0,0-2,2,2,2,0,0,0,2,2H6v4a2,2,0,0,0,2,2h4v2a2,2,0,0,0,2,2,2,2,0,0,0,2-2V19h4a2,2,0,0,0,2-2V13h2a2,2,0,0,0,2-2,2,2,0,0,0-2-2Z" />
      </svg>

      {/* Main Content Card */}
      <div className="z-10 text-center px-6 py-12 glass-morphism rounded-[2.5rem] max-w-lg w-full mx-auto animate-in fade-in zoom-in duration-1000">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Mina Puzzle Logo"
            width={400}
            height={400}
            priority
            className="w-full max-w-[320px] md:max-w-[400px] h-auto drop-shadow-xl"
          />
        </div>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-300 bg-puzzle-primary rounded-full hover:bg-puzzle-primaryDark hover:scale-105 active:scale-95 shadow-lg hover:shadow-puzzle-accent/50"
        >
          <span className="mr-2">Commencer l&apos;aventure</span>
          <svg 
            className="w-5 h-5 transition-transform group-hover:translate-x-1" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Footer info */}
      <footer className="absolute bottom-8 text-sm text-puzzle-secondary/70 font-medium tracking-wide">
        Fait avec passion • 2026
      </footer>
    </div>
  );
}
