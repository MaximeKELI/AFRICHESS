"use client";

import { TournamentListPanel } from "@/components/tournaments/TournamentListPanel";

export default function SwissPage() {
  return (
    <TournamentListPanel
      format="swiss"
      titleKey="swiss.title"
      subtitleKey="swiss.subtitle"
      showAfricanFilter
    />
  );
}
