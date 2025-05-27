import * as vscode from 'vscode';
import { ICodeParser, ICodeChunk, ICodeMetadata, CodeChunkType, VectoringException } from './types';
import * as path from 'path';

/**
 * Code parser that extracts meaningful chunks from source files
 * Supports multiple programming languages
 */
export class CodeParser implements ICodeParser {
  public readonly language: string;
  
  private static readonly SUPPORTED_LANGUAGES = [
    'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'c',
    'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html', 'css'
  ];

  constructor(language: string) {
    this.language = language.toLowerCase();
  }

  /**
   * Parse a file into meaningful code chunks
   * @param content File content
   * @param filePath File path
   * @returns Array of code chunks
   */
  async parseFile(content: string, filePath: string): Promise<ICodeChunk[]> {
    try {
      const chunks: ICodeChunk[] = [];
      const lines = content.split('\n');
      
      // Extract metadata first
      const metadata = await this.extractMetadata(content);
      
      // Parse based on language
      switch (this.language) {
        case 'typescript':
        case 'javascript':
          chunks.push(...this.parseJavaScriptTypeScript(lines, filePath, metadata));
          break;
        case 'python':
          chunks.push(...this.parsePython(lines, filePath, metadata));
          break;
        case 'java':
        case 'csharp':
          chunks.push(...this.parseJavaLike(lines, filePath, metadata));
          break;
        default:
          chunks.push(...this.parseGeneric(lines, filePath, metadata));
      }
      
      // Add file-level chunk if no specific chunks found
      if (chunks.length === 0) {
        chunks.push(this.createFileChunk(content, filePath, metadata));
      }
      
      return chunks;
      
    } catch (error) {
      throw new VectoringException('parseFile', `Failed to parse file ${filePath}`, error);
    }
  }

  /**
   * Extract metadata from code content
   * @param content File content
   * @returns Code metadata
   */
  async extractMetadata(content: string): Promise<ICodeMetadata> {
    const metadata: ICodeMetadata = {
      imports: [],
      exports: [],
      dependencies: [],
      lastModified: Date.now()
    };

    try {
      // Extract imports/requires
      const importRegex = /(?:import|require|from|#include)\s+['""]?([^'"";\n]+)['""]?/gi;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        metadata.imports?.push(match[1].trim());
      }

      // Extract exports
      const exportRegex = /(?:export|module\.exports|exports)\s+(?:default\s+)?(?:class|function|const|let|var)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/gi;
      while ((match = exportRegex.exec(content)) !== null) {
        metadata.exports?.push(match[1].trim());
      }

      // Calculate complexity (rough estimate)
      metadata.complexity = this.calculateComplexity(content);
      
    } catch (error) {
      // Metadata extraction is non-critical, continue with empty metadata
      console.warn('Failed to extract metadata:', error);
    }

    return metadata;
  }

  /**
   * Parse JavaScript/TypeScript files
   */
  private parseJavaScriptTypeScript(lines: string[], filePath: string, metadata: ICodeMetadata): ICodeChunk[] {
    const chunks: ICodeChunk[] = [];
    let currentChunk: string[] = [];
    let startLine = 0;
    let inFunction = false;
    let inClass = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments at the start
      if (!line || line.startsWith('//') || line.startsWith('/*')) {
        if (currentChunk.length > 0) {
          currentChunk.push(lines[i]);
        }
        continue;
      }

      // Detect function/class/interface start
      if (this.isFunctionStart(line) || this.isClassStart(line) || this.isInterfaceStart(line)) {
        // Save previous chunk if exists
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(currentChunk, startLine, i - 1, filePath, metadata));
        }
        
        // Start new chunk
        currentChunk = [lines[i]];
        startLine = i;
        inFunction = this.isFunctionStart(line);
        inClass = this.isClassStart(line);
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (currentChunk.length > 0) {
        currentChunk.push(lines[i]);
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        // End of function/class
        if (braceCount <= 0 && (inFunction || inClass)) {
          chunks.push(this.createChunk(currentChunk, startLine, i, filePath, metadata));
          currentChunk = [];
          inFunction = false;
          inClass = false;
        }
      } else if (line.length > 20) { // Standalone meaningful lines
        currentChunk = [lines[i]];
        startLine = i;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk, startLine, lines.length - 1, filePath, metadata));
    }

    return chunks;
  }

  /**
   * Parse Python files
   */
  private parsePython(lines: string[], filePath: string, metadata: ICodeMetadata): ICodeChunk[] {
    const chunks: ICodeChunk[] = [];
    let currentChunk: string[] = [];
    let startLine = 0;
    let currentIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) {
        if (currentChunk.length > 0) {
          currentChunk.push(line);
        }
        continue;
      }

      const indent = line.length - line.trimStart().length;
      
      // Detect function/class start
      if (trimmed.startsWith('def ') || trimmed.startsWith('class ') || trimmed.startsWith('async def ')) {
        // Save previous chunk
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(currentChunk, startLine, i - 1, filePath, metadata));
        }
        
        currentChunk = [line];
        startLine = i;
        currentIndent = indent;
      } else if (currentChunk.length > 0) {
        // Continue current chunk if indented or empty
        if (indent > currentIndent || !trimmed) {
          currentChunk.push(line);
        } else {
          // End of current chunk
          chunks.push(this.createChunk(currentChunk, startLine, i - 1, filePath, metadata));
          currentChunk = [line];
          startLine = i;
          currentIndent = indent;
        }
      } else if (trimmed.length > 20) {
        currentChunk = [line];
        startLine = i;
        currentIndent = indent;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk, startLine, lines.length - 1, filePath, metadata));
    }

    return chunks;
  }

  /**
   * Parse Java-like languages (Java, C#)
   */
  private parseJavaLike(lines: string[], filePath: string, metadata: ICodeMetadata): ICodeChunk[] {
    // Similar to JavaScript but with different patterns
    return this.parseJavaScriptTypeScript(lines, filePath, metadata);
  }

  /**
   * Generic parser for unsupported languages
   */
  private parseGeneric(lines: string[], filePath: string, metadata: ICodeMetadata): ICodeChunk[] {
    const chunks: ICodeChunk[] = [];
    const chunkSize = 20; // Lines per chunk
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      const content = chunkLines.join('\n').trim();
      
      if (content.length > 50) { // Only meaningful chunks
        chunks.push({
          id: this.generateChunkId(filePath, i),
          filePath,
          content,
          startLine: i,
          endLine: Math.min(i + chunkSize - 1, lines.length - 1),
          language: this.language,
          type: CodeChunkType.BLOCK,
          metadata: { ...metadata }
        });
      }
    }
    
    return chunks;
  }

  /**
   * Create a code chunk from lines
   */
  private createChunk(lines: string[], startLine: number, endLine: number, filePath: string, metadata: ICodeMetadata): ICodeChunk {
    const content = lines.join('\n').trim();
    const type = this.determineChunkType(content);
    
    return {
      id: this.generateChunkId(filePath, startLine),
      filePath,
      content,
      startLine,
      endLine,
      language: this.language,
      type,
      metadata: {
        ...metadata,
        functionName: this.extractFunctionName(content),
        className: this.extractClassName(content)
      }
    };
  }

  /**
   * Create a file-level chunk
   */
  private createFileChunk(content: string, filePath: string, metadata: ICodeMetadata): ICodeChunk {
    return {
      id: this.generateChunkId(filePath, 0),
      filePath,
      content: content.substring(0, 2000), // Limit size
      startLine: 0,
      endLine: content.split('\n').length - 1,
      language: this.language,
      type: CodeChunkType.BLOCK,
      metadata
    };
  }

  /**
   * Helper methods
   */
  private isFunctionStart(line: string): boolean {
    return /(?:function|async\s+function|\w+\s*\(|\w+\s*=\s*\(|\w+\s*=\s*async\s*\()/i.test(line);
  }

  private isClassStart(line: string): boolean {
    return /class\s+\w+/i.test(line);
  }

  private isInterfaceStart(line: string): boolean {
    return /interface\s+\w+/i.test(line);
  }

  private determineChunkType(content: string): CodeChunkType {
    if (/(?:function|def\s+)/i.test(content)) return CodeChunkType.FUNCTION;
    if (/(?:class\s+)/i.test(content)) return CodeChunkType.CLASS;
    if (/(?:interface\s+)/i.test(content)) return CodeChunkType.INTERFACE;
    if (/(?:import|require|from)/i.test(content)) return CodeChunkType.IMPORT;
    return CodeChunkType.BLOCK;
  }

  private extractFunctionName(content: string): string | undefined {
    const match = content.match(/(?:function\s+|def\s+)(\w+)/i);
    return match ? match[1] : undefined;
  }

  private extractClassName(content: string): string | undefined {
    const match = content.match(/class\s+(\w+)/i);
    return match ? match[1] : undefined;
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on control structures
    const patterns = [/if\s*\(/, /for\s*\(/, /while\s*\(/, /switch\s*\(/, /catch\s*\(/];
    return patterns.reduce((count, pattern) => count + (content.match(pattern) || []).length, 0);
  }

  private generateChunkId(filePath: string, startLine: number): string {
    const fileName = path.basename(filePath);
    return `${fileName}:${startLine}:${Date.now()}`;
  }

  /**
   * Static method to get parser for file
   */
  static getParserForFile(filePath: string): CodeParser {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css'
    };

    const language = languageMap[ext] || 'generic';
    return new CodeParser(language);
  }

  /**
   * Check if language is supported
   */
  static isLanguageSupported(language: string): boolean {
    return CodeParser.SUPPORTED_LANGUAGES.includes(language.toLowerCase());
  }
}
