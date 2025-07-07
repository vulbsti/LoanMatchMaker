"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const onnxAdapter_1 = require("../training/onnxAdapter");
class MatchmakingService {
    constructor(database) {
        this.database = database;
        this.useMLPredictions = true;
    }
    async findMatches(sessionId, userParams) {
        try {
            const lenders = await this.getAllLenders();
            const mlSetup = await onnxAdapter_1.onnxMLAdapter.checkSetup();
            if (this.useMLPredictions && mlSetup.isReady) {
                console.log('🤖 Using ONNX ML-based matching');
                return await this.findMatchesWithONNX(sessionId, userParams, lenders);
            }
            else {
                console.log('📋 Using rule-based matching (ONNX ML not available):', mlSetup.message);
                return await this.findMatchesRuleBased(sessionId, userParams, lenders);
            }
        }
        catch (error) {
            console.error('Find matches error:', error);
            throw new Error('Failed to find loan matches');
        }
    }
    async findMatchesWithONNX(sessionId, userParams, lenders) {
        try {
            console.log(`🧠 Running ML inference for user profile:`, {
                loanAmount: userParams.loanAmount,
                annualIncome: userParams.annualIncome,
                creditScore: userParams.creditScore,
                employmentStatus: userParams.employmentStatus,
                loanPurpose: userParams.loanPurpose
            });
            const userProfile = {
                loanAmount: userParams.loanAmount,
                annualIncome: userParams.annualIncome,
                creditScore: userParams.creditScore,
                employmentStatus: userParams.employmentStatus,
                loanPurpose: userParams.loanPurpose
            };
            const lenderData = lenders.map(lender => ({
                id: lender.id,
                name: lender.name,
                minLoanAmount: lender.minLoanAmount,
                maxLoanAmount: lender.maxLoanAmount,
                minIncome: lender.minIncome,
                employmentTypes: lender.employmentTypes,
                minCreditScore: lender.minCreditScore,
                interestRate: lender.interestRate,
                loanPurpose: lender.loanPurpose || undefined,
                specialEligibility: Boolean(lender.specialEligibility)
            }));
            const mlPredictions = await onnxAdapter_1.onnxMLAdapter.getTopRecommendations(userProfile, lenderData, 5);
            console.log(`🎯 ML generated ${mlPredictions.length} predictions`);
            const matches = mlPredictions.map((prediction, index) => {
                const originalLender = lenders.find(l => l.id === prediction.lenderId);
                if (!originalLender) {
                    throw new Error(`Lender ${prediction.lenderId} not found`);
                }
                const eligibilityScore = prediction.matchScore > 50 ? Math.min(85, 60 + prediction.matchScore * 0.4) : Math.max(30, prediction.matchScore);
                const qualityScore = Math.round(prediction.matchScore * 0.8);
                const affordabilityScore = Math.round(prediction.matchScore * 0.75);
                const specializationScore = Math.round(prediction.matchScore * 0.65);
                return {
                    ...originalLender,
                    eligibilityScore: Math.round(eligibilityScore),
                    qualityScore,
                    affordabilityScore,
                    specializationScore,
                    finalScore: Math.round(prediction.matchScore),
                    confidence: prediction.confidence,
                    reasons: prediction.reasons,
                    warnings: this.generateWarnings(userParams, originalLender),
                    rank: index + 1
                };
            });
            await this.storeMatchResults(sessionId, matches);
            console.log(`✅ ONNX ML matching completed with ${matches.length} matches`);
            return matches;
        }
        catch (error) {
            console.error('❌ ONNX ML matching error, falling back to rule-based:', error);
            return await this.findMatchesRuleBased(sessionId, userParams, lenders);
        }
    }
    generateWarnings(userParams, lender) {
        const warnings = [];
        if (userParams.loanAmount > lender.maxLoanAmount * 0.9) {
            warnings.push("You're requesting near the maximum loan amount");
        }
        const incomeRatio = userParams.annualIncome / lender.minIncome;
        if (incomeRatio < 1.5 && incomeRatio >= 1.0) {
            warnings.push("Your income just meets the minimum requirement");
        }
        const creditBuffer = userParams.creditScore - lender.minCreditScore;
        if (creditBuffer < 50 && creditBuffer >= 0) {
            warnings.push("Your credit score is close to the minimum requirement");
        }
        return warnings;
    }
    async findMatchesRuleBased(sessionId, userParams, lenders) {
        const scoredLenders = await Promise.all(lenders.map(async (lender) => {
            const scores = this.calculateLenderScore(userParams, lender);
            return {
                ...lender,
                ...scores,
                confidence: this.calculateConfidence(scores, userParams),
            };
        }));
        const eligibleLenders = scoredLenders.filter(l => l.eligibilityScore > 0);
        const sortedLenders = eligibleLenders.sort((a, b) => b.finalScore - a.finalScore);
        const topMatches = sortedLenders.slice(0, 3);
        await this.storeMatchResults(sessionId, topMatches);
        return topMatches;
    }
    generateMLReasons(matchScore) {
        const reasons = [];
        if (matchScore >= 80) {
            reasons.push("Excellent match based on ML analysis");
            reasons.push("High compatibility with your profile");
        }
        else if (matchScore >= 60) {
            reasons.push("Good match based on ML analysis");
            reasons.push("Suitable for your requirements");
        }
        else if (matchScore >= 40) {
            reasons.push("Fair match based on ML analysis");
            reasons.push("Meets basic eligibility criteria");
        }
        else {
            reasons.push("Basic eligibility match");
        }
        return reasons;
    }
    async getAllLenders() {
        try {
            const result = await this.database.query(`
        SELECT 
          id,
          name,
          interest_rate,
          min_loan_amount,
          max_loan_amount,
          min_income,
          min_credit_score,
          employment_types,
          loan_purpose,
          special_eligibility,
          processing_time_days,
          features
        FROM lenders
        ORDER BY name
      `);
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                interestRate: parseFloat(row.interest_rate),
                minLoanAmount: row.min_loan_amount,
                maxLoanAmount: row.max_loan_amount,
                minIncome: row.min_income,
                minCreditScore: row.min_credit_score,
                employmentTypes: row.employment_types,
                loanPurpose: row.loan_purpose,
                specialEligibility: row.special_eligibility,
                processingTimeDays: row.processing_time_days,
                features: row.features,
            }));
        }
        catch (error) {
            console.error('Get all lenders error:', error);
            throw new Error('Failed to retrieve lenders');
        }
    }
    calculateLenderScore(user, lender) {
        const eligibilityChecks = [
            user.loanAmount >= lender.minLoanAmount && user.loanAmount <= lender.maxLoanAmount,
            user.annualIncome >= lender.minIncome,
            user.creditScore >= lender.minCreditScore,
            lender.employmentTypes.includes(user.employmentStatus),
            !lender.loanPurpose || lender.loanPurpose === user.loanPurpose
        ];
        const passedChecks = eligibilityChecks.filter(Boolean).length;
        const eligibilityScore = (passedChecks / eligibilityChecks.length) * 100;
        if (passedChecks < 4) {
            return {
                eligibilityScore: 0,
                affordabilityScore: 0,
                specializationScore: 0,
                finalScore: 0,
                reasons: ['Does not meet basic eligibility requirements'],
            };
        }
        const affordabilityScore = this.calculateAffordabilityScore(lender.interestRate);
        const specializationScore = this.calculateSpecializationScore(user, lender);
        const finalScore = Math.round((eligibilityScore * 0.4) + (affordabilityScore * 0.35) + (specializationScore * 0.25));
        const reasons = this.generateReasons(user, lender, eligibilityChecks, affordabilityScore, specializationScore);
        return {
            eligibilityScore: Math.round(eligibilityScore),
            affordabilityScore: Math.round(affordabilityScore),
            specializationScore: Math.round(specializationScore),
            finalScore,
            reasons,
        };
    }
    calculateAffordabilityScore(interestRate) {
        const minRate = 2.99;
        const maxRate = 15.99;
        const normalizedScore = 100 * (1 - ((interestRate - minRate) / (maxRate - minRate)));
        return Math.max(0, Math.min(100, normalizedScore));
    }
    calculateSpecializationScore(user, lender) {
        let score = 50;
        if (lender.loanPurpose === user.loanPurpose) {
            score = 100;
        }
        if (lender.loanPurpose && lender.loanPurpose !== user.loanPurpose) {
            score = 20;
        }
        if (lender.specialEligibility && this.checkSpecialEligibility(user, lender)) {
            score = Math.min(100, score + 30);
        }
        if (lender.features) {
            if (user.creditScore >= 750 && lender.features.some(f => f.toLowerCase().includes('premium'))) {
                score = Math.min(100, score + 20);
            }
            if (user.loanAmount >= 100000 && lender.features.some(f => f.toLowerCase().includes('large'))) {
                score = Math.min(100, score + 15);
            }
        }
        return Math.max(0, Math.min(100, score));
    }
    checkSpecialEligibility(user, lender) {
        if (!lender.specialEligibility)
            return false;
        const specialEligibility = lender.specialEligibility.toLowerCase();
        if (specialEligibility.includes('high-income') && user.annualIncome >= 100000) {
            return true;
        }
        if (specialEligibility.includes('student') && user.loanPurpose === 'education') {
            return true;
        }
        if (specialEligibility.includes('veteran') || specialEligibility.includes('military')) {
            return false;
        }
        if (specialEligibility.includes('business') && user.employmentStatus === 'self-employed') {
            return true;
        }
        if (specialEligibility.includes('startup') && user.loanPurpose === 'startup') {
            return true;
        }
        if (specialEligibility.includes('eco') && user.loanPurpose === 'eco') {
            return true;
        }
        if (specialEligibility.includes('luxury') && user.loanPurpose === 'vehicle' && user.loanAmount >= 50000) {
            return true;
        }
        return false;
    }
    generateReasons(user, lender, eligibilityChecks, affordabilityScore, specializationScore) {
        const reasons = [];
        if (eligibilityChecks[0]) {
            reasons.push(`Loan amount $${user.loanAmount.toLocaleString()} is within their range ($${lender.minLoanAmount.toLocaleString()} - $${lender.maxLoanAmount.toLocaleString()})`);
        }
        if (eligibilityChecks[1]) {
            reasons.push(`Your income of $${user.annualIncome.toLocaleString()} meets their minimum requirement of $${lender.minIncome.toLocaleString()}`);
        }
        if (eligibilityChecks[2]) {
            reasons.push(`Your credit score of ${user.creditScore} exceeds their minimum of ${lender.minCreditScore}`);
        }
        if (eligibilityChecks[3]) {
            reasons.push(`They accept ${user.employmentStatus} applicants`);
        }
        if (affordabilityScore >= 80) {
            reasons.push(`Competitive interest rate of ${lender.interestRate}%`);
        }
        else if (affordabilityScore >= 60) {
            reasons.push(`Reasonable interest rate of ${lender.interestRate}%`);
        }
        if (lender.loanPurpose === user.loanPurpose) {
            reasons.push(`Specializes in ${user.loanPurpose} loans`);
        }
        if (lender.specialEligibility && this.checkSpecialEligibility(user, lender)) {
            reasons.push(`Special eligibility: ${lender.specialEligibility}`);
        }
        if (lender.features && lender.features.length > 0) {
            const topFeatures = lender.features.slice(0, 2);
            reasons.push(`Key features: ${topFeatures.join(', ')}`);
        }
        if (lender.processingTimeDays <= 3) {
            reasons.push(`Fast processing: ${lender.processingTimeDays} days`);
        }
        return reasons;
    }
    calculateConfidence(scores, user) {
        let confidence = scores.eligibilityScore;
        if (user.debtToIncomeRatio && user.debtToIncomeRatio < 0.4) {
            confidence = Math.min(100, confidence + 10);
        }
        if (user.employmentDuration && user.employmentDuration >= 24) {
            confidence = Math.min(100, confidence + 5);
        }
        if (scores.eligibilityScore < 90) {
            confidence *= 0.9;
        }
        return Math.round(Math.max(0, Math.min(100, confidence)));
    }
    async storeMatchResults(sessionId, matches) {
        try {
            await this.database.query(`DELETE FROM match_results WHERE session_id = $1`, [sessionId]);
            for (const match of matches) {
                await this.database.query(`INSERT INTO match_results 
           (session_id, lender_id, eligibility_score, affordability_score, specialization_score, final_score, match_reasons)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    sessionId,
                    match.id,
                    match.eligibilityScore,
                    match.affordabilityScore,
                    match.specializationScore,
                    match.finalScore,
                    match.reasons,
                ]);
            }
        }
        catch (error) {
            console.error('Store match results error:', error);
            throw new Error('Failed to store match results');
        }
    }
    async getMatchResults(sessionId) {
        try {
            const result = await this.database.query(`SELECT 
           mr.*,
           l.name,
           l.interest_rate,
           l.min_loan_amount,
           l.max_loan_amount,
           l.min_income,
           l.min_credit_score,
           l.employment_types,
           l.loan_purpose,
           l.special_eligibility,
           l.processing_time_days,
           l.features
         FROM match_results mr
         JOIN lenders l ON mr.lender_id = l.id
         WHERE mr.session_id = $1
         ORDER BY mr.final_score DESC`, [sessionId]);
            return result.rows.map(row => ({
                id: row.lender_id,
                name: row.name,
                interestRate: parseFloat(row.interest_rate),
                minLoanAmount: row.min_loan_amount,
                maxLoanAmount: row.max_loan_amount,
                minIncome: row.min_income,
                minCreditScore: row.min_credit_score,
                employmentTypes: row.employment_types,
                loanPurpose: row.loan_purpose,
                specialEligibility: row.special_eligibility,
                processingTimeDays: row.processing_time_days,
                features: row.features,
                eligibilityScore: row.eligibility_score,
                affordabilityScore: row.affordability_score,
                specializationScore: row.specialization_score,
                finalScore: row.final_score,
                reasons: row.match_reasons,
                confidence: this.calculateConfidence({
                    eligibilityScore: row.eligibility_score,
                    affordabilityScore: row.affordability_score,
                    specializationScore: row.specialization_score,
                    finalScore: row.final_score,
                    reasons: row.match_reasons,
                }, {}),
            }));
        }
        catch (error) {
            console.error('Get match results error:', error);
            throw new Error('Failed to retrieve match results');
        }
    }
    async getLenderById(id) {
        try {
            const result = await this.database.query(`SELECT * FROM lenders WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                interestRate: parseFloat(row.interest_rate),
                minLoanAmount: row.min_loan_amount,
                maxLoanAmount: row.max_loan_amount,
                minIncome: row.min_income,
                minCreditScore: row.min_credit_score,
                employmentTypes: row.employment_types,
                loanPurpose: row.loan_purpose,
                specialEligibility: row.special_eligibility,
                processingTimeDays: row.processing_time_days,
                features: row.features,
            };
        }
        catch (error) {
            console.error('Get lender by id error:', error);
            throw new Error('Failed to retrieve lender');
        }
    }
    async getMatchingStats() {
        try {
            const result = await this.database.query(`
        SELECT 
          COUNT(*) as total_matches,
          AVG(final_score) as average_score
        FROM match_results
        WHERE calculated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
      `);
            const topLendersResult = await this.database.query(`
        SELECT 
          l.name,
          COUNT(*) as match_count
        FROM match_results mr
        JOIN lenders l ON mr.lender_id = l.id
        WHERE mr.calculated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY l.id, l.name
        ORDER BY match_count DESC
        LIMIT 5
      `);
            return {
                totalMatches: parseInt(result.rows[0].total_matches || '0'),
                averageScore: parseFloat(result.rows[0].average_score || '0'),
                topLenders: topLendersResult.rows.map(row => ({
                    name: row.name,
                    matchCount: parseInt(row.match_count),
                })),
            };
        }
        catch (error) {
            console.error('Get matching stats error:', error);
            throw new Error('Failed to retrieve matching statistics');
        }
    }
}
exports.MatchmakingService = MatchmakingService;
//# sourceMappingURL=matchmakingService.js.map