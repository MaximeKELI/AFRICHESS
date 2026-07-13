import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/apis.dart';
import '../../config.dart';
import '../../features/auth/auth_provider.dart';
import '../../features/common/screens.dart';
import '../../widgets/chess_board.dart';

class BotsScreen extends ConsumerWidget {
  const BotsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ApiListScreen(
      title: 'Bots',
      loader: (r) => r.read(gamesApiProvider).bots(),
      itemBuilder: (context, bot) {
        return ListTile(
          leading: CircleAvatar(child: Text('${bot['elo'] ?? '?'}'.substring(0, 1))),
          title: Text('${bot['name'] ?? bot['slug']}'),
          subtitle: Text('ELO ${bot['elo']} · ${bot['opening_style'] ?? ''}'),
          trailing: const Icon(Icons.play_arrow),
          onTap: () async {
            final game = await ref.read(gamesApiProvider).createAi({
              'mode': 'blitz',
              'color': 'white',
              'bot_slug': bot['slug'],
              'variant': 'standard',
            });
            if (context.mounted && game['id'] != null) {
              context.push('/game/${game['id']}');
            }
          },
        );
      },
    );
  }
}

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  bool african = true;
  String mode = 'blitz';

  @override
  Widget build(BuildContext context) {
    return ApiListScreen(
      title: 'Classements',
      loader: (r) => african
          ? r.read(ratingsApiProvider).africanLeaderboard(mode: mode)
          : r.read(ratingsApiProvider).globalLeaderboard(mode: mode),
      actions: [
        IconButton(
          icon: Icon(african ? Icons.public : Icons.flag),
          onPressed: () => setState(() => african = !african),
        ),
      ],
      itemBuilder: (context, row) {
        final user = row['user'] as Map? ?? row;
        return ListTile(
          title: Text('${user['display_name'] ?? user['username']}'),
          subtitle: Text('${user['country'] ?? ''} · ${row['games_count'] ?? 0} parties'),
          trailing: Text('${row['elo']}', style: const TextStyle(fontWeight: FontWeight.bold)),
        );
      },
    );
  }
}

class FriendsScreen extends ConsumerWidget {
  const FriendsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(authProvider).user?['id'];
    return ApiListScreen(
      title: 'Amis',
      loader: (r) => r.read(socialApiProvider).friends(),
      actions: [
        IconButton(
          icon: const Icon(Icons.person_add),
          onPressed: () async {
            final ctrl = TextEditingController();
            final ok = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Ajouter un ami'),
                content: TextField(controller: ctrl, decoration: const InputDecoration(labelText: 'Username')),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
                  TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Envoyer')),
                ],
              ),
            );
            if (ok == true && ctrl.text.trim().isNotEmpty) {
              await ref.read(socialApiProvider).request(ctrl.text.trim());
            }
          },
        ),
      ],
      itemBuilder: (context, row) {
        final from = row['from_user'] as Map? ?? {};
        final to = row['to_user'] as Map? ?? {};
        final peer = from['id'] == me ? to : from;
        final name = peer['username'] ?? '?';
        return ListTile(
          title: Text('$name'),
          subtitle: Text('${row['status']}'),
          trailing: Wrap(
            children: [
              IconButton(
                icon: const Icon(Icons.sports_esports),
                onPressed: () async {
                  await ref.read(socialApiProvider).challengeFriend('$name');
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Défi envoyé')),
                    );
                  }
                },
              ),
              IconButton(
                icon: const Icon(Icons.message),
                onPressed: () => context.push('/messages/$name'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key, required this.username});
  final String username;

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  final _ctrl = TextEditingController();
  List<dynamic> _msgs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await ref.read(socialApiProvider).directMessages(widget.username);
    if (mounted) setState(() => _msgs = list);
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    await ref.read(socialApiProvider).sendDm(widget.username, text);
    _ctrl.clear();
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.username)),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _msgs.length,
              itemBuilder: (_, i) {
                final m = _msgs[i] as Map;
                return Align(
                  alignment: Alignment.centerLeft,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Text('${m['sender']?['username']}: ${m['content']}'),
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    decoration: const InputDecoration(
                      hintText: 'Message…',
                      contentPadding: EdgeInsets.symmetric(horizontal: 16),
                    ),
                  ),
                ),
                IconButton(onPressed: _send, icon: const Icon(Icons.send)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ClubsScreen extends ConsumerWidget {
  const ClubsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ApiListScreen(
      title: 'Clubs',
      loader: (r) => r.read(socialApiProvider).clubs(),
      itemBuilder: (context, club) => ListTile(
        title: Text('${club['name']}'),
        subtitle: Text('${club['country']} · ${club['member_count']} membres'),
        onTap: () => context.push('/clubs/${club['slug']}'),
      ),
    );
  }
}

class ClubDetailScreen extends ConsumerStatefulWidget {
  const ClubDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<ClubDetailScreen> createState() => _ClubDetailScreenState();
}

class _ClubDetailScreenState extends ConsumerState<ClubDetailScreen> {
  Map<String, dynamic>? _club;

  @override
  void initState() {
    super.initState();
    ref.read(socialApiProvider).club(widget.slug).then((c) {
      if (mounted) setState(() => _club = c);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_club == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: Text('${_club!['name']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${_club!['description'] ?? ''}'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () async {
              await ref.read(socialApiProvider).joinClub(widget.slug);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Club rejoint')),
                );
              }
            },
            child: const Text('Rejoindre'),
          ),
        ],
      ),
    );
  }
}

class TournamentsScreen extends ConsumerWidget {
  const TournamentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ApiListScreen(
      title: 'Tournois',
      loader: (r) => r.read(tournamentsApiProvider).list(),
      itemBuilder: (context, t) => ListTile(
        title: Text('${t['name']}'),
        subtitle: Text('${t['format']} · ${t['status']} · ${t['participant_count']} joueurs'),
        trailing: TextButton(
          child: const Text('S’inscrire'),
          onPressed: () async {
            await ref.read(tournamentsApiProvider).register('${t['slug']}');
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Inscrit')),
              );
            }
          },
        ),
        onTap: () => context.push('/tournaments/${t['slug']}'),
      ),
    );
  }
}

class LearningHubScreen extends ConsumerWidget {
  const LearningHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Apprendre')),
      body: ListView(
        children: [
          ListTile(title: const Text('Cours'), onTap: () => context.push('/learning/courses')),
          ListTile(title: const Text('Vidéos'), onTap: () => context.push('/learning/videos')),
          ListTile(title: const Text('Études'), onTap: () => context.push('/studies')),
          ListTile(title: const Text('Pratique'), onTap: () => context.push('/practice')),
          ListTile(title: const Text('Finales'), onTap: () => context.push('/learning/endgames')),
          ListTile(title: const Text('Ouvertures'), onTap: () => context.push('/learning/openings')),
          ListTile(title: const Text('Glossaire'), onTap: () => context.push('/learning/glossary')),
          ListTile(title: const Text('Coordonnées'), onTap: () => context.push('/learning/coordinates')),
          ListTile(title: const Text('Analyse plateau'), onTap: () => context.push('/analysis')),
          ListTile(title: const Text('Éditeur'), onTap: () => context.push('/editor')),
        ],
      ),
    );
  }
}

class MoreHubScreen extends ConsumerWidget {
  const MoreHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final isStaff = auth.user?['is_staff'] == true || auth.user?['is_superuser'] == true;
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: ListView(
        children: [
          ListTile(title: const Text('Profil'), onTap: () => context.push('/profile')),
          ListTile(title: const Text('Joueurs'), onTap: () => context.push('/players')),
          ListTile(title: const Text('Messages'), onTap: () => context.push('/messages')),
          ListTile(title: const Text('Statistiques'), onTap: () => context.push('/stats')),
          ListTile(title: const Text('Insights'), onTap: () => context.push('/insights')),
          ListTile(title: const Text('Classements'), onTap: () => context.push('/leaderboard')),
          ListTile(title: const Text('Ligues'), onTap: () => context.push('/leagues')),
          ListTile(title: const Text('Arènes'), onTap: () => context.push('/arena')),
          ListTile(title: const Text('Suisses'), onTap: () => context.push('/swiss')),
          ListTile(title: const Text('Tournois'), onTap: () => context.push('/tournaments')),
          ListTile(title: const Text('Apprendre'), onTap: () => context.push('/learning')),
          ListTile(title: const Text('Entraînement'), onTap: () => context.push('/training')),
          ListTile(title: const Text('Outils'), onTap: () => context.push('/tools')),
          ListTile(title: const Text('Communauté'), onTap: () => context.push('/community')),
          ListTile(title: const Text('Classroom'), onTap: () => context.push('/classroom')),
          ListTile(title: const Text('TV Live'), onTap: () => context.push('/tv')),
          ListTile(title: const Text('Live'), onTap: () => context.push('/live')),
          ListTile(title: const Text('Simultanées'), onTap: () => context.push('/simul')),
          ListTile(title: const Text('Broadcasts'), onTap: () => context.push('/broadcasts')),
          ListTile(title: const Text('Forum'), onTap: () => context.push('/forum')),
          ListTile(title: const Text('Blog'), onTap: () => context.push('/blog')),
          ListTile(title: const Text('Événements'), onTap: () => context.push('/events')),
          ListTile(title: const Text('Coachs'), onTap: () => context.push('/coaches')),
          ListTile(title: const Text('Streamers'), onTap: () => context.push('/streamers')),
          ListTile(title: const Text('Équipes'), onTap: () => context.push('/teams')),
          ListTile(title: const Text('Premium'), onTap: () => context.push('/premium')),
          ListTile(title: const Text('Paramètres'), onTap: () => context.push('/settings')),
          ListTile(title: const Text('Succès'), onTap: () => context.push('/achievements')),
          ListTile(title: const Text('Confidentialité'), onTap: () => context.push('/legal/privacy')),
          ListTile(title: const Text('Vote chess'), onTap: () => context.push('/play/vote')),
          ListTile(title: const Text('Recherche parties'), onTap: () => context.push('/games/search')),
          if (isStaff) ...[
            const Divider(),
            ListTile(title: const Text('Admin'), onTap: () => context.push('/admin')),
            ListTile(title: const Text('Fair Play'), onTap: () => context.push('/admin/fairplay')),
          ],
          const Divider(),
          ListTile(
            title: const Text('Déconnexion'),
            leading: const Icon(Icons.logout),
            onTap: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}

class StatsScreen extends ConsumerStatefulWidget {
  const StatsScreen({super.key});

  @override
  ConsumerState<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends ConsumerState<StatsScreen> {
  Map<String, dynamic>? _stats;

  @override
  void initState() {
    super.initState();
    ref.read(statsApiProvider).me().then((s) {
      if (mounted) setState(() => _stats = s);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_stats == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final games = (_stats!['recent_games'] as List?) ?? (_stats!['games'] as List?) ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Statistiques')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Parties: ${_stats!['games_count'] ?? games.length}'),
          Text('Victoires: ${_stats!['wins'] ?? '—'}'),
          const SizedBox(height: 16),
          const Text('Historique', style: TextStyle(fontWeight: FontWeight.bold)),
          ...games.take(30).map((g) {
            final m = Map<String, dynamic>.from(g as Map);
            return ListTile(
              title: Text('${m['opponent'] ?? m['id']}'),
              subtitle: Text('${m['mode'] ?? ''} · ${m['outcome'] ?? m['result'] ?? ''}'),
              onTap: () {
                final id = m['id']?.toString();
                if (id != null) context.push('/watch/$id');
              },
            );
          }),
        ],
      ),
    );
  }
}

class PremiumScreen extends ConsumerWidget {
  const PremiumScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: ref.read(usersApiProvider).subscriptionPlans(),
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final plans = (snap.data!['plans'] as List?) ?? [];
        return Scaffold(
          appBar: AppBar(title: const Text('Premium')),
          body: ListView(
            children: [
              for (final p in plans)
                ListTile(
                  title: Text('${(p as Map)['id']} — ${(p)['price_eur']} €'),
                  subtitle: Text(((p)['features'] as List?)?.join(' · ') ?? ''),
                  trailing: ElevatedButton(
                    onPressed: () async {
                      final res = await ref.read(usersApiProvider).subscribe('${p['id']}');
                      final url = res['checkout_url'] as String?;
                      if (url != null) {
                        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                      }
                    },
                    child: const Text('Choisir'),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class AnalysisScreen extends StatefulWidget {
  const AnalysisScreen({super.key});

  @override
  State<AnalysisScreen> createState() => _AnalysisScreenState();
}

class _AnalysisScreenState extends State<AnalysisScreen> {
  String fen = 'start';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Analyse')),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            ChessBoardView(
              fen: fen,
              interactive: true,
              onMove: (from, to, {promotion}) {
                // Local-only exploration — fen update via chess package would be next step
              },
            ),
            const SizedBox(height: 12),
            Text(fen, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class CoordinatesScreen extends StatelessWidget {
  const CoordinatesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Coordonnées')),
      body: const Padding(
        padding: EdgeInsets.all(12),
        child: ChessBoardView(fen: 'start', interactive: false),
      ),
    );
  }
}

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user ?? {};
    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(title: const Text('Username'), subtitle: Text('${user['username']}')),
          ListTile(title: const Text('Email'), subtitle: Text('${user['email'] ?? '—'}')),
          ListTile(title: const Text('Pays'), subtitle: Text('${user['country'] ?? '—'}')),
          ListTile(title: const Text('Titre'), subtitle: Text('${user['title'] ?? '—'}')),
        ],
      ),
    );
  }
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Paramètres')),
      body: ListView(
        children: [
          ListTile(
            title: const Text('Sécurité / mot de passe'),
            onTap: () => context.push('/settings/security'),
          ),
          ListTile(
            title: const Text('Abonnement'),
            onTap: () => context.push('/premium'),
          ),
          ListTile(
            title: const Text('API'),
            subtitle: Text(AppConfig.apiUrl),
          ),
        ],
      ),
    );
  }
}

class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: ref.read(adminApiProvider).overview(),
      builder: (context, snap) {
        return Scaffold(
          appBar: AppBar(title: const Text('Admin')),
          body: snap.hasData
              ? ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text('${snap.data}'),
                    ListTile(
                      title: const Text('Utilisateurs'),
                      onTap: () => context.push('/admin/users'),
                    ),
                    ListTile(
                      title: const Text('Fair Play'),
                      onTap: () => context.push('/admin/fairplay'),
                    ),
                  ],
                )
              : const Center(child: CircularProgressIndicator()),
        );
      },
    );
  }
}

class PlaceholderDetailScreen extends ConsumerWidget {
  const PlaceholderDetailScreen({
    super.key,
    required this.title,
    required this.loader,
  });
  final String title;
  final Future<dynamic> Function(WidgetRef ref) loader;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: loader(ref),
      builder: (context, snap) {
        return Scaffold(
          appBar: AppBar(title: Text(title)),
          body: snap.hasError
              ? Center(child: Text('${snap.error}'))
              : snap.hasData
                  ? SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Text('${snap.data}'),
                    )
                  : const Center(child: CircularProgressIndicator()),
        );
      },
    );
  }
}
