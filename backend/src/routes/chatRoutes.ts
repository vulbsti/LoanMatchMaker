import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { chatRateLimit } from '../middleware/security';
import { validateRequest, validateSession } from '../middleware/validation';
import { ChatMessageSchema, SessionCreateSchema } from '../models/schemas';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const chatController = new ChatController();

// Apply rate limiting to all chat routes
router.use(chatRateLimit);

// POST /api/chat/message - Process user messages through dual-agent system
router.post('/message', 
  validateRequest(ChatMessageSchema),
  validateSession,
  asyncHandler(chatController.processMessage.bind(chatController))
);

// GET /api/chat/history/:sessionId - Retrieve conversation history
router.get('/history/:sessionId',
  validateSession,
  asyncHandler(chatController.getHistory.bind(chatController))
);

// POST /api/chat/session - Initialize new chat session
router.post('/session',
  validateRequest(SessionCreateSchema),
  asyncHandler(chatController.createSession.bind(chatController))
);

// DELETE /api/chat/session/:sessionId - End session and cleanup
router.delete('/session/:sessionId',
  validateSession,
  asyncHandler(chatController.endSession.bind(chatController))
);

export default router;