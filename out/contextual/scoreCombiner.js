"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreCombiner = void 0;
const types_1 = require("./types");
/**
 * Combines different scoring components into a final relevance score
 * Handles normalization and ranking of search results
 */
class ScoreCombiner {
    /**
     * Combine multiple scores into a final weighted score
     * @param scores Individual relevance scores
     * @param config Configuration with weights
     * @returns Combined final score (0-1)
     */
    combineScores(scores, config) {
        // Validate weights sum to 1.0
        const totalWeight = config.semanticWeight + config.temporalWeight +
            config.spatialWeight + config.structuralWeight;
        if (Math.abs(totalWeight - 1.0) > 0.001) {
            throw new types_1.ContextualRetrievalException('combineScores', `Weights must sum to 1.0, got ${totalWeight}`);
        }
        // Calculate weighted combination
        const combinedScore = (scores.semantic * config.semanticWeight) +
            (scores.temporal * config.temporalWeight) +
            (scores.spatial * config.spatialWeight) +
            (scores.structural * config.structuralWeight);
        // Apply non-linear transformation to enhance score separation
        const enhancedScore = this.enhanceScoreSeparation(combinedScore);
        // Store the combined score
        scores.combined = enhancedScore;
        return Math.max(0, Math.min(1, enhancedScore));
    }
    /**
     * Normalize scores across all results to improve ranking
     * @param results Array of search results
     * @returns Normalized results
     */
    normalizeScores(results) {
        if (results.length === 0) {
            return results;
        }
        // Find min and max scores for each component
        const scoreStats = this.calculateScoreStatistics(results);
        // Normalize each score component
        for (const result of results) {
            result.scores.semantic = this.normalizeScore(result.scores.semantic, scoreStats.semantic.min, scoreStats.semantic.max);
            result.scores.temporal = this.normalizeScore(result.scores.temporal, scoreStats.temporal.min, scoreStats.temporal.max);
            result.scores.spatial = this.normalizeScore(result.scores.spatial, scoreStats.spatial.min, scoreStats.spatial.max);
            result.scores.structural = this.normalizeScore(result.scores.structural, scoreStats.structural.min, scoreStats.structural.max);
            // Recalculate final score with normalized components
            result.finalScore = result.scores.combined;
        }
        return results;
    }
    /**
     * Rank results by final score and assign rank numbers
     * @param results Array of search results
     * @returns Ranked results
     */
    rankResults(results) {
        // Sort by final score (descending)
        const sortedResults = results.sort((a, b) => b.finalScore - a.finalScore);
        // Assign ranks
        sortedResults.forEach((result, index) => {
            result.rank = index + 1;
        });
        return sortedResults;
    }
    /**
     * Apply advanced scoring strategies
     * @param results Array of search results
     * @param config Configuration
     * @returns Results with advanced scoring applied
     */
    applyAdvancedScoring(results, config) {
        // Apply diversity bonus to avoid too many results from the same file
        results = this.applyDiversityBonus(results);
        // Apply recency boost for recently modified files
        results = this.applyRecencyBoost(results, config);
        // Apply quality indicators boost
        results = this.applyQualityBoost(results);
        return results;
    }
    /**
     * Filter results based on minimum thresholds
     * @param results Array of search results
     * @param config Configuration with thresholds
     * @returns Filtered results
     */
    filterResults(results, config) {
        return results.filter(result => {
            // Minimum semantic threshold
            if (result.scores.semantic < config.minSemanticThreshold) {
                return false;
            }
            // Minimum final score threshold
            if (result.finalScore < config.minFinalScore) {
                return false;
            }
            return true;
        });
    }
    /**
     * Get detailed scoring explanation for debugging
     * @param result Search result to explain
     * @param config Configuration used
     * @returns Detailed explanation
     */
    explainScoring(result, config) {
        const explanation = [
            `Scoring breakdown for: ${result.chunk.filePath}:${result.chunk.startLine}`,
            ``,
            `Component Scores:`,
            `  Semantic:    ${result.scores.semantic.toFixed(3)} (weight: ${config.semanticWeight})`,
            `  Temporal:    ${result.scores.temporal.toFixed(3)} (weight: ${config.temporalWeight})`,
            `  Spatial:     ${result.scores.spatial.toFixed(3)} (weight: ${config.spatialWeight})`,
            `  Structural:  ${result.scores.structural.toFixed(3)} (weight: ${config.structuralWeight})`,
            ``,
            `Weighted Contributions:`,
            `  Semantic:    ${(result.scores.semantic * config.semanticWeight).toFixed(3)}`,
            `  Temporal:    ${(result.scores.temporal * config.temporalWeight).toFixed(3)}`,
            `  Spatial:     ${(result.scores.spatial * config.spatialWeight).toFixed(3)}`,
            `  Structural:  ${(result.scores.structural * config.structuralWeight).toFixed(3)}`,
            ``,
            `Final Score: ${result.finalScore.toFixed(3)}`,
            `Rank: ${result.rank}`
        ];
        return explanation.join('\n');
    }
    /**
     * Calculate statistics for score normalization
     */
    calculateScoreStatistics(results) {
        const semanticScores = results.map(r => r.scores.semantic);
        const temporalScores = results.map(r => r.scores.temporal);
        const spatialScores = results.map(r => r.scores.spatial);
        const structuralScores = results.map(r => r.scores.structural);
        return {
            semantic: this.getScoreStats(semanticScores),
            temporal: this.getScoreStats(temporalScores),
            spatial: this.getScoreStats(spatialScores),
            structural: this.getScoreStats(structuralScores)
        };
    }
    /**
     * Get statistics for a set of scores
     */
    getScoreStats(scores) {
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return { min, max, avg };
    }
    /**
     * Normalize a single score using min-max normalization
     */
    normalizeScore(score, min, max) {
        if (max === min) {
            return 0.5; // All scores are the same
        }
        return (score - min) / (max - min);
    }
    /**
     * Enhance score separation using non-linear transformation
     */
    enhanceScoreSeparation(score) {
        // Apply sigmoid-like transformation to enhance separation
        // This makes high scores higher and low scores lower
        const enhanced = Math.pow(score, 1.5);
        return Math.max(0, Math.min(1, enhanced));
    }
    /**
     * Apply diversity bonus to avoid clustering results from same file
     */
    applyDiversityBonus(results) {
        const fileCount = new Map();
        // Count results per file
        for (const result of results) {
            const filePath = result.chunk.filePath;
            fileCount.set(filePath, (fileCount.get(filePath) || 0) + 1);
        }
        // Apply penalty for files with many results
        for (const result of results) {
            const filePath = result.chunk.filePath;
            const count = fileCount.get(filePath) || 1;
            if (count > 3) {
                // Apply diminishing returns for files with many results
                const penalty = Math.max(0.7, 1 - (count - 3) * 0.1);
                result.finalScore *= penalty;
            }
        }
        return results;
    }
    /**
     * Apply recency boost for recently modified files
     */
    applyRecencyBoost(results, config) {
        const now = Date.now();
        const recentThreshold = config.recentModificationBonus;
        for (const result of results) {
            const lastModified = result.chunk.metadata.lastModified;
            const age = now - lastModified;
            if (age < recentThreshold) {
                // Apply recency boost
                const boost = 1 + (0.2 * (1 - age / recentThreshold));
                result.finalScore *= boost;
            }
        }
        return results;
    }
    /**
     * Apply quality boost based on code characteristics
     */
    applyQualityBoost(results) {
        for (const result of results) {
            let qualityMultiplier = 1.0;
            // Boost for exported functions/classes (likely more important)
            if (result.chunk.metadata.exports && result.chunk.metadata.exports.length > 0) {
                qualityMultiplier *= 1.1;
            }
            // Boost for well-documented code
            if (result.chunk.content.includes('/**') || result.chunk.content.includes('"""')) {
                qualityMultiplier *= 1.05;
            }
            // Boost for moderate complexity (not too simple, not too complex)
            const complexity = result.chunk.metadata.complexity || 1;
            if (complexity >= 3 && complexity <= 8) {
                qualityMultiplier *= 1.05;
            }
            result.finalScore *= qualityMultiplier;
        }
        return results;
    }
    /**
     * Create a default configuration for score combination
     */
    static createDefaultConfig() {
        return {
            // Weights (must sum to 1.0)
            semanticWeight: 0.4, // Semantic similarity is most important
            temporalWeight: 0.2, // Recent modifications are important
            spatialWeight: 0.25, // Proximity to active file matters
            structuralWeight: 0.15, // Code structure provides context
            // Temporal parameters
            recentModificationBonus: 5 * 60 * 1000, // 5 minutes
            temporalDecayFactor: 2.0,
            maxTemporalAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            // Spatial parameters
            sameFileBonus: 0.3,
            sameDirectoryBonus: 0.2,
            maxSpatialDistance: 10,
            // Structural parameters
            sameLanguageBonus: 0.2,
            functionTypeBonus: 0.15,
            classTypeBonus: 0.1,
            // Search parameters
            maxResults: 10,
            minSemanticThreshold: 0.3,
            minFinalScore: 0.2
        };
    }
}
exports.ScoreCombiner = ScoreCombiner;
//# sourceMappingURL=scoreCombiner.js.map