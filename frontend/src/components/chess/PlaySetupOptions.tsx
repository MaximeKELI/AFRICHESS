"use client";

import { BackgroundPicker } from "@/components/chess/BackgroundPicker";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { OptionCategoryNav } from "@/components/ui/OptionCategoryNav";
import { OptionSection } from "@/components/ui/OptionSection";
import { useTranslation } from "@/hooks/useTranslation";

export type PlaySetupCategory =
  | "game"
  | "ai"
  | "online"
  | "board"
  | "pieces"
  | "background";

interface PlaySetupOptionsProps {
  setupCategory: PlaySetupCategory;
  onSetupCategoryChange: (id: PlaySetupCategory) => void;
  gameSection?: React.ReactNode;
  aiSection?: React.ReactNode;
  onlineSection?: React.ReactNode;
  status?: React.ReactNode;
}

export function PlaySetupOptions({
  setupCategory,
  onSetupCategoryChange,
  gameSection,
  aiSection,
  onlineSection,
  status,
}: PlaySetupOptionsProps) {
  const { t } = useTranslation();

  const categories = [
    { id: "game", label: t("play.options.game") },
    { id: "ai", label: t("play.vsAi.title") },
    { id: "online", label: t("play.online.title") },
    { id: "board", label: t("board.picker.title") },
    { id: "pieces", label: t("board.picker.pieces") },
    { id: "background", label: t("background.picker.title") },
  ];

  return (
    <div id="play-options" className="space-y-4">
      <OptionCategoryNav
        categories={categories}
        active={setupCategory}
        onChange={(id) => onSetupCategoryChange(id as PlaySetupCategory)}
        ariaLabel={t("play.options.sectionNav")}
      />

      {setupCategory === "game" && gameSection}
      {setupCategory === "ai" && aiSection}
      {setupCategory === "online" && onlineSection}

      {setupCategory === "board" && (
        <OptionSection compact title={t("board.picker.title")} description={t("board.picker.hint")}>
          <BoardThemePicker compact showHeader={false} showPieces={false} />
        </OptionSection>
      )}

      {setupCategory === "pieces" && (
        <OptionSection compact title={t("board.picker.pieces")} description={t("board.picker.piecesHint")}>
          <BoardThemePicker compact showHeader={false} showColors={false} />
        </OptionSection>
      )}

      {setupCategory === "background" && (
        <OptionSection compact title={t("background.picker.title")} description={t("background.picker.hint")}>
          <BackgroundPicker compact showHeader={false} />
        </OptionSection>
      )}

      {status}
    </div>
  );
}
