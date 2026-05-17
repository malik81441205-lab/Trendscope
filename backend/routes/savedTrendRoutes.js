const express = require("express");
const router = express.Router();
const savedTrendController = require("../controllers/savedTrendController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth } = require("../middleware/authMiddleware");

// All saved-trend routes require authentication
router.post("/", requireAuth, asyncHandler(savedTrendController.saveTrend));
router.get("/mine", requireAuth, asyncHandler(savedTrendController.getSavedTrends));
router.get("/mine/ids", requireAuth, asyncHandler(savedTrendController.getSavedIds));
router.delete("/:id", requireAuth, asyncHandler(savedTrendController.deleteSavedTrend));

module.exports = router;
