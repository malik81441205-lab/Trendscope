// ─── Security Middleware ─────────────────────────────────────────────
const helmet = require("helmet");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");

// ─── Reserved Usernames ─────────────────────────────────────────────
const RESERVED_USERNAMES = [
    "admin", "administrator", "root", "system", "superadmin",
    "moderator", "mod", "support", "helpdesk", "trendscope",
    "vidvoyage", "api", "null", "undefined", "test"
];

// ─── Valid Countries List ───────────────────────────────────────────
const VALID_COUNTRIES = [
    "Afghanistan","Albania","Algeria","Argentina","Australia","Austria",
    "Bangladesh","Belgium","Brazil","Canada","Chile","China","Colombia",
    "Czech Republic","Denmark","Egypt","Ethiopia","Finland","France",
    "Germany","Ghana","Greece","Hungary","India","Indonesia","Iran",
    "Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan",
    "Kazakhstan","Kenya","Kuwait","Lebanon","Libya","Malaysia","Mexico",
    "Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria",
    "Norway","Oman","Pakistan","Palestine","Peru","Philippines","Poland",
    "Portugal","Qatar","Romania","Russia","Saudi Arabia","Singapore",
    "South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden",
    "Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia",
    "Turkey","UAE","Uganda","Ukraine","United Kingdom","United States",
    "Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"
];

// ─── Valid Genders ──────────────────────────────────────────────────
const VALID_GENDERS = ["male", "female", "other", "prefer_not_to_say"];

// ─── Username Validation ────────────────────────────────────────────
function validateUsername(name) {
    if (!name || typeof name !== "string") {
        return { valid: false, error: "Full name is required." };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: "Name must be at least 2 characters long." };
    }

    if (trimmed.length > 50) {
        return { valid: false, error: "Name must be less than 50 characters." };
    }

    // Must start with an alphabet
    if (!/^[a-zA-Z]/.test(trimmed)) {
        return { valid: false, error: "Name must start with a letter (e.g. Kashif123, not 123Kashif)." };
    }

    // Only allow alphabets, numbers, and spaces (for full names)
    if (!/^[a-zA-Z][a-zA-Z0-9 ]*$/.test(trimmed)) {
        return { valid: false, error: "Name can only contain letters, numbers, and spaces. No special characters allowed." };
    }

    // Check reserved names (case-insensitive, ignoring spaces)
    const normalized = trimmed.replace(/\s+/g, "").toLowerCase();
    if (RESERVED_USERNAMES.includes(normalized)) {
        return { valid: false, error: `The name "${trimmed}" is reserved and cannot be used.` };
    }

    return { valid: true, name: trimmed };
}

// ─── Email Validation ───────────────────────────────────────────────
function validateEmail(email) {
    if (!email || typeof email !== "string") {
        return { valid: false, error: "Email is required." };
    }
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: "Please enter a valid email address." };
    }
    if (trimmed.length > 255) {
        return { valid: false, error: "Email is too long." };
    }
    return { valid: true, email: trimmed };
}

// ─── Input Sanitizer (XSS Prevention) ──────────────────────────────
function sanitizeInput(str) {
    if (typeof str !== "string") return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
}

// Middleware to sanitize all string fields in req.body
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === "object") {
        for (const key of Object.keys(req.body)) {
            if (typeof req.body[key] === "string") {
                // Don't sanitize password fields (they need raw input for hashing)
                if (!key.toLowerCase().includes("password") && !key.toLowerCase().includes("token")) {
                    req.body[key] = sanitizeInput(req.body[key]);
                }
            }
        }
    }
    next();
}

// ─── Rate Limiters ──────────────────────────────────────────────────

// Global API rate limit (100 req/15min per IP)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limiter for login (10 attempts/15min per IP — brute-force protection)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limiter for signup (5 attempts/hour per IP)
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: "Too many signup attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

// Admin login limiter (5 attempts/15min)
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many admin login attempts. Account locked for 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false
});

// ─── Helmet Configuration ───────────────────────────────────────────
const helmetConfig = helmet({
    contentSecurityPolicy: false, // Disabled — we load external scripts (Google, Chart.js, Leaflet)
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

// ─── HPP (HTTP Parameter Pollution) ─────────────────────────────────
const hppProtection = hpp();

module.exports = {
    RESERVED_USERNAMES,
    VALID_COUNTRIES,
    VALID_GENDERS,
    validateUsername,
    validateEmail,
    sanitizeInput,
    sanitizeBody,
    globalLimiter,
    loginLimiter,
    signupLimiter,
    adminLoginLimiter,
    helmetConfig,
    hppProtection
};
