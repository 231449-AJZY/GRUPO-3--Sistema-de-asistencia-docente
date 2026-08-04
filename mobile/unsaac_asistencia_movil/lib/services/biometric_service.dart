import 'package:local_auth/local_auth.dart';

class BiometricStatus {
  const BiometricStatus({
    required this.supported,
    required this.enrolled,
    required this.types,
  });

  final bool supported;
  final bool enrolled;
  final List<String> types;
}

class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();

  Future<BiometricStatus> status() async {
    try {
      final bool supported = await _auth.isDeviceSupported();
      final bool enrolled = await _auth.canCheckBiometrics;
      final List<BiometricType> available = enrolled
          ? await _auth.getAvailableBiometrics()
          : <BiometricType>[];

      return BiometricStatus(
        supported: supported,
        enrolled: enrolled,
        types: available.map((BiometricType type) => type.name).toList(),
      );
    } on Object {
      return const BiometricStatus(
        supported: false,
        enrolled: false,
        types: <String>[],
      );
    }
  }

  Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason:
            'Confirme su identidad para continuar en UNSAAC Asistencia.',
        biometricOnly: true,
        sensitiveTransaction: true,
        persistAcrossBackgrounding: true,
      );
    } on Object {
      return false;
    }
  }
}
