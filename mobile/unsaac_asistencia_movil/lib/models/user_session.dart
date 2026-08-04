class UserSession {
  const UserSession({
    required this.id,
    required this.nombres,
    required this.apellidos,
    required this.email,
    required this.codigo,
    required this.rol,
    this.docenteId,
  });

  final int id;
  final int? docenteId;
  final String nombres;
  final String apellidos;
  final String email;
  final String codigo;
  final String rol;

  String get nombreCompleto => '$nombres $apellidos'.trim();

  String get normalizedRole => rol.trim().toLowerCase();

  bool get isDocente => normalizedRole == 'docente';

  bool get isAdmin =>
      normalizedRole == 'administrador' || normalizedRole == 'admin';

  bool get isSupervisor => normalizedRole == 'supervisor';

  bool get isMobileRole => isDocente || isAdmin || isSupervisor;

  factory UserSession.fromJson(Map<String, dynamic> json) {
    int parseRequiredInt(Object? value) {
      if (value is int) {
        return value;
      }
      return int.tryParse(value?.toString() ?? '') ?? 0;
    }

    int? parseOptionalInt(Object? value) {
      if (value == null) {
        return null;
      }
      if (value is int) {
        return value;
      }
      return int.tryParse(value.toString());
    }

    return UserSession(
      id: parseRequiredInt(json['usuario_id'] ?? json['id']),
      docenteId: parseOptionalInt(json['docente_id']),
      nombres: (json['nombres'] ?? '').toString(),
      apellidos: (json['apellidos'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      codigo: (json['codigo'] ?? '').toString(),
      rol: (json['rol'] ?? '').toString(),
    );
  }
}
