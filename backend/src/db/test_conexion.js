// src/db/test_conexion.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'unsaac',
  password: String(process.env.DB_PASSWORD || 'elvis0308').replace(/"/g, ''),
  port: Number(process.env.DB_PORT) || 5432,
});

async function probarPersistencia() {
  try {
    const res = await pool.query('SELECT NOW() AS fecha_actual, current_database() AS base_datos;');
    console.log('✅ Conexión exitosa a la Base de Datos');
    console.log('📌 Base de datos conectada:', res.rows[0].base_datos);
    console.log('⏰ Fecha/Hora del servidor DB:', res.rows[0].fecha_actual);
  } catch (err) {
    console.error('❌ Error de conexión/persistencia con PostgreSQL:', err.message);
  } finally {
    await pool.end();
  }
}

probarPersistencia();