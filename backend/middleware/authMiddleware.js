// ─── JWT Authentication Middleware ──────────────────────────────
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "trendscope_fallback_secret";
const COOKIE_NAME = "vvw_auth_token";

/**
 * Cookie options for secure JWT storage
 */
function getCookieOptions(rememberMe = false) {
    return {
        httpOnly: true,       // Not accessible via JavaScript — prevents XSS token theft
        secure: process.env.NODE_ENV === "production",  // HTTPS only in production
        sameSite: "strict",   // Prevents CSRF
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000  // 30 days or 24 hours
    };
}

/**
 * Middleware: Require valid JWT token
 * Checks: 1) HttpOnly cookie  2) Authorization: Bearer header (fallback)
 * Attaches decoded user to req.user
 */
function requireAuth(req, res, next) {
    // 1. Check HttpOnly cookie first (most secure)
    let token = req.cookies && req.cookies[COOKIE_NAME];

    // 2. Fallback to Authorization header (for API testing / mobile apps)
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            error: "Authentication required. Please log in to access this feature.",
            code: 401
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch (err) {
        // Clear invalid cookie
        res.clearCookie(COOKIE_NAME, { path: "/" });

        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Session expired. Please log in again.",
                code: 401,
                expired: true
            });
        }
        return res.status(401).json({
            error: "Invalid authentication token.",
            code: 401
        });
    }
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user, rememberMe = false) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role || "user"
    };
    const expiresIn = rememberMe ? "30d" : (process.env.JWT_EXPIRY || "24h");
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Set the auth cookie on a response object
 */
function setAuthCookie(res, token, rememberMe = false) {
    res.cookie(COOKIE_NAME, token, getCookieOptions(rememberMe));
}

/**
 * Clear the auth cookie
 */
function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
}

/**
 * Middleware: Require Admin Role
 * Must be used AFTER requireAuth
 */
function isAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: "Forbidden. Admin access required.",
            code: 403
        });
    }
    next();
}

module.exports = { requireAuth, isAdmin, generateToken, setAuthCookie, clearAuthCookie, COOKIE_NAME };
