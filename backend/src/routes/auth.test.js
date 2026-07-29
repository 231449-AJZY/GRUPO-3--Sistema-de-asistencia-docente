const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Importamos el middleware oficial del proyecto base
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// Servidor de pruebas Express aislado
const app = express();
app.use(express.json());
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_para_pruebas_123';

// Ruta ficticia para testear las restricciones de Supervisor
app.get('/api/test/supervisor', autenticar, soloRol('Supervisor', 'Administrador'), (req, res) => {
  res.status(200).json({ ok: true, mensaje: 'Acceso autorizado al modulo de supervisor' });
});

describe('Pruebas Unitarias de Autenticación y Autorización (soloRol)', () => {

  test('1. Debe denegar el acceso (401) si no se envía ningún Token', async () => {
    const res = await request(app).get('/api/test/supervisor');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token requerido');
  });

  test('2. Debe denegar el acceso (403) si el usuario tiene rol Docente', async () => {
    const tokenDocente = jwt.sign(
      { id: 10, rol: 'Docente', nombres: 'Juan Docente' },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get('/api/test/supervisor')
      .set('Authorization', `Bearer ${tokenDocente}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Sin permiso para este recurso');
  });

  test('3. Debe permitir el acceso (200) si el usuario tiene rol Supervisor', async () => {
    const tokenSupervisor = jwt.sign(
      { id: 20, rol: 'Supervisor', nombres: 'Carlos Supervisor' },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get('/api/test/supervisor')
      .set('Authorization', `Bearer ${tokenSupervisor}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('4. Debe permitir el acceso usando el token de servidor interno (Next.js SSR)', async () => {
    const res = await request(app)
      .get('/api/test/supervisor')
      .set('Authorization', 'Bearer internal-server-token');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

});

