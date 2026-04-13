"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { SelectionView } from "@/components/selection-view";
import { HomeView } from "@/components/home-view";
import type { PuzzleImage } from "@/types";
import { SAMPLE_PUZZLES } from "@/lib/sample-puzzles";

type ViewState = "HOME" | "SELECTION" | "GAME";

const GameView = dynamic(
  () => import("@/components/game-view").then((m) => m.GameView),
  { ssr: false },
);

export default function HomePage() {
  const [view, setView] = useState<ViewState>("HOME");
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleImage | null>(
    null,
  );

  const handleStart = useCallback(() => {
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
        onBack={() => setView("HOME")}
      />
    );
  }

  return <HomeView onStart={handleStart} />;
}
