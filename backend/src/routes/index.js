const router = require('express').Router();

const authRoutes     = require('./auth.routes');
const docentesRoutes = require('./docentes.routes');

router.use('/auth',     authRoutes);
router.use('/docentes', docentesRoutes);

// Próximas rutas:
// router.use('/horarios',   horariosRoutes);
// router.use('/asistencia', asistenciaRoutes);
// router.use('/reportes',   reportesRoutes);

module.exports = router;
