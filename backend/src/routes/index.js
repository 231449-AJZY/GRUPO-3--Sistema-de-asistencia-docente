const router = require('express').Router();

const authRoutes       = require('./auth.routes');
const docentesRoutes   = require('./docentes.routes');
const asistenciaRoutes = require('./asistencia.routes');
const dashboardRoutes  = require('./dashboard.routes');
const rolesRoutes      = require('./roles.routes');
const alertasRoutes    = require('./alertas.routes');

router.use('/auth',       authRoutes);
router.use('/docentes',   docentesRoutes);
router.use('/asistencia', asistenciaRoutes);
router.use('/dashboard',  dashboardRoutes);
router.use('/roles',      rolesRoutes);
router.use('/alertas',    alertasRoutes);

module.exports = router;
