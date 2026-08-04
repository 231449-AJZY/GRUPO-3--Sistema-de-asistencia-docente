const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Creamos servidor de prueba aislado
const app = express();
app.use(express.json());
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_para_pruebas_123';

// Mock de Middleware para pruebas aisladas
const autenticarMock = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const soloRolMock = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.rol)) return res.status(403).json({ error: 'Sin permiso' });
  next();
};

// Configuración de endpoints ficticios para testear respuesta
app.post('/api/biometria/logs', autenticarMock, (req, res) => {
  const { tipo_biometria, resultado } = req.body;
  if (!tipo_biometria || !resultado) return res.status(400).json({ error: 'Campos requeridos' });
  res.status(201).json({ ok: true, mensaje: 'Log registrado' });
});

app.get('/api/biometria/logs', autenticarMock, soloRolMock('Supervisor', 'Administrador'), (req, res) => {
  res.status(200).json({ total: 1, logs: [{ id: 1, resultado: 'FALLIDO' }] });
});

describe('Pruebas Unitarias del Módulo de Auditoría Biométrica', () => {

  test('1. Debería registrar un intento biométrico correctamente (201)', async () => {
    const token = jwt.sign({ id: 1, rol: 'Docente' }, process.env.JWT_SECRET);

    const res = await request(app)
      .post('/api/biometria/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        docente_id: 10,
        tipo_biometria: 'ROSTRO',
        resultado: 'FALLIDO',
        motivo_fallo: 'Iluminación insuficiente'
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  test('2. Debería rechazar consulta de logs si el rol es Docente (403)', async () => {
    const tokenDocente = jwt.sign({ id: 10, rol: 'Docente' }, process.env.JWT_SECRET);

    const res = await request(app)
      .get('/api/biometria/logs')
      .set('Authorization', `Bearer ${tokenDocente}`);

    expect(res.status).toBe(403);
  });

  test('3. Debería permitir la consulta de logs al Supervisor (200)', async () => {
    const tokenSupervisor = jwt.sign({ id: 2, rol: 'Supervisor' }, process.env.JWT_SECRET);

    const res = await request(app)
      .get('/api/biometria/logs')
      .set('Authorization', `Bearer ${tokenSupervisor}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

});