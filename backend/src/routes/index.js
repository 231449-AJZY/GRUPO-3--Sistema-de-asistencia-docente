const router = require('express').Router();

const authRoutes       = require('./auth.routes');
const docentesRoutes   = require('./docentes.routes');
const asistenciaRoutes = require('./asistencia.routes');

router.use('/auth',       authRoutes);
router.use('/docentes',   docentesRoutes);
router.use('/asistencia', asistenciaRoutes);

// Próximas rutas:
// router.use('/horarios', horariosRoutes);
// router.use('/reportes', reportesRoutes);

module.exports = router;
