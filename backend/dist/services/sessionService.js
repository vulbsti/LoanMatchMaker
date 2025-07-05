"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
class SessionService {
    constructor(database) {
        this.database = database;
    }
    async createSession(userAgent, ipAddress) {
        try {
            const result = await this.database.query(`INSERT INTO user_sessions (user_agent, ip_address) 
         VALUES ($1, $2) 
         RETURNING id`, [userAgent, ipAddress]);
            const sessionId = result.rows[0].id;
            await this.database.query(`INSERT INTO parameter_tracking (session_id) VALUES ($1)`, [sessionId]);
            await this.database.query(`INSERT INTO loan_parameters (session_id) VALUES ($1)`, [sessionId]);
            return sessionId;
        }
        catch (error) {
            console.error('Session creation error:', error);
            throw new Error('Failed to create session');
        }
    }
    async getSessionData(sessionId) {
        try {
            const sessionResult = await this.database.query(`SELECT * FROM user_sessions WHERE id = $1 AND status = 'active'`, [sessionId]);
            if (sessionResult.rows.length === 0) {
                throw (0, errorHandler_1.createNotFoundError)('Session');
            }
            const session = {
                id: sessionResult.rows[0].id,
                createdAt: sessionResult.rows[0].created_at,
                updatedAt: sessionResult.rows[0].updated_at,
                expiresAt: sessionResult.rows[0].expires_at,
                status: sessionResult.rows[0].status,
                userAgent: sessionResult.rows[0].user_agent,
                ipAddress: sessionResult.rows[0].ip_address,
            };
            const trackingResult = await this.database.query(`SELECT * FROM parameter_tracking WHERE session_id = $1`, [sessionId]);
            const tracking = trackingResult.rows[0] ? {
                sessionId: trackingResult.rows[0].session_id,
                loanAmountCollected: trackingResult.rows[0].loan_amount_collected,
                annualIncomeCollected: trackingResult.rows[0].annual_income_collected,
                employmentStatusCollected: trackingResult.rows[0].employment_status_collected,
                creditScoreCollected: trackingResult.rows[0].credit_score_collected,
                loanPurposeCollected: trackingResult.rows[0].loan_purpose_collected,
                completionPercentage: trackingResult.rows[0].completion_percentage,
                updatedAt: trackingResult.rows[0].updated_at,
            } : {
                sessionId,
                loanAmountCollected: false,
                annualIncomeCollected: false,
                employmentStatusCollected: false,
                creditScoreCollected: false,
                loanPurposeCollected: false,
                completionPercentage: 0,
                updatedAt: new Date(),
            };
            const parametersResult = await this.database.query(`SELECT * FROM loan_parameters WHERE session_id = $1`, [sessionId]);
            const parameters = {};
            if (parametersResult.rows.length > 0) {
                const row = parametersResult.rows[0];
                if (row.loan_amount)
                    parameters.loanAmount = row.loan_amount;
                if (row.annual_income)
                    parameters.annualIncome = row.annual_income;
                if (row.employment_status)
                    parameters.employmentStatus = row.employment_status;
                if (row.credit_score)
                    parameters.creditScore = row.credit_score;
                if (row.loan_purpose)
                    parameters.loanPurpose = row.loan_purpose;
                if (row.debt_to_income_ratio)
                    parameters.debtToIncomeRatio = row.debt_to_income_ratio;
                if (row.employment_duration)
                    parameters.employmentDuration = row.employment_duration;
            }
            const historyResult = await this.database.query(`SELECT * FROM conversation_history 
         WHERE session_id = $1 
         ORDER BY created_at ASC`, [sessionId]);
            const conversationHistory = historyResult.rows.map(row => ({
                id: row.id,
                sessionId: row.session_id,
                messageType: row.message_type,
                content: row.content,
                agentType: row.agent_type,
                metadata: row.metadata,
                createdAt: row.created_at,
            }));
            return {
                session,
                parameters,
                tracking,
                conversationHistory,
            };
        }
        catch (error) {
            console.error('Get session data error:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            throw new Error('Failed to retrieve session data');
        }
    }
    async updateSession(sessionId) {
        try {
            await this.database.query(`UPDATE user_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [sessionId]);
        }
        catch (error) {
            console.error('Session update error:', error);
            throw new Error('Failed to update session');
        }
    }
    async endSession(sessionId) {
        try {
            await this.database.query(`UPDATE user_sessions SET status = 'completed' WHERE id = $1`, [sessionId]);
        }
        catch (error) {
            console.error('Session end error:', error);
            throw new Error('Failed to end session');
        }
    }
    async cleanupExpiredSessions() {
        try {
            await this.database.query(`UPDATE user_sessions 
         SET status = 'expired' 
         WHERE expires_at < CURRENT_TIMESTAMP AND status = 'active'`);
        }
        catch (error) {
            console.error('Session cleanup error:', error);
            throw new Error('Failed to cleanup expired sessions');
        }
    }
    async validateSession(sessionId) {
        try {
            const result = await this.database.query(`SELECT id FROM user_sessions 
         WHERE id = $1 AND status = 'active' AND expires_at > CURRENT_TIMESTAMP`, [sessionId]);
            return result.rows.length > 0;
        }
        catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }
    async getSessionStats() {
        try {
            const result = await this.database.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_sessions,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_duration_minutes
        FROM user_sessions 
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `);
            return result.rows[0];
        }
        catch (error) {
            console.error('Session stats error:', error);
            throw new Error('Failed to get session statistics');
        }
    }
}
exports.SessionService = SessionService;
//# sourceMappingURL=sessionService.js.map