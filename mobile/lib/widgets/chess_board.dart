import 'package:chess/chess.dart' as ch;
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

const _unicode = {
  'K': '♔',
  'Q': '♕',
  'R': '♖',
  'B': '♗',
  'N': '♘',
  'P': '♙',
  'k': '♚',
  'q': '♛',
  'r': '♜',
  'b': '♝',
  'n': '♞',
  'p': '♟',
};

typedef SquareTap = void Function(String square);
typedef MoveMade = void Function(String from, String to, {String? promotion});

class ChessBoardView extends StatefulWidget {
  const ChessBoardView({
    super.key,
    required this.fen,
    this.orientationWhite = true,
    this.interactive = true,
    this.lastMove,
    this.onMove,
    this.playerColor,
  });

  final String fen;
  final bool orientationWhite;
  final bool interactive;
  final ({String from, String to})? lastMove;
  final MoveMade? onMove;
  /// If set, only this color can move interactively ('w' or 'b').
  final String? playerColor;

  @override
  State<ChessBoardView> createState() => _ChessBoardViewState();
}

class _ChessBoardViewState extends State<ChessBoardView> {
  String? _selected;
  late ch.Chess _game;

  @override
  void initState() {
    super.initState();
    _loadFen(widget.fen);
  }

  @override
  void didUpdateWidget(covariant ChessBoardView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fen != widget.fen) {
      _loadFen(widget.fen);
      _selected = null;
    }
  }

  void _loadFen(String fen) {
    _game = ch.Chess();
    final clean = fen == 'start' ? ch.Chess.DEFAULT_POSITION : fen;
    try {
      _game.load(clean);
    } catch (_) {
      _game.reset();
    }
  }

  String _sq(int file, int rank) {
    final files = widget.orientationWhite
        ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    final ranks = widget.orientationWhite
        ? ['8', '7', '6', '5', '4', '3', '2', '1']
        : ['1', '2', '3', '4', '5', '6', '7', '8'];
    return '${files[file]}${ranks[rank]}';
  }

  void _onTap(String square) {
    if (!widget.interactive || widget.onMove == null) return;
    final myTurn = widget.playerColor == null ||
        (widget.playerColor == 'w' && _game.turn == ch.Color.WHITE) ||
        (widget.playerColor == 'b' && _game.turn == ch.Color.BLACK);
    if (!myTurn) return;

    if (_selected == null) {
      final piece = _game.get(square);
      if (piece == null) return;
      final isWhite = piece.color == ch.Color.WHITE;
      if (widget.playerColor == 'w' && !isWhite) return;
      if (widget.playerColor == 'b' && isWhite) return;
      setState(() => _selected = square);
      return;
    }

    if (_selected == square) {
      setState(() => _selected = null);
      return;
    }

    final from = _selected!;
    final legal = _game.moves({'square': from, 'verbose': true});
    final destinations = <String>{};
    for (final m in legal) {
      if (m is Map && m['to'] is String) destinations.add(m['to'] as String);
    }
    if (!destinations.contains(square)) {
      final piece = _game.get(square);
      if (piece != null) {
        setState(() => _selected = square);
      } else {
        setState(() => _selected = null);
      }
      return;
    }

    final rank = square[1];
    final piece = _game.get(from);
    String? promo;
    if (piece != null &&
        piece.type == ch.Chess.PAWN &&
        ((piece.color == ch.Color.WHITE && rank == '8') ||
            (piece.color == ch.Color.BLACK && rank == '1'))) {
      promo = 'q';
    }

    widget.onMove!(from, square, promotion: promo);
    setState(() => _selected = null);
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = constraints.biggest.shortestSide / 8;
          return Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: List.generate(8, (rank) {
                return Expanded(
                  child: Row(
                    children: List.generate(8, (file) {
                      final light = (file + rank).isEven;
                      final square = _sq(file, rank);
                      final piece = _game.get(square);
                      final selected = _selected == square;
                      final last = widget.lastMove != null &&
                          (widget.lastMove!.from == square ||
                              widget.lastMove!.to == square);
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => _onTap(square),
                          child: Container(
                            color: selected
                                ? AfrichessColors.gold.withValues(alpha: 0.55)
                                : last
                                    ? AfrichessColors.gold.withValues(alpha: 0.28)
                                    : (light
                                        ? AfrichessColors.boardLight
                                        : AfrichessColors.boardDark),
                            child: piece == null
                                ? null
                                : Center(
                                    child: Text(
                                      _unicode[piece.color == ch.Color.WHITE
                                              ? piece.type.toUpperCase()
                                              : piece.type.toLowerCase()] ??
                                          '?',
                                      style: TextStyle(
                                        fontSize: size * 0.72,
                                        height: 1,
                                        color: piece.color == ch.Color.WHITE
                                            ? Colors.white
                                            : Colors.black87,
                                        shadows: const [
                                          Shadow(
                                            blurRadius: 2,
                                            color: Colors.black45,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                      );
                    }),
                  ),
                );
              }),
            ),
          );
        },
      ),
    );
  }
}

String formatMovesPgn(List<Map<String, dynamic>> moves) {
  final buf = StringBuffer();
  for (final m in moves) {
    final num = m['move_number'] ?? m['number'];
    final san = m['san'] as String?;
    final white = m['played_by_white'] as bool? ?? true;
    if (san == null) continue;
    if (white) {
      if (buf.isNotEmpty) buf.write(' ');
      buf.write('$num. $san');
    } else {
      buf.write(' $san');
    }
  }
  return buf.toString().trim();
}
