"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "puzzle-completed";

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
    // Silently ignore storage errors
  }
}

export function useCompleted() {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompletedIds(loadFromStorage());
  }, []);

  const markCompleted = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (!next.has(id)) {
        next.add(id);
        saveToStorage(next);
      }
      return next;
    });
  }, []);

  const isCompleted = useCallback(
    (id: string) => completedIds.has(id),
    [completedIds],
  );

  return { completedIds, markCompleted, isCompleted };
}
