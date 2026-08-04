const router = require('express').Router();

const authRoutes       = require('./auth.routes');
const docentesRoutes   = require('./docentes.routes');
const asistenciaRoutes = require('./asistencia.routes');
const dashboardRoutes  = require('./dashboard.routes');
const rolesRoutes      = require('./roles.routes');
const usuariosRoutes   = require('./usuarios.routes');
const horariosRoutes    = require('./horarios.routes');
const academicoRoutes    = require('./academico.routes');
const configuracionRoutes = require('./configuracion.routes');
const dispositivosRoutes = require('./dispositivos.routes');
const asistenciaMovilRoutes = require('./asistencia-movil.routes');
const estacionesBleRoutes = require('./estaciones-ble.routes');
const asistenciaOfflineRoutes = require('./asistencia-offline.routes');
const alertasRoutes = require('./alertas.routes');
const reportesRoutes = require('./reportes.routes');
const biometriaRoutes = require('./biometria.routes');

const notificacionesMovilRoutes = require('./notificaciones-movil.routes');

router.use('/auth',       authRoutes);
router.use('/docentes',   docentesRoutes);
router.use('/asistencia', asistenciaRoutes);
router.use('/dashboard',  dashboardRoutes);
router.use('/roles',      rolesRoutes);
router.use('/usuarios',   usuariosRoutes);
router.use('/horarios',     horariosRoutes);
router.use('/academico',    academicoRoutes);
router.use('/configuracion', configuracionRoutes);
router.use('/dispositivos', dispositivosRoutes);
router.use('/asistencia-movil', asistenciaMovilRoutes);
router.use('/estaciones-ble', estacionesBleRoutes);
router.use('/asistencia-offline', asistenciaOfflineRoutes);
router.use('/alertas', alertasRoutes);
router.use('/reportes', reportesRoutes);
router.use('/biometria', biometriaRoutes);

router.use('/notificaciones-movil', notificacionesMovilRoutes);

module.exports = router;