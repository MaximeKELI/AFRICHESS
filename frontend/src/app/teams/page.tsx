import { redirect } from "next/navigation";

/** Alias Lichess « Teams » → clubs AFRICHESS. */
export default function TeamsPage() {
  redirect("/clubs");
}
