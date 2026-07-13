import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../api/apis.dart';
import '../../core/storage.dart';
import '../../core/ws.dart';
import '../../features/auth/auth_provider.dart';
import '../../widgets/chess_board.dart';
import '../../theme/app_theme.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final name = auth.user?['username'] ?? auth.user?['display_name'] ?? 'Joueur';
    return Scaffold(
      appBar: AppBar(
        title: const Text('AFRICHESS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Bonjour, $name', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Jouez, progressez, rejoignez la communauté.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
          ),
          const SizedBox(height: 20),
          _HeroCard(
            title: 'Partie rapide',
            subtitle: 'Matchmaking blitz 3+2',
            icon: Icons.flash_on,
            color: AfrichessColors.green,
            onTap: () => context.push('/play'),
          ),
          _HeroCard(
            title: 'Problèmes',
            subtitle: 'Daily, rush, thèmes…',
            icon: Icons.extension,
            color: AfrichessColors.gold,
            onTap: () => context.push('/puzzles'),
          ),
          _HeroCard(
            title: 'Bots',
            subtitle: 'Affrontez l’IA AFRICHESS',
            icon: Icons.smart_toy_outlined,
            color: AfrichessColors.terracotta,
            onTap: () => context.push('/bots'),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.15), child: Icon(icon, color: color)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

class PlayHubScreen extends ConsumerStatefulWidget {
  const PlayHubScreen({super.key});

  @override
  ConsumerState<PlayHubScreen> createState() => _PlayHubScreenState();
}

class _PlayHubScreenState extends ConsumerState<PlayHubScreen> {
  String _mode = 'blitz';
  String _time = '3+2';
  bool _searching = false;
  String? _error;

  Future<void> _startHuman() async {
    setState(() {
      _searching = true;
      _error = null;
    });
    try {
      final api = ref.read(gamesApiProvider);
      final game = await api.matchmaking(_mode, timeControl: _time);
      if (game['id'] != null && mounted) {
        context.push('/game/${game['id']}');
        return;
      }
      // Queue — listen WS
      final token = await ref.read(tokenStorageProvider).getAccess();
      if (token == null) throw Exception('Non connecté');
      final channel = WebSocketChannel.connect(
        Uri.parse(wsMatchmakingPath()),
        protocols: wsAuthProtocols(token),
      );
      late StreamSubscription sub;
      sub = channel.stream.listen((raw) {
        final data = jsonDecode(raw as String) as Map<String, dynamic>;
        final gid = data['game_id'] ?? data['game']?['id'];
        if (gid != null && mounted) {
          sub.cancel();
          channel.sink.close();
          context.push('/game/$gid');
        }
      }, onError: (e) {
        if (mounted) setState(() => _error = e.toString());
      });
      channel.sink.add(jsonEncode({
        'type': 'seek',
        'mode': _mode,
        'time_control': _time,
      }));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _startAi() async {
    final api = ref.read(gamesApiProvider);
    final game = await api.createAi({
      'mode': _mode,
      'color': 'white',
      'ai_elo': 1500,
      'variant': 'standard',
    });
    if (mounted && game['id'] != null) context.push('/game/${game['id']}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Jouer')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Cadence', style: TextStyle(fontWeight: FontWeight.w600)),
          Wrap(
            spacing: 8,
            children: [
              for (final m in ['bullet', 'blitz', 'rapid', 'classical'])
                ChoiceChip(
                  label: Text(m),
                  selected: _mode == m,
                  onSelected: (_) => setState(() => _mode = m),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: [
              for (final t in ['1+0', '3+2', '5+3', '10+0', '15+10'])
                ChoiceChip(
                  label: Text(t),
                  selected: _time == t,
                  onSelected: (_) => setState(() => _time = t),
                ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _searching ? null : _startHuman,
            icon: _searching
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.people),
            label: Text(_searching ? 'Recherche…' : 'Matchmaking'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _startAi,
            icon: const Icon(Icons.smart_toy),
            label: const Text('Contre l’IA'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => context.push('/bots'),
            icon: const Icon(Icons.list),
            label: const Text('Catalogue de bots'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => context.push('/lobby'),
            icon: const Icon(Icons.meeting_room),
            label: const Text('Lobby'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => context.push('/daily'),
            icon: const Icon(Icons.mail_outline),
            label: const Text('Parties par correspondance'),
          ),
        ],
      ),
    );
  }
}

class GameScreen extends ConsumerStatefulWidget {
  const GameScreen({super.key, required this.gameId, this.watchOnly = false});
  final String gameId;
  final bool watchOnly;

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen> {
  Map<String, dynamic>? _game;
  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _sub?.cancel();
    _channel?.sink.close();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final game = await ref.read(gamesApiProvider).get(widget.gameId);
      if (!mounted) return;
      setState(() {
        _game = game;
        _loading = false;
      });
      if (!widget.watchOnly) await _connectWs();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _connectWs() async {
    final token = await ref.read(tokenStorageProvider).getAccess();
    if (token == null) return;
    _channel = WebSocketChannel.connect(
      Uri.parse(wsGamePath(widget.gameId)),
      protocols: wsAuthProtocols(token),
    );
    _sub = _channel!.stream.listen((raw) {
      final data = jsonDecode(raw as String) as Map<String, dynamic>;
      final g = data['game'] as Map<String, dynamic>?;
      if (g != null && mounted) setState(() => _game = {...?_game, ...g});
    });
  }

  String get _fen => (_game?['fen'] as String?) ?? 'start';

  String? get _myColor {
    final user = ref.read(authProvider).user;
    if (user == null || _game == null) return null;
    final uid = user['id'];
    if (_game!['white_player']?['id'] == uid) return 'w';
    if (_game!['black_player']?['id'] == uid) return 'b';
    return null;
  }

  Future<void> _onMove(String from, String to, {String? promotion}) async {
    final uci = '$from$to${promotion ?? ''}';
    try {
      _channel?.sink.add(jsonEncode({'type': 'move', 'uci': uci}));
      final updated = await ref.read(gamesApiProvider).move(widget.gameId, uci);
      if (mounted) setState(() => _game = updated);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _resign() async {
    final g = await ref.read(gamesApiProvider).resign(widget.gameId);
    if (mounted) setState(() => _game = g);
  }

  Future<void> _draw() async {
    await ref.read(gamesApiProvider).offerDraw(widget.gameId);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Offre de nulle envoyée')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(child: Text(_error!)),
      );
    }
    final status = _game?['status'] as String? ?? '';
    final moves = (_game?['moves'] as List?)?.cast<Map>() ?? [];
    final white = _game?['white_player']?['username'] ?? 'Blancs';
    final black = _game?['black_player']?['username'] ?? 'Noirs';
    final interactive = !widget.watchOnly && status == 'active' && _myColor != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.watchOnly ? 'Spectateur' : 'Partie'),
        actions: [
          if (!widget.watchOnly && status == 'active') ...[
            IconButton(icon: const Icon(Icons.handshake), onPressed: _draw, tooltip: 'Nulle'),
            IconButton(icon: const Icon(Icons.flag), onPressed: _resign, tooltip: 'Abandon'),
          ],
          IconButton(
            icon: const Icon(Icons.rate_review_outlined),
            onPressed: () => context.push('/review/${widget.gameId}'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(child: Text('$black', overflow: TextOverflow.ellipsis)),
                Text(status, style: const TextStyle(fontSize: 12, color: Colors.black54)),
                Expanded(child: Text(white, textAlign: TextAlign.right, overflow: TextOverflow.ellipsis)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: ChessBoardView(
              fen: _fen,
              orientationWhite: _myColor != 'b',
              interactive: interactive,
              playerColor: _myColor,
              onMove: interactive ? _onMove : null,
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: moves.length,
              itemBuilder: (_, i) {
                final m = Map<String, dynamic>.from(moves[i] as Map);
                return Text(
                  '${m['move_number']}. ${m['played_by_white'] == true ? '' : '.. '}${m['san']}',
                  style: const TextStyle(fontFamily: 'monospace'),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
