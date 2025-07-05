import { Router } from 'express';
import { LoanController } from '../controllers/loanController';
import { matchRateLimit } from '../middleware/security';
import { validateRequest, validateSession, validateParameterValue } from '../middleware/validation';
import { MatchRequestSchema, ParameterUpdateSchema } from '../models/schemas';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const loanController = new LoanController();

// GET /api/loan/status/:sessionId - Get parameter collection status
router.get('/status/:sessionId',
  validateSession,
  asyncHandler(loanController.getStatus.bind(loanController))
);

// POST /api/loan/match - Trigger matchmaking process
router.post('/match',
  matchRateLimit,
  validateRequest(MatchRequestSchema),
  validateSession,
  asyncHandler(loanController.findMatches.bind(loanController))
);

// GET /api/loan/results/:sessionId - Retrieve match results
router.get('/results/:sessionId',
  validateSession,
  asyncHandler(loanController.getResults.bind(loanController))
);

// PUT /api/loan/parameters/:sessionId - Update specific parameter
router.put('/parameters/:sessionId',
  validateRequest(ParameterUpdateSchema),
  validateSession,
  validateParameterValue,
  asyncHandler(loanController.updateParameter.bind(loanController))
);

// GET /api/loan/lenders - Get all available lenders (for dev/testing)
router.get('/lenders',
  asyncHandler(loanController.getAllLenders.bind(loanController))
);

export default router;