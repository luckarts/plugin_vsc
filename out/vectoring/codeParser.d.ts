import { ICodeParser, ICodeChunk, ICodeMetadata } from './types';
/**
 * Code parser that extracts meaningful chunks from source files
 * Supports multiple programming languages
 */
export declare class CodeParser implements ICodeParser {
    readonly language: string;
    private static readonly SUPPORTED_LANGUAGES;
    constructor(language: string);
    /**
     * Parse a file into meaningful code chunks
     * @param content File content
     * @param filePath File path
     * @returns Array of code chunks
     */
    parseFile(content: string, filePath: string): Promise<ICodeChunk[]>;
    /**
     * Extract metadata from code content
     * @param content File content
     * @returns Code metadata
     */
    extractMetadata(content: string): Promise<ICodeMetadata>;
    /**
     * Parse JavaScript/TypeScript files
     */
    private parseJavaScriptTypeScript;
    /**
     * Parse Python files
     */
    private parsePython;
    /**
     * Parse Java-like languages (Java, C#)
     */
    private parseJavaLike;
    /**
     * Generic parser for unsupported languages
     */
    private parseGeneric;
    /**
     * Create a code chunk from lines
     */
    private createChunk;
    /**
     * Create a file-level chunk
     */
    private createFileChunk;
    /**
     * Helper methods
     */
    private isFunctionStart;
    private isClassStart;
    private isInterfaceStart;
    private determineChunkType;
    private extractFunctionName;
    private extractClassName;
    private calculateComplexity;
    private generateChunkId;
    /**
     * Static method to get parser for file
     */
    static getParserForFile(filePath: string): CodeParser;
    /**
     * Check if language is supported
     */
    static isLanguageSupported(language: string): boolean;
}
//# sourceMappingURL=codeParser.d.ts.map