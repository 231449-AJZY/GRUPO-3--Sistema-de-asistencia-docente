const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Importamos el middleware que creamos en el paso anterior
const { autenticar, soloRol } = require('./autorizacion.middleware');

// Configuración de un servidor Express ficticio para la prueba
const app = express();
app.use(express.json());
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_prueba_123';

// Ruta de prueba protegida solo para Administradores
app.get('/api/test-admin', autenticar, soloRol('Administrador'), (req, res) => {
  res.status(200).json({ OK: true });
});

describe('Pruebas Unitarias de Autorización (soloRol)', () => {
  
  test('Debería denegar el acceso (401) si no se envía el token', async () => {
    const response = await request(app).get('/api/test-admin');
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Token no proporcionado');
  });

  test('Debería denegar el acceso (403) si el rol no es Administrador (ej. Docente)', async () => {
    // Generamos un token simulando ser un Docente
    const tokenDocente = jwt.sign({ id: 1, rol: 'Docente' }, process.env.JWT_SECRET);

    const response = await request(app)
      .get('/api/test-admin')
      .set('Authorization', `Bearer ${tokenDocente}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('No tienes los permisos requeridos');
  });

  test('Debería permitir el acceso (200) si el rol es Administrador', async () => {
    // Generamos un token simulando ser Administrador
    const tokenAdmin = jwt.sign({ id: 2, rol: 'Administrador' }, process.env.JWT_SECRET);

    const response = await request(app)
      .get('/api/test-admin')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(response.status).toBe(200);
    expect(response.body.OK).toBe(true);
  });

});