/// Runtime config — override with --dart-define=API_URL=... / WS_URL=...
class AppConfig {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:8000/api',
  );
  static const wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://10.0.2.2:8000',
  );
  static const mediaOrigin = String.fromEnvironment(
    'MEDIA_ORIGIN',
    defaultValue: 'http://10.0.2.2:8000',
  );
  static const webOrigin = String.fromEnvironment(
    'WEB_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static String get apiOrigin =>
      apiUrl.replaceFirst(RegExp(r'/api/?$'), '');
}
