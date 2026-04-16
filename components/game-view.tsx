"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Path, Rect, Stage } from "react-konva";
import type Konva from "konva";
import type { PuzzleImage } from "@/types";
import { generateShapeData, getPiecePath, type PieceShapeData } from "@/lib/puzzle-shapes";
import { useElementSize } from "@/hooks/use-element-size";
import { Fireworks } from "./fireworks";
import { useCompleted } from "@/hooks/use-completed";
import { useSaves, writeSaveSync, type PuzzleSave } from "@/hooks/use-saves";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameViewProps = {
  puzzle: PuzzleImage;
  onBack: () => void;
};

type Phase = "config" | "playing";
type GridN = 4 | 6 | 8 | 10 | 15 | 20;

type PieceState = {
  id: string;
  col: number;
  row: number;
  offsetX: number;
  offsetY: number;
  shapeData: PieceShapeData;
};

type ClusterState = {
  id: string;
  x: number;
  y: number;
  pieces: PieceState[];
  locked: boolean;
  snapFlash: boolean;
};

type KonvaDragTarget = {
  x: (val?: number) => number;
  y: (val?: number) => number;
  moveToTop: () => void;
};
type KonvaDragEvent = { 
  target: KonvaDragTarget; 
  evt: PointerEvent | TouchEvent | MouseEvent;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAD = 16;
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

function layoutBoardFromImage(
  naturalW: number,
  naturalH: number,
  gridN: GridN,
  containerW: number,
  containerH: number,
) {
  if (containerW === 0 || containerH === 0) {
    return {
      displayW: 0, displayH: 0, pieceW: 0, pieceH: 0,
      cropW: 0, cropH: 0, boardX: 0, boardY: 0,
      stageW: containerW, stageH: containerH,
    };
  }

  const aspect = naturalW / naturalH;
  let displayW = containerW - PAD * 2;
  let displayH = displayW / aspect;

  if (displayH > containerH - PAD * 2) {
    displayH = containerH - PAD * 2;
    displayW = displayH * aspect;
  }

  const boardX = Math.round(Math.max(0, (containerW - displayW) / 2));
  const boardY = Math.round(Math.max(0, (containerH - displayH) / 2));

  return {
    displayW: Math.round(displayW),
    displayH: Math.round(displayH),
    pieceW: displayW / gridN,
    pieceH: displayH / gridN,
    cropW: naturalW / gridN,
    cropH: naturalH / gridN,
    boardX,
    boardY,
    stageW: Math.round(containerW),
    stageH: Math.round(containerH),
  };
}

type Layout = ReturnType<typeof layoutBoardFromImage>;

function createInitialTrayPieces(gridN: GridN): PieceState[] {
  const shapes = generateShapeData(gridN);
  const pieces: PieceState[] = [];
  for (let row = 0; row < gridN; row++) {
    for (let col = 0; col < gridN; col++) {
      pieces.push({
        id: `p-${row}-${col}`,
        col,
        row,
        offsetX: 0,
        offsetY: 0,
        shapeData: shapes[row][col],
      });
    }
  }
  return pieces.sort(() => Math.random() - 0.5);
}

// ─── Adjacency & merge helpers ────────────────────────────────────────────────

function arePiecesGridAdjacent(
  colA: number, rowA: number,
  colB: number, rowB: number,
) {
  const dc = Math.abs(colA - colB);
  const dr = Math.abs(rowA - rowB);
  return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
}

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

function mergeClusters(dst: ClusterState, src: ClusterState, L: Layout): ClusterState {
  const dx = src.x - dst.x;
  const dy = src.y - dst.y;

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

function trySnapToBoard(cluster: ClusterState, L: Layout): { x: number; y: number } | null {
  if (L.displayW === 0) return null;
  const threshold = Math.max(L.pieceW, L.pieceH) * 0.3;

  const first = cluster.pieces[0];
  const expectedOriginX = L.boardX + first.col * L.pieceW - first.offsetX;
  const expectedOriginY = L.boardY + first.row * L.pieceH - first.offsetY;

  const dist = Math.hypot(cluster.x - expectedOriginX, cluster.y - expectedOriginY);
  if (dist > threshold) return null;

  return { x: expectedOriginX, y: expectedOriginY };
}

// ─── Main GameView component ─────────────────────────────────────────────────

export function GameView({ puzzle, onBack }: GameViewProps) {
  const { image, error } = usePuzzleImage(puzzle.url);
  const [phase, setPhase] = useState<Phase>("config");
  const [gridN, setGridN] = useState<GridN | null>(null);
  
  const [trayPieces, setTrayPieces] = useState<PieceState[]>([]);
  const [clusters, setClusters] = useState<ClusterState[]>([]);
  const [draggedTrayPiece, setDraggedTrayPiece] = useState<{
    piece: PieceState;
    clientX: number;
    clientY: number;
  } | null>(null);

  const [helpOn, setHelpOn] = useState(false);
  const [won, setWon] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const winAlertedRef = useRef(false);
  const { markCompleted } = useCompleted();
  const { getSave, writeSave, deleteSave } = useSaves();

  // ─── Timer ────────────────────────────────────────────────────────────────────
  const elapsedRef = useRef(0);       // total elapsed seconds (persisted)
  const timerStartRef = useRef<number | null>(null); // Date.now() when last started

  const getElapsed = useCallback((): number => {
    if (timerStartRef.current === null) return elapsedRef.current;
    return elapsedRef.current + Math.floor((Date.now() - timerStartRef.current) / 1000);
  }, []);

  const startTimer = useCallback(() => {
    timerStartRef.current = Date.now();
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerStartRef.current !== null) {
      elapsedRef.current += Math.floor((Date.now() - timerStartRef.current) / 1000);
      timerStartRef.current = null;
    }
  }, []);

  // ─── Refs for beforeunload (must read current state synchronously) ────────────
  const trayPiecesRef = useRef<PieceState[]>([]);
  const clustersRef = useRef<ClusterState[]>([]);
  const phaseRef = useRef<Phase>("config");
  const gridNRef = useRef<GridN | null>(null);

  useEffect(() => { trayPiecesRef.current = trayPieces; }, [trayPieces]);
  useEffect(() => { clustersRef.current = clusters; }, [clusters]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { gridNRef.current = gridN; }, [gridN]);

  const [mainRef, mainSize] = useElementSize<HTMLElement>();
  const [windowSize, setWindowSize] = useState({ 
    w: typeof window !== "undefined" ? window.innerWidth : 0, 
    h: typeof window !== "undefined" ? window.innerHeight : 0 
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const screenIsLandscape = windowSize.w > windowSize.h;
  const imageIsPortrait = image ? image.naturalWidth < image.naturalHeight : false;
  const isSideTray = screenIsLandscape && imageIsPortrait;

  const stageSpaceW = isSideTray ? Math.max(0, mainSize.width - 160) : mainSize.width;
  const stageSpaceH = isSideTray ? mainSize.height : Math.max(0, mainSize.height - 150);

  const trayRef = useRef<HTMLDivElement>(null);
  const [hoverInsertIndexState, setHoverInsertIndexState] = useState<number | null>(null);
  const hoverInsertIndexRef = useRef<number | null>(null);
  const draggedTrayPieceRef = useRef(draggedTrayPiece);

  const [draggingBoardCluster, setDraggingBoardCluster] = useState<{
    cluster: ClusterState;
    globalX: number;
    globalY: number;
  } | null>(null);
  
  useEffect(() => {
    draggedTrayPieceRef.current = draggedTrayPiece;
  }, [draggedTrayPiece]);

  const setHoverInsertIndex = useCallback((val: number | null) => {
    if (hoverInsertIndexRef.current !== val) {
      hoverInsertIndexRef.current = val;
      setHoverInsertIndexState(val);
    }
  }, []);

  const calculateTrayHoverIndex = useCallback((clientX: number, clientY: number) => {
    if (!trayRef.current) return null;
    const rect = trayRef.current.getBoundingClientRect();
    if (
       clientX >= rect.left && clientX <= rect.right &&
       clientY >= rect.top && clientY <= rect.bottom
    ) {
       if (isSideTray) {
           const scrollY = trayRef.current.scrollTop;
           // Side Tray: ~32px top padding, items are 80px + 24px gap = 104px
           const y = clientY - rect.top + scrollY - 32; 
           return Math.max(0, Math.round(y / 104));
       } else {
           const scrollX = trayRef.current.scrollLeft;
           // Bottom Tray: ~32px left padding, items are 80px + 24px gap = 104px
           const x = clientX - rect.left + scrollX - 32;
           return Math.max(0, Math.round(x / 104));
       }
    }
    return null;
  }, [isSideTray]);

  const layout = useMemo(() => {
    if (!image || !gridN || mainSize.width === 0) return null;
    return layoutBoardFromImage(image.naturalWidth, image.naturalHeight, gridN, stageSpaceW, stageSpaceH);
  }, [image, gridN, stageSpaceW, stageSpaceH, mainSize.width]);

  // ─── Reconstruct full PieceState from a save ────────────────────────────────
  const restoreFromSave = useCallback((save: PuzzleSave) => {
    const n = save.gridN as GridN;
    const shapes = generateShapeData(n);

    const buildPiece = (id: string, offsetX = 0, offsetY = 0): PieceState => {
      const parts = id.split("-"); // "p-{row}-{col}"
      const row = parseInt(parts[1], 10);
      const col = parseInt(parts[2], 10);
      return { id, col, row, offsetX, offsetY, shapeData: shapes[row][col] };
    };

    const restoredTray: PieceState[] = save.trayPieceIds.map((id) => buildPiece(id));

    const restoredClusters: ClusterState[] = save.clusters.map((sc) => ({
      id: sc.id,
      x: sc.x,
      y: sc.y,
      locked: sc.locked,
      snapFlash: false,
      pieces: sc.pieceOffsets.map((po) => buildPiece(po.id, po.offsetX, po.offsetY)),
    }));

    elapsedRef.current = save.elapsedSeconds;
    timerStartRef.current = null;

    winAlertedRef.current = false;
    setTrayPieces(restoredTray);
    setClusters(restoredClusters);
    setGridN(n);
    setPhase("playing");
    setHelpOn(false);
    setWon(false);
    startTimer();
  }, [startTimer]);

  const startGame = useCallback((n: GridN) => {
    if (!image) return;
    // Check for an existing save for this puzzle
    const existing = getSave(puzzle.id);
    if (existing && existing.gridN === n) {
      // Option A: auto-restore from save
      restoreFromSave(existing);
      return;
    }
    // Fresh game
    winAlertedRef.current = false;
    elapsedRef.current = 0;
    timerStartRef.current = null;
    setTrayPieces(createInitialTrayPieces(n));
    setClusters([]);
    setGridN(n);
    setPhase("playing");
    setHelpOn(false);
    setWon(false);
    startTimer();
  }, [image, getSave, puzzle.id, restoreFromSave, startTimer]);

  // Auto-restore on mount if a save exists and image is loaded
  const autoRestoredRef = useRef(false);
  useEffect(() => {
    if (!image || autoRestoredRef.current) return;
    const existing = getSave(puzzle.id);
    if (existing) {
      autoRestoredRef.current = true;
      restoreFromSave(existing);
    }
  }, [image, getSave, puzzle.id, restoreFromSave]);

  const shuffleCurrent = useCallback(() => {
    setTrayPieces(prev => [...prev].sort(() => Math.random() - 0.5));
    setHelpOn(false);
  }, []);

  // ─── Build a PuzzleSave snapshot from current React state ────────────────────
  const buildSave = useCallback(
    (currentTray: PieceState[], currentClusters: ClusterState[], currentGridN: GridN): PuzzleSave => ({
      puzzleId: puzzle.id,
      gridN: currentGridN,
      savedAt: new Date().toISOString(),
      elapsedSeconds: getElapsed(),
      trayPieceIds: currentTray.map((p) => p.id),
      clusters: currentClusters.map((cl) => ({
        id: cl.id,
        x: cl.x,
        y: cl.y,
        locked: cl.locked,
        pieceOffsets: cl.pieces.map((p) => ({ id: p.id, offsetX: p.offsetX, offsetY: p.offsetY })),
      })),
    }),
    [puzzle.id, getElapsed],
  );

  // ─── Persist save when clusters or tray changes (piece placed) ───────────────
  const saveOnChangeRef = useRef(false);
  useEffect(() => {
    if (phase !== "playing" || gridN === null || won) return;
    // Skip the very first render after mount
    if (!saveOnChangeRef.current) {
      saveOnChangeRef.current = true;
      return;
    }
    const save = buildSave(trayPieces, clusters, gridN);
    writeSave(save);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, trayPieces]);

  // ─── Periodic auto-save every 30s ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || gridN === null || won) return;
    const id = setInterval(() => {
      const save = buildSave(trayPiecesRef.current, clustersRef.current, gridNRef.current!);
      writeSave(save);
    }, 30_000);
    return () => clearInterval(id);
  }, [phase, gridN, won, buildSave, writeSave]);

  // ─── Save on tab/window close (beforeunload) ─────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (phaseRef.current !== "playing" || gridNRef.current === null) return;
      const save: PuzzleSave = {
        puzzleId: puzzle.id,
        gridN: gridNRef.current,
        savedAt: new Date().toISOString(),
        elapsedSeconds: getElapsed(),
        trayPieceIds: trayPiecesRef.current.map((p) => p.id),
        clusters: clustersRef.current.map((cl) => ({
          id: cl.id,
          x: cl.x,
          y: cl.y,
          locked: cl.locked,
          pieceOffsets: cl.pieces.map((p) => ({ id: p.id, offsetX: p.offsetX, offsetY: p.offsetY })),
        })),
      };
      writeSaveSync(save);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [puzzle.id, getElapsed]);

  useEffect(() => {
    if (phase !== "playing" || gridN === null) return;
    if (trayPieces.length > 0) return;
    if (clusters.length === 0 || clusters.some((cl) => !cl.locked)) return;
    if (winAlertedRef.current) return;
    winAlertedRef.current = true;
    setTimeout(() => {
      setWon(true);
      markCompleted(puzzle.id);
      deleteSave(puzzle.id); // ✅ clean up save on completion
      pauseTimer();
    }, 400);
  }, [trayPieces.length, clusters, phase, gridN, markCompleted, puzzle.id, deleteSave, pauseTimer]);

  const clearFlashLater = useCallback((clusterId: string, delay = 800) => {
    window.setTimeout(() => {
      setClusters((prev) =>
        prev.map((cl) => (cl.id === clusterId ? { ...cl, snapFlash: false } : cl))
      );
    }, delay);
  }, []);

  const handleTrayPiecePointerDown = useCallback((e: React.PointerEvent, piece: PieceState) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedTrayPiece({
      piece,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  }, []);

  useEffect(() => {
    if (!draggedTrayPiece) {
      setHoverInsertIndex(null);
      return;
    }
    const handleMove = (e: PointerEvent) => {
      setDraggedTrayPiece(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null);
      
      const newHover = calculateTrayHoverIndex(e.clientX, e.clientY);
      setHoverInsertIndex(newHover);

      if (newHover !== null) {
          setTrayPieces(items => {
             const dtp = draggedTrayPieceRef.current;
             if (!dtp) return items;
             const pieceId = dtp.piece.id;
             const currentIndex = items.findIndex(p => p.id === pieceId);
             if (currentIndex === -1) return items;
             const targetIndex = Math.min(newHover, items.length - 1);
             if (currentIndex === targetIndex) return items;
             
             const newItems = [...items];
             const [moved] = newItems.splice(currentIndex, 1);
             newItems.splice(targetIndex, 0, moved);
             return newItems;
          });
      }
    };
    const handleUp = (e: PointerEvent) => {
      if (!draggedTrayPiece || !layout || !mainRef.current) {
        setDraggedTrayPiece(null);
        setHoverInsertIndex(null);
        return;
      }
      
      const mainRect = mainRef.current.getBoundingClientRect();
      const stageLeft = mainRect.left;
      const stageTop = mainRect.top;
      const stageRight = stageLeft + layout.stageW;
      const stageBottom = stageTop + layout.stageH;
      
      if (
        e.clientX >= stageLeft && e.clientX <= stageRight &&
        e.clientY >= stageTop && e.clientY <= stageBottom
      ) {
        // Drop on board
        const localX = e.clientX - stageLeft - layout.pieceW / 2;
        const localY = e.clientY - stageTop - layout.pieceH / 2;
        
        const newCluster: ClusterState = {
          id: `cl-${Date.now()}-${draggedTrayPiece.piece.id}`,
          x: localX,
          y: localY,
          pieces: [{ ...draggedTrayPiece.piece, offsetX: 0, offsetY: 0 }],
          locked: false,
          snapFlash: false,
        };
        
        setTrayPieces(items => items.filter(p => p.id !== draggedTrayPiece.piece.id));
        setHoverInsertIndex(null);
        setDraggedTrayPiece(null);
        
        setClusters(clustersPrev => {
          let updated = [...clustersPrev, newCluster];
          const snap = trySnapToBoard(newCluster, layout);
          if (snap) {
            const lockedPieceSlots = new Set(
              clustersPrev.filter((c) => c.locked).flatMap((c) => c.pieces.map((p) => `${p.col},${p.row}`))
            );
            const allFree = newCluster.pieces.every((p) => !lockedPieceSlots.has(`${p.col},${p.row}`));
            if (allFree) {
              setTimeout(() => clearFlashLater(newCluster.id, 800), 0);
              return updated.map(c => c.id === newCluster.id ? { ...c, x: snap.x, y: snap.y, locked: true, snapFlash: true } : c);
            }
          }
          
          let merged = false;
          let currentClId = newCluster.id;
          for (const other of clustersPrev) {
            if (other.locked) continue;
            const currentCl = updated.find((c) => c.id === currentClId)!;
            if (shouldMergeClusters(currentCl, other, layout)) {
              const mergedCl = mergeClusters(currentCl, other, layout);
              mergedCl.snapFlash = true;
              updated = [
                ...updated.filter((c) => c.id !== currentClId && c.id !== other.id),
                mergedCl,
              ];
              currentClId = mergedCl.id;
              merged = true;
              break;
            }
          }
          if (merged) {
            setTimeout(() => clearFlashLater(currentClId, 800), 0);
          }
          return updated;
        });
      }
      
      setHoverInsertIndex(null);
      setDraggedTrayPiece(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggedTrayPiece, layout, clearFlashLater, calculateTrayHoverIndex, setHoverInsertIndex, mainRef]);

  const handleDragStart = useCallback((clusterId: string, e: KonvaDragEvent) => {
    setClusters(prev => {
      const idx = prev.findIndex(c => c.id === clusterId);
      if (idx === -1) return prev;
      const cl = prev[idx];
      const next = [...prev];
      next.splice(idx, 1);
      next.push(cl);
      
      const rect = mainRef.current?.getBoundingClientRect();
      if (rect) {
         setDraggingBoardCluster({
           cluster: cl,
           globalX: rect.left + e.target.x(),
           globalY: rect.top + e.target.y()
         });
      }
      return next;
    });
  }, [mainRef]);

  const handleDragMove = useCallback((clusterId: string, e: KonvaDragEvent) => {
    const evt = e.evt as PointerEvent | TouchEvent;
    let clientX = 0, clientY = 0;
    if ('clientX' in evt) {
      clientX = evt.clientX;
      clientY = evt.clientY;
    } else if ('changedTouches' in evt && evt.changedTouches.length > 0) {
      clientX = evt.changedTouches[0].clientX;
      clientY = evt.changedTouches[0].clientY;
    }
    
    // Update global visual overlay coordinates
    const rect = mainRef.current?.getBoundingClientRect();
    if (rect) {
      setDraggingBoardCluster(prev => prev ? {
         ...prev,
         globalX: rect.left + e.target.x(),
         globalY: rect.top + e.target.y()
      } : null);
    }

    setHoverInsertIndex(calculateTrayHoverIndex(clientX, clientY));
  }, [calculateTrayHoverIndex, setHoverInsertIndex, mainRef]);

  const handlePieceReturnToTray = useCallback((clusterId: string) => {
    setClusters(prev => {
       const cluster = prev.find(c => c.id === clusterId);
       if (cluster && !cluster.locked) {
            setTimeout(() => {
                setTrayPieces(items => {
                    const existingIds = new Set(items.map(i => i.id));
                    const newItems = cluster.pieces.filter(p => !existingIds.has(p.id)).map(p => ({ ...p, offsetX: 0, offsetY: 0}));
                    return [...items, ...newItems];
                });
            }, 0);
            return prev.filter(c => c.id !== clusterId);
       }
       return prev;
    });
  }, []);

  const handleDragEnd = useCallback((clusterId: string, e: KonvaDragEvent) => {
    if (!layout || !mainRef.current) return;
    const node = e.target;
    const absX = node.x();
    const absY = node.y();

    const evt = e.evt as PointerEvent | TouchEvent;
    let clientX = 0, clientY = 0;
    if ('clientX' in evt) {
      clientX = evt.clientX;
      clientY = evt.clientY;
    } else if ('changedTouches' in evt && evt.changedTouches.length > 0) {
      clientX = evt.changedTouches[0].clientX;
      clientY = evt.changedTouches[0].clientY;
    }

    const mainRect = mainRef.current.getBoundingClientRect();
    const stageLeft = mainRect.left;
    const stageTop = mainRect.top;
    const stageRight = stageLeft + layout.stageW;
    const stageBottom = stageTop + layout.stageH;

    // Strict pointer escape over the stage edge
    const isPlacedInTrayPointer = clientX < stageLeft || clientX > stageRight || clientY < stageTop || clientY > stageBottom;
    
    // Fuzzy logic: if the user intuitively drops the piece such that its physical bounds overlap the invisible Tray limit heavily
    const isPlacedInTrayFuzzy = isSideTray
      ? absX > layout.stageW - layout.pieceW * 0.4
      : absY > layout.stageH - layout.pieceH * 0.4;

    // Terminate overlay dragging
    setDraggingBoardCluster(null);

    // Capture hover index synchronously
    const currentHoverIndex = hoverInsertIndexRef.current;
    
    // Guarantee cleanup of the dashed placeholder UI regardless of the final drop result
    setHoverInsertIndex(null);

    setClusters((prev) => {
      const idx = prev.findIndex((c) => c.id === clusterId);
      if (idx === -1) return prev;
      const originalCl = prev[idx];
      if (originalCl.locked) {
        node.x(originalCl.x);
        node.y(originalCl.y);
        return prev;
      }

      const movedCl = { ...originalCl, x: absX, y: absY };
      const updated = prev.map((c) => c.id === clusterId ? movedCl : c);

      // Reusable tray return function
      const processTrayReturn = (insertIndex: number | null) => {
         setTimeout(() => {
           setTrayPieces(items => {
             const existingIds = new Set(items.map(i => i.id));
             const newItems = movedCl.pieces.filter(p => !existingIds.has(p.id)).map(p => ({ ...p, offsetX: 0, offsetY: 0}));
             
             if (insertIndex !== null) {
                const safeInsertAt = Math.min(insertIndex, items.length);
                const before = items.slice(0, safeInsertAt);
                const after = items.slice(safeInsertAt);
                return [...before, ...newItems, ...after];
             }
             return [...items, ...newItems];
           });
         }, 0);
         return prev.filter(c => c.id !== clusterId);
      };

      // PRIORITY 1: Explicit user intent to drop in Tray (finger is visibly outside the canvas / inside the tray)
      if (currentHoverIndex !== null || isPlacedInTrayPointer) {
         return processTrayReturn(currentHoverIndex);
      }

      // PRIORITY 2: Correct snapping on the board
      const snap = trySnapToBoard(movedCl, layout);
      if (snap) {
        const lockedPieceSlots = new Set(
          updated.filter((c) => c.locked && c.id !== clusterId).flatMap((c) => c.pieces.map((p) => `${p.col},${p.row}`))
        );
        const allFree = movedCl.pieces.every((p) => !lockedPieceSlots.has(`${p.col},${p.row}`));
        if (allFree) {
          node.x(snap.x);
          node.y(snap.y);
          setTimeout(() => clearFlashLater(clusterId, 800), 0);
          return updated.map(c => c.id === clusterId ? { ...c, x: snap.x, y: snap.y, locked: true, snapFlash: true } : c);
        }
      }

      // PRIORITY 3: Merging with existing board pieces
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

      // PRIORITY 4: Fuzzy Tray Drop (Piece was dragged near the boundary wall and didn't snap/merge anywhere)
      if (isPlacedInTrayFuzzy) {
         return processTrayReturn(null);
      }

      // PRIORITY 5: Leave loose piece on the board
      return updated;
    });
  }, [layout, clearFlashLater, isSideTray, setHoverInsertIndex, mainRef]);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-puzzle-bg font-sans text-puzzle-text overflow-hidden touch-none">
      <header className="z-10 flex flex-wrap items-center gap-3 border-b border-puzzle-primary/20 bg-white/90 backdrop-blur-md px-4 py-3 shadow-sm transition-all duration-300">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] order-1 rounded-xl bg-puzzle-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-puzzle-primaryDark hover:shadow disabled:opacity-50"
        >
          Retour
        </button>
        <div className="order-2 min-w-0 flex-1 text-center">
          <p className="text-xs uppercase tracking-wider text-puzzle-primaryDark mb-0.5">
            {puzzle.theme}
          </p>
          <h1 className="truncate text-lg font-bold text-puzzle-text">
            {puzzle.title}
          </h1>
        </div>
        {phase === "playing" && (
          <div className="order-3 flex flex-wrap justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={shuffleCurrent}
              className="min-h-[44px] rounded-xl bg-puzzle-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-puzzle-primaryDark hover:shadow"
            >
              Mélanger
            </button>
            <button
              type="button"
              onClick={() => setPhase("config")}
              className="min-h-[44px] rounded-xl bg-puzzle-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-puzzle-primaryDark hover:shadow"
            >
              Difficulté
            </button>
            <button
              type="button"
              onClick={() => setHelpOn((v) => !v)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition duration-200 ${
                helpOn
                  ? "bg-puzzle-primaryDark text-white shadow-sm ring-2 ring-puzzle-primary/50"
                  : "bg-puzzle-primary text-white shadow-sm hover:bg-puzzle-primaryDark hover:shadow"
              }`}
            >
              Aide
            </button>
          </div>
        )}
      </header>

      <main ref={mainRef} className="flex-1 flex min-h-0 min-w-0 relative">
        {error && (
          <div className="m-auto text-center text-red-600" role="alert">
            {error}
          </div>
        )}

        {phase === "config" && !error && (
          <div className="m-auto flex w-full max-w-lg flex-col items-center gap-8 rounded-3xl border border-white bg-white/60 backdrop-blur px-8 py-10 shadow-lg shadow-puzzle-primary/5">
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
          <div className={`flex w-full h-full ${isSideTray ? 'flex-row' : 'flex-col'}`}>
            <div className="flex-[1_1_100%] relative min-w-0 min-h-0">
              {won && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/10 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-700 animate-in fade-in">
                  <div className="absolute inset-0 z-0">
                    <img src={puzzle.url} alt="" className="w-full h-full object-cover blur-2xl opacity-40 scale-110" />
                  </div>
                  <Fireworks />
                  <div className="relative z-20 bg-white/90 backdrop-blur-md px-10 py-8 rounded-[2.5rem] shadow-2xl shadow-puzzle-accent/30 border border-white/60 text-center transform scale-110 animate-in zoom-in duration-500 max-w-[90%]">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-puzzle-accent/20 text-3xl">
                      🎉
                    </div>
                    <h3 className="text-3xl font-extrabold text-puzzle-text mb-2 tracking-tight">Félicitations !</h3>
                    <p className="text-puzzle-primaryDark font-semibold mb-8">Vous avez brillamment assemblé toutes les pièces.</p>
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => setShowFullImage(true)}
                        className="w-full min-h-[52px] rounded-2xl bg-white border-2 border-puzzle-primary/20 px-8 py-3 text-base font-bold text-puzzle-primary transition-all hover:bg-puzzle-primary/5 hover:border-puzzle-primary hover:scale-[1.02] active:scale-95 shadow-sm"
                      >
                        Admirer l&apos;œuvre ✨
                      </button>
                      <button
                        type="button"
                        onClick={onBack}
                        className="w-full min-h-[52px] rounded-2xl bg-puzzle-primary px-8 py-3 text-base font-bold text-white shadow-lg shadow-puzzle-primary/30 transition-all hover:bg-puzzle-primaryDark hover:scale-[1.02] hover:shadow-xl active:scale-95"
                      >
                        Retour au menu
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <Stage
                width={layout.stageW}
                height={layout.stageH}
                pixelRatio={typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 2, 2) : 2}
              >
                <Layer listening={false}>
                  {helpOn && (
                    <KonvaImage
                      image={image}
                      x={layout.boardX}
                      y={layout.boardY}
                      width={layout.displayW}
                      height={layout.displayH}
                      opacity={1}
                    />
                  )}
                  <Rect
                    x={layout.boardX}
                    y={layout.boardY}
                    width={layout.displayW}
                    height={layout.displayH}
                    fill={helpOn ? "transparent" : "rgba(255,255,255,0.35)"}
                    stroke="#d4d4d8"
                    strokeWidth={1}
                  />
                </Layer>
                <Layer>
                  {clusters.map((cluster) => (
                    <ClusterGroup
                      key={cluster.id}
                      cluster={cluster}
                      image={image}
                      layout={layout}
                      isDragging={draggingBoardCluster?.cluster.id === cluster.id}
                      onDragStart={(e) => handleDragStart(cluster.id, e)}
                      onDragMove={(e) => handleDragMove(cluster.id, e)}
                      onDragEnd={(e) => handleDragEnd(cluster.id, e)}
                      onDblClick={() => handlePieceReturnToTray(cluster.id)}
                      onDblTap={() => handlePieceReturnToTray(cluster.id)}
                    />
                  ))}
                </Layer>
              </Stage>
              
              {/* Permanent Unclipped Drag Overlay for Board Pieces */}
              {windowSize.w > 0 && draggingBoardCluster && (
                <div className="fixed inset-0 pointer-events-none z-[100] touch-none">
                  <Stage
                    width={windowSize.w}
                    height={windowSize.h}
                    pixelRatio={typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 2, 2) : 2}
                  >
                    <Layer>
                       <Group 
                          x={draggingBoardCluster.globalX} 
                          y={draggingBoardCluster.globalY}
                       >
                         {draggingBoardCluster.cluster.pieces.map((piece) => (
                           <PuzzlePiece
                             key={piece.id}
                             piece={piece}
                             image={image}
                             layout={layout}
                             isLocked={false}
                             snapFlash={false}
                           />
                         ))}
                       </Group>
                    </Layer>
                  </Stage>
                </div>
              )}
            </div>
            
            {/* Piece Tray component */}
            <div 
              ref={trayRef}
              className={`flex border-white/10 bg-black/40 backdrop-blur-2xl z-50 overflow-auto scroll-smooth ${
                isSideTray 
                  ? 'w-[160px] flex-col border-l shadow-[-10px_0_30px_rgba(0,0,0,0.3)]' 
                  : 'h-[150px] w-full flex-row border-t shadow-[0_-10px_30px_rgba(0,0,0,0.3)]'
              }`}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div 
                className={`flex ${
                  isSideTray 
                    ? 'flex-col items-center py-8 gap-6 w-full min-h-max' 
                    : 'flex-row items-center px-8 gap-6 h-full min-w-max pb-[env(safe-area-inset-bottom,16px)]'
                }`}
              >
                {(() => {
                  const isHTMLDrag = draggedTrayPiece !== null;
                  const mappedItems: (PieceState | { id: string; isPlaceholder: true })[] = [...trayPieces];
                  
                  if (!isHTMLDrag && hoverInsertIndexState !== null) {
                     const safeInsertAt = Math.min(hoverInsertIndexState, mappedItems.length);
                     mappedItems.splice(safeInsertAt, 0, { id: 'placeholder', isPlaceholder: true });
                  }

                  return mappedItems.map((piece) => {
                    if ('isPlaceholder' in piece) {
                       return (
                         <div 
                           key="placeholder" 
                           className="w-[80px] h-[80px] shrink-0 border-2 border-dashed border-white/30 rounded-xl transition-all duration-300" 
                         />
                       );
                    }
                    
                    const isDragged = draggedTrayPiece?.piece.id === piece.id;
                    return (
                      <div 
                         key={piece.id} 
                         className="shrink-0 transition-all duration-300 flex items-center justify-center animate-in fade-in zoom-in-75 slide-in-from-bottom-2" 
                         style={{ 
                           opacity: isDragged ? 0 : 1, 
                         }}
                      >
                        <TrayPieceItem
                          piece={piece}
                          image={image}
                          layout={layout}
                          onPointerDown={(e) => handleTrayPiecePointerDown(e, piece)}
                        />
                      </div>
                    )
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Dragged Piece */}
      {draggedTrayPiece && image && layout && (
        <div 
          className="fixed pointer-events-none z-[10000] drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
          style={{
             left: draggedTrayPiece.clientX - layout.pieceW / 2,
             top: draggedTrayPiece.clientY - layout.pieceH / 2,
             transform: 'scale(1.15)',
          }}
        >
          <PieceSVG piece={draggedTrayPiece.piece} image={image} layout={layout} />
        </div>
      )}

      {showFullImage && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in zoom-in duration-300 touch-none"
          onClick={() => setShowFullImage(false)}
        >
          <div className="absolute top-0 left-0 right-0 z-[120] flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowFullImage(false); }}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-5 py-2.5 text-sm font-bold text-white border border-white/30 transition-all hover:bg-white/30 hover:scale-105 active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Retour
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-puzzle-primary px-5 py-2.5 text-sm font-bold text-white shadow-xl transition-all hover:bg-puzzle-primaryDark hover:scale-105 active:scale-95"
            >
              Quitter le jeu
            </button>
          </div>
          
          <div className="relative flex-1 flex items-center justify-center p-4 md:p-12 pointer-events-none">
            <img 
              src={puzzle.url} 
              alt={puzzle.title} 
              className="max-w-full max-h-full object-contain shadow-2xl pointer-events-auto rounded-lg"
              style={{ boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}
            />
          </div>
          
          <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none px-6">
            <p className="inline-block px-6 py-2 rounded-full bg-black/40 backdrop-blur-md text-white/80 text-sm font-medium border border-white/10 uppercase tracking-widest">
              {puzzle.title} — {puzzle.theme}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PieceSVG({ piece, image, layout }: { piece: PieceState; image: HTMLImageElement; layout: Layout }) {
  const pathData = useMemo(() => getPiecePath(layout.pieceW, layout.pieceH, piece.shapeData), [layout.pieceW, layout.pieceH, piece.shapeData]);
  
  return (
    <svg 
      width={layout.pieceW} 
      height={layout.pieceH} 
      style={{ overflow: 'visible', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}
    >
      <clipPath id={`clip-${piece.id}`}>
        <path d={pathData} />
      </clipPath>
      <image
        href={image.src}
        width={layout.displayW}
        height={layout.displayH}
        x={-piece.col * layout.pieceW}
        y={-piece.row * layout.pieceH}
        clipPath={`url(#clip-${piece.id})`}
      />
      <path d={pathData} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
    </svg>
  );
}

function TrayPieceItem({ 
  piece, 
  image, 
  layout, 
  onPointerDown 
}: { 
  piece: PieceState; 
  image: HTMLImageElement; 
  layout: Layout; 
  onPointerDown: (e: React.PointerEvent) => void 
}) {
  const TARGET_SIZE = 80; // Uniform baseline scale size for pieces in Tray
  const pieceSize = Math.max(layout.pieceW, layout.pieceH);
  const scale = TARGET_SIZE / pieceSize; // Calculate proportional scale up/down
  
  return (
    <div 
      className="relative cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-all duration-300 touch-none drop-shadow-lg hover:drop-shadow-2xl flex items-center justify-center"
      onPointerDown={onPointerDown}
      style={{
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div 
        style={{ 
          width: layout.pieceW, 
          height: layout.pieceH, 
          transform: `scale(${scale})`, 
          transformOrigin: 'center' 
        }}
      >
        <PieceSVG piece={piece} image={image} layout={layout} />
      </div>
    </div>
  );
}

function DifficultyButton({ label, parts, onClick }: { label: string; parts: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center rounded-3xl border-2 border-puzzle-primary/20 bg-white/70 p-6 transition-all duration-300 hover:border-puzzle-primary hover:bg-white hover:scale-[1.02] hover:shadow-xl hover:shadow-puzzle-primary/20"
    >
      <div className="flex items-center gap-2 text-2xl font-black text-puzzle-text transition-colors group-hover:text-black">
        {parts}
        <span className="text-xl font-medium text-puzzle-text/40">×</span>
        <svg width="24" height="24" viewBox="0 0 24 24" className="w-6 h-6 opacity-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDblClick,
  onDblTap,
}: {
  cluster: ClusterState;
  image: HTMLImageElement;
  layout: Layout;
  isDragging?: boolean;
  onDragStart: (e: KonvaDragEvent) => void;
  onDragMove?: (e: KonvaDragEvent) => void;
  onDragEnd: (e: KonvaDragEvent) => void;
  onDblClick?: () => void;
  onDblTap?: () => void;
}) {
  return (
    <Group
      x={cluster.x}
      y={cluster.y}
      opacity={isDragging ? 0.001 : 1}
      draggable={!cluster.locked}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDblClick={onDblClick}
      onDblTap={onDblTap}
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
  const piecePathRef = useRef<Konva.Path>(null);

  // We cache the piece path once the image is ready.
  // This converts the vector Path + Pattern into a simple bitmap.
  useEffect(() => {
    if (piecePathRef.current && image.complete) {
      const timeout = setTimeout(() => {
        // We only cache the main path to keep the flash effect dynamic
        piecePathRef.current?.cache();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [image.complete, layout.pieceW, layout.pieceH]);

  const pathData = useMemo(
    () => getPiecePath(layout.pieceW, layout.pieceH, piece.shapeData),
    [layout.pieceW, layout.pieceH, piece.shapeData]
  );

  const scaleX = layout.displayW / image.naturalWidth;
  const scaleY = layout.displayH / image.naturalHeight;

  return (
    <Group x={piece.offsetX} y={piece.offsetY}>
      <Path
        ref={piecePathRef}
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
        transformsEnabled="position"
      />
      {snapFlash && (
        <Path
          data={pathData}
          stroke="#A8655D"
          strokeWidth={4}
          shadowColor="#A8655D"
          shadowBlur={18}
          shadowOpacity={0.75}
          listening={false}
          perfectDrawEnabled={false}
          transformsEnabled="position"
        />
      )}
    </Group>
  );
}
