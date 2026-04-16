"use client";

import { useCallback, useEffect, useState } from "react";
import type { PuzzleImage } from "@/types";
import type { UnsplashPhoto } from "@/lib/unsplash";
import {
  buildPuzzleImageUrl,
  triggerDownload,
  photographerProfileUrl,
} from "@/lib/unsplash";

const STORAGE_KEY = "puzzle-unsplash";

function loadFromStorage(): PuzzleImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as PuzzleImage[];
  } catch {
    // Silently ignore parse errors
  }
  return [];
}

function saveToStorage(puzzles: PuzzleImage[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
  } catch {
    console.warn("Unsplash puzzle storage limit reached.");
  }
}

export function useUnsplashPuzzles() {
  const [unsplashPuzzles, setUnsplashPuzzles] = useState<PuzzleImage[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setUnsplashPuzzles(loadFromStorage());
  }, []);

  /**
   * Adds a new puzzle from an Unsplash photo.
   * Triggers the download event as required by Unsplash guidelines.
   * Stores all metadata for attribution and future use.
   */
  const addUnsplashPuzzle = useCallback(
    async (
      photo: UnsplashPhoto,
      theme: string,
      orientation: "landscape" | "portrait",
      searchQuery: string
    ): Promise<PuzzleImage> => {
      // Trigger download event (required by Unsplash API guidelines)
      await triggerDownload(photo.links.download_location);

      const imageUrl = buildPuzzleImageUrl(photo, orientation);
      const w = orientation === "landscape" ? 2048 : 1536;
      const h = orientation === "landscape" ? 1536 : 2048;

      const id = `unsplash-${photo.id}-${Date.now()}`;

      const newPuzzle: PuzzleImage = {
        id,
        url: imageUrl,
        theme,
        title: `${theme} - ${photo.user.name}`,
        dateAdded: new Date().toISOString().split("T")[0],

        // Unsplash metadata
        source: "unsplash",
        unsplashId: photo.id,
        unsplashPhotoId: photo.id,
        imageUrl,
        thumbUrl: photo.urls.thumb,
        photographerName: photo.user.name,
        photographerUrl: photographerProfileUrl(photo),
        downloadLocation: photo.links.download_location,
        searchQuery,
        orientation,
        width: w,
        height: h,
      };

      setUnsplashPuzzles((prev) => {
        const next = [newPuzzle, ...prev];
        saveToStorage(next);
        return next;
      });

      return newPuzzle;
    },
    []
  );

  /** Remove an Unsplash-added puzzle. */
  const removeUnsplashPuzzle = useCallback((id: string) => {
    setUnsplashPuzzles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { unsplashPuzzles, addUnsplashPuzzle, removeUnsplashPuzzle };
}
