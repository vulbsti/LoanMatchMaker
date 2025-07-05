"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loanController_1 = require("../controllers/loanController");
const security_1 = require("../middleware/security");
const validation_1 = require("../middleware/validation");
const schemas_1 = require("../models/schemas");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
const loanController = new loanController_1.LoanController();
router.get('/status/:sessionId', validation_1.validateSession, (0, errorHandler_1.asyncHandler)(loanController.getStatus.bind(loanController)));
router.post('/match', security_1.matchRateLimit, (0, validation_1.validateRequest)(schemas_1.MatchRequestSchema), validation_1.validateSession, (0, errorHandler_1.asyncHandler)(loanController.findMatches.bind(loanController)));
router.get('/results/:sessionId', validation_1.validateSession, (0, errorHandler_1.asyncHandler)(loanController.getResults.bind(loanController)));
router.put('/parameters/:sessionId', (0, validation_1.validateRequest)(schemas_1.ParameterUpdateSchema), validation_1.validateSession, validation_1.validateParameterValue, (0, errorHandler_1.asyncHandler)(loanController.updateParameter.bind(loanController)));
router.get('/lenders', (0, errorHandler_1.asyncHandler)(loanController.getAllLenders.bind(loanController)));
exports.default = router;
//# sourceMappingURL=loanRoutes.js.map