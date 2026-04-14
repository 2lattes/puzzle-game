"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { SelectionView } from "@/components/selection-view";
import { CategoryView } from "@/components/category-view";
import { HomeView } from "@/components/home-view";
import type { PuzzleImage } from "@/types";
import { SAMPLE_PUZZLES, PUZZLE_THEMES } from "@/lib/sample-puzzles";

type ViewState = "HOME" | "CATEGORIES" | "SELECTION" | "GAME";
type SelectionTab = "recent" | "favorites" | "completed" | "imported";

const GameView = dynamic(
  () => import("@/components/game-view").then((m) => m.GameView),
  { ssr: false },
);

export default function HomePage() {
  const [view, setView] = useState<ViewState>("HOME");
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleImage | null>(null);
  const [selectionTab, setSelectionTab] = useState<SelectionTab>("recent");
  const [selectionTheme, setSelectionTheme] = useState<(typeof PUZZLE_THEMES)[number] | "all">("all");

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
        puzzles={SAMPLE_PUZZLES}
        onSelect={handleSelectPuzzle}
        onBack={handleNavigateCategories}
        onNavigateCategories={handleNavigateCategories}
        onNavigateRecent={handleNavigateRecent}
        onNavigateFavorites={handleNavigateFavorites}
        onNavigateCompleted={handleNavigateCompleted}
        onNavigateImported={handleNavigateImported}
        activeTab={selectionTab}
        selectedTheme={selectionTheme}
      />
    );
  }

  if (view === "CATEGORIES") {
    return (
      <CategoryView
        puzzles={SAMPLE_PUZZLES}
        onSelectCategory={handleSelectCategory}
        onNavigateRecent={handleNavigateRecent}
        onNavigateFavorites={handleNavigateFavorites}
        onNavigateImported={handleNavigateImported}
        onNavigateCompleted={handleNavigateCompleted}
        onBack={() => setView("HOME")}
      />
    );
  }

  return <HomeView onStart={handleStart} />;
}
