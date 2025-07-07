import { DatabaseService } from '../config/database';
import { LoanParameters, Lender, LenderMatch, ScoringResult } from '../models/interfaces';
import { LenderRow, MatchResultRow, MatchingStatsRow, LenderStatsRow } from '../models/database-types';
import { createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { mlAdapter } from '../training/mlAdapter';

export class MatchmakingService {
  private useMLPredictions: boolean = true; // Feature flag for ML vs rule-based

  constructor(private database: DatabaseService) {}

  async findMatches(sessionId: string, userParams: LoanParameters): Promise<LenderMatch[]> {
    try {
      // Get all lenders from database
      const lenders = await this.getAllLenders();
      
      // Check if ML model is available
      const mlSetup = await mlAdapter.checkSetup();
      
      if (this.useMLPredictions && mlSetup.isReady) {
        return await this.findMatchesWithML(sessionId, userParams, lenders);
      } else {
        console.log('Using rule-based matching (ML not available):', mlSetup.message);
        return await this.findMatchesRuleBased(sessionId, userParams, lenders);
      }
    } catch (error) {
      console.error('Find matches error:', error);
      throw new Error('Failed to find loan matches');
    }
  }

  /**
   * ML-based matching using trained model
   */
  private async findMatchesWithML(
    sessionId: string, 
    userParams: LoanParameters, 
    lenders: Lender[]
  ): Promise<LenderMatch[]> {
    try {
      // Convert user parameters to ML format
      const userProfile = {
        loanAmount: userParams.loanAmount,
        annualIncome: userParams.annualIncome,
        creditScore: userParams.creditScore,
        employmentStatus: userParams.employmentStatus,
        loanPurpose: userParams.loanPurpose
      };

      // Convert lenders to ML format
      const lenderData = lenders.map(lender => ({
        id: lender.id,
        name: lender.name,
        minLoanAmount: lender.minLoanAmount,
        maxLoanAmount: lender.maxLoanAmount,
        minIncome: lender.minIncome,
        employmentTypes: lender.employmentTypes,
        minCreditScore: lender.minCreditScore,
        interestRate: lender.interestRate,
        loanPurpose: lender.loanPurpose,
        specialEligibility: lender.specialEligibility
      }));

      // Get ML predictions
      const mlPredictions = await mlAdapter.getTopRecommendations(userProfile, lenderData, 5);

      // Convert ML predictions to LenderMatch format
      const matches: LenderMatch[] = mlPredictions.map((prediction, index) => {
        const originalLender = lenders.find(l => l.id === prediction.lenderId);
        if (!originalLender) {
          throw new Error(`Lender ${prediction.lenderId} not found`);
        }

        return {
          ...originalLender,
          eligibilityScore: prediction.matchScore > 50 ? 85 : 65, // Convert ML score to eligibility
          qualityScore: Math.round(prediction.matchScore * 0.8), // Scale ML score to quality
          affordabilityScore: Math.round(prediction.matchScore * 0.7), // ML-derived affordability
          specializationScore: Math.round(prediction.matchScore * 0.6), // ML-derived specialization
          finalScore: Math.round(prediction.matchScore),
          confidence: prediction.confidence || 0.8,
          reasons: prediction.reasons || this.generateMLReasons(prediction.matchScore),
          warnings: [], // ML doesn't generate warnings yet
          rank: index + 1
        };
      });

      // Store results in database
      await this.storeMatchResults(sessionId, matches);

      return matches;
    } catch (error) {
      console.error('ML matching error, falling back to rule-based:', error);
      return await this.findMatchesRuleBased(sessionId, userParams, lenders);
    }
  }

  /**
   * Rule-based matching (fallback)
   */
  private async findMatchesRuleBased(
    sessionId: string, 
    userParams: LoanParameters, 
    lenders: Lender[]
  ): Promise<LenderMatch[]> {
    // Calculate scores for each lender
    const scoredLenders = await Promise.all(
      lenders.map(async (lender) => {
        const scores = this.calculateLenderScore(userParams, lender);
        return {
          ...lender,
          ...scores,
          confidence: this.calculateConfidence(scores, userParams),
        };
      })
    );
    
    // Filter eligible lenders (must have eligibility score > 0)
    const eligibleLenders = scoredLenders.filter(l => l.eligibilityScore > 0);
    
    // Sort by final score descending
    const sortedLenders = eligibleLenders.sort((a, b) => b.finalScore - a.finalScore);
    
    // Get top 3 matches
    const topMatches = sortedLenders.slice(0, 3);
    
    // Store results in database
    await this.storeMatchResults(sessionId, topMatches);
    
    return topMatches;
  }

  /**
   * Generate reasons for ML predictions
   */
  private generateMLReasons(matchScore: number): string[] {
    const reasons = [];
    
    if (matchScore >= 80) {
      reasons.push("Excellent match based on ML analysis");
      reasons.push("High compatibility with your profile");
    } else if (matchScore >= 60) {
      reasons.push("Good match based on ML analysis");
      reasons.push("Suitable for your requirements");
    } else if (matchScore >= 40) {
      reasons.push("Fair match based on ML analysis");
      reasons.push("Meets basic eligibility criteria");
    } else {
      reasons.push("Basic eligibility match");
    }
    
    return reasons;
  }

  async getAllLenders(): Promise<Lender[]> {
    try {
      const result = await this.database.query<LenderRow>(`
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
    } catch (error) {
      console.error('Get all lenders error:', error);
      throw new Error('Failed to retrieve lenders');
    }
  }

  private calculateLenderScore(user: LoanParameters, lender: Lender): ScoringResult {
    // 1. Eligibility Score Calculation (40% weight)
    const eligibilityChecks = [
      user.loanAmount >= lender.minLoanAmount && user.loanAmount <= lender.maxLoanAmount,
      user.annualIncome >= lender.minIncome,
      user.creditScore >= lender.minCreditScore,
      lender.employmentTypes.includes(user.employmentStatus),
      !lender.loanPurpose || lender.loanPurpose === user.loanPurpose
    ];
    
    const passedChecks = eligibilityChecks.filter(Boolean).length;
    const eligibilityScore = (passedChecks / eligibilityChecks.length) * 100;
    
    // If critical eligibility fails, return 0 score
    if (passedChecks < 4) {
      return {
        eligibilityScore: 0,
        affordabilityScore: 0,
        specializationScore: 0,
        finalScore: 0,
        reasons: ['Does not meet basic eligibility requirements'],
      };
    }
    
    // 2. Affordability Score (35% weight) - Interest rate comparison
    const affordabilityScore = this.calculateAffordabilityScore(lender.interestRate);
    
    // 3. Specialization Score (25% weight)
    const specializationScore = this.calculateSpecializationScore(user, lender);
    
    // 4. Final Weighted Score
    const finalScore = Math.round(
      (eligibilityScore * 0.4) + (affordabilityScore * 0.35) + (specializationScore * 0.25)
    );
    
    // 5. Generate explanations
    const reasons = this.generateReasons(user, lender, eligibilityChecks, affordabilityScore, specializationScore);
    
    return {
      eligibilityScore: Math.round(eligibilityScore),
      affordabilityScore: Math.round(affordabilityScore),
      specializationScore: Math.round(specializationScore),
      finalScore,
      reasons,
    };
  }

  private calculateAffordabilityScore(interestRate: number): number {
    // Interest rate scoring - lower rates get higher scores
    // Typical range: 2.99% - 15.99%
    const minRate = 2.99;
    const maxRate = 15.99;
    
    // Normalize interest rate to 0-100 scale (inverted - lower rate = higher score)
    const normalizedScore = 100 * (1 - ((interestRate - minRate) / (maxRate - minRate)));
    
    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, normalizedScore));
  }

  private calculateSpecializationScore(user: LoanParameters, lender: Lender): number {
    let score = 50; // Default score for general lenders
    
    // Perfect match for loan purpose
    if (lender.loanPurpose === user.loanPurpose) {
      score = 100;
    }
    
    // Penalty for mismatched specific purpose
    if (lender.loanPurpose && lender.loanPurpose !== user.loanPurpose) {
      score = 20;
    }
    
    // Bonus for special eligibility
    if (lender.specialEligibility && this.checkSpecialEligibility(user, lender)) {
      score = Math.min(100, score + 30);
    }
    
    // Bonus for premium features matching user profile
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

  private checkSpecialEligibility(user: LoanParameters, lender: Lender): boolean {
    if (!lender.specialEligibility) return false;
    
    const specialEligibility = lender.specialEligibility.toLowerCase();
    
    // High-income earners
    if (specialEligibility.includes('high-income') && user.annualIncome >= 100000) {
      return true;
    }
    
    // Students
    if (specialEligibility.includes('student') && user.loanPurpose === 'education') {
      return true;
    }
    
    // Veterans
    if (specialEligibility.includes('veteran') || specialEligibility.includes('military')) {
      // This would require additional user data in a real application
      return false;
    }
    
    // Business owners
    if (specialEligibility.includes('business') && user.employmentStatus === 'self-employed') {
      return true;
    }
    
    // Startups
    if (specialEligibility.includes('startup') && user.loanPurpose === 'startup') {
      return true;
    }
    
    // Eco-friendly loans
    if (specialEligibility.includes('eco') && user.loanPurpose === 'eco') {
      return true;
    }
    
    // Luxury vehicles
    if (specialEligibility.includes('luxury') && user.loanPurpose === 'vehicle' && user.loanAmount >= 50000) {
      return true;
    }
    
    return false;
  }

  private generateReasons(
    user: LoanParameters, 
    lender: Lender, 
    eligibilityChecks: boolean[], 
    affordabilityScore: number, 
    specializationScore: number
  ): string[] {
    const reasons: string[] = [];
    
    // Eligibility reasons
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
    
    // Affordability reasons
    if (affordabilityScore >= 80) {
      reasons.push(`Competitive interest rate of ${lender.interestRate}%`);
    } else if (affordabilityScore >= 60) {
      reasons.push(`Reasonable interest rate of ${lender.interestRate}%`);
    }
    
    // Specialization reasons
    if (lender.loanPurpose === user.loanPurpose) {
      reasons.push(`Specializes in ${user.loanPurpose} loans`);
    }
    
    if (lender.specialEligibility && this.checkSpecialEligibility(user, lender)) {
      reasons.push(`Special eligibility: ${lender.specialEligibility}`);
    }
    
    // Feature highlights
    if (lender.features && lender.features.length > 0) {
      const topFeatures = lender.features.slice(0, 2);
      reasons.push(`Key features: ${topFeatures.join(', ')}`);
    }
    
    // Processing time
    if (lender.processingTimeDays <= 3) {
      reasons.push(`Fast processing: ${lender.processingTimeDays} days`);
    }
    
    return reasons;
  }

  private calculateConfidence(scores: ScoringResult, user: LoanParameters): number {
    // Base confidence on eligibility score
    let confidence = scores.eligibilityScore;
    
    // Boost confidence for complete user profiles
    if (user.debtToIncomeRatio && user.debtToIncomeRatio < 0.4) {
      confidence = Math.min(100, confidence + 10);
    }
    
    if (user.employmentDuration && user.employmentDuration >= 24) {
      confidence = Math.min(100, confidence + 5);
    }
    
    // Reduce confidence for borderline cases
    if (scores.eligibilityScore < 90) {
      confidence *= 0.9;
    }
    
    return Math.round(Math.max(0, Math.min(100, confidence)));
  }

  private async storeMatchResults(sessionId: string, matches: LenderMatch[]): Promise<void> {
    try {
      // Clear previous results for this session
      await this.database.query(
        `DELETE FROM match_results WHERE session_id = $1`,
        [sessionId]
      );
      
      // Insert new results
      for (const match of matches) {
        await this.database.query(
          `INSERT INTO match_results 
           (session_id, lender_id, eligibility_score, affordability_score, specialization_score, final_score, match_reasons)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            sessionId,
            match.id,
            match.eligibilityScore,
            match.affordabilityScore,
            match.specializationScore,
            match.finalScore,
            match.reasons,
          ]
        );
      }
    } catch (error) {
      console.error('Store match results error:', error);
      throw new Error('Failed to store match results');
    }
  }

  async getMatchResults(sessionId: string): Promise<LenderMatch[]> {
    try {
      const result = await this.database.query<MatchResultRow>(
        `SELECT 
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
         ORDER BY mr.final_score DESC`,
        [sessionId]
      );
      
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
        }, {} as LoanParameters), // Simplified for retrieval
      }));
    } catch (error) {
      console.error('Get match results error:', error);
      throw new Error('Failed to retrieve match results');
    }
  }

  async getLenderById(id: number): Promise<Lender | null> {
    try {
      const result = await this.database.query<LenderRow>(
        `SELECT * FROM lenders WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0]!;
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
    } catch (error) {
      console.error('Get lender by id error:', error);
      throw new Error('Failed to retrieve lender');
    }
  }

  async getMatchingStats(): Promise<{
    totalMatches: number;
    averageScore: number;
    topLenders: Array<{ name: string; matchCount: number }>;
  }> {
    try {
      const result = await this.database.query<MatchingStatsRow>(`
        SELECT 
          COUNT(*) as total_matches,
          AVG(final_score) as average_score
        FROM match_results
        WHERE calculated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
      `);
      
      const topLendersResult = await this.database.query<LenderStatsRow>(`
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
        totalMatches: parseInt(result.rows[0]!.total_matches || '0'),
        averageScore: parseFloat(result.rows[0]!.average_score || '0'),
        topLenders: topLendersResult.rows.map(row => ({
          name: row.name,
          matchCount: parseInt(row.match_count),
        })),
      };
    } catch (error) {
      console.error('Get matching stats error:', error);
      throw new Error('Failed to retrieve matching statistics');
    }
  }
}