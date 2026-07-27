"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import {
  BOARD_THEMES,
  getThemedSquareStyles,
  type BoardTheme,
} from "@/lib/boardThemes";
import { PIECE_SETS, type PieceSetId } from "@/lib/pieceSets";
import { usePreferencesStore } from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";
import { boardThemeLabel } from "@/lib/i18n/labels";
import { PieceSetKnightIcon, StyleBoardPreview } from "@/components/chess/StyleBoardPreview";

interface BoardThemePickerProps {
  compact?: boolean;
  className?: string;
  showHeader?: boolean;
  showColors?: boolean;
  showPieces?: boolean;
  /** Sous-onglets échiquiers / pièces (style paramètres Chess.com). */
  tabbed?: boolean;
}

type StyleTab = "boards" | "pieces";

function ThemeSwatch({ theme, size }: { theme: BoardTheme; size: "sm" | "md" }) {
  const { dark, light } = getThemedSquareStyles(theme);
  const dim = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  return (
    <span className={clsx("grid grid-cols-2 overflow-hidden shrink-0 rounded-md", dim)}>
      <span style={light} />
      <span style={dark} />
      <span style={dark} />
      <span style={light} />
    </span>
  );
}

function SelectCheck({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="absolute top-1 left-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
    </span>
  );
}

function ThemeButton({
  theme,
  selected,
  compact,
  onSelect,
  label,
}: {
  theme: BoardTheme;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      className={clsx(
        "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-[1.02]",
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
          : "border-white/15 hover:border-white/30"
      )}
      aria-pressed={selected}
      aria-label={label}
    >
      <SelectCheck show={selected} />
      <ThemeSwatch theme={theme} size={compact ? "sm" : "md"} />
      <span className={clsx("leading-tight text-center", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </span>
    </button>
  );
}

function PieceSetTile({
  id,
  label,
  selected,
  onSelect,
  compact,
}: {
  id: PieceSetId;
  label: string;
  selected: boolean;
  onSelect: () => void;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={clsx(
        "relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all hover:scale-[1.03]",
        compact ? "p-1.5 aspect-square" : "p-2 aspect-square",
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
          : "border-white/15 bg-black/25 hover:border-white/30"
      )}
    >
      <SelectCheck show={selected} />
      <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center">
        <PieceSetKnightIcon setId={id} size={compact ? 32 : 38} />
      </span>
      {!compact && (
        <span className="text-[10px] leading-tight text-center line-clamp-1 opacity-80 w-full px-0.5">
          {label}
        </span>
      )}
    </button>
  );
}

export function BoardThemePicker({
  compact = false,
  className,
  showHeader = true,
  showColors = true,
  showPieces = true,
  tabbed = false,
}: BoardThemePickerProps) {
  const { boardTheme, setBoardTheme, pieceSet, setPieceSet } = usePreferencesStore();
  const { t } = useTranslation();
  const classic = BOARD_THEMES.filter((th) => !th.floral);
  const floral = BOARD_THEMES.filter((th) => th.floral);
  const africhessPieces = PIECE_SETS.filter((s) => s.group === "africhess");
  const lichessPieces = PIECE_SETS.filter((s) => s.group === "lichess");

  const useTabs = tabbed && showColors && showPieces;
  const [tab, setTab] = useState<StyleTab>("pieces");
  const showBoardGrid = useTabs ? tab === "boards" : showColors;
  const showPieceGrid = useTabs ? tab === "pieces" : showPieces;
  const showPreview = showColors || showPieces;

  const gridClass = clsx(
    "grid gap-2",
    compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4"
  );
  const pieceGridClass = clsx(
    "grid gap-2",
    compact ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-4 sm:grid-cols-5 md:grid-cols-6"
  );

  return (
    <div className={className}>
      {showHeader && (
        <>
          <h3 className={clsx("font-semibold", compact ? "text-sm mb-2" : "mb-3")}>
            {t("board.picker.title")}
          </h3>
          <p className={clsx("opacity-60 mb-3", compact ? "text-xs" : "text-sm")}>
            {t("board.picker.hint")}
          </p>
        </>
      )}

      {useTabs && (
        <div
          className="flex gap-1 mb-3 border-b border-white/10"
          role="tablist"
          aria-label={t("board.picker.styleTabs")}
        >
          {(
            [
              { id: "boards" as const, label: t("board.picker.boardsTab") },
              { id: "pieces" as const, label: t("board.picker.pieces") },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={tab === opt.id}
              onClick={() => setTab(opt.id)}
              className={clsx(
                "px-3 py-1.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === opt.id
                  ? "border-africhess-gold text-africhess-gold"
                  : "border-transparent opacity-60 hover:opacity-90"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {showPreview && (
        <div
          className={clsx(
            "flex gap-3 mb-4",
            compact ? "flex-col sm:flex-row sm:items-start" : "flex-col md:flex-row md:items-start"
          )}
        >
          <div className="flex-1 min-w-0 space-y-3 order-2 sm:order-1">
            {showBoardGrid && (
              <>
                <p
                  className={clsx(
                    "opacity-50 uppercase tracking-wide",
                    compact ? "text-[10px]" : "text-xs"
                  )}
                >
                  {t("board.picker.classics")}
                </p>
                <div className={gridClass}>
                  {classic.map((theme) => (
                    <ThemeButton
                      key={theme.id}
                      theme={theme}
                      compact={compact}
                      selected={boardTheme === theme.id}
                      onSelect={() => setBoardTheme(theme.id)}
                      label={boardThemeLabel(t, theme.id, theme.labelFr)}
                    />
                  ))}
                </div>
                <p
                  className={clsx(
                    "opacity-50 uppercase tracking-wide mt-3",
                    compact ? "text-[10px]" : "text-xs"
                  )}
                >
                  {t("board.picker.floral")}
                </p>
                <div className={gridClass}>
                  {floral.map((theme) => (
                    <ThemeButton
                      key={theme.id}
                      theme={theme}
                      compact={compact}
                      selected={boardTheme === theme.id}
                      onSelect={() => setBoardTheme(theme.id)}
                      label={boardThemeLabel(t, theme.id, theme.labelFr)}
                    />
                  ))}
                </div>
              </>
            )}

            {showPieceGrid && (
              <>
                <p
                  className={clsx(
                    "opacity-50 uppercase tracking-wide",
                    compact ? "text-[10px]" : "text-xs",
                    showBoardGrid && "mt-1"
                  )}
                >
                  {t("board.picker.pieces")}
                </p>
                <div className={pieceGridClass}>
                  {africhessPieces.map((set) => (
                    <PieceSetTile
                      key={set.id}
                      id={set.id}
                      label={t(set.labelKey)}
                      selected={pieceSet === set.id}
                      onSelect={() => setPieceSet(set.id)}
                      compact={compact}
                    />
                  ))}
                </div>
                <p
                  className={clsx(
                    "opacity-50 uppercase tracking-wide mt-3",
                    compact ? "text-[10px]" : "text-xs"
                  )}
                >
                  {t("board.picker.piecesLichess")}
                </p>
                <div
                  className={clsx(
                    pieceGridClass,
                    "max-h-[min(36vh,260px)] overflow-y-auto pr-1 scrollbar-thin"
                  )}
                >
                  {lichessPieces.map((set) => (
                    <PieceSetTile
                      key={set.id}
                      id={set.id}
                      label={t(set.labelKey)}
                      selected={pieceSet === set.id}
                      onSelect={() => setPieceSet(set.id)}
                      compact={compact}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="order-1 sm:order-2 shrink-0 flex flex-col items-center gap-2 sm:sticky sm:top-2">
            <p className="text-[10px] uppercase tracking-wide opacity-50">
              {t("board.picker.preview")}
            </p>
            <StyleBoardPreview
              boardThemeId={boardTheme}
              pieceSetId={pieceSet}
              squareSize={compact ? 48 : 58}
            />
          </div>
        </div>
      )}
    </div>
  );
}
