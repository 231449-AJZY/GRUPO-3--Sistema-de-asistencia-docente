import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/mobile_attendance.dart';

void main() {
  test('interpreta un desafío de curso', () {
    final MobileAttendanceChallenge challenge =
        MobileAttendanceChallenge.fromJson(<String, dynamic>{
          'id': 'cbe2da50-9021-4d7d-a884-5550bdb602a6',
          'contenido': '{"version":1}',
          'expira_en': '2026-07-22T12:00:30.000Z',
          'objetivo': 'CURSO',
          'docente': <String, dynamic>{
            'codigo': 'DOC-DEMO-001',
            'nombres': 'Lucía',
            'apellidos': 'Mendoza Quispe',
          },
          'curso': <String, dynamic>{
            'codigo': 'SIS-DEMO-01',
            'nombre': 'Programación',
            'aula': 'A-101',
          },
        });

    expect(challenge.teacherName, 'Lucía Mendoza Quispe');
    expect(challenge.courseName, 'Programación');
    expect(challenge.target, 'CURSO');
  });

  test('interpreta una asistencia registrada', () {
    final MobileAttendanceResult result = MobileAttendanceResult.fromJson(
      <String, dynamic>{
        'registrada': true,
        'duplicada': false,
        'firma_verificada': true,
        'objetivo': 'CURSO',
        'estado': 'PRESENTE',
        'fecha': '2026-07-22',
        'hora_servidor': '08:01:00',
        'mensaje': 'Asistencia registrada.',
        'docente': <String, dynamic>{
          'codigo': 'DOC-DEMO-001',
          'nombres': 'Lucía',
          'apellidos': 'Mendoza Quispe',
        },
        'curso': <String, dynamic>{'nombre': 'Programación'},
        'ingreso_institucional': <String, dynamic>{'nuevo': true},
        'asistencia_curso': <String, dynamic>{'nueva': true},
      },
    );

    expect(result.registered, isTrue);
    expect(result.signatureVerified, isTrue);
    expect(result.courseAttendanceCreated, isTrue);
  });
}
