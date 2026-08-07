/// Runtime config — override with --dart-define=API_URL=... / WS_URL=...
///
/// Defaults target local backend on the host (Linux desktop / Chrome / iOS sim).
/// Android emulator: `--dart-define=API_URL=http://10.0.2.2:8000/api`.
class AppConfig {
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://127.0.0.1:8000/api',
  );
  static const wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://127.0.0.1:8000',
  );
  static const mediaOrigin = String.fromEnvironment(
    'MEDIA_ORIGIN',
    defaultValue: 'http://127.0.0.1:8000',
  );
  static const webOrigin = String.fromEnvironment(
    'WEB_URL',
    defaultValue: 'http://127.0.0.1:3000',
  );

  static String get apiOrigin =>
      apiUrl.replaceFirst(RegExp(r'/api/?$'), '');
}





