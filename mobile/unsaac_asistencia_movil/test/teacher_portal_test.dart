import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/teacher_portal.dart';

void main() {
  test('interpreta un horario docente real', () {
    final TeacherSchedule schedule = TeacherSchedule.fromJson(
      <String, dynamic>{
        'id': 15,
        'curso_codigo': 'IS-101',
        'curso': 'Ingeniería de Software',
        'aula': 'A-204',
        'dia_semana': 3,
        'hora_inicio': '08:00:00',
        'hora_fin': '10:00:00',
        'semestre': '2026-I',
        'activo': true,
      },
    );

    expect(schedule.dayName, 'Miércoles');
    expect(schedule.startTime, '08:00');
    expect(schedule.courseName, 'Ingeniería de Software');
  });

  test('interpreta historial con método QR dinámico', () {
    final TeacherAttendanceItem item = TeacherAttendanceItem.course(
      <String, dynamic>{
        'fecha': '2026-07-23T00:00:00.000Z',
        'hora_registro': '08:03:00',
        'estado': 'PRESENTE',
        'curso': 'Ingeniería de Software',
        'aula': 'A-204',
        'metodo_verificacion': 'QR_DINAMICO',
      },
    );

    expect(item.date, '2026-07-23');
    expect(item.time, '08:03');
    expect(item.verificationMethod, 'QR_DINAMICO');
    expect(item.isCourse, isTrue);
  });

  test('interpreta respuesta de marcación QR', () {
    final QrAttendanceOutcome outcome = QrAttendanceOutcome.fromJson(
      <String, dynamic>{
        'registrada': true,
        'duplicada': false,
        'objetivo': 'CURSO',
        'estado': 'PRESENTE',
        'fecha': '2026-07-23',
        'hora_servidor': '08:02:00',
        'mensaje': 'Asistencia por QR registrada como PRESENTE.',
        'curso': <String, dynamic>{
          'nombre': 'Ingeniería de Software',
          'aula': 'A-204',
        },
      },
    );

    expect(outcome.registered, isTrue);
    expect(outcome.courseName, 'Ingeniería de Software');
    expect(outcome.serverTime, '08:02');
  });
}
