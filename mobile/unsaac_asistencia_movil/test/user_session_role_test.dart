import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/user_session.dart';

void main() {
  UserSession buildUser(String role) => UserSession(
    id: 1,
    nombres: 'Usuario',
    apellidos: 'Prueba',
    email: 'prueba@unsaac.edu.pe',
    codigo: 'USR-001',
    rol: role,
  );

  test('acepta rol Administrador en la app móvil', () {
    expect(buildUser('Administrador').isAdmin, isTrue);
    expect(buildUser('Administrador').isMobileRole, isTrue);
  });

  test('acepta rol Docente en la app móvil', () {
    expect(buildUser('Docente').isDocente, isTrue);
    expect(buildUser('Docente').isMobileRole, isTrue);
  });

  test('acepta rol Supervisor en la app móvil multirrol', () {
    final UserSession supervisor = buildUser('Supervisor');

    expect(supervisor.isSupervisor, isTrue);
    expect(supervisor.isMobileRole, isTrue);
    expect(supervisor.isAdmin, isFalse);
    expect(supervisor.isDocente, isFalse);
  });
}
