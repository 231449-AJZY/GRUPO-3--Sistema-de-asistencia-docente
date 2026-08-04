import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _serverController;

  @override
  void initState() {
    super.initState();
    _serverController = TextEditingController(
      text: widget.controller.serverUrl,
    );
  }

  @override
  void dispose() {
    _serverController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final bool online = await widget.controller.saveServerUrl(
      _serverController.text,
    );

    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          online
              ? 'Servidor guardado y conectado correctamente.'
              : 'Dirección guardada. El servidor todavía no responde.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configuración del servidor')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: <Widget>[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  const Text(
                    'Dirección del backend',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Use la IP local de la computadora. Ejemplo: http://192.168.1.50:3000',
                    style: TextStyle(color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: _serverController,
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'URL del servidor',
                      prefixIcon: Icon(Icons.dns_outlined),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: widget.controller.busy ? null : _save,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Guardar y comprobar'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(18),
              child: Text(
                'Durante las pruebas, el celular y la PC deben estar en la misma red Wi-Fi. En producción se utilizará HTTPS.',
                style: TextStyle(color: Color(0xFF475569)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
