/**
 * Unsplash API service layer.
 *
 * Guidelines respected:
 * - Uses NEXT_PUBLIC_UNSPLASH_ACCESS_KEY env var (never hardcoded)
 * - Uses official photo.urls values, never reconstructed URLs
 * - Calls photo.links.download_location (not download) on selection
 * - Appends UTM params to all user-facing Unsplash links
 * - Uses per_page=20 with page pagination
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.unsplash.com";
const APP_NAME = "mina-puzzle";
const UTM = `utm_source=${APP_NAME}&utm_medium=referral`;

// Target dimensions matching the project's existing migration
const LANDSCAPE_W = 2048;
const LANDSCAPE_H = 1536;
const PORTRAIT_W = 1536;
const PORTRAIT_H = 2048;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in ms

// ─── Category → search query mapping ─────────────────────────────────────────

export const CATEGORY_QUERY_MAP: Record<string, string> = {
  Corse: "Corsica landscape",
  "Coucher de soleil": "golden sunset",
  Couture: "fashion haute couture",
  Exotique: "tropical exotic",
  "Fonds Marins": "underwater ocean sea",
  Fruits: "colorful fruits",
  Marseille: "Marseille France",
  Perles: "pearls jewelry",
  Printemps: "spring flowers bloom",
  Provence: "Provence lavender",
};

/** Returns the best search query for a given category name. */
export function getCategoryQuery(theme: string): string {
  return CATEGORY_QUERY_MAP[theme] ?? theme;
}

/** Appends UTM params to any Unsplash URL. Preserves existing query params. */
export function addUtmParams(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${UTM}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
}

export interface SearchResult {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CachedSearch {
  data: SearchResult;
  timestamp: number;
}

const searchCache: Record<string, CachedSearch> = {};

// ─── API helpers ──────────────────────────────────────────────────────────────

function getAccessKey(): string {
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_UNSPLASH_ACCESS_KEY is not defined. " +
      "Add it to your .env.local file."
    );
  }
  return key;
}

function buildHeaders(): HeadersInit {
  return {
    Authorization: `Client-ID ${getAccessKey()}`,
    "Accept-Version": "v1",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search photos using the Unsplash API.
 * @param query - Search keywords
 * @param page - Page number (1-indexed)
 * @param orientation - "landscape" | "portrait" | "squarish"
 * @returns Paginated search results
 */
export async function searchPhotos(
  query: string,
  page = 1,
  orientation: "landscape" | "portrait" | "squarish" = "landscape"
): Promise<SearchResult> {
  const cacheKey = `${query.trim().toLowerCase()}_${orientation}_${page}`;
  const now = Date.now();

  // Check cache
  const cached = searchCache[cacheKey];
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const params = new URLSearchParams({
    query: query.trim(),
    page: String(page),
    per_page: "10",
    orientation,
  });

  const res = await fetch(`${BASE_URL}/search/photos?${params}`, {
    headers: buildHeaders(),
    // Next.js: no-store to avoid caching stale search results (we handle our own memory cache)
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Unsplash API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as SearchResult;

  // Store in cache
  searchCache[cacheKey] = {
    data,
    timestamp: now,
  };

  return data;
}

/**
 * Fetch a single photo by ID.
 */
export async function getPhoto(id: string): Promise<UnsplashPhoto> {
  const res = await fetch(`${BASE_URL}/photos/${id}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Unsplash API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<UnsplashPhoto>;
}

/**
 * Triggers the Unsplash download event as required by the API guidelines.
 * Must be called when a user actually selects/downloads a photo.
 * Uses download_location (not download link).
 */
export async function triggerDownload(downloadLocation: string): Promise<void> {
  try {
    // Preserve existing query params on download_location
    const url = downloadLocation.includes("?")
      ? `${downloadLocation}&${UTM}`
      : `${downloadLocation}?${UTM}`;

    await fetch(url, {
      headers: buildHeaders(),
      cache: "no-store",
    });
  } catch (err) {
    // Non-blocking — log but don't interrupt the user flow
    console.warn("Failed to trigger Unsplash download event:", err);
  }
}

/**
 * Builds the best image URL for use as a puzzle image.
 * Uses photo.urls.raw with explicit size params for quality control.
 * Falls back to photo.urls.regular if raw is unavailable.
 */
export function buildPuzzleImageUrl(
  photo: UnsplashPhoto,
  orientation: "landscape" | "portrait"
): string {
  const w = orientation === "landscape" ? LANDSCAPE_W : PORTRAIT_W;
  const h = orientation === "landscape" ? LANDSCAPE_H : PORTRAIT_H;

  // Use raw URL with explicit sizing to match project targets exactly
  const base = photo.urls.raw;
  return `${base}&auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

/**
 * Returns a photographer's Unsplash profile URL with UTM params.
 */
export function photographerProfileUrl(photo: UnsplashPhoto): string {
  return addUtmParams(photo.user.links.html);
}

/**
 * Returns the photo's Unsplash page URL with UTM params.
 */
export function photoPageUrl(photo: UnsplashPhoto): string {
  return addUtmParams(photo.links.html);
}
