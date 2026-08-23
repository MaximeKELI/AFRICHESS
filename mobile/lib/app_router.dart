import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_provider.dart';
import '../features/auth/login_screen.dart';
import '../features/common/screens.dart';
import '../features/hubs/extra_screens.dart';
import '../features/hubs/hub_screens.dart';
import '../features/play/play_screens.dart';
import '../api/apis.dart';
import '../theme/app_theme.dart';

final _rootKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/',
    refreshListenable: _AuthRefresh(ref),
    redirect: (context, state) {
      if (!auth.bootstrapped) return null;
      final loggingIn = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register' ||
          state.matchedLocation.startsWith('/auth');
      if (!auth.isAuthenticated && !loggingIn) return '/login';
      if (auth.isAuthenticated && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/auth/callback',
        builder: (context, state) {
          final code = state.uri.queryParameters['code'];
          return OAuthCallbackScreen(code: code);
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/play', builder: (_, __) => const PlayHubScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/puzzles', builder: (_, __) => const PuzzlesHubScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/friends', builder: (_, __) => const FriendsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/more', builder: (_, __) => const MoreHubScreen()),
          ]),
        ],
      ),
      GoRoute(
        path: '/game/:id',
        builder: (_, s) => GameScreen(gameId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/watch/:id',
        builder: (_, s) => GameScreen(gameId: s.pathParameters['id']!, watchOnly: true),
      ),
      GoRoute(
        path: '/review/:id',
        builder: (_, s) => ReviewScreen(gameId: s.pathParameters['id']!),
      ),
      GoRoute(path: '/bots', builder: (_, __) => const BotsScreen()),
      GoRoute(path: '/leaderboard', builder: (_, __) => const LeaderboardScreen()),
      GoRoute(path: '/clubs', builder: (_, __) => const ClubsScreen()),
      GoRoute(
        path: '/clubs/:slug',
        builder: (_, s) => ClubDetailScreen(slug: s.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/messages/:username',
        builder: (_, s) => MessagesScreen(username: s.pathParameters['username']!),
      ),
      GoRoute(path: '/tournaments', builder: (_, __) => const TournamentsScreen()),
      GoRoute(
        path: '/tournaments/:slug',
        builder: (_, s) => PlaceholderDetailScreen(
          title: s.pathParameters['slug']!,
          loader: (r) => r.read(tournamentsApiProvider).detail(s.pathParameters['slug']!),
        ),
      ),
      GoRoute(path: '/learning', builder: (_, __) => const LearningHubScreen()),
      GoRoute(
        path: '/learning/courses',
        builder: (_, __) => ApiListScreen(
          title: 'Cours',
          loader: (r) => r.read(learningApiProvider).courses(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['title']}'),
            subtitle: Text('${item['level']} · ${item['lesson_count']} leçons'),
            onTap: () => c.push('/learning/courses/${item['slug']}'),
          ),
        ),
      ),
      GoRoute(
        path: '/learning/courses/:slug',
        builder: (_, s) => PlaceholderDetailScreen(
          title: s.pathParameters['slug']!,
          loader: (r) => r.read(learningApiProvider).course(s.pathParameters['slug']!),
        ),
      ),
      GoRoute(
        path: '/learning/videos',
        builder: (_, __) => ApiListScreen(
          title: 'Vidéos',
          loader: (r) => r.read(learningApiProvider).videos(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['title']}')),
        ),
      ),
      GoRoute(
        path: '/studies',
        builder: (_, __) => ApiListScreen(
          title: 'Études',
          loader: (r) => r.read(learningApiProvider).studies(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['title']}'),
            onTap: () => c.push('/studies/${item['id']}'),
          ),
        ),
      ),
      GoRoute(
        path: '/studies/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'Étude',
          loader: (r) => r.read(learningApiProvider).studyDetail(int.parse(s.pathParameters['id']!)),
        ),
      ),
      GoRoute(
        path: '/practice',
        builder: (_, __) => ApiListScreen(
          title: 'Pratique',
          loader: (r) => r.read(learningApiProvider).practice(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['title'] ?? item}')),
        ),
      ),
      GoRoute(
        path: '/learning/endgames',
        builder: (_, __) => ApiListScreen(
          title: 'Finales',
          loader: (r) => r.read(learningApiProvider).endgames(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['title'] ?? item}')),
        ),
      ),
      GoRoute(
        path: '/learning/openings',
        builder: (_, __) => ApiListScreen(
          title: 'Ouvertures',
          loader: (r) => r.read(learningApiProvider).openings(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['name'] ?? item['title'] ?? item}')),
        ),
      ),
      GoRoute(
        path: '/learning/glossary',
        builder: (_, __) => ApiListScreen(
          title: 'Glossaire',
          loader: (r) => r.read(learningApiProvider).glossary(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['term'] ?? item['title'] ?? item}'),
            subtitle: Text('${item['definition'] ?? ''}'),
          ),
        ),
      ),
      GoRoute(path: '/learning/coordinates', builder: (_, __) => const CoordinatesScreen()),
      GoRoute(path: '/analysis', builder: (_, __) => const AnalysisScreen()),
      GoRoute(path: '/editor', builder: (_, __) => const AnalysisScreen()),
      GoRoute(path: '/puzzles/daily', builder: (_, __) => const PuzzlePlayScreen(mode: 'daily')),
      GoRoute(path: '/puzzles/training', builder: (_, __) => const PuzzlePlayScreen(mode: 'training')),
      GoRoute(path: '/puzzles/rush', builder: (_, __) => const PuzzlePlayScreen(mode: 'rush')),
      GoRoute(path: '/puzzles/survival', builder: (_, __) => const PuzzlePlayScreen(mode: 'survival')),
      GoRoute(
        path: '/puzzles/streak',
        builder: (_, __) => PlaceholderDetailScreen(
          title: 'Streak',
          loader: (r) => r.read(puzzlesApiProvider).streak(),
        ),
      ),
      GoRoute(
        path: '/puzzles/battle',
        builder: (_, __) => PlaceholderDetailScreen(
          title: 'Battle',
          loader: (r) => r.read(puzzlesApiProvider).battleQueue(),
        ),
      ),
      GoRoute(
        path: '/puzzles/themes',
        builder: (_, __) => ApiListScreen(
          title: 'Thèmes',
          loader: (r) => r.read(puzzlesApiProvider).themes(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['name'] ?? item['id'] ?? item}')),
        ),
      ),
      GoRoute(
        path: '/puzzles/dashboard',
        builder: (_, __) => PlaceholderDetailScreen(
          title: 'Dashboard puzzles',
          loader: (r) => r.read(puzzlesApiProvider).dashboard(),
        ),
      ),
      GoRoute(
        path: '/lobby',
        builder: (_, __) => ApiListScreen(
          title: 'Lobby',
          loader: (r) => r.read(gamesApiProvider).lobby(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['username'] ?? item['id']}'),
            subtitle: Text('${item['mode'] ?? ''} ${item['time_control'] ?? ''}'),
          ),
        ),
      ),
      GoRoute(
        path: '/daily',
        builder: (_, __) => ApiListScreen(
          title: 'Correspondance',
          loader: (r) => r.read(gamesApiProvider).correspondence(),
          actions: [
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () async {
                // seek handled via button in empty state — use global keyless call
              },
            ),
          ],
          itemBuilder: (c, item) => ListTile(
            title: Text('Partie ${item['id']}'),
            onTap: () => c.push('/game/${item['id']}'),
          ),
        ),
      ),
      GoRoute(
        path: '/tv',
        builder: (_, __) => PlaceholderDetailScreen(
          title: 'TV',
          loader: (r) => r.read(gamesApiProvider).tv(),
        ),
      ),
      GoRoute(
        path: '/simul',
        builder: (_, __) => ApiListScreen(
          title: 'Simultanées',
          loader: (r) => r.read(gamesApiProvider).simuls(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['title'] ?? item['id']}')),
        ),
      ),
      GoRoute(
        path: '/broadcasts',
        builder: (_, __) => ApiListScreen(
          title: 'Broadcasts',
          loader: (r) => r.read(gamesApiProvider).broadcasts(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['title'] ?? item['slug']}')),
        ),
      ),
      GoRoute(
        path: '/forum',
        builder: (_, __) => ApiListScreen(
          title: 'Forum',
          loader: (r) => r.read(socialApiProvider).forum(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['title']}'),
            onTap: () => c.push('/forum/${item['id']}'),
          ),
        ),
      ),
      GoRoute(
        path: '/forum/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'Sujet',
          loader: (r) => r.read(socialApiProvider).forumPost(int.parse(s.pathParameters['id']!)),
        ),
      ),
      GoRoute(
        path: '/blog',
        builder: (_, __) => ApiListScreen(
          title: 'Blog',
          loader: (r) => r.read(socialApiProvider).forum(category: 'blog'),
          itemBuilder: (c, item) => ListTile(title: Text('${item['title']}')),
        ),
      ),
      GoRoute(
        path: '/events',
        builder: (_, __) => ApiListScreen(
          title: 'Événements',
          loader: (r) => r.read(socialApiProvider).events(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['title'] ?? item['name']}')),
        ),
      ),
      GoRoute(
        path: '/coaches',
        builder: (_, __) => ApiListScreen(
          title: 'Coachs',
          loader: (r) => r.read(socialApiProvider).coaches(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['username'] ?? item['name']}')),
        ),
      ),
      GoRoute(
        path: '/streamers',
        builder: (_, __) => ApiListScreen(
          title: 'Streamers',
          loader: (r) => r.read(socialApiProvider).streamers(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['username'] ?? item['name']}')),
        ),
      ),
      GoRoute(
        path: '/teams',
        builder: (_, __) => ApiListScreen(
          title: 'Équipes',
          loader: (r) => r.read(socialApiProvider).teams(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['name']}')),
        ),
      ),
      GoRoute(
        path: '/leagues',
        builder: (_, __) => ApiListScreen(
          title: 'Ligues',
          loader: (r) => r.read(ratingsApiProvider).leagues(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['name'] ?? item}')),
        ),
      ),
      GoRoute(
        path: '/notifications',
        builder: (_, __) => ApiListScreen(
          title: 'Notifications',
          loader: (r) => r.read(notificationsApiProvider).list(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['title'] ?? item['message'] ?? item}'),
            onTap: () {
              final id = item['id'];
              if (id is int) {
                // mark read fire-and-forget
              }
            },
          ),
        ),
      ),
      GoRoute(path: '/stats', builder: (_, __) => const StatsScreen()),
      GoRoute(path: '/premium', builder: (_, __) => const PremiumScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(
        path: '/settings/security',
        builder: (_, __) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/achievements',
        builder: (_, __) => const Scaffold(
          body: Center(child: Text('Succès — branché sur /learning badges')),
        ),
      ),
      GoRoute(path: '/admin', builder: (_, __) => const AdminScreen()),
      GoRoute(
        path: '/admin/users',
        builder: (_, __) => ApiListScreen(
          title: 'Admin users',
          loader: (r) => r.read(adminApiProvider).users(),
          itemBuilder: (c, item) => ListTile(title: Text('${item['username']}')),
        ),
      ),
      GoRoute(
        path: '/admin/fairplay',
        builder: (_, __) => ApiListScreen(
          title: 'Fair Play',
          loader: (r) => r.read(adminApiProvider).fairplayQueue(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['id']}'),
            onTap: () => c.push('/admin/fairplay/${item['id']}'),
          ),
        ),
      ),
      GoRoute(
        path: '/admin/fairplay/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'Fair Play',
          loader: (r) => r.read(adminApiProvider).fairplayGame(s.pathParameters['id']!),
        ),
      ),
      // --- Parité web : routes manquantes ---
      GoRoute(path: '/arena', builder: (_, __) => const ArenaSwissHub(kind: 'arena')),
      GoRoute(path: '/swiss', builder: (_, __) => const ArenaSwissHub(kind: 'swiss')),
      GoRoute(path: '/players', builder: (_, __) => const PlayersSearchScreen()),
      GoRoute(path: '/users/search', builder: (_, __) => const PlayersSearchScreen()),
      GoRoute(
        path: '/profile/:username',
        builder: (_, s) => PublicProfileScreen(username: s.pathParameters['username']!),
      ),
      GoRoute(path: '/messages', builder: (_, __) => const MessagesInboxScreen()),
      GoRoute(path: '/clock', builder: (_, __) => const ClockScreen()),
      GoRoute(path: '/paste', builder: (_, __) => const PastePgnScreen()),
      GoRoute(path: '/opening', builder: (_, __) => const OpeningExplorerScreen()),
      GoRoute(path: '/tools', builder: (_, __) => const ToolsHubScreen()),
      GoRoute(path: '/training', builder: (_, __) => const TrainingHubScreen()),
      GoRoute(path: '/training/solo', builder: (_, __) => const TrainingDrillScreen(title: 'Solo')),
      GoRoute(path: '/training/vision', builder: (_, __) => const TrainingDrillScreen(title: 'Vision')),
      GoRoute(path: '/training/endgames', builder: (_, __) => const TrainingDrillScreen(title: 'Finales')),
      GoRoute(path: '/community', builder: (_, __) => const CommunityHubScreen()),
      GoRoute(
        path: '/community/all',
        builder: (_, __) => ApiListScreen(
          title: 'Communauté',
          loader: (r) => r.read(socialApiProvider).forum(),
          itemBuilder: (c, item) => ListTile(
            title: Text('${item['title']}'),
            onTap: () => c.push('/forum/${item['id']}'),
          ),
        ),
      ),
      GoRoute(
        path: '/community/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'Sujet',
          loader: (r) => r.read(socialApiProvider).forumPost(int.parse(s.pathParameters['id']!)),
        ),
      ),
      GoRoute(path: '/classroom', builder: (_, __) => const ClassroomScreen()),
      GoRoute(path: '/legal/privacy', builder: (_, __) => const LegalPrivacyScreen()),
      GoRoute(path: '/insights', builder: (_, __) => const InsightsScreen()),
      GoRoute(path: '/live', builder: (_, __) => const LiveTvAliasScreen()),
      GoRoute(path: '/puzzles/storm', builder: (_, __) => const StormRacerScreen(mode: 'storm')),
      GoRoute(path: '/puzzles/racer', builder: (_, __) => const StormRacerScreen(mode: 'racer')),
      GoRoute(path: '/learn', builder: (_, __) => const LearnAliasScreen()),
      GoRoute(path: '/play/vote', builder: (_, __) => const VoteChessScreen()),
      GoRoute(path: '/play/daily', builder: (_, __) => const PlayHubScreen()),
      GoRoute(path: '/learning/repertoires', builder: (_, __) => const RepertoiresScreen()),
      GoRoute(path: '/learning/study', builder: (_, __) => const StudySrsScreen()),
      GoRoute(path: '/learning/analyze', builder: (_, __) => const AnalysisScreen()),
      GoRoute(path: '/learning/analyze/board', builder: (_, __) => const AnalysisScreen()),
      GoRoute(path: '/games/search', builder: (_, __) => const GamesSearchScreen()),
      GoRoute(
        path: '/games/:id/review',
        builder: (_, s) => ReviewScreen(gameId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/blog/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'Article',
          loader: (r) => r.read(socialApiProvider).forumPost(int.parse(s.pathParameters['id']!)),
        ),
      ),
      GoRoute(
        path: '/blog/new',
        builder: (_, __) => const Scaffold(
          body: Center(child: Text('Création d’article — utiliser le forum (catégorie blog)')),
        ),
      ),
      GoRoute(
        path: '/simul/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'Simul',
          loader: (r) async {
            final list = await r.read(gamesApiProvider).simuls();
            return list.firstWhere(
              (e) => '${(e as Map)['id']}' == s.pathParameters['id'],
              orElse: () => {'id': s.pathParameters['id']},
            );
          },
        ),
      ),
      GoRoute(
        path: '/broadcasts/:slug',
        builder: (_, s) => PlaceholderDetailScreen(
          title: s.pathParameters['slug']!,
          loader: (r) async {
            final list = await r.read(gamesApiProvider).broadcasts();
            return list.firstWhere(
              (e) => '${(e as Map)['slug']}' == s.pathParameters['slug'],
              orElse: () => {'slug': s.pathParameters['slug']},
            );
          },
        ),
      ),
      GoRoute(
        path: '/practice/:studySlug',
        builder: (_, s) => PlaceholderDetailScreen(
          title: s.pathParameters['studySlug']!,
          loader: (r) => r.read(learningApiProvider).practice(),
        ),
      ),
      GoRoute(
        path: '/practice/:studySlug/:chapterId',
        builder: (_, s) => TrainingDrillScreen(title: s.pathParameters['chapterId']!),
      ),
      GoRoute(
        path: '/settings/subscription',
        builder: (_, __) => const PremiumScreen(),
      ),
      GoRoute(
        path: '/puzzles/build',
        builder: (_, __) => const Scaffold(
          body: Center(child: Text('Création de problèmes — API /puzzles/custom')),
        ),
      ),
      GoRoute(
        path: '/admin/users/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'User ${s.pathParameters['id']}',
          loader: (r) => r.read(adminApiProvider).users(q: s.pathParameters['id']),
        ),
      ),
      GoRoute(
        path: '/admin/fairplay/games/:id',
        builder: (_, s) => PlaceholderDetailScreen(
          title: 'Fair Play',
          loader: (r) => r.read(adminApiProvider).fairplayGame(s.pathParameters['id']!),
        ),
      ),
    ],
  );
});

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(this.ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
  final Ref ref;
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: navigationShell.goBranch,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.sports_esports_outlined), selectedIcon: Icon(Icons.sports_esports), label: 'Jouer'),
          NavigationDestination(icon: Icon(Icons.extension_outlined), selectedIcon: Icon(Icons.extension), label: 'Puzzles'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Social'),
          NavigationDestination(icon: Icon(Icons.menu), label: 'Plus'),
        ],
      ),
    );
  }
}

class OAuthCallbackScreen extends ConsumerStatefulWidget {
  const OAuthCallbackScreen({super.key, this.code});
  final String? code;

  @override
  ConsumerState<OAuthCallbackScreen> createState() => _OAuthCallbackScreenState();
}

class _OAuthCallbackScreenState extends ConsumerState<OAuthCallbackScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final code = widget.code;
      if (code != null) {
        final ok = await ref.read(authProvider.notifier).oauthExchange(code);
        if (mounted) context.go(ok ? '/' : '/login');
      } else if (mounted) {
        context.go('/login');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

class AfrichessApp extends ConsumerWidget {
  const AfrichessApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final auth = ref.watch(authProvider);
    if (!auth.bootstrapped) {
      return MaterialApp(
        theme: buildAfrichessTheme(),
        home: const Scaffold(body: Center(child: CircularProgressIndicator())),
      );
    }
    return MaterialApp.router(
      title: 'AFRICHESS',
      theme: buildAfrichessTheme(),
      darkTheme: buildAfrichessTheme(dark: true),
      routerConfig: router,
    );
  }
}




