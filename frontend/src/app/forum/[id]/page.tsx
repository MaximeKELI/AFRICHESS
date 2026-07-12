import { redirect } from "next/navigation";

/** Alias Lichess-style `/forum/:id` → détail existant `/community/:id`. */
export default async function ForumPostAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/community/${id}`);
}
