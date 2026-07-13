import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/apis.dart';
import '../../features/common/screens.dart';
import '../../features/hubs/hub_screens.dart';
import '../../widgets/chess_board.dart';

/// Écrans manquants vs web — branchés sur les mêmes API.
class MissingRoutesScreens {
  MissingRoutesScreens._();
}

class ArenaSwissHub extends StatelessWidget {
  const ArenaSwissHub({super.key, required this.kind});
  final String kind; // arena | swiss

  @override
  Widget build(BuildContext context) {
    return ApiListScreen(
      title: kind == 'arena' ? 'Arènes' : 'Suisses',
      loader: (r) async {
        final all = await r.read(tournamentsApiProvider).list();
        return all.where((t) {
          final m = Map<String, dynamic>.from(t as Map);
          final fmt = '${m['format'] ?? m['type'] ?? ''}'.toLowerCase();
          if (kind == 'arena') return fmt.contains('arena');
          return fmt.contains('swiss');
        }).toList();
      },
      itemBuilder: (c, t) => ListTile(
        title: Text('${t['name']}'),
        subtitle: Text('${t['format']} · ${t['status']}'),
        onTap: () => c.push('/tournaments/${t['slug']}'),
      ),
    );
  }
}

class PlayersSearchScreen extends ConsumerStatefulWidget {
  const PlayersSearchScreen({super.key});

  @override
  ConsumerState<PlayersSearchScreen> createState() => _PlayersSearchScreenState();
}

class _PlayersSearchScreenState extends ConsumerState<PlayersSearchScreen> {
  final _q = TextEditingController();
  List<dynamic> _results = [];
  bool _loading = false;

  Future<void> _search() async {
    setState(() => _loading = true);
    try {
      _results = await ref.read(socialApiProvider).searchUsers(_q.text.trim());
    } catch (_) {
      _results = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Joueurs')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _q,
                    decoration: const InputDecoration(hintText: 'Rechercher…'),
                    onSubmitted: (_) => _search(),
                  ),
                ),
                IconButton(onPressed: _search, icon: const Icon(Icons.search)),
              ],
            ),
          ),
          if (_loading) const LinearProgressIndicator(),
          Expanded(
            child: ListView.builder(
              itemCount: _results.length,
              itemBuilder: (_, i) {
                final u = Map<String, dynamic>.from(_results[i] as Map);
                final name = '${u['username'] ?? u['display_name']}';
                return ListTile(
                  title: Text(name),
                  subtitle: Text('${u['country'] ?? ''}'),
                  onTap: () => context.push('/profile/$name'),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class PublicProfileScreen extends ConsumerWidget {
  const PublicProfileScreen({super.key, required this.username});
  final String username;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text(username)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            title: const Text('Défier'),
            leading: const Icon(Icons.sports_esports),
            onTap: () async {
              await ref.read(socialApiProvider).challengeFriend(username);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Défi envoyé')),
                );
              }
            },
          ),
          ListTile(
            title: const Text('Message'),
            leading: const Icon(Icons.message),
            onTap: () => context.push('/messages/$username'),
          ),
          ListTile(
            title: const Text('Demande d’ami'),
            leading: const Icon(Icons.person_add),
            onTap: () async {
              await ref.read(socialApiProvider).request(username);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Demande envoyée')),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}

class MessagesInboxScreen extends ConsumerWidget {
  const MessagesInboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Inbox = liste d’amis pour ouvrir un DM (pas d’endpoint inbox dédié côté mobile legacy)
    return ApiListScreen(
      title: 'Messages',
      loader: (r) => r.read(socialApiProvider).friends(),
      itemBuilder: (c, row) {
        final from = row['from_user'] as Map? ?? {};
        final to = row['to_user'] as Map? ?? {};
        final name = '${from['username'] ?? to['username'] ?? '?'}';
        return ListTile(
          title: Text(name),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => c.push('/messages/$name'),
        );
      },
    );
  }
}

class ClockScreen extends StatefulWidget {
  const ClockScreen({super.key});

  @override
  State<ClockScreen> createState() => _ClockScreenState();
}

class _ClockScreenState extends State<ClockScreen> {
  Duration white = const Duration(minutes: 5);
  Duration black = const Duration(minutes: 5);
  bool whiteTurn = true;
  bool running = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pendule')),
      body: Column(
        children: [
          Expanded(
            child: InkWell(
              onTap: () => setState(() {
                if (running) whiteTurn = false;
              }),
              child: Container(
                color: whiteTurn && running ? Colors.green.shade700 : Colors.grey.shade900,
                alignment: Alignment.center,
                child: Text(
                  _fmt(white),
                  style: const TextStyle(fontSize: 48, color: Colors.white, fontFamily: 'monospace'),
                ),
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: Icon(running ? Icons.pause : Icons.play_arrow),
                onPressed: () => setState(() => running = !running),
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => setState(() {
                  white = const Duration(minutes: 5);
                  black = const Duration(minutes: 5);
                  running = false;
                  whiteTurn = true;
                }),
              ),
            ],
          ),
          Expanded(
            child: InkWell(
              onTap: () => setState(() {
                if (running) whiteTurn = true;
              }),
              child: Container(
                color: !whiteTurn && running ? Colors.green.shade700 : Colors.grey.shade800,
                alignment: Alignment.center,
                child: Text(
                  _fmt(black),
                  style: const TextStyle(fontSize: 48, color: Colors.white, fontFamily: 'monospace'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}

class PastePgnScreen extends StatefulWidget {
  const PastePgnScreen({super.key});

  @override
  State<PastePgnScreen> createState() => _PastePgnScreenState();
}

class _PastePgnScreenState extends State<PastePgnScreen> {
  final _ctrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Coller un PGN')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Expanded(
              child: TextField(
                controller: _ctrl,
                maxLines: null,
                expands: true,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: '1. e4 e5 2. Nf3 …',
                ),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => context.push('/analysis'),
              child: const Text('Ouvrir en analyse'),
            ),
          ],
        ),
      ),
    );
  }
}

class OpeningExplorerScreen extends ConsumerWidget {
  const OpeningExplorerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ApiListScreen(
      title: 'Ouvertures',
      loader: (r) => r.read(learningApiProvider).openings(),
      itemBuilder: (c, item) => ListTile(
        title: Text('${item['name'] ?? item['title'] ?? item['eco'] ?? item}'),
        subtitle: Text('${item['moves'] ?? item['pgn'] ?? ''}'),
      ),
    );
  }
}

class ToolsHubScreen extends StatelessWidget {
  const ToolsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Outils')),
      body: ListView(
        children: [
          ListTile(title: const Text('Analyse'), onTap: () => context.push('/analysis')),
          ListTile(title: const Text('Éditeur'), onTap: () => context.push('/editor')),
          ListTile(title: const Text('Coller PGN'), onTap: () => context.push('/paste')),
          ListTile(title: const Text('Ouvertures'), onTap: () => context.push('/opening')),
          ListTile(title: const Text('Pendule'), onTap: () => context.push('/clock')),
          ListTile(title: const Text('Coordonnées'), onTap: () => context.push('/learning/coordinates')),
        ],
      ),
    );
  }
}

class TrainingHubScreen extends StatelessWidget {
  const TrainingHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Entraînement')),
      body: ListView(
        children: [
          ListTile(title: const Text('Solo'), onTap: () => context.push('/training/solo')),
          ListTile(title: const Text('Vision'), onTap: () => context.push('/training/vision')),
          ListTile(title: const Text('Finales'), onTap: () => context.push('/training/endgames')),
          ListTile(title: const Text('Problèmes'), onTap: () => context.push('/puzzles')),
        ],
      ),
    );
  }
}

class TrainingDrillScreen extends StatelessWidget {
  const TrainingDrillScreen({super.key, required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: const Padding(
        padding: EdgeInsets.all(12),
        child: ChessBoardView(fen: 'start', interactive: true),
      ),
    );
  }
}

class CommunityHubScreen extends StatelessWidget {
  const CommunityHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Communauté')),
      body: ListView(
        children: [
          ListTile(title: const Text('Forum'), onTap: () => context.push('/forum')),
          ListTile(title: const Text('Blog'), onTap: () => context.push('/blog')),
          ListTile(title: const Text('Clubs'), onTap: () => context.push('/clubs')),
          ListTile(title: const Text('Équipes'), onTap: () => context.push('/teams')),
          ListTile(title: const Text('Événements'), onTap: () => context.push('/events')),
          ListTile(title: const Text('Tous les sujets'), onTap: () => context.push('/community/all')),
        ],
      ),
    );
  }
}

class ClassroomScreen extends StatelessWidget {
  const ClassroomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Classroom')),
      body: const Padding(
        padding: EdgeInsets.all(12),
        child: Column(
          children: [
            Text('Tableau pédagogique partagé (même API /learning/classroom).'),
            SizedBox(height: 12),
            ChessBoardView(fen: 'start', interactive: true),
          ],
        ),
      ),
    );
  }
}

class LegalPrivacyScreen extends StatelessWidget {
  const LegalPrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Confidentialité')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Text(
          'Politique de confidentialité AFRICHESS — consulter aussi la version web /legal/privacy.',
        ),
      ),
    );
  }
}

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PlaceholderDetailScreen(
      title: 'Insights',
      loader: (r) => r.read(statsApiProvider).me(),
    );
  }
}

class LiveTvAliasScreen extends ConsumerWidget {
  const LiveTvAliasScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PlaceholderDetailScreen(
      title: 'Live',
      loader: (r) => r.read(gamesApiProvider).tv(),
    );
  }
}

class StormRacerScreen extends StatelessWidget {
  const StormRacerScreen({super.key, required this.mode});
  final String mode; // storm | racer

  @override
  Widget build(BuildContext context) {
    // Storm/Racer web = variantes du rush — on réutilise le mode rush API
    return const PuzzlePlayScreen(mode: 'rush');
  }
}

class LearnAliasScreen extends StatelessWidget {
  const LearnAliasScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LearningHubScreen();
  }
}

class VoteChessScreen extends StatelessWidget {
  const VoteChessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vote chess')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Parties à vote de club — endpoint /games/vote/ (web).'),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => context.push('/clubs'),
            child: const Text('Voir les clubs'),
          ),
        ],
      ),
    );
  }
}

class RepertoiresScreen extends ConsumerWidget {
  const RepertoiresScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ApiListScreen(
      title: 'Répertoires',
      loader: (r) => r.read(learningApiProvider).openings(),
      itemBuilder: (c, item) => ListTile(title: Text('${item['name'] ?? item['title'] ?? item}')),
    );
  }
}

class StudySrsScreen extends StatelessWidget {
  const StudySrsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Étude SRS')),
      body: const Padding(
        padding: EdgeInsets.all(12),
        child: ChessBoardView(fen: 'start', interactive: true),
      ),
    );
  }
}

class GamesSearchScreen extends ConsumerStatefulWidget {
  const GamesSearchScreen({super.key});

  @override
  ConsumerState<GamesSearchScreen> createState() => _GamesSearchScreenState();
}

class _GamesSearchScreenState extends ConsumerState<GamesSearchScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recherche de parties')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            title: const Text('Mes stats / historique'),
            onTap: () => context.push('/stats'),
          ),
          ListTile(
            title: const Text('TV live'),
            onTap: () => context.push('/tv'),
          ),
        ],
      ),
    );
  }
}
