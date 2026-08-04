import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/admin_mobile_device.dart';

void main() {
  test('interpreta un celular pendiente de autorización', () {
    final AdminMobileDevice device = AdminMobileDevice.fromJson(
      <String, dynamic>{
        'id': 25,
        'codigo_docente': 'DOC-1024',
        'nombres': 'Gabriel',
        'apellidos': 'Pérez Cahuana',
        'fabricante': 'Xiaomi',
        'modelo': '2407FPN8EG',
        'version_sistema': '15',
        'version_aplicacion': '0.9.1+18',
        'estado': 'PENDIENTE',
        'biometria_disponible': true,
        'tipos_biometria': 'FINGERPRINT',
      },
    );

    expect(device.id, 25);
    expect(device.teacherName, 'Gabriel Pérez Cahuana');
    expect(device.deviceLabel, 'Xiaomi 2407FPN8EG');
    expect(device.isPending, isTrue);
    expect(device.isAuthorized, isFalse);
  });

  test('interpreta el resumen administrativo', () {
    final AdminDeviceSummary summary = AdminDeviceSummary.fromJson(
      <String, dynamic>{
        'total': '4',
        'pendientes': 1,
        'autorizados': 2,
        'suspendidos': 1,
        'rechazados': 0,
        'revocados': 0,
      },
    );

    expect(summary.total, 4);
    expect(summary.pending, 1);
    expect(summary.authorized, 2);
    expect(summary.suspended, 1);
  });
}
