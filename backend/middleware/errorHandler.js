// ─── Centralized Error Handler ──────────────────────────────

const VALID_REGIONS = ["US", "GB", "IN", "JP", "BR", "DE", "FR", "KR", "GLOBAL"];
const VALID_DAYS = [1, 3, 5, 7];

/**
 * Wraps an async route handler to catch errors automatically
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Validate region code
 */
function validateRegion(region) {
    if (!region) return "US";
    const upper = region.toUpperCase();
    return VALID_REGIONS.includes(upper) ? upper : null;
}

/**
 * Validate days parameter
 */
function validateDays(days) {
    const num = parseInt(days);
    if (isNaN(num)) return 1;
    // Clamp to nearest valid value
    if (num <= 1) return 1;
    if (num <= 3) return 3;
    if (num <= 5) return 5;
    return 7;
}

/**
 * Validate required fields in request body
 */
function validateRequired(body, fields) {
    const missing = fields.filter(f => !body[f] && body[f] !== 0);
    if (missing.length > 0) {
        return `Missing required fields: ${missing.join(", ")}`;
    }
    return null;
}

/**
 * Global error handling middleware
 */
function errorMiddleware(err, req, res, _next) {
    console.error(`❌ [${req.method}] ${req.path}:`, err.message || err);

    // MySQL duplicate entry (e.g. duplicate email on INSERT)
    if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            error: "An account with this email already exists. Please sign in instead.",
            code: 409
        });
    }

    // MySQL connection error
    if (err.code === "ECONNREFUSED" || err.code === "ER_ACCESS_DENIED_ERROR") {
        return res.status(503).json({
            error: "Database connection unavailable. Please try again later.",
            code: 503
        });
    }

    // Generic server error
    const status = err.statusCode || 500;
    res.status(status).json({
        error: err.message || "An unexpected error occurred.",
        code: status
    });
}

module.exports = {
    asyncHandler,
    validateRegion,
    validateDays,
    validateRequired,
    errorMiddleware,
    VALID_REGIONS,
    VALID_DAYS
};
