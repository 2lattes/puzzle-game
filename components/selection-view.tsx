"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PUZZLE_THEMES } from "@/lib/sample-puzzles";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompleted } from "@/hooks/use-completed";
import { useImportedPuzzles } from "@/hooks/use-imported";
import { useSaves, formatElapsed } from "@/hooks/use-saves";
import type { PuzzleImage } from "@/types";
import type { UnsplashPhoto } from "@/lib/unsplash";
import { UnsplashSearchModal } from "@/components/unsplash-search-modal";

type SelectionViewProps = {
  puzzles: PuzzleImage[];
  onSelect: (puzzle: PuzzleImage) => void;
  onBack?: () => void;
  onNavigateCategories?: () => void;
  onNavigateRecent?: () => void;
  onNavigateFavorites?: () => void;
  onNavigateCompleted?: () => void;
  onNavigateImported?: () => void;
  onNavigateInProgress?: () => void;
  activeTab?: TabKey;
  selectedTheme?: (typeof PUZZLE_THEMES)[number] | "all";
  /** Called when user confirms adding an Unsplash photo as a new puzzle */
  onAddUnsplashPuzzle?: (
    photo: UnsplashPhoto,
    theme: string,
    orientation: "landscape" | "portrait",
    searchQuery: string
  ) => Promise<void>;
};

type TabKey = "recent" | "favorites" | "completed" | "imported" | "inprogress";

function shouldUseNextImage(url: string) {
  return url.startsWith("/") || url.startsWith("https://images.unsplash.com/");
}

function CardImage({
  url,
  alt,
  className,
  priority = false,
}: {
  url: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {shouldUseNextImage(url) ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={className}
          priority={priority}
          quality={85}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
          loading={priority ? "eager" : "lazy"}
        />
      )}
    </div>
  );
}

/** Animated heart button */
function HeartButton({
  isFav,
  onToggle,
  puzzleTitle,
}: {
  isFav: boolean;
  onToggle: () => void;
  puzzleTitle: string;
}) {
  const [popped, setPopped] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle();
      setPopped(true);
      setTimeout(() => setPopped(false), 300);
    },
    [onToggle],
  );

  return (
    <button
      type="button"
      aria-label={
        isFav
          ? `Retirer "${puzzleTitle}" des favoris`
          : `Ajouter "${puzzleTitle}" aux favoris`
      }
      aria-pressed={isFav}
      onClick={handleClick}
      style={{
        transform: popped ? "scale(1.35)" : "scale(1)",
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}
      className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-puzzle-primary ${
        isFav
          ? "bg-puzzle-primary text-white hover:bg-puzzle-primaryDark"
          : "bg-white/60 text-puzzle-text/50 hover:bg-white hover:text-puzzle-primary"
      }`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        aria-hidden="true"
        fill={isFav ? "white" : "none"}
        stroke="currentColor"
        strokeWidth={isFav ? 0 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
    </button>
  );
}

/** Checkmark for completed puzzles */
function CheckmarkIcon() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-puzzle-tertiary text-white shadow-md backdrop-blur-md">
      <svg width="20" height="20" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

/** Badge for in-progress puzzles: % + time */
function InProgressBadge({ percent, elapsed }: { percent: number; elapsed: number }) {
  return (
    <div className="pointer-events-none absolute top-2 left-0 right-0 z-10 flex flex-col gap-1 p-3">
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-white/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-puzzle-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-puzzle-primary/90 px-2 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
          {Math.round(percent)}%
        </span>
        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
          ⏱ {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  );
}

/** Floating bottom navigation item */
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

export function SelectionView({
  puzzles,
  onSelect,
  onBack,
  onNavigateCategories,
  onNavigateRecent,
  onNavigateFavorites,
  onNavigateCompleted,
  onNavigateImported,
  onNavigateInProgress,
  activeTab = "recent",
  selectedTheme = "all",
  onAddUnsplashPuzzle,
}: SelectionViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unsplashModalOpen, setUnsplashModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { isCompleted } = useCompleted();
  const { imported, addImportedImage } = useImportedPuzzles();
  const { allSaves, getSave } = useSaves();

  const allFilteredPuzzles = useMemo(() => {
    // If a specific theme (category) is selected, we show all puzzles for that theme
    // sorted chronologically (Oldest to Newest).
    if (selectedTheme !== "all") {
      return puzzles
        .filter((p) => p.theme === selectedTheme)
        .sort((a, b) => {
          if (!a.dateAdded) return -1;
          if (!b.dateAdded) return 1;
          return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (activeTab === "recent") {
      return puzzles
        .filter((p) => {
          if (!p.dateAdded) return false;
          return new Date(p.dateAdded) >= thirtyDaysAgo;
        })
        .sort((a, b) => new Date(b.dateAdded!).getTime() - new Date(a.dateAdded!).getTime());
    }
    if (activeTab === "favorites") {
      return puzzles.filter((p) => isFavorite(p.id));
    }
    if (activeTab === "completed") {
      return puzzles.filter((p) => isCompleted(p.id));
    }
    if (activeTab === "imported") {
      return imported;
    }
    if (activeTab === "inprogress") {
      const saveIds = new Set(allSaves.map((s) => s.puzzleId));
      return [
        ...puzzles.filter((p) => saveIds.has(p.id)),
        ...imported.filter((p) => saveIds.has(p.id)),
      ].sort((a, b) => {
        const sa = getSave(a.id);
        const sb = getSave(b.id);
        if (!sa || !sb) return 0;
        return new Date(sb.savedAt).getTime() - new Date(sa.savedAt).getTime();
      });
    }
    return puzzles;
  }, [puzzles, imported, activeTab, isFavorite, selectedTheme, isCompleted, allSaves, getSave]);

  const displayedPuzzles = useMemo(() => {
    return allFilteredPuzzles.slice(0, visibleCount);
  }, [allFilteredPuzzles, visibleCount]);

  // Reset pagination when theme or tab changes
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedTheme, activeTab]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        e.target.value = "";
        return;
      }
      await addImportedImage(file);
      e.target.value = "";
      onNavigateImported?.();
    },
    [addImportedImage, onNavigateImported]
  );

  return (
    <>
      {/* Unsplash Search Modal */}
      {unsplashModalOpen && selectedTheme !== "all" && onAddUnsplashPuzzle && (
        <UnsplashSearchModal
          initialCategory={selectedTheme}
          defaultTheme={selectedTheme}
          onAdd={async (photo, theme, orientation, searchQuery) => {
            await onAddUnsplashPuzzle(photo, theme, orientation, searchQuery);
          }}
          onClose={() => setUnsplashModalOpen(false)}
        />
      )}

    <div className="relative flex min-h-[100dvh] flex-col bg-puzzle-bg font-sans text-puzzle-text pb-48">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-8 md:py-12">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
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

            {/* Add via Unsplash button — only in a specific category view */}
            {selectedTheme !== "all" && onAddUnsplashPuzzle && (
              <button
                type="button"
                onClick={() => setUnsplashModalOpen(true)}
                className="ml-auto flex items-center gap-2 rounded-full bg-puzzle-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-puzzle-primaryDark hover:shadow active:scale-95"
                aria-label={`Ajouter un puzzle depuis Unsplash dans ${selectedTheme}`}
              >
                <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" className="h-4 w-4">
                  <path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z" />
                </svg>
                <span className="hidden sm:inline">Ajouter via Unsplash</span>
                <span className="sm:hidden">+ Unsplash</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-puzzle-text sm:text-4xl">
              {selectedTheme !== "all" && `Puzzles ${selectedTheme}`}
              {selectedTheme === "all" && activeTab === "recent" && "Récemment ajoutés"}
              {activeTab === "favorites" && "Vos favoris"}
              {activeTab === "completed" && "Puzzles terminés"}
              {activeTab === "imported" && "Créés par vous"}
              {activeTab === "inprogress" && "En cours"}
            </h1>
            <p className="text-sm font-medium text-puzzle-secondary">
              {selectedTheme !== "all" && `Parcourez tous les puzzles de la catégorie ${selectedTheme}.`}
              {selectedTheme === "all" && activeTab === "recent" && "Les puzzles ajoutés ces 30 derniers jours."}
              {activeTab === "favorites" && "Retrouvez ici les puzzles que vous avez aimés."}
              {activeTab === "completed" && "Félicitations ! Retrouvez ici tous vos puzzles résolus."}
              {activeTab === "imported" && "Transformez vos propres photos en puzzles."}
              {activeTab === "inprogress" && "Reprenez là où vous en étiez."}
            </p>
          </div>
        </header>

        {/* Theme filters removed — replaced by CategoryView */}

        {/* Import Action Block (only on "Importés") */}
        {activeTab === "imported" && (
          <div className="relative mb-6 flex flex-col justify-between gap-6 overflow-hidden rounded-[2rem] bg-black p-8 text-white sm:flex-row sm:items-center shadow-lg">
            <div className="relative z-10 max-w-md">
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                Donnez vie à vos idées.
              </h2>
              <p className="text-white/70 mb-6 text-sm">
                Créez de nouveaux puzzles à partir de vos photos stockées sur votre appareil.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={onFileChange}
              />
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105 hover:bg-slate-100"
              >
                Importer une image
                <svg width="16" height="16" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
            {/* Background decoration */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          </div>
        )}

        {/* Empty state for recent */}
        {displayedPuzzles.length === 0 && activeTab === "recent" && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200/50">
              <svg width="36" height="36" viewBox="0 0 24 24" className="h-9 w-9 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <p className="font-semibold text-slate-500">Aucun puzzle ajouté récemment</p>
          </div>
        )}

        {displayedPuzzles.length === 0 && activeTab === "favorites" && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200/50">
              <svg width="36" height="36" viewBox="0 0 24 24" className="h-9 w-9 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-500">Aucun favori pour l&apos;instant</p>
          </div>
        )}
        {displayedPuzzles.length === 0 && activeTab === "completed" && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200/50">
              <svg width="36" height="36" viewBox="0 0 24 24" className="h-9 w-9 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-semibold text-slate-500">Vous n&apos;avez pas encore terminé de puzzle</p>
          </div>
        )}

        {displayedPuzzles.length === 0 && activeTab === "inprogress" && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200/50">
              <svg width="36" height="36" viewBox="0 0 24 24" className="h-9 w-9 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <p className="font-semibold text-slate-500">Aucune partie en cours</p>
            <p className="text-sm text-slate-400">Commencez un puzzle pour qu&apos;il apparaisse ici.</p>
          </div>
        )}

        {/* Grid */}
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {displayedPuzzles.map((puzzle) => {
            const completed = isCompleted(puzzle.id);
            const save = getSave(puzzle.id);
            const totalPieces = save ? save.gridN * save.gridN : null;
            const lockedCount = save
              ? save.clusters.filter((c) => c.locked).reduce((acc, c) => acc + c.pieceOffsets.length, 0)
              : 0;
            const percent = totalPieces ? Math.min(100, (lockedCount / totalPieces) * 100) : 0;
            return (
              <li key={puzzle.id}>
                <article
                  onClick={() => onSelect(puzzle)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(puzzle);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Jouer le puzzle ${puzzle.title}`}
                  className={`group relative aspect-square overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 hover:shadow-xl hover:ring-slate-900/10 hover:-translate-y-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-puzzle-primary ${
                    completed ? 'opacity-80' : ''
                  } ${
                    activeTab === "inprogress" ? 'ring-2 ring-puzzle-primary/40' : ''
                  }`}
                >
                  <CardImage
                    url={puzzle.url}
                    alt={puzzle.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    priority={displayedPuzzles.indexOf(puzzle) < 4}
                  />

                  {completed && <CheckmarkIcon />}

                  {activeTab === "inprogress" && save && (
                    <InProgressBadge percent={percent} elapsed={save.elapsedSeconds} />
                  )}

                  {activeTab !== "imported" && activeTab !== "inprogress" && (
                    <HeartButton
                      isFav={isFavorite(puzzle.id)}
                      onToggle={() => toggleFavorite(puzzle.id)}
                      puzzleTitle={puzzle.title}
                    />
                  )}

                  {/* Hover overlay gradient */}
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                      {puzzle.theme}
                    </p>
                    <h2 className="mt-1 line-clamp-1 text-lg font-bold leading-tight text-white mb-4">
                      {puzzle.title}
                    </h2>
                    <div
                      className="min-h-[44px] w-full rounded-2xl bg-white/95 backdrop-blur-md px-4 py-2.5 text-center text-sm font-extrabold text-black shadow-lg transition-transform group-hover:scale-105 active:scale-95"
                    >
                      {activeTab === "inprogress" ? "Reprendre ▶" : "Jouer"}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        {/* Load more button */}
        {allFilteredPuzzles.length > visibleCount && (
          <div className="mt-12 flex justify-center pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="group relative flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-extrabold text-puzzle-primary shadow-lg ring-1 ring-puzzle-primary/10 transition-all hover:bg-puzzle-primary hover:text-white hover:shadow-2xl hover:ring-puzzle-primary/20 active:scale-95"
            >
              <span className="relative z-10 capitalize">Afficher plus</span>
              <svg 
                width="20" height="20" viewBox="0 0 24 24" 
                className="relative z-10 transition-transform group-hover:rotate-180" 
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
              {/* Counter badge inside button */}
              <span className="absolute -top-3 -right-3 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-puzzle-tertiary px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-white">
                {allFilteredPuzzles.length - visibleCount}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center gap-2 rounded-[2rem] bg-white/90 p-3 shadow-2xl backdrop-blur-xl border border-puzzle-primary/10">
        <NavButton
          active={selectedTheme !== "all"}
          onClick={() => onNavigateCategories?.()}
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
        <NavButton
          active={selectedTheme === "all" && activeTab === "recent"}
          onClick={() => onNavigateRecent?.()}
          label="Récent"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          }
        />
        <NavButton
          active={selectedTheme === "all" && activeTab === "favorites"}
          onClick={() => onNavigateFavorites?.()}
          label="Favoris"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          }
        />
        <NavButton
          active={selectedTheme === "all" && activeTab === "inprogress"}
          onClick={() => onNavigateInProgress?.()}
          label="En cours"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        />
        <NavButton
          active={selectedTheme === "all" && activeTab === "completed"}
          onClick={() => onNavigateCompleted?.()}
          label="Terminés"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <NavButton
          active={selectedTheme === "all" && activeTab === "imported"}
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
    </>
  );
}

