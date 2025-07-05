"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanController = void 0;
const sessionService_1 = require("../services/sessionService");
const parameterService_1 = require("../services/parameterService");
const matchmakingService_1 = require("../services/matchmakingService");
const database_1 = require("../config/database");
const config_1 = require("../config");
class LoanController {
    constructor() {
        this.database = new database_1.DatabaseService(config_1.config.database);
        this.sessionService = new sessionService_1.SessionService(this.database);
        this.parameterService = new parameterService_1.ParameterService(this.database);
        this.matchmakingService = new matchmakingService_1.MatchmakingService(this.database);
    }
    async getStatus(req, res) {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                const errorResponse = {
                    success: false,
                    error: 'Missing session ID',
                    message: 'Session ID is required',
                };
                res.status(400).json(errorResponse);
                return;
            }
            const isValidSession = await this.sessionService.validateSession(sessionId);
            if (!isValidSession) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid session',
                    message: 'Session not found or expired',
                };
                res.status(404).json(errorResponse);
                return;
            }
            const tracking = await this.parameterService.getTrackingStatus(sessionId);
            const parameters = await this.parameterService.getParameters(sessionId);
            const missingParameters = await this.parameterService.getMissingParameters(sessionId);
            const response = {
                success: true,
                data: {
                    sessionId,
                    completionPercentage: tracking.completionPercentage,
                    collectedParameters: parameters,
                    missingParameters,
                    tracking,
                    isComplete: tracking.completionPercentage === 100,
                },
                message: 'Parameter status retrieved successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Get status error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to retrieve parameter status',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async findMatches(req, res) {
        try {
            const { sessionId } = req.body;
            const isValidSession = await this.sessionService.validateSession(sessionId);
            if (!isValidSession) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid session',
                    message: 'Session not found or expired',
                };
                res.status(404).json(errorResponse);
                return;
            }
            const isComplete = await this.parameterService.isComplete(sessionId);
            if (!isComplete) {
                const missingParameters = await this.parameterService.getMissingParameters(sessionId);
                const errorResponse = {
                    success: false,
                    error: 'Incomplete parameters',
                    message: `Missing required parameters: ${missingParameters.join(', ')}`,
                };
                res.status(400).json(errorResponse);
                return;
            }
            const parameters = await this.parameterService.getParameters(sessionId);
            const matches = await this.matchmakingService.findMatches(sessionId, parameters);
            const response = {
                success: true,
                data: {
                    matches,
                    totalMatches: matches.length,
                    sessionId,
                    calculatedAt: new Date(),
                    parameters,
                },
                message: 'Loan matches calculated successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Find matches error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to find loan matches',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async getResults(req, res) {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                const errorResponse = {
                    success: false,
                    error: 'Missing session ID',
                    message: 'Session ID is required',
                };
                res.status(400).json(errorResponse);
                return;
            }
            const isValidSession = await this.sessionService.validateSession(sessionId);
            if (!isValidSession) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid session',
                    message: 'Session not found or expired',
                };
                res.status(404).json(errorResponse);
                return;
            }
            const matches = await this.matchmakingService.getMatchResults(sessionId);
            const response = {
                success: true,
                data: {
                    matches,
                    sessionId,
                    totalMatches: matches.length,
                },
                message: 'Match results retrieved successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Get results error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to retrieve match results',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async updateParameter(req, res) {
        try {
            const { sessionId } = req.params;
            const { parameter, value } = req.body;
            if (!sessionId) {
                const errorResponse = {
                    success: false,
                    error: 'Missing session ID',
                    message: 'Session ID is required',
                };
                res.status(400).json(errorResponse);
                return;
            }
            const isValidSession = await this.sessionService.validateSession(sessionId);
            if (!isValidSession) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid session',
                    message: 'Session not found or expired',
                };
                res.status(404).json(errorResponse);
                return;
            }
            await this.parameterService.updateParameter(sessionId, parameter, value);
            const tracking = await this.parameterService.getTrackingStatus(sessionId);
            const response = {
                success: true,
                data: {
                    sessionId,
                    parameter,
                    value,
                    updatedAt: new Date(),
                    completionPercentage: tracking.completionPercentage,
                    isComplete: tracking.completionPercentage === 100,
                },
                message: 'Parameter updated successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Update parameter error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to update parameter',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async getAllLenders(req, res) {
        try {
            const lenders = await this.matchmakingService.getAllLenders();
            const response = {
                success: true,
                data: {
                    lenders,
                    total: lenders.length,
                },
                message: 'Lenders retrieved successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Get all lenders error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to retrieve lenders',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async getLenderById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const errorResponse = {
                    success: false,
                    error: 'Missing lender ID',
                    message: 'Lender ID is required',
                };
                res.status(400).json(errorResponse);
                return;
            }
            const lenderId = parseInt(id);
            if (isNaN(lenderId)) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid lender ID',
                    message: 'Lender ID must be a number',
                };
                res.status(400).json(errorResponse);
                return;
            }
            const lender = await this.matchmakingService.getLenderById(lenderId);
            if (!lender) {
                const errorResponse = {
                    success: false,
                    error: 'Lender not found',
                    message: `No lender found with ID ${lenderId}`,
                };
                res.status(404).json(errorResponse);
                return;
            }
            const response = {
                success: true,
                data: {
                    lender,
                },
                message: 'Lender retrieved successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Get lender by ID error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to retrieve lender',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async getMatchingStats(req, res) {
        try {
            const stats = await this.matchmakingService.getMatchingStats();
            const response = {
                success: true,
                data: stats,
                message: 'Matching statistics retrieved successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Get matching stats error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to retrieve matching statistics',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async validateParameters(req, res) {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                const errorResponse = {
                    success: false,
                    error: 'Missing session ID',
                    message: 'Session ID is required',
                };
                res.status(400).json(errorResponse);
                return;
            }
            const isValidSession = await this.sessionService.validateSession(sessionId);
            if (!isValidSession) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid session',
                    message: 'Session not found or expired',
                };
                res.status(404).json(errorResponse);
                return;
            }
            const parameters = await this.parameterService.getParameters(sessionId);
            const tracking = await this.parameterService.getTrackingStatus(sessionId);
            const missingParameters = await this.parameterService.getMissingParameters(sessionId);
            const validation = {
                loanAmount: parameters.loanAmount ?
                    parameters.loanAmount >= 1000 && parameters.loanAmount <= 500000 : false,
                annualIncome: parameters.annualIncome ?
                    parameters.annualIncome > 0 : false,
                creditScore: parameters.creditScore ?
                    parameters.creditScore >= 300 && parameters.creditScore <= 850 : false,
                employmentStatus: parameters.employmentStatus ?
                    ['salaried', 'self-employed', 'freelancer', 'unemployed'].includes(parameters.employmentStatus) : false,
                loanPurpose: parameters.loanPurpose ?
                    ['home', 'auto', 'personal', 'business', 'education', 'debt-consolidation'].includes(parameters.loanPurpose) : false,
            };
            const isValid = Object.values(validation).every(Boolean) && missingParameters.length === 0;
            const response = {
                success: true,
                data: {
                    sessionId,
                    isValid,
                    validation,
                    parameters,
                    tracking,
                    missingParameters,
                    errors: isValid ? [] : Object.entries(validation)
                        .filter(([_, valid]) => !valid)
                        .map(([param, _]) => `Invalid ${param}`),
                },
                message: 'Parameter validation completed',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Validate parameters error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to validate parameters',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
}
exports.LoanController = LoanController;
//# sourceMappingURL=loanController.js.map