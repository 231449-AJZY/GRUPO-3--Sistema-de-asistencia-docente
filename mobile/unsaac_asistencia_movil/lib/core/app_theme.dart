import 'package:flutter/material.dart';

const Color unsaacPrimary = Color(0xFF061B34);
const Color unsaacTop = Color(0xFF0A2E52);
const Color unsaacSidebar = Color(0xFF0D385F);
const Color unsaacBlue = Color(0xFF2563EB);
const Color unsaacOrange = Color(0xFFFF8A00);
const Color unsaacBackground = Color(0xFFEEF4FA);
const Color unsaacText = Color(0xFF0F213A);
const Color unsaacMuted = Color(0xFF52627A);

// Alias conservados para las pantallas anteriores.
const Color unsaacBurgundy = unsaacPrimary;
const Color unsaacNavy = unsaacTop;
const Color unsaacGold = unsaacOrange;

ThemeData buildAppTheme() {
  final ColorScheme colors = ColorScheme.fromSeed(
    seedColor: unsaacBlue,
    brightness: Brightness.light,
  ).copyWith(
    primary: unsaacBlue,
    secondary: unsaacOrange,
    tertiary: unsaacTop,
    surface: Colors.white,
    onPrimary: Colors.white,
    onSecondary: unsaacPrimary,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colors,
    scaffoldBackgroundColor: unsaacBackground,
    fontFamily: 'Roboto',
    appBarTheme: const AppBarTheme(
      centerTitle: false,
      elevation: 0,
      backgroundColor: unsaacPrimary,
      foregroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.w900,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      labelStyle: const TextStyle(color: unsaacMuted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFD8E2EE)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFD8E2EE)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: unsaacBlue, width: 1.8),
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: Color(0xFFDDE7F1)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: unsaacBlue,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 50),
        textStyle: const TextStyle(fontWeight: FontWeight.w900),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: unsaacBlue,
        minimumSize: const Size(0, 50),
        side: const BorderSide(color: Color(0xFF9CC0F8)),
        textStyle: const TextStyle(fontWeight: FontWeight.w900),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: Color(0xFFDCEAFF),
      labelTextStyle: WidgetStatePropertyAll<TextStyle>(
        TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: Colors.white,
      selectedColor: const Color(0xFFDCEAFF),
      side: const BorderSide(color: Color(0xFFD8E2EE)),
      labelStyle: const TextStyle(fontWeight: FontWeight.w800),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}
