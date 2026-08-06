import 'package:flutter/material.dart';

class AfrichessColors {
  static const gold = Color(0xFFD4A017);
  static const green = Color(0xFF1B7A3D);
  static const greenSoft = Color(0xFF2D6A4F);
  static const terracotta = Color(0xFFC45C3E);
  static const cream = Color(0xFFF7F3EB);
  static const ink = Color(0xFF1A1A1A);
  static const boardLight = Color(0xFFEEE0C8);
  static const boardDark = Color(0xFF769656);
}

ThemeData buildAfrichessTheme({bool dark = false}) {
  final base = dark ? ThemeData.dark(useMaterial3: true) : ThemeData.light(useMaterial3: true);
  final seed = AfrichessColors.green;
  return base.copyWith(
    colorScheme: ColorScheme.fromSeed(
      seedColor: seed,
      brightness: dark ? Brightness.dark : Brightness.light,
      primary: AfrichessColors.green,
      secondary: AfrichessColors.gold,
      tertiary: AfrichessColors.terracotta,
    ),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      backgroundColor: dark ? const Color(0xFF121212) : AfrichessColors.cream,
      foregroundColor: dark ? Colors.white : AfrichessColors.ink,
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AfrichessColors.gold,
      foregroundColor: AfrichessColors.ink,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AfrichessColors.green,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AfrichessColors.gold,
        side: const BorderSide(color: AfrichessColors.gold),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  );
}



