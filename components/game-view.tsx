"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Layer, Path, Rect, Stage } from "react-konva";
import type { PuzzleImage } from "@/types";
import { generateShapeData, getPiecePath, type PieceShapeData } from "@/lib/puzzle-shapes";
import { useElementSize } from "@/hooks/use-element-size";
import { Fireworks } from "./fireworks";
import { useCompleted } from "@/hooks/use-completed";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameViewProps = {
  puzzle: PuzzleImage;
  onBack: () => void;
};

type Phase = "config" | "playing";
type GridN = 4 | 6 | 8 | 10 | 15 | 20;

/** A single puzzle piece – coordinates are relative to its parent Cluster origin */
type PieceState = {
  id: string;
  col: number;
  row: number;
  /** Offset inside its cluster (in pixels, computed from col/row × pieceW/H at creation) */
  offsetX: number;
  offsetY: number;
  shapeData: PieceShapeData;
};

/**
 * A Cluster is the draggable entity.
 * It holds one or more PieceState items.
 * x/y are absolute stage-pixels used by Konva for rendering.
 * nx/ny are normalized positions within the scatter zone [0, 1] for UNLOCKED clusters.
 * On window resize, x/y are recomputed from nx/ny so pieces never go out-of-bounds.
 * When locked==true all pieces are snapped on the board; x/y is derived from col/row.
 */
type ClusterState = {
  id: string;
  /** Absolute stage-pixel position of the cluster origin */
  x: number;
  y: number;
  /** Normalized position within scatter zone [0, 1] — reprojected on every resize */
  nx: number;
  ny: number;
  /** All pieces belonging to this cluster */
  pieces: PieceState[];
  /** true when the cluster is perfectly snapped on the board */
  locked: boolean;
  /** Momentary glow after a merge or board-lock */
  snapFlash: boolean;
};

type KonvaDragTarget = {
  x: (val?: number) => number;
  y: (val?: number) => number;
  moveToTop: () => void;
};
type KonvaDragEvent = { target: KonvaDragTarget };

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_MAX_W = 800;
const GAP_BOARD_SCATTER = 24;
const PAD = 16;
/** How close (px) piece-edges must be to trigger a free-space merge */
const FREE_MERGE_PX = 20;

// ─── Image loader hook ────────────────────────────────────────────────────────

function usePuzzleImage(url: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setImage(null);
    setError(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setError("Impossible de charger l'image.");
    img.src = url;
    return () => { img.onload = null; img.onerror = null; };
  }, [url]);
  return { image, error };
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function layoutFromImage(
  naturalW: number,
  naturalH: number,
  gridN: GridN,
  containerW: number,
  containerH: number,
) {
  if (containerW === 0 || containerH === 0) {
    return {
      displayW: 0, displayH: 0, pieceW: 0, pieceH: 0,
      cropW: 0, cropH: 0,
      boardX: 0, boardY: 0,
      scatterX: 0, scatterY: 0, scatterW: 0, scatterH: 0,
      stageW: containerW, stageH: containerH,
    };
  }

  const isPortrait = containerW < containerH;
  let displayW = 0, displayH = 0, boardX = 0, boardY = 0;
  let scatterX = 0, scatterY = 0, scatterW = 0, scatterH = 0;
  const aspect = naturalW / naturalH;

  if (isPortrait) {
    const availW = containerW - PAD * 2;
    const availH = containerH * 0.55;
    if (availW / aspect <= availH) { displayW = availW; displayH = availW / aspect; }
    else                           { displayH = availH; displayW = availH * aspect; }
    boardX = (containerW - displayW) / 2;
    boardY = PAD;
    scatterX = PAD;
    scatterY = boardY + displayH + GAP_BOARD_SCATTER;
    scatterW = containerW - PAD * 2;
    scatterH = containerH - scatterY - PAD;
  } else {
    const availW = containerW * 0.65;
    const availH = containerH - PAD * 2;
    if (availW / aspect <= availH) { displayW = availW; displayH = availW / aspect; }
    else                           { displayH = availH; displayW = availH * aspect; }
    boardX = PAD;
    boardY = Math.max(PAD, (containerH - displayH) / 2 - PAD);
    scatterX = boardX + displayW + GAP_BOARD_SCATTER;
    scatterY = PAD;
    scatterW = containerW - scatterX - PAD;
    scatterH = containerH - PAD * 2;
  }

  return {
    displayW, displayH,
    pieceW: displayW / gridN,
    pieceH: displayH / gridN,
    cropW: naturalW / gridN,
    cropH: naturalH / gridN,
    boardX, boardY,
    scatterX, scatterY,
    scatterW: Math.max(scatterW, 1),
    scatterH: Math.max(scatterH, 1),
    stageW: containerW, stageH: containerH,
  };
}

type Layout = ReturnType<typeof layoutFromImage>;

/** Absolute stage-pixel position of a grid slot */
function slotPos(col: number, row: number, L: Layout) {
  return { x: L.boardX + col * L.pieceW, y: L.boardY + row * L.pieceH };
}

/** Random position inside the scatter zone; returned as absolute px */
function randomScatterPx(L: Layout) {
  if (L.stageW === 0) return { x: 0, y: 0 };
  return {
    x: L.scatterX + Math.random() * Math.max(0, L.scatterW - L.pieceW),
    y: L.scatterY + Math.random() * Math.max(0, L.scatterH - L.pieceH),
  };
}

// ─── Cluster factory ──────────────────────────────────────────────────────────

function createScatteredClusters(gridN: GridN, L: Layout): ClusterState[] {
  const shapes = generateShapeData(gridN);
  const clusters: ClusterState[] = [];
  let i = 0;
  for (let row = 0; row < gridN; row++) {
    for (let col = 0; col < gridN; col++) {
      const { x, y } = randomScatterPx(L);
      const nx = L.scatterW > 0 ? (x - L.scatterX) / L.scatterW : 0;
      const ny = L.scatterH > 0 ? (y - L.scatterY) / L.scatterH : 0;
      clusters.push({
        id: `cl-${i++}`,
        x,
        y,
        nx,
        ny,
        locked: false,
        snapFlash: false,
        pieces: [{
          id: `p-${row}-${col}`,
          col,
          row,
          offsetX: 0,
          offsetY: 0,
          shapeData: shapes[row][col],
        }],
      });
    }
  }
  return clusters;
}

// ─── Adjacency & merge helpers ────────────────────────────────────────────────

/** True when piece A (in cluster A at origin ax/ay) and piece B (in cluster B at bx/by)
 *  are supposed to be horizontally or vertically adjacent in the final grid. */
function arePiecesGridAdjacent(
  colA: number, rowA: number,
  colB: number, rowB: number,
) {
  const dc = Math.abs(colA - colB);
  const dr = Math.abs(rowA - rowB);
  return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
}

/**
 * Given two clusters, check whether any pair of (pieceA, pieceB) from each cluster
 * is grid-adjacent AND their rendered stage positions differ by at most FREE_MERGE_PX.
 * Returns true if a merge should happen.
 */
function shouldMergeClusters(
  ca: ClusterState,
  cb: ClusterState,
  L: Layout,
): boolean {
  for (const pa of ca.pieces) {
    const pax = ca.x + pa.offsetX;
    const pay = ca.y + pa.offsetY;
    for (const pb of cb.pieces) {
      if (!arePiecesGridAdjacent(pa.col, pa.row, pb.col, pb.row)) continue;
      // Where pb *should* be relative to pa if they're correctly aligned
      const expectedPbX = pax + (pb.col - pa.col) * L.pieceW;
      const expectedPbY = pay + (pb.row - pa.row) * L.pieceH;
      const actualPbX = cb.x + pb.offsetX;
      const actualPbY = cb.y + pb.offsetY;
      const dist = Math.hypot(actualPbX - expectedPbX, actualPbY - expectedPbY);
      if (dist < FREE_MERGE_PX) return true;
    }
  }
  return false;
}

/**
 * Merge cluster `src` INTO cluster `dst`.
 * Recalculates offsets so all pieces sit at the correct relative positions
 * based on what `dst`'s first piece establishes as the "grid origin".
 */
function mergeClusters(dst: ClusterState, src: ClusterState, L: Layout): ClusterState {
  // Use dst.x/y as the cluster origin; both clusters share the same grid, so
  // src offsets relative to dst origin = (src.x - dst.x) + src_piece.offsetX, etc.
  const dx = src.x - dst.x;
  const dy = src.y - dst.y;

  // Snap src cluster origin so pieces align perfectly to the grid
  // Pick the first adjacent pair to compute correction
  let corrX = 0, corrY = 0;
  outer:
  for (const pa of dst.pieces) {
    for (const pb of src.pieces) {
      if (!arePiecesGridAdjacent(pa.col, pa.row, pb.col, pb.row)) continue;
      const expectedPbOffX = pa.offsetX + (pb.col - pa.col) * L.pieceW;
      const expectedPbOffY = pa.offsetY + (pb.row - pa.row) * L.pieceH;
      const rawPbOffX = dx + pb.offsetX;
      const rawPbOffY = dy + pb.offsetY;
      corrX = rawPbOffX - expectedPbOffX;
      corrY = rawPbOffY - expectedPbOffY;
      break outer;
    }
  }

  const newPieces: PieceState[] = [
    ...dst.pieces,
    ...src.pieces.map((pb) => ({
      ...pb,
      offsetX: dx + pb.offsetX - corrX,
      offsetY: dy + pb.offsetY - corrY,
    })),
  ];

  return { ...dst, pieces: newPieces };
}

/**
 * Check if this cluster's pieces all land on their correct board slots.
 * Returns the corrected (snapped) x/y for the cluster origin if they do, or null.
 */
function trySnapToBoard(cluster: ClusterState, L: Layout): { x: number; y: number } | null {
  if (L.displayW === 0) return null;
  const threshold = Math.max(L.pieceW, L.pieceH) * 0.3;

  // The cluster's "grid origin" will be boardX/Y when every piece lands exactly.
  // cluster.x + piece.offsetX  should equal  boardX + piece.col * pieceW
  // → clusterOriginX = boardX + piece.col * pieceW - piece.offsetX  (should be same for all)
  // We pick the first piece and compute the expected cluster origin:
  const first = cluster.pieces[0];
  const expectedOriginX = L.boardX + first.col * L.pieceW - first.offsetX;
  const expectedOriginY = L.boardY + first.row * L.pieceH - first.offsetY;

  const dist = Math.hypot(cluster.x - expectedOriginX, cluster.y - expectedOriginY);
  if (dist > threshold) return null;

  // Verify all pieces would land on unoccupied correct slots
  return { x: expectedOriginX, y: expectedOriginY };
}

// ─── Main GameView component ─────────────────────────────────────────────────

export function GameView({ puzzle, onBack }: GameViewProps) {
  const { image, error } = usePuzzleImage(puzzle.url);
  const [phase, setPhase] = useState<Phase>("config");
  const [gridN, setGridN] = useState<GridN | null>(null);
  const [clusters, setClusters] = useState<ClusterState[]>([]);
  const [helpOn, setHelpOn] = useState(false);
  const [won, setWon] = useState(false);
  const winAlertedRef = useRef(false);
  const { markCompleted } = useCompleted();

  const [wrapperRef, size] = useElementSize<HTMLDivElement>();

  const layout = useMemo(() => {
    if (!image || !gridN) return null;
    return layoutFromImage(image.naturalWidth, image.naturalHeight, gridN, size.width, size.height);
  }, [image, gridN, size.width, size.height]);


  // ── Start game ───────────────────────────────────────────────────────────────
  const startGame = useCallback(
    (n: GridN) => {
      if (!image) return;
      winAlertedRef.current = false;
      const L = layoutFromImage(image.naturalWidth, image.naturalHeight, n, size.width, size.height);
      setClusters(createScatteredClusters(n, L));
      setGridN(n);
      setPhase("playing");
      setHelpOn(false);
      setWon(false);
    },
    [image, size.width, size.height],
  );

  // ── Shuffle only unlocked clusters ──────────────────────────────────────────
  const shuffleCurrent = useCallback(() => {
    if (!layout) return;
    winAlertedRef.current = false;
    setClusters((prev) =>
      prev.map((cl) => {
        if (cl.locked) return cl;
        const { x, y } = randomScatterPx(layout);
        // Always normalize so pieces stay in-bounds after any future resize
        const nx = layout.scatterW > 0 ? (x - layout.scatterX) / layout.scatterW : 0;
        const ny = layout.scatterH > 0 ? (y - layout.scatterY) / layout.scatterH : 0;
        return { ...cl, x, y, nx, ny };
      })
    );
    setHelpOn(false);
    setWon(false);
  }, [layout]);

  // ── Win detection ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || clusters.length === 0) return;
    if (clusters.some((cl) => !cl.locked)) return;
    if (winAlertedRef.current) return;
    winAlertedRef.current = true;
    setTimeout(() => {
      setWon(true);
      markCompleted(puzzle.id);
    }, 400);
  }, [clusters, phase, markCompleted, puzzle.id]);

  // ── Reproject positions on resize (the core resize fix) ──────────────────────
  // When the layout changes (window resize / orientation change), remap every
  // unlocked cluster's absolute x/y from its stored normalized nx/ny so pieces
  // can never end up outside the scatter zone.
  useEffect(() => {
    if (!layout) return;
    setClusters((prev) =>
      prev.map((cl) => {
        if (cl.locked) return cl;
        const x = layout.scatterX + cl.nx * layout.scatterW;
        const y = layout.scatterY + cl.ny * layout.scatterH;
        return { ...cl, x, y };
      })
    );
  }, [layout]);

  // ── Flash cleanup ────────────────────────────────────────────────────────────
  const clearFlashLater = useCallback((clusterId: string, delay = 800) => {
    window.setTimeout(() => {
      setClusters((prev) =>
        prev.map((cl) => (cl.id === clusterId ? { ...cl, snapFlash: false } : cl))
      );
    }, delay);
  }, []);

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: KonvaDragEvent) => {
    e.target.moveToTop();
  }, []);

  const handleDragEnd = useCallback(
    (clusterId: string, e: KonvaDragEvent) => {
      if (!layout) return;
      const node = e.target;
      const absX = node.x();
      const absY = node.y();
      // Normalize final position into scatter-zone coords so it survives any future resize
      const normX = layout.scatterW > 0 ? Math.max(0, Math.min(1, (absX - layout.scatterX) / layout.scatterW)) : 0;
      const normY = layout.scatterH > 0 ? Math.max(0, Math.min(1, (absY - layout.scatterY) / layout.scatterH)) : 0;

      setClusters((prev) => {
        const clIdx = prev.findIndex((c) => c.id === clusterId);
        if (clIdx === -1) return prev;
        const cl = prev[clIdx];
        if (cl.locked) return prev;

        // Update cluster position (pixels + normalized)
        let updated = prev.map((c) =>
          c.id === clusterId ? { ...c, x: absX, y: absY, nx: normX, ny: normY } : c
        );

        // ── 1. Try to snap the whole cluster to the board ──────────────────
        const movedCl = { ...cl, x: absX, y: absY };
        const snap = trySnapToBoard(movedCl, layout);
        if (snap) {
          // Check board occupancy: no other locked cluster piece should sit at same col/row
          const lockedPieceSlots = new Set(
            updated
              .filter((c) => c.locked && c.id !== clusterId)
              .flatMap((c) => c.pieces.map((p) => `${p.col},${p.row}`))
          );
          const allFree = movedCl.pieces.every(
            (p) => !lockedPieceSlots.has(`${p.col},${p.row}`)
          );
          if (allFree) {
            node.x(snap.x);
            node.y(snap.y);
            updated = updated.map((c) =>
              c.id === clusterId
                ? { ...c, x: snap.x, y: snap.y, locked: true, snapFlash: true }
                : c
            );
            setTimeout(() => clearFlashLater(clusterId, 800), 0);
            return updated;
          }
        }

        // ── 2. Try to merge with adjacent free clusters ────────────────────
        let merged = false;
        let workingClusters = updated;
        let currentClId = clusterId;

        for (const other of workingClusters) {
          if (other.id === currentClId || other.locked) continue;
          const currentCl = workingClusters.find((c) => c.id === currentClId)!;
          if (shouldMergeClusters(currentCl, other, layout)) {
            const mergedCl = mergeClusters(currentCl, other, layout);
            mergedCl.snapFlash = true;
            workingClusters = [
              ...workingClusters.filter((c) => c.id !== currentClId && c.id !== other.id),
              mergedCl,
            ];
            currentClId = mergedCl.id;
            merged = true;
            break;
          }
        }

        if (merged) {
          const newCl = workingClusters.find((c) => c.id === currentClId)!;
          node.x(newCl.x);
          node.y(newCl.y);
          setTimeout(() => clearFlashLater(currentClId, 800), 0);
          return workingClusters;
        }

        return updated;
      });
    },
    [layout, clearFlashLater],
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] w-full flex-col-reverse md:flex-col bg-puzzle-bg font-sans text-puzzle-text overflow-hidden">
      <header className="z-10 flex flex-wrap items-center gap-3 border-t md:border-t-0 md:border-b border-puzzle-primary/30 bg-white/90 backdrop-blur-md px-4 py-3 shadow-sm transition-all duration-300">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] order-1 rounded-xl bg-white px-4 py-2 text-sm font-medium text-puzzle-text shadow-sm border border-puzzle-primary/40 transition-all hover:bg-puzzle-primary/10 hover:shadow disabled:opacity-50"
        >
          Retour
        </button>
        <div className="order-2 min-w-0 flex-1 sm:order-2 sm:text-center">
          <p className="text-xs uppercase tracking-wider text-puzzle-primaryDark mb-0.5">
            {puzzle.theme}
          </p>
          <h1 className="truncate text-lg font-bold text-puzzle-text">
            {puzzle.title}
          </h1>
        </div>
        {phase === "playing" && (
          <div className="order-3 flex w-full flex-wrap justify-end gap-2 sm:order-3 sm:w-auto">
            <button
              type="button"
              onClick={() => setPhase("config")}
              className="min-h-[44px] rounded-xl border border-puzzle-primary/40 bg-white px-4 py-2 text-sm font-medium text-puzzle-text shadow-sm transition hover:bg-puzzle-primary/10 hover:shadow"
            >
              Changer Difficulté
            </button>
            <button
              type="button"
              onClick={() => setHelpOn((v) => !v)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition duration-200 ${
                helpOn
                  ? "bg-puzzle-accent/20 text-puzzle-text ring-2 ring-puzzle-accent/50"
                  : "bg-white text-puzzle-text border border-puzzle-primary/40 shadow-sm hover:bg-puzzle-primary/10 hover:shadow"
              }`}
            >
              Aide
            </button>
            <button
              type="button"
              onClick={shuffleCurrent}
              className="min-h-[44px] rounded-xl border border-puzzle-primary/40 bg-white px-4 py-2 text-sm font-medium text-puzzle-text shadow-sm transition hover:bg-puzzle-primary/10 hover:shadow"
            >
              Mélanger
            </button>
          </div>
        )}
      </header>

      <main ref={wrapperRef} className="flex flex-1 flex-col items-center justify-center w-full h-full min-h-0 relative touch-none">
        {error && (
          <p className="text-center text-red-600" role="alert">
            {error}
          </p>
        )}

        {phase === "config" && !error && (
          <div className="flex w-full max-w-lg flex-col items-center gap-8 rounded-3xl border border-white bg-white/60 backdrop-blur px-8 py-10 shadow-lg shadow-puzzle-primary/5">
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-extrabold text-puzzle-text">
                Difficulté
              </h2>
              <p className="text-sm font-medium text-puzzle-text/60">
                Sélectionnez le nombre de pièces
              </p>
            </div>
            {!image && (
              <p className="text-sm text-puzzle-text/50 animate-pulse">Chargement...</p>
            )}
            {image && (
              <div className="grid w-full gap-4 grid-cols-2 md:grid-cols-3">
                <DifficultyButton label="Facile" parts={4 * 4} onClick={() => startGame(4)} />
                <DifficultyButton label="Moyen" parts={6 * 6} onClick={() => startGame(6)} />
                <DifficultyButton label="Difficile" parts={8 * 8} onClick={() => startGame(8)} />
                <DifficultyButton label="Expert" parts={10 * 10} onClick={() => startGame(10)} />
                <DifficultyButton label="Maître" parts={15 * 15} onClick={() => startGame(15)} />
                <DifficultyButton label="Légende" parts={20 * 20} onClick={() => startGame(20)} />
              </div>
            )}
          </div>
        )}

        {phase === "playing" && layout && image && (
          <div className="relative w-full h-full">
            {won && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-2xl overflow-hidden">
                <Fireworks />
                <div className="relative z-20 bg-white/95 px-10 py-8 rounded-[2.5rem] shadow-2xl shadow-puzzle-accent/30 border border-white/60 text-center transform scale-110 animate-in fade-in zoom-in duration-500">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-puzzle-accent/20 text-3xl">
                    🎉
                  </div>
                  <h3 className="text-3xl font-extrabold text-puzzle-text mb-2 tracking-tight">Félicitations !</h3>
                  <p className="text-puzzle-primaryDark font-semibold mb-8">Vous avez brillamment assemblé toutes les pièces.</p>
                  
                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full min-h-[52px] rounded-2xl bg-puzzle-text px-8 py-3 text-base font-bold text-white shadow-lg shadow-puzzle-text/20 transition-all hover:bg-black hover:scale-[1.02] hover:shadow-xl active:scale-95"
                  >
                    Retour au menu
                  </button>
                </div>
              </div>
            )}
            <Stage
              width={layout.stageW}
              height={layout.stageH}
              pixelRatio={typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2}
            >
              {/* Background layer: board outline + help image */}
              <Layer listening={false}>
                {helpOn && (
                  <Image
                    image={image}
                    x={layout.boardX}
                    y={layout.boardY}
                    width={layout.displayW}
                    height={layout.displayH}
                    opacity={0.15}
                  />
                )}
                <Rect
                  x={layout.boardX}
                  y={layout.boardY}
                  width={layout.displayW}
                  height={layout.displayH}
                  fill="rgba(255,255,255,0.35)"
                  stroke="#d4d4d8"
                  strokeWidth={1}
                />
              </Layer>

              {/* Piece clusters layer */}
              <Layer>
                {clusters.map((cluster) => (
                  <ClusterGroup
                    key={cluster.id}
                    cluster={cluster}
                    image={image}
                    layout={layout}
                    onDragStart={handleDragStart}
                    onDragEnd={(e) => handleDragEnd(cluster.id, e)}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DifficultyButton({ label, parts, onClick }: { label: string; parts: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center rounded-3xl border-2 border-puzzle-primary/10 bg-white/60 p-6 transition-all duration-300 hover:border-puzzle-primary hover:bg-white hover:scale-[1.02] hover:shadow-xl hover:shadow-puzzle-primary/10"
    >
      <div className="flex items-center gap-2 text-2xl font-black text-puzzle-text transition-colors group-hover:text-black">
        {parts}
        <span className="text-xl font-medium text-puzzle-text/40">×</span>
        <svg viewBox="0 0 24 24" className="w-6 h-6 opacity-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 21H3V14H5A2 2 0 1 0 5 10H3V3H10V5A2 2 0 1 1 14 5V3H21V10H19A2 2 0 1 0 19 14H21V21H14V19A2 2 0 1 1 10 19V21Z" />
        </svg>
      </div>
      <span className="mt-2 block text-[11px] font-bold uppercase tracking-widest text-puzzle-primaryDark/80">{label}</span>
    </button>
  );
}

function ClusterGroup({
  cluster,
  image,
  layout,
  onDragStart,
  onDragEnd,
}: {
  cluster: ClusterState;
  image: HTMLImageElement;
  layout: Layout;
  onDragStart: (e: KonvaDragEvent) => void;
  onDragEnd: (e: KonvaDragEvent) => void;
}) {
  return (
    <Group
      x={cluster.x}
      y={cluster.y}
      draggable={!cluster.locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {cluster.pieces.map((piece) => (
        <PuzzlePiece
          key={piece.id}
          piece={piece}
          image={image}
          layout={layout}
          isLocked={cluster.locked}
          snapFlash={cluster.snapFlash}
        />
      ))}
    </Group>
  );
}

function PuzzlePiece({
  piece,
  image,
  layout,
  isLocked,
  snapFlash,
}: {
  piece: PieceState;
  image: HTMLImageElement;
  layout: Layout;
  isLocked: boolean;
  snapFlash: boolean;
}) {
  const pathData = useMemo(
    () => getPiecePath(layout.pieceW, layout.pieceH, piece.shapeData),
    [layout.pieceW, layout.pieceH, piece.shapeData]
  );

  const scaleX = layout.displayW / image.naturalWidth;
  const scaleY = layout.displayH / image.naturalHeight;

  return (
    <Group x={piece.offsetX} y={piece.offsetY}>
      <Path
        data={pathData}
        fillPatternImage={image}
        fillPatternOffsetX={piece.col * layout.cropW}
        fillPatternOffsetY={piece.row * layout.cropH}
        fillPatternScaleX={scaleX}
        fillPatternScaleY={scaleY}
        shadowBlur={isLocked ? 0 : 5}
        shadowColor="rgba(0,0,0,0.18)"
        shadowOffsetY={2}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
        perfectDrawEnabled={false}
      />
      {snapFlash && (
        <Path
          data={pathData}
          stroke="#9cb1a2"
          strokeWidth={4}
          shadowColor="#9cb1a2"
          shadowBlur={18}
          shadowOpacity={0.85}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
