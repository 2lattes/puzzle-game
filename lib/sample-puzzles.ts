import type { PuzzleImage } from "@/types";
import ALL_PUZZLES from "../public/puzzles.json";

/** Thèmes officiels */
export const PUZZLE_THEMES = [
  "Corse",
  "Coucher de soleil",
  "Couture",
  "Exotique",
  "Fonds Marins",
  "Fruits",
  "Marseille",
  "Perles",
  "Printemps",
  "Provence",
] as const;

/**
 * Tous les puzzles (locaux et distants) centralisés.
 */
export const SAMPLE_PUZZLES: PuzzleImage[] = ALL_PUZZLES as PuzzleImage[];

