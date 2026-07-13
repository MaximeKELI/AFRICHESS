import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/apis.dart';
import '../core/storage.dart';
import '../core/api_client.dart';

class AuthState {
  final bool loading;
  final bool bootstrapped;
  final Map<String, dynamic>? user;
  final String? error;

  const AuthState({
    this.loading = false,
    this.bootstrapped = false,
    this.user,
    this.error,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    bool? loading,
    bool? bootstrapped,
    Map<String, dynamic>? user,
    String? error,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      loading: loading ?? this.loading,
      bootstrapped: bootstrapped ?? this.bootstrapped,
      user: clearUser ? null : (user ?? this.user),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._ref) : super(const AuthState()) {
    bootstrap();
  }

  final Ref _ref;

  TokenStorage get _storage => _ref.read(tokenStorageProvider);
  AuthApi get _auth => _ref.read(authApiProvider);
  UsersApi get _users => _ref.read(usersApiProvider);

  Future<void> bootstrap() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final access = await _storage.getAccess();
      if (access == null) {
        state = state.copyWith(loading: false, bootstrapped: true, clearUser: true);
        return;
      }
      final profile = await _auth.profile();
      state = state.copyWith(loading: false, bootstrapped: true, user: profile);
    } catch (_) {
      await _storage.clear();
      state = state.copyWith(loading: false, bootstrapped: true, clearUser: true);
    }
  }

  Future<bool> login(String username, String password, {String? totp}) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final tokens = await _auth.login(username, password, totpCode: totp);
      await _storage.setTokens(
        tokens['access'] as String,
        tokens['refresh'] as String,
      );
      final profile = await _auth.profile();
      state = state.copyWith(loading: false, user: profile, bootstrapped: true);
      return true;
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> register({
    required String username,
    required String email,
    required String password,
    String? country,
  }) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final data = await _users.register({
        'username': username,
        'email': email,
        'password': password,
        'password_confirm': password,
        if (country != null) 'country': country,
      });
      if (data['access'] != null) {
        await _storage.setTokens(
          data['access'] as String,
          data['refresh'] as String,
        );
        final profile = await _auth.profile();
        state = state.copyWith(loading: false, user: profile, bootstrapped: true);
      } else {
        state = state.copyWith(loading: false);
      }
      return true;
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    final refresh = await _storage.getRefresh();
    try {
      await _auth.logout(refresh);
    } catch (_) {}
    await _storage.clear();
    state = state.copyWith(clearUser: true, bootstrapped: true);
  }

  Future<bool> oauthExchange(String code) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final tokens = await _auth.oauthExchange(code);
      await _storage.setTokens(
        tokens['access'] as String,
        tokens['refresh'] as String,
      );
      final profile = await _auth.profile();
      state = state.copyWith(loading: false, user: profile, bootstrapped: true);
      return true;
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      return false;
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref),
);
