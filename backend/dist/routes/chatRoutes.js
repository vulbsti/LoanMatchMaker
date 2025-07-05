"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const security_1 = require("../middleware/security");
const validation_1 = require("../middleware/validation");
const schemas_1 = require("../models/schemas");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
const chatController = new chatController_1.ChatController();
router.use(security_1.chatRateLimit);
router.post('/message', (0, validation_1.validateRequest)(schemas_1.ChatMessageSchema), validation_1.validateSession, (0, errorHandler_1.asyncHandler)(chatController.processMessage.bind(chatController)));
router.get('/history/:sessionId', validation_1.validateSession, (0, errorHandler_1.asyncHandler)(chatController.getHistory.bind(chatController)));
router.post('/session', (0, validation_1.validateRequest)(schemas_1.SessionCreateSchema), (0, errorHandler_1.asyncHandler)(chatController.createSession.bind(chatController)));
router.delete('/session/:sessionId', validation_1.validateSession, (0, errorHandler_1.asyncHandler)(chatController.endSession.bind(chatController)));
exports.default = router;
//# sourceMappingURL=chatRoutes.js.map