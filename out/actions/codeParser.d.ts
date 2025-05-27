import { ICodeParser, ICodeAction, ICodeBlock, ActionType, RiskLevel } from './types';
/**
 * Intelligent code parser that extracts actionable code suggestions from Claude responses
 * Identifies code blocks, determines action types, and assesses risk levels
 */
export declare class CodeParser implements ICodeParser {
    private readonly codeBlockRegex;
    private readonly filePathRegex;
    private readonly actionKeywords;
    /**
     * Parse code suggestions from Claude's response
     * @param content The full response content from Claude
     * @returns Array of actionable code actions
     */
    parseCodeSuggestions(content: string): Promise<ICodeAction[]>;
    /**
     * Extract code blocks from content
     * @param content Content to parse
     * @returns Array of code blocks
     */
    extractCodeBlocks(content: string): ICodeBlock[];
    /**
     * Detect the most appropriate action type for a code block
     * @param codeBlock The code block to analyze
     * @param context The surrounding context
     * @returns Detected action type
     */
    detectActionType(codeBlock: ICodeBlock, context: string): ActionType;
    /**
     * Estimate risk level for an action
     * @param action The action to assess
     * @returns Risk level
     */
    estimateRisk(action: ICodeAction): RiskLevel;
    /**
     * Generate a unique action ID
     */
    private generateActionId;
    /**
     * Generate a unique block ID
     */
    private generateBlockId;
    /**
     * Generate description for an action
     */
    private generateDescription;
    /**
     * Extract target file from block or context
     */
    private extractTargetFile;
    /**
     * Extract filename from description or code
     */
    private extractFilename;
    /**
     * Normalize language identifier
     */
    private normalizeLanguage;
    /**
     * Check if code block is complete
     */
    private isCompleteCodeBlock;
    /**
     * Check if code represents new file content
     */
    private isNewFileContent;
    /**
     * Check if code is a React/Vue component
     */
    private isComponentCode;
    /**
     * Check if code is a function definition
     */
    private isFunctionCode;
    /**
     * Check if code is a class definition
     */
    private isClassCode;
    /**
     * Check if code is an import statement
     */
    private isImportStatement;
    /**
     * Check if code is an error fix
     */
    private isErrorFix;
    /**
     * Check if code is a refactoring
     */
    private isRefactoring;
    /**
     * Check if file is critical
     */
    private isCriticalFile;
    /**
     * Check if modification affects system code
     */
    private isSystemModification;
    /**
     * Calculate confidence level for action
     */
    private calculateConfidence;
    /**
     * Estimate impact of action
     */
    private estimateImpact;
    /**
     * Extract dependencies from code
     */
    private extractDependencies;
    /**
     * Find target range for modifications
     */
    private findTargetRange;
    /**
     * Get context around a code block
     */
    private getContextAroundBlock;
    /**
     * Rank actions by relevance
     */
    private rankActionsByRelevance;
}
//# sourceMappingURL=codeParser.d.ts.map