"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { UnsplashPhoto } from "@/lib/unsplash";
import {
  searchPhotos,
  getCategoryQuery,
  photographerProfileUrl,
  photoPageUrl,
} from "@/lib/unsplash";

// ─── Types ────────────────────────────────────────────────────────────────────

type Orientation = "landscape" | "portrait";

interface UnsplashSearchModalProps {
  /** Category name to use as initial search query */
  initialCategory: string;
  /** Default destination theme for the new puzzle */
  defaultTheme: string;
  /** Called when user confirms adding a photo */
  onAdd: (
    photo: UnsplashPhoto,
    theme: string,
    orientation: Orientation,
    searchQuery: string
  ) => Promise<void>;
  /** Called to close the modal */
  onClose: () => void;
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; results: UnsplashPhoto[]; totalPages: number };

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  onSelect,
}: {
  photo: UnsplashPhoto;
  onSelect: (photo: UnsplashPhoto) => void;
}) {
  const profUrl = photographerProfileUrl(photo);
  const pageUrl = photoPageUrl(photo);

  return (
    <article
      className="group relative overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-900/10 cursor-pointer focus-within:ring-2 focus-within:ring-puzzle-primary"
      aria-label={`Photo par ${photo.user.name}${photo.alt_description ? ` : ${photo.alt_description}` : ""}`}
    >
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => onSelect(photo)}
        className="block w-full aspect-square focus:outline-none"
        aria-label={`Choisir cette photo de ${photo.user.name}`}
      >
        <div className="relative w-full h-full">
          <Image
            src={photo.urls.small}
            alt={photo.alt_description ?? photo.user.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            quality={75}
          />
        </div>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="rounded-full bg-white/95 px-5 py-2.5 text-sm font-extrabold text-black shadow-lg">
            Choisir
          </span>
        </div>
      </button>

      {/* Attribution */}
      <div className="px-3 py-2 bg-white/90 backdrop-blur-sm border-t border-slate-100">
        <p className="text-[11px] text-slate-500 truncate">
          Photo by{" "}
          <a
            href={profUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-slate-700 hover:text-puzzle-primary underline-offset-2 hover:underline"
          >
            {photo.user.name}
          </a>{" "}
          on{" "}
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-slate-700 hover:text-puzzle-primary underline-offset-2 hover:underline"
          >
            Unsplash
          </a>
        </p>
      </div>
    </article>
  );
}

function ConfirmPanel({
  photo,
  theme,
  orientation,
  searchQuery,
  onConfirm,
  onCancel,
  isAdding,
}: {
  photo: UnsplashPhoto;
  theme: string;
  orientation: Orientation;
  searchQuery: string;
  onConfirm: () => void;
  onCancel: () => void;
  isAdding: boolean;
}) {
  const profUrl = photographerProfileUrl(photo);
  const pageUrl = photoPageUrl(photo);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Preview */}
      <div className="relative w-full max-w-sm mx-auto aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-900/10">
        <Image
          src={photo.urls.regular}
          alt={photo.alt_description ?? photo.user.name}
          fill
          sizes="(max-width: 640px) 90vw, 400px"
          className="object-cover"
          quality={80}
          priority
        />
      </div>

      {/* Photo info */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-puzzle-text">
          {photo.alt_description || photo.description || "Photo sans titre"}
        </p>
        <p className="text-xs text-slate-500">
          Photo by{" "}
          <a
            href={profUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-puzzle-primary hover:underline"
          >
            {photo.user.name}
          </a>{" "}
          on{" "}
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-puzzle-primary hover:underline"
          >
            Unsplash
          </a>
        </p>
        <p className="text-xs text-slate-400">
          Catégorie : <strong>{theme}</strong> · {orientation === "landscape" ? "Paysage 4:3" : "Portrait 3:4"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={onCancel}
          disabled={isAdding}
          className="rounded-full bg-slate-100 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isAdding}
          className="inline-flex items-center gap-2 rounded-full bg-puzzle-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-puzzle-primaryDark hover:shadow disabled:opacity-50"
        >
          {isAdding ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Ajout en cours…
            </>
          ) : (
            <>
              Créer ce puzzle
              <svg width="16" height="16" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function UnsplashSearchModal({
  initialCategory,
  defaultTheme,
  onAdd,
  onClose,
}: UnsplashSearchModalProps) {
  const [query, setQuery] = useState(getCategoryQuery(initialCategory));
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ─── Auto-search on open with initial category query ─────────────────────
  const runSearch = useCallback(async (q: string, p: number, ori: Orientation) => {
    if (!q.trim()) return;
    setState({ status: "loading" });
    try {
      const data = await searchPhotos(q.trim(), p, ori);
      if (p === 1) {
        setState({ status: "success", results: data.results, totalPages: data.total_pages });
      } else {
        // Append for "load more"
        setState((prev) => {
          if (prev.status !== "success") return { status: "success", results: data.results, totalPages: data.total_pages };
          return { status: "success", results: [...prev.results, ...data.results], totalPages: data.total_pages };
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setState({ status: "error", message: msg });
    }
  }, []);

  // Launch search automatically on mount
  useEffect(() => {
    runSearch(query, 1, orientation);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    setSelectedPhoto(null);
    runSearch(query, 1, orientation);
  }, [query, orientation, runSearch]);

  const handleOrientationChange = useCallback((ori: Orientation) => {
    setOrientation(ori);
    setPage(1);
    setSelectedPhoto(null);
    runSearch(query, 1, ori);
  }, [query, runSearch]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    runSearch(query, nextPage, orientation);
  }, [page, query, orientation, runSearch]);

  const handleConfirmAdd = useCallback(async () => {
    if (!selectedPhoto) return;
    setIsAdding(true);
    try {
      await onAdd(selectedPhoto, defaultTheme, orientation, query.trim());
      setAddSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Failed to add Unsplash puzzle:", err);
      setIsAdding(false);
    }
  }, [selectedPhoto, defaultTheme, orientation, query, onAdd, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedPhoto) setSelectedPhoto(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedPhoto, onClose]);

  const hasMore =
    state.status === "success" && page < state.totalPages;
  const isLoadingMore =
    state.status === "loading" && page > 1;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-puzzle-bg/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Rechercher une photo Unsplash"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-puzzle-primary/10 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => {
            if (selectedPhoto) setSelectedPhoto(null);
            else onClose();
          }}
          className="min-h-[44px] flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
          aria-label="Fermer la recherche Unsplash"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {selectedPhoto ? "Retour" : "Fermer"}
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-puzzle-text truncate">
            Ajouter depuis Unsplash
          </h2>
          <p className="text-xs text-slate-400 truncate">
            Catégorie : <strong>{defaultTheme}</strong>
          </p>
        </div>

        {/* Unsplash wordmark */}
        <div className="flex items-center gap-1.5 shrink-0">
          <svg width="18" height="18" viewBox="0 0 32 32" className="text-slate-800" fill="currentColor">
            <path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z" />
          </svg>
          <span className="text-xs font-bold text-slate-500 hidden sm:block">Unsplash</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-screen-xl px-4 py-6 pb-44 md:px-8 md:pb-44 flex flex-col gap-6">

          {/* Success state */}
          {addSuccess && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center animate-in fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-puzzle-tertiary/10">
                <svg width="40" height="40" viewBox="0 0 24 24" className="text-puzzle-tertiary" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-lg font-bold text-puzzle-text">Puzzle ajouté avec succès !</p>
              <p className="text-sm text-slate-500">Il apparaît maintenant dans la catégorie <strong>{defaultTheme}</strong>.</p>
            </div>
          )}

          {/* Confirm panel */}
          {!addSuccess && selectedPhoto && (
            <ConfirmPanel
              photo={selectedPhoto}
              theme={defaultTheme}
              orientation={orientation}
              searchQuery={query.trim()}
              onConfirm={handleConfirmAdd}
              onCancel={() => setSelectedPhoto(null)}
              isAdding={isAdding}
            />
          )}

          {/* Search UI */}
          {!addSuccess && !selectedPhoto && (
            <>
              {/* Search bar + controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search input */}
                <div className="flex flex-1 gap-2">
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="ex : paysage montagne, fleurs sauvages…"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-puzzle-text shadow-sm outline-none transition focus:border-puzzle-primary focus:ring-2 focus:ring-puzzle-primary/20 placeholder:text-slate-400"
                    aria-label="Mots-clés de recherche"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={state.status === "loading" && page === 1}
                    className="min-h-[44px] rounded-2xl bg-puzzle-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-puzzle-primaryDark disabled:opacity-60"
                    aria-label="Lancer la recherche"
                  >
                    {state.status === "loading" && page === 1 ? (
                      <span className="h-4 w-4 inline-block rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Orientation toggle */}
                <div className="flex rounded-2xl bg-slate-100 p-1 gap-1 shrink-0" role="group" aria-label="Orientation">
                  <button
                    type="button"
                    onClick={() => handleOrientationChange("landscape")}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      orientation === "landscape"
                        ? "bg-white text-puzzle-primary shadow-sm"
                        : "text-slate-500 hover:text-puzzle-text"
                    }`}
                    aria-pressed={orientation === "landscape"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                    </svg>
                    Paysage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationChange("portrait")}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      orientation === "portrait"
                        ? "bg-white text-puzzle-primary shadow-sm"
                        : "text-slate-500 hover:text-puzzle-text"
                    }`}
                    aria-pressed={orientation === "portrait"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="2" width="12" height="20" rx="2" />
                    </svg>
                    Portrait
                  </button>
                </div>
              </div>

              {/* Attribution notice */}
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-xs text-slate-500 ring-1 ring-slate-100">
                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" className="shrink-0 text-slate-400">
                  <path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z" />
                </svg>
                Photos provenant d&apos;{" "}
                <a href={`https://unsplash.com?utm_source=${("mina-puzzle")}&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-600 hover:text-puzzle-primary">
                  Unsplash
                </a>
                . Attribution photographe requise.
              </div>

              {/* Error state */}
              {state.status === "error" && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <svg width="28" height="28" viewBox="0 0 24 24" className="text-red-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-600">Erreur lors de la recherche</p>
                  <p className="text-xs text-slate-400 max-w-xs">{state.message}</p>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="rounded-full bg-puzzle-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-puzzle-primaryDark"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {/* Loading initial */}
              {state.status === "loading" && page === 1 && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="h-10 w-10 rounded-full border-4 border-puzzle-primary/20 border-t-puzzle-primary animate-spin" />
                  <p className="text-sm text-slate-400 font-medium">Recherche en cours…</p>
                </div>
              )}

              {/* No results */}
              {state.status === "success" && state.results.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <svg width="28" height="28" viewBox="0 0 24 24" className="text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-600">Aucun résultat pour &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-slate-400">Essayez d&apos;autres mots-clés ou changez l&apos;orientation.</p>
                </div>
              )}

              {/* Results grid */}
              {state.status === "success" && state.results.length > 0 && (
                <>
                  <p className="text-xs font-medium text-slate-400">
                    {state.results.length} photo{state.results.length > 1 ? "s" : ""} — cliquez pour choisir
                  </p>
                  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {state.results.map((photo) => (
                      <li key={photo.id}>
                        <PhotoCard photo={photo} onSelect={setSelectedPhoto} />
                      </li>
                    ))}
                  </ul>

                  {/* Load more */}
                  {hasMore && (
                    <div className="flex justify-center pt-2 pb-6">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="rounded-full border border-puzzle-primary/30 bg-white px-8 py-3 text-sm font-bold text-puzzle-primary shadow-sm transition hover:bg-puzzle-primary hover:text-white disabled:opacity-60"
                      >
                        {isLoadingMore ? (
                          <span className="flex items-center gap-2">
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-puzzle-primary/30 border-t-puzzle-primary animate-spin" />
                            Chargement…
                          </span>
                        ) : (
                          "Charger plus de photos"
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
