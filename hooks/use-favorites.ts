"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "puzzle-favorites";

function loadFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch {
    // Silently ignore parse errors
  }
  return new Set();
}

function saveToStorage(ids: Set<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Silently ignore storage errors (e.g. private browsing quota)
  }
}

export function useFavorites() {
  // Start with an empty set to avoid SSR mismatch, then hydrate on mount
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFavoriteIds(loadFromStorage());
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveToStorage(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  return { favoriteIds, toggleFavorite, isFavorite, count: favoriteIds.size };
}
