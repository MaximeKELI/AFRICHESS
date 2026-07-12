import { redirect } from "next/navigation";

export default function PuzzleRacerRedirectPage() {
  redirect("/puzzles?mode=racer");
}
