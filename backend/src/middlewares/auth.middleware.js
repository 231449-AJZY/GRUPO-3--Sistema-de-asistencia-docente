const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token requerido' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function soloRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol))
      return res.status(403).json({ error: 'Sin permiso para este recurso' });
    next();
  };
}

module.exports = { autenticar, soloRol };