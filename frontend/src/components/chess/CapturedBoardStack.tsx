"use client";

import type { CapturedState } from "@/lib/chessDisplay";
import { resolveCapturedSides } from "@/lib/capturedSides";
import { BoardCapturedBar } from "./BoardCapturedBar";

interface CapturedBoardStackProps {
  captured?: CapturedState;
  orientation?: "white" | "black";
  children: React.ReactNode;
}

export function CapturedBoardStack({
  captured,
  orientation = "white",
  children,
}: CapturedBoardStackProps) {
  if (!captured) {
    return <>{children}</>;
  }

  const { top, bottom, topAdvantage, bottomAdvantage } = resolveCapturedSides(
    captured,
    orientation
  );

  return (
    <>
      <BoardCapturedBar pieces={top} advantage={topAdvantage} />
      {children}
      <BoardCapturedBar pieces={bottom} advantage={bottomAdvantage} />
    </>
  );
}
