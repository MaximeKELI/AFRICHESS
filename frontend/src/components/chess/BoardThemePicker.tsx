"use client";

import clsx from "clsx";
import {
  BOARD_THEMES,
  getThemedSquareStyles,
  type BoardTheme,
} from "@/lib/boardThemes";
import { PIECE_SETS, getPieceSet, pieceSvgUrl } from "@/lib/pieceSets";
import { usePreferencesStore } from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";
import { boardThemeLabel } from "@/lib/i18n/labels";

interface BoardThemePickerProps {
  compact?: boolean;
  className?: string;
  /** Masquer le titre quand le picker est dans une OptionSection */
  showHeader?: boolean;
  /** Afficher la grille de couleurs du plateau */
  showColors?: boolean;
  /** Afficher le sélecteur de pièces */
  showPieces?: boolean;
}

function ThemeSwatch({ theme, size }: { theme: BoardTheme; size: "sm" | "md" }) {
  const { dark, light } = getThemedSquareStyles(theme);
  const dim = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  return (
    <span className={clsx("grid grid-cols-2 overflow-hidden shrink-0 rounded", dim)}>
      <span style={light} />
      <span style={dark} />
      <span style={dark} />
      <span style={light} />
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
        "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-[1.02]",
        selected
          ? "border-africhess-gold bg-africhess-gold/10 ring-1 ring-africhess-gold/50"
          : "border-white/15 hover:border-white/30"
      )}
      aria-pressed={selected}
      aria-label={`${label}`}
    >
      <ThemeSwatch theme={theme} size={compact ? "sm" : "md"} />
      <span className={clsx("leading-tight text-center", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </span>
    </button>
  );
}

function PieceSetButton({
  id,
  label,
  selected,
  onSelect,
}: {
  id: (typeof PIECE_SETS)[number]["id"];
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = getPieceSet(id);
  const preview =
    meta.folder != null ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pieceSvgUrl(meta.folder, "wN")}
        alt=""
        className="w-5 h-5 object-contain"
        draggable={false}
      />
    ) : id === "african" || id === "african-svg" ? (
      <span className="text-sm leading-none" aria-hidden>
        ♘
      </span>
    ) : (
      <span className="text-sm leading-none opacity-70" aria-hidden>
        ♞
      </span>
    );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border focus-visible:outline focus-visible:outline-2 focus-visible:outline-africhess-gold",
        selected
          ? "border-africhess-gold bg-africhess-gold/20"
          : "border-white/20 hover:border-white/35"
      )}
    >
      {preview}
      <span>{label}</span>
    </button>
  );
}

export function BoardThemePicker({
  compact = false,
  className,
  showHeader = true,
  showColors = true,
  showPieces = true,
}: BoardThemePickerProps) {
  const { boardTheme, setBoardTheme, pieceSet, setPieceSet } = usePreferencesStore();
  const { t } = useTranslation();
  const classic = BOARD_THEMES.filter((th) => !th.floral);
  const floral = BOARD_THEMES.filter((th) => th.floral);
  const africhessPieces = PIECE_SETS.filter((s) => s.group === "africhess");
  const lichessPieces = PIECE_SETS.filter((s) => s.group === "lichess");

  const gridClass = clsx(
    "grid gap-2",
    compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4"
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

      {showColors && (
        <>
          <p
            className={clsx(
              "opacity-50 mb-2 uppercase tracking-wide",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            {t("board.picker.classics")}
          </p>
          <div className={clsx(gridClass, showPieces ? "mb-4" : "")}>
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
              "opacity-50 mb-2 uppercase tracking-wide",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            {t("board.picker.floral")}
          </p>
          <div className={clsx(gridClass, showPieces ? "mb-0" : "")}>
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

      {showPieces && (
        <>
          {showColors && (
            <p
              className={clsx(
                "opacity-50 mb-2 mt-4 uppercase tracking-wide",
                compact ? "text-[10px]" : "text-xs"
              )}
            >
              {t("board.picker.pieces")}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {africhessPieces.map((set) => (
              <PieceSetButton
                key={set.id}
                id={set.id}
                label={t(set.labelKey)}
                selected={pieceSet === set.id}
                onSelect={() => setPieceSet(set.id)}
              />
            ))}
          </div>
          <p
            className={clsx(
              "opacity-50 mb-2 uppercase tracking-wide",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            {t("board.picker.piecesLichess")}
          </p>
          <div className="flex flex-wrap gap-2 max-h-[min(40vh,280px)] overflow-y-auto pr-1 scrollbar-thin">
            {lichessPieces.map((set) => (
              <PieceSetButton
                key={set.id}
                id={set.id}
                label={t(set.labelKey)}
                selected={pieceSet === set.id}
                onSelect={() => setPieceSet(set.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
