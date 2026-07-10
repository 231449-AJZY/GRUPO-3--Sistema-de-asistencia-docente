const router = require('express').Router();

const authRoutes       = require('./auth.routes');
const docentesRoutes   = require('./docentes.routes');
const asistenciaRoutes = require('./asistencia.routes');
const dashboardRoutes  = require('./dashboard.routes');

router.use('/auth',       authRoutes);
router.use('/docentes',   docentesRoutes);
router.use('/asistencia', asistenciaRoutes);
router.use('/dashboard',  dashboardRoutes);

module.exports = router;
