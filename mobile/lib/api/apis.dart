import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';

final authApiProvider = Provider((ref) => AuthApi(ref.watch(dioProvider)));
final usersApiProvider = Provider((ref) => UsersApi(ref.watch(dioProvider)));
final gamesApiProvider = Provider((ref) => GamesApi(ref.watch(dioProvider)));
final puzzlesApiProvider = Provider((ref) => PuzzlesApi(ref.watch(dioProvider)));
final socialApiProvider = Provider((ref) => SocialApi(ref.watch(dioProvider)));
final ratingsApiProvider = Provider((ref) => RatingsApi(ref.watch(dioProvider)));
final tournamentsApiProvider =
    Provider((ref) => TournamentsApi(ref.watch(dioProvider)));
final learningApiProvider = Provider((ref) => LearningApi(ref.watch(dioProvider)));
final notificationsApiProvider =
    Provider((ref) => NotificationsApi(ref.watch(dioProvider)));
final statsApiProvider = Provider((ref) => StatsApi(ref.watch(dioProvider)));
final adminApiProvider = Provider((ref) => AdminApi(ref.watch(dioProvider)));

class AuthApi {
  AuthApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> login(
    String username,
    String password, {
    String? totpCode,
  }) async {
    final res = await _dio.post('/auth/login/', data: {
      'username': username,
      'password': password,
      if (totpCode != null && totpCode.isNotEmpty) 'totp_code': totpCode,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> logout(String? refresh) async {
    await _dio.post('/auth/logout/', data: refresh != null ? {'refresh': refresh} : {});
  }

  Future<Map<String, dynamic>> oauthExchange(String code, {String? totpCode}) async {
    final res = await _dio.post('/users/auth/oauth/exchange/', data: {
      'code': code,
      if (totpCode != null) 'totp_code': totpCode,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> profile() async {
    final res = await _dio.get('/users/profile/');
    return Map<String, dynamic>.from(res.data as Map);
  }
}

class UsersApi {
  UsersApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    final res = await _dio.post('/users/register/', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> subscriptionPlans() async {
    final res = await _dio.get('/users/subscription/plans/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> subscriptionStatus() async {
    final res = await _dio.get('/users/subscription/status/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> subscribe(String plan) async {
    final res = await _dio.post('/users/subscription/subscribe/', data: {'plan': plan});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> billingPortal() async {
    final res = await _dio.post('/users/subscription/billing-portal/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword1,
    required String newPassword2,
  }) async {
    await _dio.post('/auth/password/change/', data: {
      'old_password': oldPassword,
      'new_password1': newPassword1,
      'new_password2': newPassword2,
    });
  }
}

class GamesApi {
  GamesApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> bots({String? q, bool legends = false}) async {
    final res = await _dio.get('/games/bots/', queryParameters: {
      if (q != null && q.isNotEmpty) 'q': q,
      if (legends) 'legends': '1',
    });
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> createAi(Map<String, dynamic> data) async {
    final res = await _dio.post('/games/ai/', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> get(String id) async {
    final res = await _dio.get('/games/$id/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> matchmaking(
    String mode, {
    bool isTimed = true,
    bool isRated = true,
    String timeControl = '3+2',
    String variant = 'standard',
  }) async {
    final res = await _dio.post('/games/matchmaking/', data: {
      'mode': mode,
      'is_timed': isTimed,
      'is_rated': isRated,
      'time_control': timeControl,
      'variant': variant,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> leaveQueue() => _dio.delete('/games/matchmaking/');

  Future<Map<String, dynamic>> move(String id, String uci, {int? spentMs}) async {
    final res = await _dio.post('/games/$id/move/', data: {
      'uci': uci,
      if (spentMs != null) 'spent_ms': spentMs,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> resign(String id) async {
    final res = await _dio.post('/games/$id/resign/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> abort(String id) async {
    final res = await _dio.post('/games/$id/abort/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> offerDraw(String id) => _dio.post('/games/$id/draw/');
  Future<void> respondDraw(String id, bool accept) =>
      _dio.post('/games/$id/draw/respond/', data: {'accept': accept});
  Future<void> offerTakeback(String id) => _dio.post('/games/$id/takeback/');
  Future<void> respondTakeback(String id, bool accept) =>
      _dio.post('/games/$id/takeback/respond/', data: {'accept': accept});

  Future<Map<String, dynamic>> fairplayStatus() async {
    final res = await _dio.get('/games/fairplay/status/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> fairplayConsent() => _dio.post('/games/fairplay/consent/');

  Future<List<dynamic>> correspondence() async {
    final res = await _dio.get('/games/correspondence/');
    return res.data is List ? res.data as List : [];
  }

  Future<Map<String, dynamic>> correspondenceSeek({int daysPerMove = 3}) async {
    final res = await _dio.post('/games/correspondence/seek/', data: {
      'days_per_move': daysPerMove,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> leaveCorrespondenceQueue() =>
      _dio.delete('/games/correspondence/seek/');

  Future<List<dynamic>> lobby() async {
    final res = await _dio.get('/games/lobby/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> tv() async {
    final res = await _dio.get('/games/tv/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> pendingChallenges() async {
    final res = await _dio.get('/games/challenges/pending/');
    if (res.data is List) return res.data as List;
    return (res.data['results'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> acceptChallenge(int id) async {
    final res = await _dio.post('/games/challenges/$id/accept/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> declineChallenge(int id) =>
      _dio.post('/games/challenges/$id/decline/');

  Future<Map<String, dynamic>> engineEval(String fen) async {
    final res = await _dio.post('/games/engine/eval/', data: {'fen': fen});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> simuls() async {
    final res = await _dio.get('/games/simul/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> broadcasts() async {
    final res = await _dio.get('/games/broadcasts/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }
}

class PuzzlesApi {
  PuzzlesApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> daily() async {
    final res = await _dio.get('/puzzles/daily/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> training({
    String difficulty = 'medium',
    int count = 10,
    String? theme,
  }) async {
    final res = await _dio.get('/puzzles/training/', queryParameters: {
      'difficulty': difficulty,
      'count': count,
      if (theme != null) 'theme': theme,
    });
    return res.data is List ? res.data as List : [];
  }

  Future<Map<String, dynamic>> submit(
    int id,
    List<String> moves,
    int timeSeconds,
  ) async {
    final res = await _dio.post('/puzzles/$id/submit/', data: {
      'moves': moves,
      'time_seconds': timeSeconds,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> rushStart() async {
    final res = await _dio.post('/puzzles/rush/start/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> rushSubmit(
    int sessionId,
    List<String> moves,
    int timeSeconds,
  ) async {
    final res = await _dio.post('/puzzles/rush/$sessionId/submit/', data: {
      'moves': moves,
      'time_seconds': timeSeconds,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> survivalStart() async {
    final res = await _dio.post('/puzzles/survival/start/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> survivalSubmit(
    int sessionId,
    List<String> moves,
    int timeSeconds,
  ) async {
    final res = await _dio.post('/puzzles/survival/$sessionId/submit/', data: {
      'moves': moves,
      'time_seconds': timeSeconds,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> streak() async {
    final res = await _dio.get('/puzzles/streak/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> battleQueue() async {
    final res = await _dio.post('/puzzles/battle/queue/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> battleGet(int id) async {
    final res = await _dio.get('/puzzles/battle/$id/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> battleSubmit(
    int id,
    List<String> moves,
    int timeSeconds,
  ) async {
    final res = await _dio.post('/puzzles/battle/$id/', data: {
      'moves': moves,
      'time_seconds': timeSeconds,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> battleLeave() => _dio.delete('/puzzles/battle/queue/');

  Future<List<dynamic>> themes() async {
    final res = await _dio.get('/puzzles/themes/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> dashboard() async {
    final res = await _dio.get('/puzzles/dashboard/');
    return Map<String, dynamic>.from(res.data as Map);
  }
}

class SocialApi {
  SocialApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> friends() async {
    final res = await _dio.get('/social/friends/');
    return res.data is List ? res.data as List : [];
  }

  Future<List<dynamic>> pending() async {
    final res = await _dio.get('/social/friends/pending/');
    return res.data is List ? res.data as List : [];
  }

  Future<void> request(String username) =>
      _dio.post('/social/friends/request/', data: {'username': username});

  Future<void> accept(int id) => _dio.post('/social/friends/$id/accept/');

  Future<Map<String, dynamic>> challengeFriend(String username, {String mode = 'blitz'}) async {
    final res = await _dio.post('/social/friends/challenge/', data: {
      'username': username,
      'mode': mode,
      'is_rated': false,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> directMessages(String username) async {
    final res = await _dio.get('/social/messages/$username/');
    return res.data is List ? res.data as List : [];
  }

  Future<Map<String, dynamic>> sendDm(String username, String message) async {
    final res = await _dio.post('/social/messages/$username/', data: {'message': message});
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> clubs({String? country}) async {
    final res = await _dio.get('/social/clubs/', queryParameters: {
      if (country != null) 'country': country,
    });
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> club(String slug) async {
    final res = await _dio.get('/social/clubs/$slug/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> joinClub(String slug) => _dio.post('/social/clubs/$slug/join/');

  Future<List<dynamic>> forum({String? category}) async {
    final res = await _dio.get('/social/forum/', queryParameters: {
      if (category != null) 'category': category,
    });
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> forumPost(int id) async {
    final res = await _dio.get('/social/forum/$id/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> events() async {
    final res = await _dio.get('/social/events/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> coaches() async {
    final res = await _dio.get('/social/coaches/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> streamers() async {
    final res = await _dio.get('/social/streamers/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> searchUsers(String q) async {
    final res = await _dio.get('/users/search/', queryParameters: {'q': q});
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> teams() async {
    final res = await _dio.get('/social/teams/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }
}

class RatingsApi {
  RatingsApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> globalLeaderboard({String mode = 'blitz'}) async {
    final res = await _dio.get('/ratings/leaderboard/global/', queryParameters: {'mode': mode});
    if (res.data is List) return res.data as List;
    return (res.data['results'] as List?) ?? [];
  }

  Future<List<dynamic>> africanLeaderboard({String mode = 'blitz', String? country}) async {
    final res = await _dio.get('/ratings/leaderboard/african/', queryParameters: {
      'mode': mode,
      if (country != null) 'country': country,
    });
    if (res.data is List) return res.data as List;
    return (res.data['results'] as List?) ?? [];
  }

  Future<List<dynamic>> leagues() async {
    final res = await _dio.get('/ratings/leagues/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }
}

class TournamentsApi {
  TournamentsApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> list() async {
    final res = await _dio.get('/tournaments/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<void> register(String slug, {int? clubId}) =>
      _dio.post('/tournaments/$slug/register/', data: {
        if (clubId != null) 'club_id': clubId,
      });

  Future<Map<String, dynamic>> standings(String slug) async {
    final res = await _dio.get('/tournaments/$slug/standings/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> detail(String slug) async {
    final res = await _dio.get('/tournaments/$slug/');
    return Map<String, dynamic>.from(res.data as Map);
  }
}

class LearningApi {
  LearningApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> courses({String lang = 'fr'}) async {
    final res = await _dio.get('/learning/courses/', queryParameters: {'lang': lang});
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> course(String slug) async {
    final res = await _dio.get('/learning/courses/$slug/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> videos() async {
    final res = await _dio.get('/learning/videos/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> studies() async {
    final res = await _dio.get('/learning/studies/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> studyDetail(int id) async {
    final res = await _dio.get('/learning/studies/$id/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> dashboard() async {
    final res = await _dio.get('/learning/dashboard/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> practice() async {
    final res = await _dio.get('/learning/practice/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> endgames() async {
    final res = await _dio.get('/learning/endgames/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> openings() async {
    final res = await _dio.get('/learning/openings/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> glossary() async {
    final res = await _dio.get('/learning/glossary/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }
}

class NotificationsApi {
  NotificationsApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> list() async {
    final res = await _dio.get('/notifications/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<void> markRead(int id) => _dio.post('/notifications/$id/read/');

  Future<void> registerDevice({
    required String token,
    required String platform,
    String kind = 'fcm',
    String? deviceId,
  }) =>
      _dio.post('/notifications/devices/', data: {
        'token': token,
        'platform': platform,
        'kind': kind,
        if (deviceId != null) 'device_id': deviceId,
      });
}

class StatsApi {
  StatsApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> me() async {
    final res = await _dio.get('/stats/me/');
    return Map<String, dynamic>.from(res.data as Map);
  }
}

class AdminApi {
  AdminApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> overview() async {
    final res = await _dio.get('/analytics/admin/overview/');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> users({String? q}) async {
    final res = await _dio.get('/analytics/admin/users/', queryParameters: {
      if (q != null) 'q': q,
    });
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<List<dynamic>> fairplayQueue() async {
    final res = await _dio.get('/games/admin/fairplay/');
    return res.data is List ? res.data as List : (res.data['results'] as List? ?? []);
  }

  Future<Map<String, dynamic>> fairplayGame(String id) async {
    final res = await _dio.get('/games/admin/fairplay/$id/');
    return Map<String, dynamic>.from(res.data as Map);
  }
}

