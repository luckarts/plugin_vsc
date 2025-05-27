import * as vscode from 'vscode';
import { 
  IStructuralAnalyzer, 
  ICodeChunk, 
  IContextualSearchConfig, 
  IStructuralInfo, 
  CodeChunkType,
  ContextualRetrievalException 
} from './types';

/**
 * Analyzes structural aspects of code for contextual retrieval
 * Considers code type, language, complexity, and relationships
 */
export class StructuralAnalyzer implements IStructuralAnalyzer {
  private symbolCache: Map<string, ICodeChunk[]> = new Map();
  private languageWeights: Map<string, number> = new Map();

  constructor() {
    this.initializeLanguageWeights();
  }

  /**
   * Calculate structural score based on code characteristics
   * @param chunk Code chunk to analyze
   * @param query Search query
   * @param config Configuration for structural scoring
   * @returns Structural score (0-1)
   */
  calculateStructuralScore(chunk: ICodeChunk, query: string, config: IContextualSearchConfig): number {
    const structuralInfo = this.analyzeCodeStructure(chunk);
    let score = 0.5; // Base score

    // Language bonus
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && chunk.language === activeEditor.document.languageId) {
      score += config.sameLanguageBonus;
    }

    // Type-based scoring
    score += this.getTypeScore(chunk.type, config);

    // Complexity scoring (moderate complexity is often more relevant)
    score += this.getComplexityScore(structuralInfo.complexity);

    // Export/Import relevance
    if (structuralInfo.isExported) {
      score += 0.1; // Exported symbols are often more important
    }

    // Documentation bonus
    if (structuralInfo.hasDocumentation) {
      score += 0.1; // Well-documented code is often more relevant
    }

    // Query-specific structural analysis
    score += this.analyzeQueryStructuralRelevance(chunk, query);

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Analyze the structural characteristics of a code chunk
   * @param chunk Code chunk to analyze
   * @returns Structural information
   */
  analyzeCodeStructure(chunk: ICodeChunk): IStructuralInfo {
    const content = chunk.content.toLowerCase();
    
    return {
      chunkType: chunk.type,
      language: chunk.language,
      complexity: chunk.metadata.complexity || this.calculateComplexity(chunk.content),
      isExported: this.isExported(chunk),
      isImported: this.isImported(chunk),
      hasDocumentation: this.hasDocumentation(chunk.content)
    };
  }

  /**
   * Get related symbols based on a symbol name
   * @param symbolName Name of the symbol to find relations for
   * @returns Array of related code chunks
   */
  async getRelatedSymbols(symbolName: string): Promise<ICodeChunk[]> {
    // Check cache first
    if (this.symbolCache.has(symbolName)) {
      return this.symbolCache.get(symbolName)!;
    }

    const relatedChunks: ICodeChunk[] = [];

    try {
      // Use VSCode's symbol provider to find related symbols
      const workspaceSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeWorkspaceSymbolProvider',
        symbolName
      );

      if (workspaceSymbols) {
        for (const symbol of workspaceSymbols) {
          // Convert VSCode symbol to our code chunk format
          const chunk = await this.symbolToCodeChunk(symbol);
          if (chunk) {
            relatedChunks.push(chunk);
          }
        }
      }

      // Cache the result
      this.symbolCache.set(symbolName, relatedChunks);

    } catch (error) {
      console.error(`Failed to get related symbols for ${symbolName}:`, error);
    }

    return relatedChunks;
  }

  /**
   * Find structurally similar code chunks
   * @param referenceChunk Reference chunk to find similarities for
   * @param allChunks All available chunks to search through
   * @returns Array of similar chunks with similarity scores
   */
  findSimilarStructures(
    referenceChunk: ICodeChunk, 
    allChunks: ICodeChunk[]
  ): Array<{chunk: ICodeChunk, similarity: number}> {
    const referenceInfo = this.analyzeCodeStructure(referenceChunk);
    const similarities: Array<{chunk: ICodeChunk, similarity: number}> = [];

    for (const chunk of allChunks) {
      if (chunk.id === referenceChunk.id) {
        continue; // Skip self
      }

      const chunkInfo = this.analyzeCodeStructure(chunk);
      const similarity = this.calculateStructuralSimilarity(referenceInfo, chunkInfo);
      
      if (similarity > 0.3) { // Only include meaningful similarities
        similarities.push({ chunk, similarity });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Analyze query for structural hints
   * @param query Search query
   * @returns Structural hints found in the query
   */
  analyzeQueryStructure(query: string): {
    mentionedTypes: CodeChunkType[];
    mentionedLanguages: string[];
    mentionedSymbols: string[];
    isLookingForFunction: boolean;
    isLookingForClass: boolean;
    isLookingForInterface: boolean;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Detect mentioned types
    const mentionedTypes: CodeChunkType[] = [];
    if (lowerQuery.includes('function') || lowerQuery.includes('method')) {
      mentionedTypes.push(CodeChunkType.FUNCTION);
    }
    if (lowerQuery.includes('class')) {
      mentionedTypes.push(CodeChunkType.CLASS);
    }
    if (lowerQuery.includes('interface')) {
      mentionedTypes.push(CodeChunkType.INTERFACE);
    }
    if (lowerQuery.includes('variable') || lowerQuery.includes('const') || lowerQuery.includes('let')) {
      mentionedTypes.push(CodeChunkType.VARIABLE);
    }

    // Detect mentioned languages
    const mentionedLanguages: string[] = [];
    const languageKeywords = ['typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'go', 'rust'];
    for (const lang of languageKeywords) {
      if (lowerQuery.includes(lang)) {
        mentionedLanguages.push(lang);
      }
    }

    // Extract potential symbol names (camelCase or PascalCase words)
    const symbolPattern = /\b[a-z][a-zA-Z0-9]*\b|\b[A-Z][a-zA-Z0-9]*\b/g;
    const mentionedSymbols = query.match(symbolPattern) || [];

    return {
      mentionedTypes,
      mentionedLanguages,
      mentionedSymbols: [...new Set(mentionedSymbols)], // Remove duplicates
      isLookingForFunction: lowerQuery.includes('function') || lowerQuery.includes('method'),
      isLookingForClass: lowerQuery.includes('class'),
      isLookingForInterface: lowerQuery.includes('interface')
    };
  }

  /**
   * Get structural score based on chunk type
   */
  private getTypeScore(type: CodeChunkType, config: IContextualSearchConfig): number {
    switch (type) {
      case CodeChunkType.FUNCTION:
        return config.functionTypeBonus;
      case CodeChunkType.CLASS:
        return config.classTypeBonus;
      case CodeChunkType.INTERFACE:
        return 0.15;
      case CodeChunkType.TYPE:
        return 0.1;
      case CodeChunkType.VARIABLE:
        return 0.05;
      default:
        return 0;
    }
  }

  /**
   * Get complexity score (moderate complexity is often most relevant)
   */
  private getComplexityScore(complexity: number): number {
    if (complexity < 2) return 0.05; // Too simple
    if (complexity <= 5) return 0.15; // Good complexity
    if (complexity <= 10) return 0.1; // Moderate complexity
    return 0.05; // Too complex
  }

  /**
   * Analyze query for structural relevance to a specific chunk
   */
  private analyzeQueryStructuralRelevance(chunk: ICodeChunk, query: string): number {
    const queryStructure = this.analyzeQueryStructure(query);
    let relevanceScore = 0;

    // Type matching
    if (queryStructure.mentionedTypes.includes(chunk.type)) {
      relevanceScore += 0.2;
    }

    // Language matching
    if (queryStructure.mentionedLanguages.includes(chunk.language)) {
      relevanceScore += 0.15;
    }

    // Symbol name matching
    const chunkContent = chunk.content.toLowerCase();
    for (const symbol of queryStructure.mentionedSymbols) {
      if (chunkContent.includes(symbol.toLowerCase())) {
        relevanceScore += 0.1;
      }
    }

    // Function name matching
    if (chunk.metadata.functionName) {
      for (const symbol of queryStructure.mentionedSymbols) {
        if (chunk.metadata.functionName.toLowerCase().includes(symbol.toLowerCase())) {
          relevanceScore += 0.15;
        }
      }
    }

    // Class name matching
    if (chunk.metadata.className) {
      for (const symbol of queryStructure.mentionedSymbols) {
        if (chunk.metadata.className.toLowerCase().includes(symbol.toLowerCase())) {
          relevanceScore += 0.15;
        }
      }
    }

    return Math.min(0.3, relevanceScore); // Cap at 0.3
  }

  /**
   * Calculate structural similarity between two code structures
   */
  private calculateStructuralSimilarity(info1: IStructuralInfo, info2: IStructuralInfo): number {
    let similarity = 0;

    // Type similarity
    if (info1.chunkType === info2.chunkType) {
      similarity += 0.3;
    }

    // Language similarity
    if (info1.language === info2.language) {
      similarity += 0.2;
    }

    // Complexity similarity (closer complexity = higher similarity)
    const complexityDiff = Math.abs(info1.complexity - info2.complexity);
    const complexitySimilarity = Math.max(0, 1 - (complexityDiff / 10));
    similarity += complexitySimilarity * 0.2;

    // Export/Import similarity
    if (info1.isExported === info2.isExported) {
      similarity += 0.1;
    }
    if (info1.isImported === info2.isImported) {
      similarity += 0.1;
    }

    // Documentation similarity
    if (info1.hasDocumentation === info2.hasDocumentation) {
      similarity += 0.1;
    }

    return Math.min(1.0, similarity);
  }

  /**
   * Calculate complexity of code content
   */
  private calculateComplexity(content: string): number {
    const complexityPatterns = [
      /if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /&&|\|\|/g,
      /\?.*:/g // Ternary operators
    ];

    let complexity = 1; // Base complexity
    
    for (const pattern of complexityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Check if a chunk represents an exported symbol
   */
  private isExported(chunk: ICodeChunk): boolean {
    const content = chunk.content;
    return /export\s+(default\s+)?(class|function|const|let|var|interface|type)/i.test(content) ||
           /module\.exports\s*=/i.test(content);
  }

  /**
   * Check if a chunk contains imports
   */
  private isImported(chunk: ICodeChunk): boolean {
    return chunk.type === CodeChunkType.IMPORT ||
           /import\s+.*from/i.test(chunk.content) ||
           /require\s*\(/i.test(chunk.content);
  }

  /**
   * Check if a chunk has documentation
   */
  private hasDocumentation(content: string): boolean {
    return /\/\*\*[\s\S]*?\*\//g.test(content) || // JSDoc
           /"""[\s\S]*?"""/g.test(content) || // Python docstring
           /'''[\s\S]*?'''/g.test(content) || // Python docstring
           /^\s*#.*$/gm.test(content); // Comments
  }

  /**
   * Convert VSCode symbol to code chunk
   */
  private async symbolToCodeChunk(symbol: vscode.SymbolInformation): Promise<ICodeChunk | null> {
    try {
      const document = await vscode.workspace.openTextDocument(symbol.location.uri);
      const range = symbol.location.range;
      const content = document.getText(range);

      return {
        id: `symbol_${symbol.name}_${Date.now()}`,
        filePath: symbol.location.uri.fsPath,
        content,
        startLine: range.start.line,
        endLine: range.end.line,
        language: document.languageId,
        type: this.symbolKindToChunkType(symbol.kind),
        metadata: {
          functionName: symbol.kind === vscode.SymbolKind.Function ? symbol.name : undefined,
          className: symbol.kind === vscode.SymbolKind.Class ? symbol.name : undefined,
          lastModified: Date.now()
        }
      };

    } catch (error) {
      console.error('Failed to convert symbol to code chunk:', error);
      return null;
    }
  }

  /**
   * Convert VSCode symbol kind to our chunk type
   */
  private symbolKindToChunkType(kind: vscode.SymbolKind): CodeChunkType {
    switch (kind) {
      case vscode.SymbolKind.Function:
      case vscode.SymbolKind.Method:
        return CodeChunkType.FUNCTION;
      case vscode.SymbolKind.Class:
        return CodeChunkType.CLASS;
      case vscode.SymbolKind.Interface:
        return CodeChunkType.INTERFACE;
      case vscode.SymbolKind.Variable:
      case vscode.SymbolKind.Constant:
        return CodeChunkType.VARIABLE;
      default:
        return CodeChunkType.BLOCK;
    }
  }

  /**
   * Initialize language weights for scoring
   */
  private initializeLanguageWeights(): void {
    this.languageWeights.set('typescript', 1.0);
    this.languageWeights.set('javascript', 0.9);
    this.languageWeights.set('python', 0.8);
    this.languageWeights.set('java', 0.7);
    this.languageWeights.set('csharp', 0.7);
    this.languageWeights.set('cpp', 0.6);
    this.languageWeights.set('c', 0.6);
    this.languageWeights.set('go', 0.6);
    this.languageWeights.set('rust', 0.6);
  }

  /**
   * Clear symbol cache
   */
  clearCache(): void {
    this.symbolCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; symbols: string[] } {
    return {
      entries: this.symbolCache.size,
      symbols: Array.from(this.symbolCache.keys())
    };
  }
}
