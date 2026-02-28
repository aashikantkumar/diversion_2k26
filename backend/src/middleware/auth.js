// ============================================
// AUTH MIDDLEWARE — Verify Auth0 JWT
// ============================================
// Attaches req.auth = { sub, payload } to every authenticated request

const { auth } = require("express-oauth2-jwt-bearer");
const config = require("../config");

/**
 * Protects any route with Auth0 JWT verification.
 * Usage: router.get('/protected', requireAuth, handler)
 *
 * On success: req.auth.payload.sub = 'auth0|userId'
 * On fail:    returns 401 Unauthorized
 */
const requireAuth = auth({
    audience: config.AUTH0_AUDIENCE,
    issuerBaseURL: config.AUTH0_DOMAIN,
    tokenSigningAlg: "RS256",
});

module.exports = { requireAuth };
