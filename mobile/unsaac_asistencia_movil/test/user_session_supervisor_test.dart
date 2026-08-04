import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/user_session.dart';

void main() {
  test('Supervisor es un rol móvil autorizado', () {
    const UserSession session = UserSession(
      id: 9,
      nombres: 'Sofía',
      apellidos: 'Supervisor',
      email: 'supervisor@unsaac.edu.pe',
      codigo: 'SUP-001',
      rol: 'Supervisor',
    );

    expect(session.isSupervisor, isTrue);
    expect(session.isMobileRole, isTrue);
    expect(session.isAdmin, isFalse);
    expect(session.isDocente, isFalse);
  });
}
