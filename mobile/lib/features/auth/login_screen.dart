import 'package:flutter/material.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config.dart';
import '../../features/auth/auth_provider.dart';
import '../../theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  final _totp = TextEditingController();
  bool _showTotp = false;

  @override
  void dispose() {
    _user.dispose();
    _pass.dispose();
    _totp.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final ok = await ref.read(authProvider.notifier).login(
          _user.text.trim(),
          _pass.text,
          totp: _totp.text.trim().isEmpty ? null : _totp.text.trim(),
        );
    if (ok && mounted) context.go('/');
  }

  Future<void> _oauth(String provider) async {
    final url = Uri.parse('${AppConfig.apiOrigin}/accounts/$provider/login/');
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 32),
            Text(
              'AFRICHESS',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AfrichessColors.gold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Connexion',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _user,
              decoration: const InputDecoration(labelText: 'Identifiant'),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _pass,
              decoration: const InputDecoration(labelText: 'Mot de passe'),
              obscureText: true,
              onSubmitted: (_) => _submit(),
            ),
            if (_showTotp) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _totp,
                decoration: const InputDecoration(labelText: 'Code 2FA'),
                keyboardType: TextInputType.number,
              ),
            ],
            TextButton(
              onPressed: () => setState(() => _showTotp = !_showTotp),
              child: Text(_showTotp ? 'Masquer 2FA' : 'Code 2FA'),
            ),
            if (auth.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(auth.error!, style: const TextStyle(color: Colors.red)),
              ),
            ElevatedButton(
              onPressed: auth.loading ? null : _submit,
              child: auth.loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Se connecter'),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => _oauth('google'),
              child: const Text('Continuer avec Google'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => _oauth('github'),
              child: const Text('Continuer avec GitHub'),
            ),
            TextButton(
              onPressed: () => context.push('/register'),
              child: const Text('Créer un compte'),
            ),
          ],
        ),
      ),
    );
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _user = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();

  @override
  void dispose() {
    _user.dispose();
    _email.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final ok = await ref.read(authProvider.notifier).register(
          username: _user.text.trim(),
          email: _email.text.trim(),
          password: _pass.text,
        );
    if (ok && mounted) context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Inscription')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextField(controller: _user, decoration: const InputDecoration(labelText: 'Identifiant')),
          const SizedBox(height: 12),
          TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: 12),
          TextField(
            controller: _pass,
            decoration: const InputDecoration(labelText: 'Mot de passe'),
            obscureText: true,
          ),
          if (auth.error != null)
            Text(auth.error!, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: auth.loading ? null : _submit,
            child: const Text("S'inscrire"),
          ),
        ],
      ),
    );
  }
}
