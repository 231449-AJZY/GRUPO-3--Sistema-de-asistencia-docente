module.exports = {
  apps: [{
    name: 'unsaac-api',
    script: 'server.js',
    cwd: '/opt/GRUPO-3--Sistema-de-asistencia-docente/backend',
    env: {
      PORT: 3000,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'unsaac_asistencia',
      DB_USER: 'unsaac_user',
      DB_PASSWORD: 'Admin2026#',
      JWT_SECRET: 'rolypavelnilsonsandrajuvenal'
    }
  }]
}
