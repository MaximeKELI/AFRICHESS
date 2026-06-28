"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { MoveComment } from "@/lib/chessDisplay";

interface AiTauntBubbleProps {
  comment?: MoveComment;
  enabled: boolean;
}

/** Bulle flottante au-dessus de l'échiquier pour le dernier commentaire IA. */
export function AiTauntBubble({ comment, enabled }: AiTauntBubbleProps) {
  if (!enabled || !comment?.byAi) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-2 pt-1">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${comment.moveNumber}-${comment.san}`}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="max-w-[min(100%,22rem)] rounded-2xl border border-africhess-gold/50 bg-black/85 px-3.5 py-2.5 shadow-lg shadow-black/40 backdrop-blur-sm"
        >
          <p className="text-[10px] uppercase tracking-wide text-africhess-gold/80 mb-0.5">
            🤖 L&apos;IA
          </p>
          <p className="text-sm leading-snug text-white">{comment.text}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
