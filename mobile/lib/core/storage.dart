import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _accessKey = 'africhess_access';
  static const _refreshKey = 'africhess_refresh';
  final FlutterSecureStorage _store;

  TokenStorage({FlutterSecureStorage? store})
      : _store = store ?? const FlutterSecureStorage();

  Future<String?> getAccess() => _store.read(key: _accessKey);
  Future<String?> getRefresh() => _store.read(key: _refreshKey);

  Future<void> setTokens(String access, String refresh) async {
    await _store.write(key: _accessKey, value: access);
    await _store.write(key: _refreshKey, value: refresh);
  }

  Future<void> clear() async {
    await _store.delete(key: _accessKey);
    await _store.delete(key: _refreshKey);
  }
}
