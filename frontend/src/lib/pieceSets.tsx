"use client";

import type { CustomPieces, Piece } from "react-chessboard/dist/chessboard/types";
import { renderAfricanSvgPiece } from "./africanPieceSvg";

/** Jeux AFRICHESS + sets SVG issus de Lichess (licences ouvertes uniquement). */
export type PieceSetId =
  | "classic"
  | "african"
  | "african-svg"
  | "cburnett"
  | "merida"
  | "chessnut"
  | "mono"
  | "letter"
  | "pirouetti"
  | "pixel"
  | "shapes"
  | "rhosgfx"
  | "fantasy"
  | "spatial"
  | "celtic"
  | "kiwen-suwi"
  | "mpchess"
  | "firi"
  | "papercut"
  | "totoy";

export interface PieceSetMeta {
  id: PieceSetId;
  /** Clé i18n `board.picker.<…>` */
  labelKey: string;
  /** Dossier sous /pieces/ (null = rendu code / défaut lib) */
  folder: string | null;
  /** Groupe UI */
  group: "africhess" | "lichess";
}

export const PIECE_SETS: PieceSetMeta[] = [
  { id: "classic", labelKey: "board.picker.classic", folder: null, group: "africhess" },
  { id: "african", labelKey: "board.picker.african", folder: null, group: "africhess" },
  { id: "african-svg", labelKey: "board.picker.africanSvg", folder: null, group: "africhess" },
  { id: "cburnett", labelKey: "board.picker.cburnett", folder: "cburnett", group: "lichess" },
  { id: "merida", labelKey: "board.picker.merida", folder: "merida", group: "lichess" },
  { id: "chessnut", labelKey: "board.picker.chessnut", folder: "chessnut", group: "lichess" },
  { id: "mono", labelKey: "board.picker.mono", folder: "mono", group: "lichess" },
  { id: "letter", labelKey: "board.picker.letter", folder: "letter", group: "lichess" },
  { id: "pirouetti", labelKey: "board.picker.pirouetti", folder: "pirouetti", group: "lichess" },
  { id: "pixel", labelKey: "board.picker.pixel", folder: "pixel", group: "lichess" },
  { id: "shapes", labelKey: "board.picker.shapes", folder: "shapes", group: "lichess" },
  { id: "rhosgfx", labelKey: "board.picker.rhosgfx", folder: "rhosgfx", group: "lichess" },
  { id: "fantasy", labelKey: "board.picker.fantasy", folder: "fantasy", group: "lichess" },
  { id: "spatial", labelKey: "board.picker.spatial", folder: "spatial", group: "lichess" },
  { id: "celtic", labelKey: "board.picker.celtic", folder: "celtic", group: "lichess" },
  { id: "kiwen-suwi", labelKey: "board.picker.kiwenSuwi", folder: "kiwen-suwi", group: "lichess" },
  { id: "mpchess", labelKey: "board.picker.mpchess", folder: "mpchess", group: "lichess" },
  { id: "firi", labelKey: "board.picker.firi", folder: "firi", group: "lichess" },
  { id: "papercut", labelKey: "board.picker.papercut", folder: "papercut", group: "lichess" },
  { id: "totoy", labelKey: "board.picker.totoy", folder: "totoy", group: "lichess" },
];

const PIECE_SET_MAP = new Map(PIECE_SETS.map((s) => [s.id, s]));

export function isPieceSetId(value: string | null | undefined): value is PieceSetId {
  return value != null && PIECE_SET_MAP.has(value as PieceSetId);
}

export function getPieceSet(id: PieceSetId): PieceSetMeta {
  return PIECE_SET_MAP.get(id) ?? PIECE_SET_MAP.get("classic")!;
}

const PIECE_KEYS: Piece[] = [
  "wP",
  "wN",
  "wB",
  "wR",
  "wQ",
  "wK",
  "bP",
  "bN",
  "bB",
  "bR",
  "bQ",
  "bK",
];

const AFRICAN_SYMBOLS: Record<Piece, string> = {
  wP: "♙",
  wN: "♘",
  wB: "♗",
  wR: "♖",
  wQ: "♕",
  wK: "♔",
  bP: "♟",
  bN: "♞",
  bB: "♝",
  bR: "♜",
  bQ: "♛",
  bK: "♚",
};

export function pieceSvgUrl(folder: string, piece: Piece): string {
  return `/pieces/${folder}/${piece}.svg`;
}

function renderSvgPieceSet(folder: string): CustomPieces {
  const out: CustomPieces = {};
  for (const key of PIECE_KEYS) {
    const src = pieceSvgUrl(folder, key);
    out[key] = ({ squareWidth, isDragging }) => (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isDragging ? 0.85 : 1,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      </div>
    );
  }
  return out;
}

/** react-chessboard v4 exige des fonctions (pas des ReactNode statiques). */
export function customPiecesForSet(setId: PieceSetId): CustomPieces | undefined {
  const meta = getPieceSet(setId);
  if (meta.folder) {
    return renderSvgPieceSet(meta.folder);
  }

  if (setId === "african-svg") {
    const out: CustomPieces = {};
    for (const key of PIECE_KEYS) {
      out[key] = ({ squareWidth, isDragging }) => (
        <div
          style={{
            width: squareWidth,
            height: squareWidth,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isDragging ? 0.85 : 1,
          }}
        >
          {renderAfricanSvgPiece(key, squareWidth)}
        </div>
      );
    }
    return out;
  }

  if (setId !== "african") return undefined;

  const out: CustomPieces = {};
  for (const [key, symbol] of Object.entries(AFRICAN_SYMBOLS) as [Piece, string][]) {
    const isWhite = key.startsWith("w");
    const pieceName = key.slice(1);
    const colorLabel = isWhite ? "blanc" : "noir";
    out[key] = ({ squareWidth, isDragging }) => (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(squareWidth * 0.72),
          lineHeight: 1,
          userSelect: "none",
          opacity: isDragging ? 0.85 : 1,
          filter: isWhite
            ? "drop-shadow(0 0 2px #C9A227)"
            : "drop-shadow(0 0 2px #1a1a1a)",
        }}
      >
        <span className="sr-only">{`${pieceName} ${colorLabel}`}</span>
        <span aria-hidden>{symbol}</span>
      </div>
    );
  }
  return out;
}
