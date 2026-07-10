const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token requerido' });

  const token = auth.split(' ')[1];

  // Token interno para SSR de Next.js
  if (token === 'internal-server-token') {
    req.user = { id: 1, rol: 'Administrador', nombres: 'Sistema' };
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
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
