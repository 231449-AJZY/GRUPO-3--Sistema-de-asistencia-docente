import 'package:flutter/material.dart';

import '../core/app_theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            CircleAvatar(
              radius: 42,
              backgroundColor: unsaacBurgundy,
              child: Icon(Icons.fingerprint, size: 48, color: Colors.white),
            ),
            SizedBox(height: 20),
            Text(
              'UNSAAC Asistencia Móvil',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 18),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
