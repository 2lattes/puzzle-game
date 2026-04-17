"use client";

import Image from "next/image";
import { useState } from "react";
import { PUZZLE_THEMES } from "@/lib/sample-puzzles";
import type { PuzzleImage } from "@/types";

type CategoryViewProps = {
  puzzles: PuzzleImage[];
  onSelectCategory: (theme: (typeof PUZZLE_THEMES)[number]) => void;
  onNavigateRecent: () => void;
  onNavigateFavorites?: () => void;
  onNavigateImported?: () => void;
  onNavigateCompleted?: () => void;
  onNavigateInProgress?: () => void;
  onBack?: () => void;
};

/** Maps each category to a "hero" puzzle image used as the card background */
function getCategoryHeroUrl(
  theme: (typeof PUZZLE_THEMES)[number],
  puzzles: PuzzleImage[]
): string | null {
  const match = puzzles.find((p) => p.theme === theme);
  return match?.thumbUrl || match?.url || null;
}

/** Pretty emoji badge per category */
const CATEGORY_EMOJI: Record<string, string> = {
  Corse: "🏝️",
  "Coucher de soleil": "🌅",
  Couture: "🧵",
  Exotique: "🌴",
  "Fonds Marins": "🐠",
  Fruits: "🍊",
  Marseille: "⚓",
  Perles: "🪬",
  Printemps: "🌸",
  Provence: "💜",
};

function shouldUseNextImage(url: string) {
  return url.startsWith("/") || url.startsWith("https://images.unsplash.com/");
}

type CategoryCardProps = {
  theme: (typeof PUZZLE_THEMES)[number];
  heroUrl: string | null;
  count: number;
  onClick: () => void;
};

function CategoryCard({ theme, heroUrl, count, onClick }: CategoryCardProps) {
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full group relative flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-puzzle-primary"
      aria-label={`Voir la catégorie ${theme}`}
    >
      {/* Folder tab */}
      <div
        className="w-3/4 h-5 rounded-t-xl bg-puzzle-primary/80 transition-all duration-300 group-hover:bg-puzzle-primary"
        style={{ marginBottom: "-2px" }}
      />

      {/* Folder body */}
      <div
        className="relative w-full overflow-hidden rounded-[1.5rem] aspect-square shadow-md ring-1 ring-puzzle-primary/20 transition-all duration-300 group-hover:shadow-xl group-hover:ring-puzzle-primary/50 group-hover:-translate-y-1"
      >
        {/* Background image */}
        {heroUrl && !error ? (
          <div className="absolute inset-0">
            {shouldUseNextImage(heroUrl) ? (
              <Image
                src={heroUrl}
                alt={theme}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                quality={80}
                onError={() => setError(true)}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={heroUrl}
                alt={theme}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
                onError={() => setError(true)}
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-puzzle-accent/40 to-puzzle-primary/60" />
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* Hover shimmer */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />

        {/* Centered Emoji badge */}
        <div className="absolute inset-0 flex items-center justify-center pb-6" aria-hidden>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl shadow-xl backdrop-blur-md transition-all duration-500 group-hover:scale-125 group-hover:bg-white/30">
            {CATEGORY_EMOJI[theme] ?? "🖼️"}
          </div>
        </div>

        {/* Text Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-end p-3 pb-5 text-center">
          {/* Category name */}
          <p className="text-[13px] font-extrabold leading-tight text-white drop-shadow-md line-clamp-2">
            {theme.toUpperCase()}
          </p>

          {/* Count badge */}
          <span className="mt-2 inline-flex items-center rounded-full bg-puzzle-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
            {count} puzzle{count > 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </button>
  );
}

/** Floating bottom nav button — consistent with SelectionView's NavButton */
function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[1.25rem] w-[80px] transition-all duration-300 ${
        active
          ? "bg-puzzle-primary text-white shadow-lg scale-105"
          : "text-puzzle-secondary/60 hover:bg-puzzle-primary/10 hover:text-puzzle-text"
      }`}
    >
      <span className="w-6 h-6 flex items-center justify-center mb-1">
        {icon}
      </span>
      <span className="text-[11px] font-bold tracking-wide">{label}</span>
    </button>
  );
}

export function CategoryView({
  puzzles,
  onSelectCategory,
  onNavigateRecent,
  onNavigateFavorites,
  onNavigateImported,
  onNavigateCompleted,
  onNavigateInProgress,
  onBack,
}: CategoryViewProps) {
  /** Count puzzles per category */
  const countByTheme = (theme: string) =>
    puzzles.filter((p) => p.theme === theme).length;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-puzzle-bg font-sans text-puzzle-text pb-48">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-8 md:py-12">

        {/* Header */}
        <header className="flex flex-col gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="group flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-puzzle-secondary shadow-sm ring-1 ring-puzzle-primary/20 transition-all hover:bg-puzzle-bg hover:text-puzzle-text hover:ring-puzzle-primary/40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Retour
            </button>
          )}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-puzzle-text sm:text-4xl">
              Catégories
            </h1>
            <p className="text-sm font-medium text-puzzle-secondary">
              Choisissez un thème pour commencer votre puzzle.
            </p>
          </div>
        </header>

        {/* Decorative accent bar */}
        <div className="h-1 w-16 rounded-full bg-puzzle-primary/60" />

        {/* Category Grid */}
        <ul
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-5"
          role="list"
        >
          {PUZZLE_THEMES.map((theme) => {
            const heroUrl = getCategoryHeroUrl(theme, puzzles);
            const count = countByTheme(theme);
            return (
              <li key={theme}>
                <CategoryCard
                  theme={theme}
                  heroUrl={heroUrl}
                  count={count}
                  onClick={() => onSelectCategory(theme)}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center gap-2 rounded-[2rem] bg-white/90 p-3 shadow-2xl backdrop-blur-xl border border-puzzle-primary/10">
        {/* Catégories (active) */}
        <NavButton
          active={true}
          onClick={() => {}}
          label="Catégories"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <path d="M3 15.5A1.5 1.5 0 0 1 4.5 14h4A1.5 1.5 0 0 1 10 15.5v4A1.5 1.5 0 0 1 8.5 21h-4A1.5 1.5 0 0 1 3 19.5v-4z" />
            </svg>
          }
        />
        {/* Récent */}
        <NavButton
          active={false}
          onClick={onNavigateRecent}
          label="Récent"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          }
        />
        {/* Favoris — navigate to SelectionView favorites */}
        <NavButton
          active={false}
          onClick={() => onNavigateFavorites?.()}
          label="Favoris"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          }
        />
        {/* En cours */}
        <NavButton
          active={false}
          onClick={() => onNavigateInProgress?.()}
          label="En cours"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        />
        {/* Terminés */}
        <NavButton
          active={false}
          onClick={() => onNavigateCompleted?.()}
          label="Terminés"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        {/* Importés */}
        <NavButton
          active={false}
          onClick={() => onNavigateImported?.()}
          label="Importés"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
