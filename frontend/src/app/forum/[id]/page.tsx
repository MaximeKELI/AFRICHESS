"use client";

import { use } from "react";
import { redirect } from "next/navigation";

/** Alias Lichess-style `/forum/:id` → détail existant `/community/:id`. */
export default function ForumPostAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  redirect(`/community/${id}`);
}
