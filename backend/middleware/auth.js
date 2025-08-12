const { auth } = require('../firebase');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return res.status(401).json({ error: 'Missing Authorization header' });
  try {
    const idToken = match[1];
    const token = await auth.verifyIdToken(idToken);
    req.user = { uid: token.uid, token };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authMiddleware };
