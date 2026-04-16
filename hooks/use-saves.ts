"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SavedCluster = {
  id: string;
  x: number;
  y: number;
  locked: boolean;
  pieceOffsets: Array<{ id: string; offsetX: number; offsetY: number }>;
};

export type PuzzleSave = {
  puzzleId: string;
  gridN: number;
  savedAt: string;         // ISO date
  elapsedSeconds: number;  // cumulative play time
  trayPieceIds: string[];  // ordered list of piece IDs still in the tray
  clusters: SavedCluster[];
};

// ─── Storage helpers ────────────────────────────────────────────────────────────

const STORAGE_KEY = "puzzle-saves";

function loadAllSaves(): Record<string, PuzzleSave> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, PuzzleSave>;
    }
  } catch {
    // Silently ignore
  }
  return {};
}

function persistAllSaves(saves: Record<string, PuzzleSave>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  } catch {
    // Silently ignore storage errors (e.g. private browsing quota)
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSaves() {
  const [saves, setSaves] = useState<Record<string, PuzzleSave>>({});

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSaves(loadAllSaves());
  }, []);

  /** Return the save for a given puzzle, or null if none exists. */
  const getSave = useCallback(
    (puzzleId: string): PuzzleSave | null => saves[puzzleId] ?? null,
    [saves],
  );

  /** Persist a save for a puzzle, merging with existing saves. */
  const writeSave = useCallback((save: PuzzleSave) => {
    setSaves((prev) => {
      const next = { ...prev, [save.puzzleId]: save };
      persistAllSaves(next);
      return next;
    });
  }, []);

  /** Delete the save for a puzzle (e.g. when the puzzle is completed). */
  const deleteSave = useCallback((puzzleId: string) => {
    setSaves((prev) => {
      if (!prev[puzzleId]) return prev;
      const next = { ...prev };
      delete next[puzzleId];
      persistAllSaves(next);
      return next;
    });
  }, []);

  /** All saves as a flat array, sorted by most recently saved. */
  const allSaves = Object.values(saves).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );

  return { saves, allSaves, getSave, writeSave, deleteSave };
}

// ─── Standalone read (for beforeunload — no React) ──────────────────────────────

/** Synchronous write used in beforeunload, outside React lifecycle. */
export function writeSaveSync(save: PuzzleSave): void {
  const current = loadAllSaves();
  current[save.puzzleId] = save;
  persistAllSaves(current);
}

/** Formatting helper: seconds → "MM:SS" or "HH:MM:SS" */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
