"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { SelectionView } from "@/components/selection-view";
import type { PuzzleImage } from "@/types";

type ViewState = "SELECTION" | "GAME";
import { SAMPLE_PUZZLES } from "@/lib/sample-puzzles";

const GameView = dynamic(
  () => import("@/components/game-view").then((m) => m.GameView),
  { ssr: false },
);

export default function HomePage() {
  const [view, setView] = useState<ViewState>("SELECTION");
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleImage | null>(
    null,
  );

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

  return (
    <SelectionView puzzles={SAMPLE_PUZZLES} onSelect={handleSelectPuzzle} />
  );
}
