import { redirect } from "next/navigation";

/** Alias Lichess — redirige vers l'entraîneur de vision / coordonnées. */
export default function CoordinatesRedirectPage() {
  redirect("/training/vision");
}
