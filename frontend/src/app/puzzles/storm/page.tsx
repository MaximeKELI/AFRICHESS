import { redirect } from "next/navigation";

export default function PuzzleStormRedirectPage() {
  redirect("/puzzles?mode=storm");
}
