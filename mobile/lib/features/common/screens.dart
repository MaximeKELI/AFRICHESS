import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/apis.dart';
import '../../widgets/chess_board.dart';

/// Generic async list screen used across domains.
class ApiListScreen extends ConsumerStatefulWidget {
  const ApiListScreen({
    super.key,
    required this.title,
    required this.loader,
    required this.itemBuilder,
    this.actions,
  });

  final String title;
  final Future<List<dynamic>> Function(WidgetRef ref) loader;
  final Widget Function(BuildContext context, Map<String, dynamic> item) itemBuilder;
  final List<Widget>? actions;

  @override
  ConsumerState<ApiListScreen> createState() => _ApiListScreenState();
}

class _ApiListScreenState extends ConsumerState<ApiListScreen> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.loader(ref);
  }

  Future<void> _refresh() async {
    setState(() => _future = widget.loader(ref));
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title), actions: widget.actions),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<dynamic>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Erreur: ${snap.error}', style: const TextStyle(color: Colors.red)),
                ),
              ]);
            }
            final items = snap.data ?? [];
            if (items.isEmpty) {
              return ListView(children: const [
                SizedBox(height: 80),
                Center(child: Text('Aucun élément')),
              ]);
            }
            return ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final raw = items[i];
                final map = raw is Map<String, dynamic>
                    ? raw
                    : Map<String, dynamic>.from(raw as Map);
                return widget.itemBuilder(context, map);
              },
            );
          },
        ),
      ),
    );
  }
}

class PuzzlesHubScreen extends ConsumerWidget {
  const PuzzlesHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Problèmes')),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.today),
            title: const Text('Problème du jour'),
            onTap: () => context.push('/puzzles/daily'),
          ),
          ListTile(
            leading: const Icon(Icons.fitness_center),
            title: const Text('Entraînement'),
            onTap: () => context.push('/puzzles/training'),
          ),
          ListTile(
            leading: const Icon(Icons.bolt),
            title: const Text('Rush / Storm'),
            onTap: () => context.push('/puzzles/rush'),
          ),
          ListTile(
            leading: const Icon(Icons.favorite),
            title: const Text('Survie'),
            onTap: () => context.push('/puzzles/survival'),
          ),
          ListTile(
            leading: const Icon(Icons.local_fire_department),
            title: const Text('Streak'),
            onTap: () => context.push('/puzzles/streak'),
          ),
          ListTile(
            leading: const Icon(Icons.sports_kabaddi),
            title: const Text('Battle'),
            onTap: () => context.push('/puzzles/battle'),
          ),
          ListTile(
            leading: const Icon(Icons.category),
            title: const Text('Thèmes'),
            onTap: () => context.push('/puzzles/themes'),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: const Text('Tableau de bord'),
            onTap: () => context.push('/puzzles/dashboard'),
          ),
        ],
      ),
    );
  }
}

class PuzzlePlayScreen extends ConsumerStatefulWidget {
  const PuzzlePlayScreen({super.key, required this.mode});
  final String mode; // daily | training | rush | survival

  @override
  ConsumerState<PuzzlePlayScreen> createState() => _PuzzlePlayScreenState();
}

class _PuzzlePlayScreenState extends ConsumerState<PuzzlePlayScreen> {
  Map<String, dynamic>? _puzzle;
  int? _sessionId;
  String? _error;
  bool _loading = true;
  final _played = <String>[];
  DateTime? _started;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _played.clear();
      _started = DateTime.now();
    });
    try {
      final api = ref.read(puzzlesApiProvider);
      Map<String, dynamic> data;
      switch (widget.mode) {
        case 'rush':
          data = await api.rushStart();
          _sessionId = data['session_id'] as int?;
          _puzzle = Map<String, dynamic>.from(data['puzzle'] as Map);
          break;
        case 'survival':
          data = await api.survivalStart();
          _sessionId = data['session_id'] as int?;
          _puzzle = Map<String, dynamic>.from(data['puzzle'] as Map);
          break;
        case 'daily':
          _puzzle = await api.daily();
          break;
        default:
          final list = await api.training();
          _puzzle = list.isNotEmpty ? Map<String, dynamic>.from(list.first as Map) : null;
      }
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _onMove(String from, String to, {String? promotion}) async {
    final uci = '$from$to${promotion ?? ''}';
    _played.add(uci);
    final id = _puzzle?['id'] as int?;
    if (id == null) return;
    final secs = DateTime.now().difference(_started ?? DateTime.now()).inSeconds;
    try {
      final api = ref.read(puzzlesApiProvider);
      Map<String, dynamic> res;
      if (widget.mode == 'rush' && _sessionId != null) {
        res = await api.rushSubmit(_sessionId!, _played, secs);
        if (res['next_puzzle'] != null) {
          setState(() {
            _puzzle = Map<String, dynamic>.from(res['next_puzzle'] as Map);
            _played.clear();
            _started = DateTime.now();
          });
          return;
        }
      } else if (widget.mode == 'survival' && _sessionId != null) {
        res = await api.survivalSubmit(_sessionId!, _played, secs);
        if (res['next_puzzle'] != null) {
          setState(() {
            _puzzle = Map<String, dynamic>.from(res['next_puzzle'] as Map);
            _played.clear();
            _started = DateTime.now();
          });
          return;
        }
      } else {
        res = await api.submit(id, _played, secs);
      }
      if (!mounted) return;
      final solved = res['solved'] == true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(solved ? 'Bravo !' : 'Incorrect')),
      );
      if (solved && widget.mode == 'daily') {
        // stay on board
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.mode)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null || _puzzle == null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.mode)),
        body: Center(child: Text(_error ?? 'Aucun problème')),
      );
    }
    final fen = _puzzle!['fen'] as String? ?? 'start';
    return Scaffold(
      appBar: AppBar(
        title: Text('Puzzle #${_puzzle!['id']}'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Text(
              'Thèmes: ${(_puzzle!['themes'] as List?)?.join(', ') ?? '—'}',
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 8),
            ChessBoardView(fen: fen, interactive: true, onMove: _onMove),
          ],
        ),
      ),
    );
  }
}

class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, required this.gameId});
  final String gameId;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  Map<String, dynamic>? _game;
  int _ply = 0;

  @override
  void initState() {
    super.initState();
    ref.read(gamesApiProvider).get(widget.gameId).then((g) {
      if (mounted) setState(() => _game = g);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_game == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final moves = (_game!['moves'] as List?) ?? [];
    String fen = 'start';
    if (_ply > 0 && moves.isNotEmpty) {
      final idx = (_ply - 1).clamp(0, moves.length - 1);
      fen = (moves[idx] as Map)['fen_after'] as String? ?? _game!['fen'] as String? ?? 'start';
    }
    final pgn = formatMovesPgn(
      moves.map((m) => Map<String, dynamic>.from(m as Map)).toList(),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Revue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy),
            tooltip: 'Copier les coups',
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: pgn));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coups copiés')),
                );
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: ChessBoardView(fen: fen, interactive: false),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: _ply > 0 ? () => setState(() => _ply--) : null,
                icon: const Icon(Icons.skip_previous),
              ),
              Text('$_ply / ${moves.length}'),
              IconButton(
                onPressed: _ply < moves.length ? () => setState(() => _ply++) : null,
                icon: const Icon(Icons.skip_next),
              ),
            ],
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: SelectableText(pgn, style: const TextStyle(fontFamily: 'monospace')),
            ),
          ),
        ],
      ),
    );
  }
}
