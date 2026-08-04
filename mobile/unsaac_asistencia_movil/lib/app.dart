import 'package:flutter/material.dart';

import 'controllers/app_controller.dart';
import 'core/app_theme.dart';
import 'screens/admin_mobile_portal_screen.dart';
import 'screens/public_home_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/supervisor_portal_screen.dart';
import 'screens/teacher_portal_screen.dart';

class UnsaacMobileApp extends StatelessWidget {
  const UnsaacMobileApp({required this.controller, super.key});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (BuildContext context, Widget? child) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'UNSAAC Asistencia Móvil',
          theme: buildAppTheme(),
          home: switch (controller.state) {
            AppState.loading => const SplashScreen(),
            AppState.signedOut => PublicHomeScreen(controller: controller),
            AppState.signedIn =>
              controller.user?.isAdmin == true
                  ? AdminMobilePortalScreen(controller: controller)
                  : controller.user?.isSupervisor == true
                  ? SupervisorPortalScreen(controller: controller)
                  : TeacherPortalScreen(controller: controller),
          },
        );
      },
    );
  }
}
