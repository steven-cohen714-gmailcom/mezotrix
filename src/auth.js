const bcrypt = require('bcryptjs');

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

async function login(req, res) {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const valid = bcrypt.compareSync(password, process.env.LOGIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  req.session.authenticated = true;
  res.json({ ok: true });
}

function logout(req, res) {
  req.session.destroy();
  res.json({ ok: true });
}

function me(req, res) {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true });
  }
  res.status(401).json({ authenticated: false });
}

module.exports = { requireAuth, login, logout, me };
