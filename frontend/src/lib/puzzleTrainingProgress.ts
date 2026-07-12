/** Persistance locale de la session d'entraînement puzzles (reprise / recommencer). */

import type { PuzzleSessionEntry } from "@/lib/puzzleSession";

const STORAGE_KEY = "africhess_puzzle_training_v1";

export type TrainingPuzzleSnapshot = {
  id: number;
  fen: string;
  solution_moves: string[];
  themes?: string[];
  difficulty?: string;
  rating?: number;
};

export type TrainingProgressSnapshot = {
  difficulty: string;
  theme: string;
  queue: TrainingPuzzleSnapshot[];
  index: number;
  section: number;
  entries: PuzzleSessionEntry[];
  perfectStreak: number;
  updatedAt: number;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveTrainingProgress(snap: Omit<TrainingProgressSnapshot, "updatedAt">): void {
  const s = storage();
  if (!s) return;
  try {
    const payload: TrainingProgressSnapshot = { ...snap, updatedAt: Date.now() };
    s.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function loadTrainingProgress(): TrainingProgressSnapshot | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as TrainingProgressSnapshot;
    if (!Array.isArray(data.queue) || typeof data.index !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function clearTrainingProgress(): void {
  storage()?.removeItem(STORAGE_KEY);
}

/** Session reprise possible : file non vide et au moins un puzzle restant. */
export function canResumeTraining(snap: TrainingProgressSnapshot | null): boolean {
  if (!snap || !snap.queue.length) return false;
  if (snap.index < 0 || snap.index >= snap.queue.length) return false;
  // Expiré après 7 jours
  if (Date.now() - (snap.updatedAt || 0) > 7 * 24 * 60 * 60 * 1000) return false;
  return true;
}
