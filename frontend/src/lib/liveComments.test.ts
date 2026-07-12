import { describe, expect, it } from "vitest";
import { commentsFromMoves, type ApiMove } from "@/lib/chessDisplay";
import { movesMissingComments, recentMovesMissingComments } from "@/lib/pollGameComments";
import { applyMoveDelta } from "@/lib/gameMerge";

describe("commentsFromMoves", () => {
  const moves: ApiMove[] = [
    {
      move_number: 1,
      san: "e4",
      uci: "e2e4",
      played_by_white: true,
      comment: "Bon départ.",
    },
    {
      move_number: 1,
      san: "e5",
      uci: "e7e5",
      played_by_white: false,
      comment: "Je réponds.",
    },
    {
      move_number: 2,
      san: "Nf3",
      uci: "g1f3",
      played_by_white: true,
      comment: "",
    },
  ];

  it("marks player moves as coach and opponent moves as AI when player is white", () => {
    const comments = commentsFromMoves(moves, true, true);
    expect(comments).toHaveLength(2);
    expect(comments[0]).toMatchObject({ san: "e4", byAi: false, text: "Bon départ." });
    expect(comments[1]).toMatchObject({ san: "e5", byAi: true, text: "Je réponds." });
  });

  it("inverts byAi when player is black", () => {
    const comments = commentsFromMoves(moves, false, true);
    expect(comments[0].byAi).toBe(true);
    expect(comments[1].byAi).toBe(false);
  });

  it("ignores moves without comment text", () => {
    expect(commentsFromMoves(moves, true).every((c) => c.text.trim())).toBe(true);
  });
});

describe("pollGameComments helpers", () => {
  it("counts missing comments", () => {
    const moves: ApiMove[] = [
      { move_number: 1, san: "e4", uci: "e2e4", played_by_white: true, comment: "ok" },
      { move_number: 1, san: "e5", uci: "e7e5", played_by_white: false },
    ];
    expect(movesMissingComments(moves)).toBe(1);
    expect(recentMovesMissingComments(moves, 2)).toBe(true);
    expect(recentMovesMissingComments([{ ...moves[0] }], 2)).toBe(false);
  });
});

describe("applyMoveDelta with live comments", () => {
  it("merges comments from delta new_moves into existing game state", () => {
    const prev = {
      fen: "start",
      moves: [
        { move_number: 1, san: "e4", uci: "e2e4", played_by_white: true, comment: "" },
      ] as ApiMove[],
    };
    const next = applyMoveDelta(prev, {
      fen: "after",
      delta: true,
      new_moves: [
        {
          move_number: 1,
          san: "e4",
          uci: "e2e4",
          played_by_white: true,
          comment: "Solide.",
        },
        {
          move_number: 1,
          san: "e5",
          uci: "e7e5",
          played_by_white: false,
          comment: "À mon tour.",
        },
      ],
      comments_pending: false,
    });
    expect(next.moves).toHaveLength(2);
    expect(next.moves?.find((m) => m.played_by_white)?.comment).toBe("Solide.");
    expect(next.moves?.find((m) => !m.played_by_white)?.comment).toBe("À mon tour.");
    expect(next.comments_pending).toBe(false);
  });
});
