import * as vscode from 'vscode';
import { VectorDatabase } from '../vectorDb';
import { TemporalAnalyzer } from './temporalAnalyzer';
import { SpatialAnalyzer } from './spatialAnalyzer';
import { StructuralAnalyzer } from './structuralAnalyzer';
import { ScoreCombiner } from './scoreCombiner';
import {
  IContextualRetriever,
  IContextualSearchResult,
  IContextualSearchConfig,
  IRelevanceScores,
  ICodeChunk,
  ContextualRetrievalException
} from './types';

/**
 * Main contextual retriever that combines semantic, temporal, spatial, and structural analysis
 * Provides intelligent code context for AI assistance
 */
export class ContextualRetriever implements IContextualRetriever {
  private readonly vectorDb: VectorDatabase;
  private readonly temporalAnalyzer: TemporalAnalyzer;
  private readonly spatialAnalyzer: SpatialAnalyzer;
  private readonly structuralAnalyzer: StructuralAnalyzer;
  private readonly scoreCombiner: ScoreCombiner;
  private readonly config: IContextualSearchConfig;

  constructor(
    vectorDb: VectorDatabase,
    storageUri: vscode.Uri,
    config?: Partial<IContextualSearchConfig>
  ) {
    this.vectorDb = vectorDb;
    this.temporalAnalyzer = new TemporalAnalyzer(storageUri);
    this.spatialAnalyzer = new SpatialAnalyzer();
    this.structuralAnalyzer = new StructuralAnalyzer();
    this.scoreCombiner = new ScoreCombiner();
    
    // Merge provided config with defaults
    this.config = {
      ...ScoreCombiner.createDefaultConfig(),
      ...config
    };
  }

  /**
   * Search for contextually relevant code chunks
   * @param query Search query
   * @param activeFilePath Currently active file path
   * @returns Array of contextually ranked results
   */
  async search(query: string, activeFilePath?: string): Promise<IContextualSearchResult[]> {
    try {
      // Step 1: Get semantic search results from vector database
      const semanticResults = await this.vectorDb.search(query, this.config.maxResults * 2);
      
      if (semanticResults.length === 0) {
        return [];
      }

      // Step 2: Analyze each result for contextual relevance
      const contextualResults: IContextualSearchResult[] = [];
      
      for (const semanticResult of semanticResults) {
        const relevanceScores = await this.analyzeCodeRelevance(
          semanticResult.chunk, 
          query, 
          activeFilePath
        );

        // Combine scores into final score
        const finalScore = this.scoreCombiner.combineScores(relevanceScores, this.config);

        contextualResults.push({
          chunk: semanticResult.chunk,
          scores: relevanceScores,
          finalScore,
          rank: 0 // Will be set during ranking
        });
      }

      // Step 3: Apply advanced scoring strategies
      let processedResults = this.scoreCombiner.applyAdvancedScoring(contextualResults, this.config);

      // Step 4: Normalize scores for better ranking
      processedResults = this.scoreCombiner.normalizeScores(processedResults);

      // Step 5: Filter results based on thresholds
      processedResults = this.scoreCombiner.filterResults(processedResults, this.config);

      // Step 6: Rank and limit results
      processedResults = this.scoreCombiner.rankResults(processedResults);
      
      return processedResults.slice(0, this.config.maxResults);

    } catch (error) {
      throw new ContextualRetrievalException('search', 'Failed to perform contextual search', error);
    }
  }

  /**
   * Analyze code relevance across all dimensions
   * @param chunk Code chunk to analyze
   * @param query Search query
   * @param activeFilePath Currently active file path
   * @returns Relevance scores
   */
  async analyzeCodeRelevance(
    chunk: ICodeChunk, 
    query: string, 
    activeFilePath?: string
  ): Promise<IRelevanceScores> {
    try {
      // Get semantic similarity (already calculated in vector search)
      const semanticScore = await this.calculateSemanticScore(chunk, query);

      // Calculate temporal score
      const temporalScore = this.temporalAnalyzer.calculateTemporalScore(
        chunk.metadata.lastModified, 
        this.config
      );

      // Calculate spatial score
      const spatialScore = activeFilePath 
        ? this.spatialAnalyzer.calculateSpatialScore(chunk.filePath, activeFilePath, this.config)
        : 0.5; // Neutral score when no active file

      // Calculate structural score
      const structuralScore = this.structuralAnalyzer.calculateStructuralScore(
        chunk, 
        query, 
        this.config
      );

      const scores: IRelevanceScores = {
        semantic: semanticScore,
        temporal: temporalScore,
        spatial: spatialScore,
        structural: structuralScore,
        combined: 0 // Will be calculated by score combiner
      };

      return scores;

    } catch (error) {
      throw new ContextualRetrievalException('analyzeCodeRelevance', 'Failed to analyze code relevance', error);
    }
  }

  /**
   * Get relevant context optimized for token limits
   * @param query Search query
   * @param maxTokens Maximum tokens to return
   * @returns Array of context strings
   */
  async getRelevantContext(query: string, maxTokens: number = 4000): Promise<string[]> {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      const activeFilePath = activeEditor?.document.fileName;

      // Get contextual search results
      const results = await this.search(query, activeFilePath);

      if (results.length === 0) {
        return [];
      }

      // Convert results to context strings with token management
      const contextStrings: string[] = [];
      let totalTokens = 0;
      const avgTokensPerChar = 0.25; // Rough estimate

      for (const result of results) {
        const contextString = this.formatContextString(result);
        const estimatedTokens = contextString.length * avgTokensPerChar;

        if (totalTokens + estimatedTokens > maxTokens) {
          break; // Stop adding context to stay within token limit
        }

        contextStrings.push(contextString);
        totalTokens += estimatedTokens;
      }

      return contextStrings;

    } catch (error) {
      throw new ContextualRetrievalException('getRelevantContext', 'Failed to get relevant context', error);
    }
  }

  /**
   * Update file modification time for temporal analysis
   * @param filePath Path to the modified file
   */
  async updateFileModificationTime(filePath: string): Promise<void> {
    try {
      await this.temporalAnalyzer.updateFileTimestamp(filePath);
    } catch (error) {
      throw new ContextualRetrievalException('updateFileModificationTime', `Failed to update modification time for ${filePath}`, error);
    }
  }

  /**
   * Get contextual search statistics
   * @returns Statistics about the contextual search system
   */
  async getSearchStats(): Promise<{
    temporal: any;
    spatial: any;
    structural: any;
    config: IContextualSearchConfig;
  }> {
    return {
      temporal: this.temporalAnalyzer.getTemporalStats(),
      spatial: this.spatialAnalyzer.getCacheStats(),
      structural: this.structuralAnalyzer.getCacheStats(),
      config: this.config
    };
  }

  /**
   * Explain why specific results were ranked as they were
   * @param query Search query
   * @param activeFilePath Currently active file path
   * @returns Detailed explanation of ranking
   */
  async explainRanking(query: string, activeFilePath?: string): Promise<string[]> {
    try {
      const results = await this.search(query, activeFilePath);
      const explanations: string[] = [];

      explanations.push(`Contextual Search Explanation for: "${query}"`);
      explanations.push(`Active File: ${activeFilePath || 'None'}`);
      explanations.push(`Configuration: Semantic(${this.config.semanticWeight}) + Temporal(${this.config.temporalWeight}) + Spatial(${this.config.spatialWeight}) + Structural(${this.config.structuralWeight})`);
      explanations.push('');

      for (let i = 0; i < Math.min(5, results.length); i++) {
        const result = results[i];
        explanations.push(`--- Result #${i + 1} ---`);
        explanations.push(this.scoreCombiner.explainScoring(result, this.config));
        explanations.push('');
      }

      return explanations;

    } catch (error) {
      return [`Failed to explain ranking: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }
  }

  /**
   * Get recently modified files for context prioritization
   * @param maxAge Maximum age in milliseconds
   * @returns Array of recently modified file paths
   */
  async getRecentlyModifiedFiles(maxAge: number = 60 * 60 * 1000): Promise<string[]> {
    return await this.temporalAnalyzer.getRecentlyModifiedFiles(maxAge);
  }

  /**
   * Get files near the active file for spatial context
   * @param activeFilePath Currently active file path
   * @param maxResults Maximum number of results
   * @returns Array of nearby files with scores
   */
  async getNearbyFiles(activeFilePath: string, maxResults: number = 10): Promise<Array<{path: string, score: number}>> {
    return await this.spatialAnalyzer.getRelevantFilesByProximity(activeFilePath, this.config, maxResults);
  }

  /**
   * Calculate semantic score for a chunk
   */
  private async calculateSemanticScore(chunk: ICodeChunk, query: string): Promise<number> {
    // This would typically use the embedding similarity from vector search
    // For now, we'll use a simple text similarity as fallback
    const chunkText = chunk.content.toLowerCase();
    const queryText = query.toLowerCase();
    
    // Simple keyword matching as fallback
    const queryWords = queryText.split(/\s+/);
    let matches = 0;
    
    for (const word of queryWords) {
      if (chunkText.includes(word)) {
        matches++;
      }
    }
    
    return Math.min(1.0, matches / queryWords.length);
  }

  /**
   * Format a search result into a context string
   */
  private formatContextString(result: IContextualSearchResult): string {
    const chunk = result.chunk;
    const filePath = chunk.filePath.split('/').pop() || chunk.filePath;
    
    let contextString = `// File: ${filePath} (Lines ${chunk.startLine}-${chunk.endLine})\n`;
    contextString += `// Relevance: ${(result.finalScore * 100).toFixed(1)}% `;
    contextString += `(Semantic: ${(result.scores.semantic * 100).toFixed(0)}%, `;
    contextString += `Temporal: ${(result.scores.temporal * 100).toFixed(0)}%, `;
    contextString += `Spatial: ${(result.scores.spatial * 100).toFixed(0)}%, `;
    contextString += `Structural: ${(result.scores.structural * 100).toFixed(0)}%)\n`;
    
    if (chunk.metadata.functionName) {
      contextString += `// Function: ${chunk.metadata.functionName}\n`;
    }
    
    if (chunk.metadata.className) {
      contextString += `// Class: ${chunk.metadata.className}\n`;
    }
    
    contextString += chunk.content;
    
    return contextString;
  }

  /**
   * Update configuration
   * @param newConfig New configuration to apply
   */
  updateConfig(newConfig: Partial<IContextualSearchConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): IContextualSearchConfig {
    return { ...this.config };
  }
}
