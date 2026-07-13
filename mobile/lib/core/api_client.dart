import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config.dart';
import 'storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((_) => TokenStorage());

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  const noAuth = [
    '/auth/login/',
    '/auth/register/',
    '/auth/token/refresh/',
    '/users/register/',
    '/users/auth/oauth/exchange/',
  ];

  Future<String?> refreshAccess() async {
    final refresh = await storage.getRefresh();
    if (refresh == null) {
      await storage.clear();
      return null;
    }
    try {
      final res = await Dio().post(
        '${AppConfig.apiUrl}/auth/token/refresh/',
        data: {'refresh': refresh},
      );
      final access = res.data['access'] as String;
      final newRefresh = (res.data['refresh'] as String?) ?? refresh;
      await storage.setTokens(access, newRefresh);
      return access;
    } catch (_) {
      await storage.clear();
      return null;
    }
  }

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final path = options.path;
        if (!noAuth.any(path.contains)) {
          final token = await storage.getAccess();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final status = error.response?.statusCode;
        final req = error.requestOptions;
        if (status != 401 || req.extra['retried'] == true) {
          return handler.next(error);
        }
        final access = await refreshAccess();
        if (access == null) return handler.next(error);
        req.extra['retried'] = true;
        req.headers['Authorization'] = 'Bearer $access';
        try {
          final clone = await dio.fetch(req);
          return handler.resolve(clone);
        } catch (e) {
          return handler.next(error);
        }
      },
    ),
  );

  return dio;
});
