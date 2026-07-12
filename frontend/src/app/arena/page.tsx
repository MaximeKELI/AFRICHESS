"use client";

import { TournamentListPanel } from "@/components/tournaments/TournamentListPanel";

export default function ArenaPage() {
  return (
    <TournamentListPanel
      format="arena"
      titleKey="arena.title"
      subtitleKey="arena.subtitle"
      showAfricanFilter
    />
  );
}
