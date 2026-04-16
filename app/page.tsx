"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { SelectionView } from "@/components/selection-view";
import { CategoryView } from "@/components/category-view";
import { HomeView } from "@/components/home-view";
import type { PuzzleImage } from "@/types";
import { SAMPLE_PUZZLES, PUZZLE_THEMES } from "@/lib/sample-puzzles";
import { useUnsplashPuzzles } from "@/hooks/use-unsplash-puzzles";
import type { UnsplashPhoto } from "@/lib/unsplash";

type ViewState = "HOME" | "CATEGORIES" | "SELECTION" | "GAME";
type SelectionTab = "recent" | "favorites" | "completed" | "imported" | "inprogress";

const GameView = dynamic(
  () => import("@/components/game-view").then((m) => m.GameView),
  { ssr: false },
);

export default function HomePage() {
  const [view, setView] = useState<ViewState>("HOME");
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleImage | null>(null);
  const [selectionTab, setSelectionTab] = useState<SelectionTab>("recent");
  const [selectionTheme, setSelectionTheme] = useState<(typeof PUZZLE_THEMES)[number] | "all">("all");

  // Unsplash-added puzzles (stored in localStorage)
  const { unsplashPuzzles, addUnsplashPuzzle } = useUnsplashPuzzles();

  // Combined puzzle list: static + Unsplash-added (most recent first for Unsplash ones)
  const allPuzzles = useMemo(
    () => [...SAMPLE_PUZZLES, ...unsplashPuzzles],
    [unsplashPuzzles]
  );

  const handleAddUnsplashPuzzle = useCallback(
    async (
      photo: UnsplashPhoto,
      theme: string,
      orientation: "landscape" | "portrait",
      searchQuery: string
    ) => {
      await addUnsplashPuzzle(photo, theme, orientation, searchQuery);
    },
    [addUnsplashPuzzle]
  );

  const handleStart = useCallback(() => {
    setView("CATEGORIES");
  }, []);

  const handleSelectCategory = useCallback((theme: (typeof PUZZLE_THEMES)[number]) => {
    setSelectionTheme(theme);
    setSelectionTab("recent"); // Tab is ignored when theme is selected, but good practice
    setView("SELECTION");
  }, []);

  const handleNavigateRecent = useCallback(() => {
    setSelectionTheme("all");
    setSelectionTab("recent");
    setView("SELECTION");
  }, []);

  const handleNavigateCategories = useCallback(() => {
    setView("CATEGORIES");
  }, []);

  const handleNavigateFavorites = useCallback(() => {
    setSelectionTheme("all");
    setSelectionTab("favorites");
    setView("SELECTION");
  }, []);

  const handleNavigateImported = useCallback(() => {
    setSelectionTheme("all");
    setSelectionTab("imported");
    setView("SELECTION");
  }, []);
  
  const handleNavigateCompleted = useCallback(() => {
    setSelectionTheme("all");
    setSelectionTab("completed");
    setView("SELECTION");
  }, []);

  const handleNavigateInProgress = useCallback(() => {
    setSelectionTheme("all");
    setSelectionTab("inprogress");
    setView("SELECTION");
  }, []);

  const handleSelectPuzzle = useCallback((puzzle: PuzzleImage) => {
    setSelectedPuzzle(puzzle);
    setView("GAME");
  }, []);

  const handleBackToSelection = useCallback(() => {
    setSelectedPuzzle(null);
    setView("SELECTION");
  }, []);

  if (view === "GAME" && selectedPuzzle) {
    return (
      <GameView puzzle={selectedPuzzle} onBack={handleBackToSelection} />
    );
  }

  if (view === "SELECTION") {
    return (
      <SelectionView
        puzzles={allPuzzles}
        onSelect={handleSelectPuzzle}
        onBack={handleNavigateCategories}
        onNavigateCategories={handleNavigateCategories}
        onNavigateRecent={handleNavigateRecent}
        onNavigateFavorites={handleNavigateFavorites}
        onNavigateCompleted={handleNavigateCompleted}
        onNavigateImported={handleNavigateImported}
        onNavigateInProgress={handleNavigateInProgress}
        activeTab={selectionTab}
        selectedTheme={selectionTheme}
        onAddUnsplashPuzzle={handleAddUnsplashPuzzle}
      />
    );
  }

  if (view === "CATEGORIES") {
    return (
      <CategoryView
        puzzles={allPuzzles}
        onSelectCategory={handleSelectCategory}
        onNavigateRecent={handleNavigateRecent}
        onNavigateFavorites={handleNavigateFavorites}
        onNavigateImported={handleNavigateImported}
        onNavigateCompleted={handleNavigateCompleted}
        onNavigateInProgress={handleNavigateInProgress}
        onBack={() => setView("HOME")}
      />
    );
  }

  return <HomeView onStart={handleStart} />;
}
