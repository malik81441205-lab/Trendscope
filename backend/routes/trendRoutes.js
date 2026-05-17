const express = require("express");
const router = express.Router();
const trendController = require("../controllers/trendController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth } = require("../middleware/authMiddleware");

// Public routes — homepage data
router.get("/trends", asyncHandler(trendController.getTrends));
router.get("/categories", asyncHandler(trendController.getCategories));
router.get("/trends/history", asyncHandler(trendController.getHistory));
router.get("/trends/compare", asyncHandler(trendController.getComparison));

// Protected routes — require authentication
// (none currently needed for trends, but kept for future structure)

module.exports = router;
