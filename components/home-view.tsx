"use client";

import Image from "next/image";

// Force HMR recompile
export function HomeView({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#E2C0BB]">
      
      {/* Soft Mesh Gradient Background - Pro Max Style (Darker) */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#D4A8A2] rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#A8655D] rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-float-delayed" />
      <div className="absolute top-[30%] right-[10%] w-[50%] h-[50%] bg-[#926F6A] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-float" style={{ animationDelay: '2s' }} />

      {/* Puzzle piece shape silhouette - Curved */}
      <svg
        className="absolute top-[15%] left-[20%] w-32 h-32 text-puzzle-primaryDark/10 animate-float hidden lg:block drop-shadow-lg"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ animationDelay: '1s' }}
      >
        <path d="M 4 6 H 10.5 A 2.5 2.5 0 1 1 13.5 6 H 20 V 10.5 A 2.5 2.5 0 1 0 20 13.5 V 22 H 13.5 A 2.5 2.5 0 1 0 10.5 22 H 4 V 13.5 A 2.5 2.5 0 1 0 4 10.5 Z" />
      </svg>

      {/* Main Content Card - Pro Max Glassmorphism */}
      <div className="z-10 text-center px-8 py-16 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[3rem] shadow-[0_20px_40px_-10px_rgba(168,101,93,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] max-w-lg w-[calc(100%-2.5rem)] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]">
        <div className="mb-12 flex justify-center relative">
          {/* Soft glow behind logo */}
          <div className="absolute inset-0 bg-white/60 blur-3xl rounded-full scale-150" />
          <Image
            src="/logo.png"
            alt="Mina Puzzle Logo"
            width={400}
            height={400}
            priority
            className="w-full max-w-[280px] md:max-w-[340px] h-auto drop-shadow-2xl relative z-10 transition-transform duration-700 hover:scale-[1.03] ease-[cubic-bezier(0.33,1,0.68,1)]"
          />
        </div>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-puzzle-primary px-10 py-5 font-extrabold text-white shadow-[0_10px_30px_rgba(168,101,93,0.4)] ring-1 ring-puzzle-primary/50 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-105 hover:bg-puzzle-primaryDark hover:shadow-[0_15px_40px_rgba(168,101,93,0.5)] hover:ring-white/20 active:scale-95"
        >
          {/* Shimmer effect */}
          <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[100%]" />
          
          <span className="relative mr-3 text-[17px] tracking-wide">Commencer l&apos;aventure</span>
          <svg 
            className="w-5 h-5 relative transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1.5" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Footer info - Pro Max Minimal */}
      <footer className="absolute bottom-10 text-[11px] text-puzzle-secondary/60 font-bold tracking-[0.2em] uppercase backdrop-blur-sm px-6 py-2 rounded-full border border-white/30 bg-white/10 shadow-sm">
        Fait avec passion • 2026
      </footer>
    </div>
  );
}
