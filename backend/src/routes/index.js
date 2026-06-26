const router = require('express').Router();

const authRoutes = require('./auth.routes');

// Registrar todas las rutas aquí
router.use('/auth', authRoutes);

// Cuando el equipo agregue más rutas, solo añadir aquí:
// router.use('/docentes',   docentesRoutes);
// router.use('/horarios',   horariosRoutes);
// router.use('/asistencia', asistenciaRoutes);
// router.use('/reportes',   reportesRoutes);

module.exports = router;