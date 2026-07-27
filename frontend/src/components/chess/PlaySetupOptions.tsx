"use client";

import dynamic from "next/dynamic";
import { OptionCategoryNav } from "@/components/ui/OptionCategoryNav";
import { OptionSection } from "@/components/ui/OptionSection";
import { useTranslation } from "@/hooks/useTranslation";

const BackgroundPicker = dynamic(
  () => import("@/components/chess/BackgroundPicker").then((m) => m.BackgroundPicker),
  { ssr: false }
);
const BoardThemePicker = dynamic(
  () => import("@/components/chess/BoardThemePicker").then((m) => m.BoardThemePicker),
  { ssr: false }
);
const SoundThemePicker = dynamic(
  () => import("@/components/chess/SoundThemePicker").then((m) => m.SoundThemePicker),
  { ssr: false }
);
const BoardSizePicker = dynamic(
  () => import("@/components/chess/BoardSizePicker").then((m) => m.BoardSizePicker),
  { ssr: false }
);

export type PlaySetupCategory = "game" | "ai" | "online" | "style";

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
    { id: "style", label: t("play.options.style") },
  ];

  return (
    <div id="play-options" className="space-y-4">
      <OptionCategoryNav
        categories={categories}
        active={setupCategory}
        onChange={(id) => onSetupCategoryChange(id as PlaySetupCategory)}
        ariaLabel={t("play.options.sectionNav")}
      />

      <OptionSection compact title={t("board.size.title")} description={t("board.size.hint")}>
        <BoardSizePicker compact showHeader={false} />
      </OptionSection>

      {setupCategory === "game" && gameSection}
      {setupCategory === "ai" && aiSection}
      {setupCategory === "online" && onlineSection}

      {setupCategory === "style" && (
        <div className="space-y-4">
          <OptionSection
            compact
            title={t("board.picker.styleSection")}
            description={t("board.picker.styleSectionHint")}
          >
            <BoardThemePicker compact showHeader={false} tabbed />
          </OptionSection>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-africhess-gold py-2 list-none flex items-center justify-between">
              {t("sound.picker.title")}
              <span className="opacity-50 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <OptionSection compact title="" description={t("sound.picker.hint")}>
              <SoundThemePicker compact showHeader={false} />
            </OptionSection>
          </details>
          <details className="group" open>
            <summary className="cursor-pointer text-sm font-medium text-africhess-gold py-2 list-none flex items-center justify-between">
              {t("background.picker.title")}
              <span className="opacity-50 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <OptionSection compact title="" description={t("background.picker.hint")}>
              <BackgroundPicker compact showHeader={false} />
            </OptionSection>
          </details>
        </div>
      )}

      {status}
    </div>
  );
}
