export interface PuzzleImage {
  id: string;
  url: string;
  theme: string;
  title: string;
  /** ISO 8601 date string, e.g. "2026-04-10". Used to filter "Récent" (last 30 days). */
  dateAdded?: string;
}
