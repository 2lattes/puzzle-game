"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { PUZZLE_THEMES } from "@/lib/sample-puzzles";
import type { PuzzleImage } from "@/types";

type SelectionViewProps = {
  puzzles: PuzzleImage[];
  onSelect: (puzzle: PuzzleImage) => void;
};

type FilterKey = "all" | (typeof PUZZLE_THEMES)[number];

function isUnsplashHttps(url: string) {
  return url.startsWith("https://images.unsplash.com/");
}

function CardImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {isUnsplashHttps(url) ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className={className}
        />
      ) : (
        // Données locales (FileReader) : pas d’optimisation Next
        <img
          src={url}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
        />
      )}
    </div>
  );
}

export function SelectionView({ puzzles, onSelect }: SelectionViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [customPuzzle, setCustomPuzzle] = useState<PuzzleImage | null>(null);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return puzzles;
    return puzzles.filter((p) => p.theme === activeFilter);
  }, [puzzles, activeFilter]);

  const displayedPuzzles = useMemo(() => {
    if (customPuzzle && activeFilter === "all") {
      return [customPuzzle, ...filtered];
    }
    return filtered;
  }, [customPuzzle, activeFilter, filtered]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") return;
        const baseName = file.name.replace(/\.[^.]+$/, "") || "Ma photo";
        setCustomPuzzle({
          id: `local-${Date.now()}`,
          url: result,
          theme: "Ma photo",
          title: baseName,
        });
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Choisir un puzzle
          </h1>
          <p className="mt-2 text-zinc-600">
            Filtrez par thème ou importez votre propre image.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={openFilePicker}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            Charger ma photo
          </button>
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="toolbar"
        aria-label="Filtrer par thème"
      >
        <FilterButton
          label="Tous"
          pressed={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
        />
        {PUZZLE_THEMES.map((theme) => (
          <FilterButton
            key={theme}
            label={theme}
            pressed={activeFilter === theme}
            onClick={() => setActiveFilter(theme)}
          />
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {displayedPuzzles.map((puzzle) => (
          <li key={puzzle.id}>
            <article className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-sm ring-zinc-900/5 transition hover:border-zinc-300 hover:shadow-md">
              <CardImage
                url={puzzle.url}
                alt={puzzle.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  {puzzle.theme}
                </p>
                <h2 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-white">
                  {puzzle.title}
                </h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(puzzle);
                  }}
                  className="pointer-events-auto mt-4 w-full rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 shadow-md transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                >
                  Jouer
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={pressed}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
        pressed
          ? "bg-zinc-900 text-white shadow-md"
          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}
