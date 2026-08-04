import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../controllers/app_controller.dart';

class QuickAttendanceScreen extends StatefulWidget {
  const QuickAttendanceScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<QuickAttendanceScreen> createState() => _QuickAttendanceScreenState();
}

class _QuickAttendanceScreenState extends State<QuickAttendanceScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _codeController = TextEditingController();
  QuickAttendanceOutcome? _outcome;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final QuickAttendanceOutcome outcome = await widget.controller
        .verifyQuickAttendance(_codeController.text);

    if (!mounted) {
      return;
    }

    setState(() => _outcome = outcome);
  }

  void _reset() {
    setState(() {
      _outcome = null;
      _codeController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Asistencia rápida')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 30),
        children: <Widget>[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(22),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const Align(
                      child: CircleAvatar(
                        radius: 38,
                        backgroundColor: Color(0xFF7A1631),
                        child: Icon(
                          Icons.fingerprint,
                          size: 45,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 17),
                    const Text(
                      'Código + estación BLE + huella',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 23,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      widget.controller.serverOnline
                          ? 'Con conexión: la app validará la estación y registrará la asistencia inmediatamente.'
                          : 'Sin conexión: la app validará la estación, solicitará la huella y guardará una marcación cifrada para sincronizarla después.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 22),
                    TextFormField(
                      controller: _codeController,
                      textCapitalization: TextCapitalization.characters,
                      inputFormatters: <TextInputFormatter>[
                        FilteringTextInputFormatter.allow(
                          RegExp(r'[A-Za-z0-9_-]'),
                        ),
                        LengthLimitingTextInputFormatter(30),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Código institucional',
                        hintText: 'Ejemplo: DOC-DEMO-001',
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                      validator: (String? value) =>
                          value == null || value.trim().length < 3
                          ? 'Ingrese un código institucional válido.'
                          : null,
                    ),
                    const SizedBox(height: 17),
                    FilledButton.icon(
                      onPressed: widget.controller.busy ? null : _verify,
                      icon: widget.controller.busy
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.bluetooth_searching),
                      label: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          widget.controller.scanningAttendanceBle
                              ? 'Buscando estación BLE cercana…'
                              : widget.controller.serverOnline
                              ? 'Buscar estación, firmar y registrar'
                              : 'Buscar estación, firmar y guardar offline',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_outcome != null) ...<Widget>[
            const SizedBox(height: 15),
            _OutcomeCard(outcome: _outcome!, onReset: _reset),
          ],
          const SizedBox(height: 15),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(17),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Icon(Icons.security, color: Color(0xFF1D4ED8)),
                  SizedBox(width: 11),
                  Expanded(
                    child: Text(
                      'La app combina estación BLE, clave privada en Android Keystore, biometría fuerte y una cola local cifrada. Al volver internet, el servidor valida firma, horario, reloj y presencia antes de aceptar la asistencia.',
                      style: TextStyle(color: Color(0xFF475569), height: 1.35),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OutcomeCard extends StatelessWidget {
  const _OutcomeCard({required this.outcome, required this.onReset});

  final QuickAttendanceOutcome outcome;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final bool duplicate = outcome.duplicate;
    final bool queued = outcome.queued;
    final Color color = outcome.registered
        ? const Color(0xFF047857)
        : queued
        ? const Color(0xFF1D4ED8)
        : duplicate
        ? const Color(0xFFB45309)
        : const Color(0xFFB91C1C);
    final Color background = outcome.registered
        ? const Color(0xFFECFDF5)
        : queued
        ? const Color(0xFFEFF6FF)
        : duplicate
        ? const Color(0xFFFFFBEB)
        : const Color(0xFFFEF2F2);
    final IconData icon = outcome.registered
        ? Icons.check_circle
        : queued
        ? Icons.cloud_off_outlined
        : duplicate
        ? Icons.info_outline
        : Icons.error_outline;
    final String title = outcome.registered
        ? 'Asistencia registrada'
        : queued
        ? 'Marcación guardada offline'
        : duplicate
        ? 'Asistencia ya registrada'
        : outcome.verified
        ? 'Firma verificada'
        : 'Marcación no completada';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Icon(icon, color: color, size: 42),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: color,
              fontSize: 19,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 9),
          Text(
            outcome.message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF475569), height: 1.4),
          ),
          if (outcome.teacherName != null) ...<Widget>[
            const SizedBox(height: 16),
            const Divider(),
            _DetailRow(label: 'Docente', value: outcome.teacherName!),
            if (outcome.teacherCode != null)
              _DetailRow(label: 'Código', value: outcome.teacherCode!),
            if (outcome.courseName != null)
              _DetailRow(label: 'Curso', value: outcome.courseName!),
            if (outcome.classroom != null)
              _DetailRow(label: 'Aula', value: outcome.classroom!),
            if (outcome.state != null)
              _DetailRow(label: 'Estado', value: outcome.state!),
            if (outcome.stationName != null)
              _DetailRow(label: 'Estación', value: outcome.stationName!),
            if (outcome.stationCode != null)
              _DetailRow(label: 'Código BLE', value: outcome.stationCode!),
            if (outcome.stationRssi != null)
              _DetailRow(
                label: 'Señal BLE',
                value:
                    '${outcome.stationRssi!.toStringAsFixed(1)} dBm · ${outcome.stationSamples ?? 0} muestras',
              ),
            if (outcome.date != null && outcome.serverTime != null)
              _DetailRow(
                label: outcome.offline ? 'Hora estimada' : 'Hora oficial',
                value: '${outcome.date} · ${outcome.serverTime}',
              ),
            if (outcome.offline)
              const _DetailRow(
                label: 'Modo',
                value: 'Sin conexión · cola cifrada',
              ),
            if (outcome.pendingCount != null)
              _DetailRow(label: 'Pendientes', value: '${outcome.pendingCount}'),
            _DetailRow(
              label: 'Firma',
              value: outcome.verified ? 'Verificada' : 'No verificada',
            ),
          ],
          const SizedBox(height: 16),
          OutlinedButton(onPressed: onReset, child: const Text('Finalizar')),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}
