"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Layer, Rect, Stage } from "react-konva";
import type { PuzzleImage } from "@/types";

type GameViewProps = {
  puzzle: PuzzleImage;
  onBack: () => void;
};

type Phase = "config" | "playing";

type GridN = 3 | 4 | 6;

type PieceState = {
  id: string;
  col: number;
  row: number;
  x: number;
  y: number;
  locked: boolean;
  /** Court éclat vert après aimantage */
  snapFlash: boolean;
};

/** Cible Konva pour drag (Group / Node) */
type KonvaDragTarget = {
  x: () => number;
  y: () => number;
  position: (p: { x: number; y: number }) => void;
  moveToTop: () => void;
};

type KonvaDragEvent = { target: KonvaDragTarget };

const SNAP_PX = 20;
const BOARD_MAX_W = 800;
const GAP_BOARD_SCATTER = 32;
const SCATTER_EXTRA_W = 400;
const PAD = 24;

function usePuzzleImage(url: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImage(null);
    setError(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setError("Impossible de charger l’image.");
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return { image, error };
}

function layoutFromImage(
  naturalW: number,
  naturalH: number,
  gridN: GridN,
) {
  let displayW = naturalW;
  let displayH = naturalH;
  if (displayW > BOARD_MAX_W) {
    displayW = BOARD_MAX_W;
    displayH = (naturalH / naturalW) * BOARD_MAX_W;
  }

  const pieceW = displayW / gridN;
  const pieceH = displayH / gridN;
  const cropW = naturalW / gridN;
  const cropH = naturalH / gridN;

  const boardX = PAD;
  const boardY = PAD;

  const scatterX = boardX + displayW + GAP_BOARD_SCATTER;
  const scatterY = boardY;
  const scatterW = SCATTER_EXTRA_W;
  const scatterH = Math.max(displayH, 420);

  const stageW = scatterX + scatterW + PAD;
  const stageH = Math.max(boardY + displayH, scatterY + scatterH) + PAD;

  return {
    displayW,
    displayH,
    pieceW,
    pieceH,
    cropW,
    cropH,
    boardX,
    boardY,
    scatterX,
    scatterY,
    scatterW,
    scatterH,
    stageW,
    stageH,
  };
}

function slotPosition(
  col: number,
  row: number,
  boardX: number,
  boardY: number,
  pieceW: number,
  pieceH: number,
) {
  return { x: boardX + col * pieceW, y: boardY + row * pieceH };
}

function randomScatterPosition(
  pieceW: number,
  pieceH: number,
  scatterX: number,
  scatterY: number,
  scatterW: number,
  scatterH: number,
) {
  const x = scatterX + Math.random() * Math.max(1, scatterW - pieceW);
  const y = scatterY + Math.random() * Math.max(1, scatterH - pieceH);
  return { x, y };
}

function createShuffledPieces(
  gridN: GridN,
  layout: ReturnType<typeof layoutFromImage>,
): PieceState[] {
  const list: PieceState[] = [];
  let i = 0;
  for (let row = 0; row < gridN; row++) {
    for (let col = 0; col < gridN; col++) {
      const { x, y } = randomScatterPosition(
        layout.pieceW,
        layout.pieceH,
        layout.scatterX,
        layout.scatterY,
        layout.scatterW,
        layout.scatterH,
      );
      list.push({
        id: `p-${i++}`,
        col,
        row,
        x,
        y,
        locked: false,
        snapFlash: false,
      });
    }
  }
  return list;
}

export function GameView({ puzzle, onBack }: GameViewProps) {
  const { image, error } = usePuzzleImage(puzzle.url);
  const [phase, setPhase] = useState<Phase>("config");
  const [gridN, setGridN] = useState<GridN | null>(null);
  const [pieces, setPieces] = useState<PieceState[]>([]);
  const [helpOn, setHelpOn] = useState(false);
  const winAlertedRef = useRef(false);

  const layout = useMemo(() => {
    if (!image || !gridN) return null;
    return layoutFromImage(image.naturalWidth, image.naturalHeight, gridN);
  }, [image, gridN]);

  const startGame = useCallback(
    (n: GridN) => {
      if (!image) return;
      winAlertedRef.current = false;
      const L = layoutFromImage(image.naturalWidth, image.naturalHeight, n);
      setGridN(n);
      setPieces(createShuffledPieces(n, L));
      setPhase("playing");
      setHelpOn(false);
    },
    [image],
  );

  const shuffleCurrent = useCallback(() => {
    if (!layout || !gridN) return;
    winAlertedRef.current = false;
    setPieces(createShuffledPieces(gridN, layout));
    setHelpOn(false);
  }, [layout, gridN]);

  useEffect(() => {
    if (
      phase !== "playing" ||
      pieces.length === 0 ||
      pieces.some((p) => !p.locked)
    ) {
      return;
    }
    if (winAlertedRef.current) return;
    winAlertedRef.current = true;
    window.alert("Bravo !");
  }, [pieces, phase]);

  const clearSnapFlashLater = useCallback((id: string) => {
    window.setTimeout(() => {
      setPieces((prev) =>
        prev.map((p) => (p.id === id ? { ...p, snapFlash: false } : p)),
      );
    }, 2200);
  }, []);

  const handleDragStart = useCallback((e: KonvaDragEvent) => {
    e.target.moveToTop();
  }, []);

  const handleDragEnd = useCallback(
    (pieceId: string, e: KonvaDragEvent) => {
      if (!layout) return;
      const node = e.target;
      const x = node.x();
      const y = node.y();
      let snapped = false;

      setPieces((prev) => {
        const piece = prev.find((p) => p.id === pieceId);
        if (!piece || piece.locked) return prev;

        const target = slotPosition(
          piece.col,
          piece.row,
          layout.boardX,
          layout.boardY,
          layout.pieceW,
          layout.pieceH,
        );

        const dist = Math.hypot(x - target.x, y - target.y);
        if (dist < SNAP_PX) {
          node.x(target.x);
          node.y(target.y);
          snapped = true;
          return prev.map((p) =>
            p.id === pieceId
              ? {
                  ...p,
                  x: target.x,
                  y: target.y,
                  locked: true,
                  snapFlash: true,
                }
              : p,
          );
        }

        return prev.map((p) => (p.id === pieceId ? { ...p, x, y } : p));
      });

      if (snapped) clearSnapFlashLater(pieceId);
    },
    [layout, clearSnapFlashLater],
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="order-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Retour
        </button>
        <div className="order-2 min-w-0 flex-1 sm:order-2 sm:text-center">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {puzzle.theme}
          </p>
          <h1 className="truncate text-lg font-semibold text-zinc-900">
            {puzzle.title}
          </h1>
        </div>
        {phase === "playing" && (
          <div className="order-3 flex w-full flex-wrap justify-end gap-2 sm:order-3 sm:w-auto">
            <button
              type="button"
              onClick={() => setHelpOn((v) => !v)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                helpOn
                  ? "bg-amber-100 text-amber-900 ring-2 ring-amber-400"
                  : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              Aide
            </button>
            <button
              type="button"
              onClick={shuffleCurrent}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              Mélanger
            </button>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        {error && (
          <p className="text-center text-red-600" role="alert">
            {error}
          </p>
        )}

        {phase === "config" && !error && (
          <div className="flex w-full max-w-lg flex-col items-center gap-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-zinc-900">
                Choisir la difficulté
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                L’image s’adapte à une largeur max. de {BOARD_MAX_W}px en
                conservant ses proportions.
              </p>
            </div>
            {!image && (
              <p className="text-sm text-zinc-500">Chargement de l’image…</p>
            )}
            {image && (
              <div className="grid w-full gap-3 sm:grid-cols-3">
                <DifficultyButton
                  label="Facile"
                  detail="3 × 3"
                  onClick={() => startGame(3)}
                />
                <DifficultyButton
                  label="Moyen"
                  detail="4 × 4"
                  onClick={() => startGame(4)}
                />
                <DifficultyButton
                  label="Difficile"
                  detail="6 × 6"
                  onClick={() => startGame(6)}
                />
              </div>
            )}
          </div>
        )}

        {phase === "playing" && layout && image && (
          <div className="w-full max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2 shadow-inner">
            <Stage width={layout.stageW} height={layout.stageH}>
              <Layer listening={false}>
                <Rect
                  x={0}
                  y={0}
                  width={layout.stageW}
                  height={layout.stageH}
                  fill="#f4f4f5"
                  listening={false}
                />
                {helpOn && (
                  <Image
                    image={image}
                    x={layout.boardX}
                    y={layout.boardY}
                    width={layout.displayW}
                    height={layout.displayH}
                    opacity={0.15}
                    listening={false}
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
                  listening={false}
                />
              </Layer>
              <Layer>
                {pieces.map((piece) => (
                  <PuzzlePiece
                    key={piece.id}
                    piece={piece}
                    image={image}
                    layout={layout}
                    onDragStart={handleDragStart}
                    onDragEnd={(e) => handleDragEnd(piece.id, e)}
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

function DifficultyButton({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-center transition hover:border-zinc-300 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
    >
      <span className="block font-semibold text-zinc-900">{label}</span>
      <span className="mt-1 block text-sm text-zinc-500">{detail}</span>
    </button>
  );
}

function PuzzlePiece({
  piece,
  image,
  layout,
  onDragStart,
  onDragEnd,
}: {
  piece: PieceState;
  image: HTMLImageElement;
  layout: ReturnType<typeof layoutFromImage>;
  onDragStart: (e: KonvaDragEvent) => void;
  onDragEnd: (e: KonvaDragEvent) => void;
}) {
  const crop = useMemo(
    () => ({
      x: piece.col * layout.cropW,
      y: piece.row * layout.cropH,
      width: layout.cropW,
      height: layout.cropH,
    }),
    [piece.col, piece.row, layout.cropW, layout.cropH],
  );

  return (
    <Group
      x={piece.x}
      y={piece.y}
      draggable={!piece.locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Image
        image={image}
        width={layout.pieceW}
        height={layout.pieceH}
        crop={crop}
        shadowBlur={piece.locked ? 0 : 6}
        shadowColor="rgba(0,0,0,0.25)"
        shadowOffsetY={2}
      />
      {piece.snapFlash && (
        <Rect
          x={-3}
          y={-3}
          width={layout.pieceW + 6}
          height={layout.pieceH + 6}
          stroke="#22c55e"
          strokeWidth={3}
          cornerRadius={4}
          listening={false}
        />
      )}
    </Group>
  );
}
