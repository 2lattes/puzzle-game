"use client";

import { useCallback, useEffect, useState } from "react";
import type { PuzzleImage } from "@/types";

const STORAGE_KEY = "puzzle-imported";

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
    // Handle quota exceeded
    console.warn("Storage limits reached.");
  }
}

/** Resize and crop image to 4:3 or 3:4 */
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const isHorizontal = width >= height;

      // Target aspect ratio
      const targetRatio = isHorizontal ? 4 / 3 : 3 / 4;
      const currentRatio = width / height;

      let cropW = width;
      let cropH = height;
      let cropX = 0;
      let cropY = 0;

      if (currentRatio > targetRatio) {
        // Image is too wide
        cropW = height * targetRatio;
        cropX = (width - cropW) / 2;
      } else {
        // Image is too tall
        cropH = width / targetRatio;
        cropY = (height - cropH) / 2;
      }

      // Max dimensions to keep local storage small
      const MAX_SIZE = 800; // reasonable size for web puzzle
      let destW = cropW;
      let destH = cropH;

      if (destW > MAX_SIZE || destH > MAX_SIZE) {
        if (destW > destH) {
          destH = Math.round((destH * MAX_SIZE) / destW);
          destW = MAX_SIZE;
        } else {
          destW = Math.round((destW * MAX_SIZE) / destH);
          destH = MAX_SIZE;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = destW;
      canvas.height = destH;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Unable to create canvas context"));
        return;
      }

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, destW, destH);
      
      // Convert to compressed jpeg
      const base64 = canvas.toDataURL("image/jpeg", 0.7);
      resolve(base64);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export function useImportedPuzzles() {
  const [imported, setImported] = useState<PuzzleImage[]>([]);

  useEffect(() => {
    setImported(loadFromStorage());
  }, []);

  const addImportedImage = useCallback(async (file: File) => {
    try {
      const base64Url = await processImageFile(file);
      const baseName = file.name.replace(/\.[^.]+$/, "") || "Mon image";
      
      const newPuzzle: PuzzleImage = {
        id: `local-${Date.now()}`,
        url: base64Url,
        theme: "Importé",
        title: baseName,
      };

      setImported((prev) => {
        const next = [newPuzzle, ...prev];
        saveToStorage(next);
        return next;
      });
      return newPuzzle;
    } catch (e) {
      console.error("Failed to import image", e);
      return null;
    }
  }, []);

  const deleteImportedImage = useCallback((id: string) => {
    setImported((prev) => {
      const next = prev.filter(p => p.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { imported, addImportedImage, deleteImportedImage };
}
