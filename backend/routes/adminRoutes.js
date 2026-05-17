const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth, isAdmin } = require("../middleware/authMiddleware");

// Apply authentication and admin authorization to all routes in this file
router.use(requireAuth, isAdmin);

// Overview Stats
router.get("/overview", asyncHandler(adminController.getOverviewStats));

// User Management
router.get("/users", asyncHandler(adminController.getUsers));
router.put("/users/:id/role", asyncHandler(adminController.updateUserRole));
router.delete("/users/:id", asyncHandler(adminController.deleteUser));

// Trend Monitoring
router.get("/monitoring", asyncHandler(adminController.getTrendMonitoring));

// Content Moderation
router.delete("/trends/:id", asyncHandler(adminController.deleteTrend));

// Activity Feed
router.get("/activity", asyncHandler(adminController.getActivityFeed));

// System Settings
router.get("/settings", asyncHandler(adminController.getSettings));
router.put("/settings", asyncHandler(adminController.updateSettings));

module.exports = router;
