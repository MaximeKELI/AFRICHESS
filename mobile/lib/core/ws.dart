import '../config.dart';

String wsGamePath(String gameId) => '${AppConfig.wsUrl}/ws/game/$gameId/';
String wsMatchmakingPath() => '${AppConfig.wsUrl}/ws/matchmaking/';
String wsNotificationsPath() => '${AppConfig.wsUrl}/ws/notifications/';
String wsSimulPath(String id) => '${AppConfig.wsUrl}/ws/simul/$id/';
String wsChatPath(String roomType, String roomId) =>
    '${AppConfig.wsUrl}/ws/chat/$roomType/$roomId/';

List<String> wsAuthProtocols(String token) => ['bearer', token];
