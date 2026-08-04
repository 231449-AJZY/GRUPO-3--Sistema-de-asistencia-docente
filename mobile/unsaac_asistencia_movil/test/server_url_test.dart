import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/core/server_url.dart';

void main() {
  group('normalizeServerUrl', () {
    test('usa HTTPS cuando falta el esquema', () {
      expect(
        normalizeServerUrl('192.168.100.16:3443'),
        'https://192.168.100.16:3443',
      );
    });

    test('retira api y barras finales', () {
      expect(
        normalizeServerUrl(
          'https://192.168.100.16:3443/api/',
        ),
        'https://192.168.100.16:3443',
      );
    });

    test('usa el servidor HTTPS predeterminado si está vacío', () {
      expect(normalizeServerUrl('  '), defaultServerUrl);
    });
  });

  group('migrateServerUrl', () {
    test('migra el servidor HTTP anterior del POCO', () {
      expect(
        migrateServerUrl('http://192.168.100.16:3000'),
        defaultServerUrl,
      );
    });

    test('migra el servidor local original del prototipo', () {
      expect(
        migrateServerUrl('http://192.168.1.100:3000'),
        defaultServerUrl,
      );
    });

    test('conserva el servidor HTTPS institucional', () {
      expect(
        migrateServerUrl(defaultServerUrl),
        defaultServerUrl,
      );
    });
  });
}
