export interface PuzzleImage {
  id: string;
  url: string;
  theme: string;
  title: string;
  /** ISO 8601 date string, e.g. "2026-04-10". Used to filter "Récent" (last 30 days). */
  dateAdded?: string;

  // ── Unsplash metadata (optional) ──────────────────────────────────────────
  /** Origin of the puzzle: "unsplash" | "local" | "imported" */
  source?: "unsplash" | "local" | "imported";
  /** Short Unsplash photo slug (e.g. "vCL9BpjsH-4") */
  unsplashId?: string;
  /** Full Unsplash photo ID from the API (e.g. "photo-1561200473-3dd82a0722a3") */
  unsplashPhotoId?: string;
  /** Photo URL used as puzzle image */
  imageUrl?: string;
  /** Thumbnail URL from Unsplash (photo.urls.thumb) */
  thumbUrl?: string;
  /** Photographer's display name */
  photographerName?: string;
  /** URL to the photographer's Unsplash profile */
  photographerUrl?: string;
  /** Unsplash download_location endpoint (must be called when user selects the image) */
  downloadLocation?: string;
  /** The search query that led to this image */
  searchQuery?: string;
  /** Image orientation: "landscape" or "portrait" */
  orientation?: "landscape" | "portrait";
  /** Natural width of the image in pixels */
  width?: number;
  /** Natural height of the image in pixels */
  height?: number;
}
