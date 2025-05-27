import * as path from 'path';
import {
  IContextFilter,
  IWorkspaceContext,
  IOpenFileContext,
  ContextException
} from './types';

/**
 * Filters workspace context based on various criteria
 * Helps focus on relevant files and reduce noise
 */
export class ContextFilter implements IContextFilter {
  private readonly supportedLanguages = new Set([
    'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'c',
    'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html',
    'css', 'scss', 'less', 'json', 'yaml', 'xml', 'markdown'
  ]);

  private readonly codeExtensions = new Set([
    '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.cpp', '.c',
    '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.html',
    '.css', '.scss', '.less', '.json', '.yaml', '.yml', '.xml', '.md'
  ]);

  /**
   * Filter context by programming languages
   * @param context Workspace context to filter
   * @param languages Array of language IDs to include
   * @returns Filtered context
   */
  filterByLanguage(context: IWorkspaceContext, languages: string[]): IWorkspaceContext {
    try {
      const languageSet = new Set(languages.map(lang => lang.toLowerCase()));
      
      const filteredContext: IWorkspaceContext = {
        ...context,
        openFiles: context.openFiles.filter(file => 
          languageSet.has(file.language.toLowerCase())
        ),
        recentFiles: context.recentFiles.filter(filePath => {
          const ext = path.extname(filePath).toLowerCase();
          return this.getLanguageFromExtension(ext).some(lang => 
            languageSet.has(lang.toLowerCase())
          );
        })
      };

      // Filter active file if it doesn't match
      if (context.activeFile && !languageSet.has(context.activeFile.language.toLowerCase())) {
        filteredContext.activeFile = undefined;
      }

      // Filter project structure
      if (context.projectStructure) {
        const filteredFilesByExtension = new Map();
        
        for (const [ext, files] of context.projectStructure.filesByExtension) {
          const extLanguages = this.getLanguageFromExtension(ext);
          if (extLanguages.some(lang => languageSet.has(lang.toLowerCase()))) {
            filteredFilesByExtension.set(ext, files);
          }
        }
        
        filteredContext.projectStructure = {
          ...context.projectStructure,
          filesByExtension: filteredFilesByExtension
        };
      }

      return filteredContext;

    } catch (error) {
      throw new ContextException('filterByLanguage', 'Failed to filter context by language', error);
    }
  }

  /**
   * Filter context by file extensions
   * @param context Workspace context to filter
   * @param extensions Array of file extensions to include (with or without dots)
   * @returns Filtered context
   */
  filterByExtension(context: IWorkspaceContext, extensions: string[]): IWorkspaceContext {
    try {
      const normalizedExtensions = new Set(
        extensions.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`)
      );

      const filteredContext: IWorkspaceContext = {
        ...context,
        openFiles: context.openFiles.filter(file => {
          const ext = path.extname(file.filePath).toLowerCase();
          return normalizedExtensions.has(ext);
        }),
        recentFiles: context.recentFiles.filter(filePath => {
          const ext = path.extname(filePath).toLowerCase();
          return normalizedExtensions.has(ext);
        })
      };

      // Filter active file if it doesn't match
      if (context.activeFile) {
        const activeExt = path.extname(context.activeFile.filePath).toLowerCase();
        if (!normalizedExtensions.has(activeExt)) {
          filteredContext.activeFile = undefined;
        }
      }

      // Filter project structure
      if (context.projectStructure) {
        const filteredFilesByExtension = new Map();
        
        for (const [ext, files] of context.projectStructure.filesByExtension) {
          if (normalizedExtensions.has(ext.toLowerCase())) {
            filteredFilesByExtension.set(ext, files);
          }
        }
        
        filteredContext.projectStructure = {
          ...context.projectStructure,
          filesByExtension: filteredFilesByExtension
        };
      }

      return filteredContext;

    } catch (error) {
      throw new ContextException('filterByExtension', 'Failed to filter context by extension', error);
    }
  }

  /**
   * Filter context by relevance score threshold
   * @param context Workspace context to filter
   * @param threshold Minimum relevance score (0-1)
   * @returns Filtered context
   */
  filterByRelevance(context: IWorkspaceContext, threshold: number): IWorkspaceContext {
    try {
      if (threshold < 0 || threshold > 1) {
        throw new Error('Relevance threshold must be between 0 and 1');
      }

      const filteredContext: IWorkspaceContext = {
        ...context,
        openFiles: context.openFiles.filter(file => file.relevanceScore >= threshold)
      };

      // Sort by relevance score (highest first)
      filteredContext.openFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return filteredContext;

    } catch (error) {
      throw new ContextException('filterByRelevance', 'Failed to filter context by relevance', error);
    }
  }

  /**
   * Filter context by file size to avoid very large files
   * @param context Workspace context to filter
   * @param maxSize Maximum file size in bytes
   * @returns Filtered context
   */
  filterByFileSize(context: IWorkspaceContext, maxSize: number): IWorkspaceContext {
    try {
      const filteredContext: IWorkspaceContext = {
        ...context,
        openFiles: context.openFiles.filter(file => 
          this.estimateFileSize(file.filePath) <= maxSize
        ),
        recentFiles: context.recentFiles.filter(filePath => 
          this.estimateFileSize(filePath) <= maxSize
        )
      };

      // Filter active file if it's too large
      if (context.activeFile && this.estimateFileSize(context.activeFile.filePath) > maxSize) {
        filteredContext.activeFile = undefined;
      }

      return filteredContext;

    } catch (error) {
      throw new ContextException('filterByFileSize', 'Failed to filter context by file size', error);
    }
  }

  /**
   * Apply multiple filters in sequence
   * @param context Workspace context to filter
   * @param filters Array of filter configurations
   * @returns Filtered context
   */
  applyMultipleFilters(
    context: IWorkspaceContext,
    filters: Array<{
      type: 'language' | 'extension' | 'relevance' | 'fileSize';
      value: any;
    }>
  ): IWorkspaceContext {
    try {
      let filteredContext = context;

      for (const filter of filters) {
        switch (filter.type) {
          case 'language':
            filteredContext = this.filterByLanguage(filteredContext, filter.value);
            break;
          case 'extension':
            filteredContext = this.filterByExtension(filteredContext, filter.value);
            break;
          case 'relevance':
            filteredContext = this.filterByRelevance(filteredContext, filter.value);
            break;
          case 'fileSize':
            filteredContext = this.filterByFileSize(filteredContext, filter.value);
            break;
          default:
            console.warn(`Unknown filter type: ${filter.type}`);
        }
      }

      return filteredContext;

    } catch (error) {
      throw new ContextException('applyMultipleFilters', 'Failed to apply multiple filters', error);
    }
  }

  /**
   * Filter to only include code files (exclude docs, configs, etc.)
   * @param context Workspace context to filter
   * @returns Filtered context with only code files
   */
  filterCodeFilesOnly(context: IWorkspaceContext): IWorkspaceContext {
    try {
      const codeLanguages = [
        'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'c',
        'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala'
      ];

      return this.filterByLanguage(context, codeLanguages);

    } catch (error) {
      throw new ContextException('filterCodeFilesOnly', 'Failed to filter code files only', error);
    }
  }

  /**
   * Filter to prioritize recently modified files
   * @param context Workspace context to filter
   * @param maxAge Maximum age in milliseconds
   * @returns Filtered context with recent files prioritized
   */
  filterRecentlyModified(context: IWorkspaceContext, maxAge: number): IWorkspaceContext {
    try {
      const now = Date.now();
      const cutoffTime = now - maxAge;

      const filteredContext: IWorkspaceContext = {
        ...context,
        openFiles: context.openFiles.filter(file => file.lastAccessed >= cutoffTime)
      };

      // Sort by last accessed time (most recent first)
      filteredContext.openFiles.sort((a, b) => b.lastAccessed - a.lastAccessed);

      return filteredContext;

    } catch (error) {
      throw new ContextException('filterRecentlyModified', 'Failed to filter recently modified files', error);
    }
  }

  /**
   * Create a smart filter based on the active file context
   * @param context Workspace context to filter
   * @returns Intelligently filtered context
   */
  createSmartFilter(context: IWorkspaceContext): IWorkspaceContext {
    try {
      if (!context.activeFile) {
        // No active file, apply general filters
        return this.applyMultipleFilters(context, [
          { type: 'relevance', value: 0.3 },
          { type: 'fileSize', value: 100000 } // 100KB limit
        ]);
      }

      const activeLanguage = context.activeFile.language;
      const activeExtension = path.extname(context.activeFile.filePath);

      // Filter by same language and related languages
      const relatedLanguages = this.getRelatedLanguages(activeLanguage);
      
      let filteredContext = this.filterByLanguage(context, relatedLanguages);
      
      // Apply relevance and size filters
      filteredContext = this.applyMultipleFilters(filteredContext, [
        { type: 'relevance', value: 0.2 },
        { type: 'fileSize', value: 200000 } // 200KB limit for related files
      ]);

      return filteredContext;

    } catch (error) {
      throw new ContextException('createSmartFilter', 'Failed to create smart filter', error);
    }
  }

  /**
   * Get file statistics after filtering
   * @param originalContext Original context
   * @param filteredContext Filtered context
   * @returns Statistics about the filtering operation
   */
  getFilterStats(originalContext: IWorkspaceContext, filteredContext: IWorkspaceContext): {
    originalFiles: number;
    filteredFiles: number;
    reductionPercentage: number;
    languagesIncluded: string[];
    extensionsIncluded: string[];
  } {
    const originalFiles = originalContext.openFiles.length + originalContext.recentFiles.length;
    const filteredFiles = filteredContext.openFiles.length + filteredContext.recentFiles.length;
    const reductionPercentage = originalFiles > 0 ? ((originalFiles - filteredFiles) / originalFiles) * 100 : 0;

    const languagesIncluded = [...new Set(filteredContext.openFiles.map(file => file.language))];
    const extensionsIncluded = [...new Set([
      ...filteredContext.openFiles.map(file => path.extname(file.filePath)),
      ...filteredContext.recentFiles.map(file => path.extname(file))
    ])];

    return {
      originalFiles,
      filteredFiles,
      reductionPercentage,
      languagesIncluded,
      extensionsIncluded
    };
  }

  /**
   * Helper method to get language from file extension
   */
  private getLanguageFromExtension(extension: string): string[] {
    const extMap: Record<string, string[]> = {
      '.ts': ['typescript'],
      '.tsx': ['typescript', 'typescriptreact'],
      '.js': ['javascript'],
      '.jsx': ['javascript', 'javascriptreact'],
      '.py': ['python'],
      '.java': ['java'],
      '.cs': ['csharp'],
      '.cpp': ['cpp'],
      '.c': ['c'],
      '.go': ['go'],
      '.rs': ['rust'],
      '.php': ['php'],
      '.rb': ['ruby'],
      '.swift': ['swift'],
      '.kt': ['kotlin'],
      '.scala': ['scala'],
      '.html': ['html'],
      '.css': ['css'],
      '.scss': ['scss'],
      '.less': ['less'],
      '.json': ['json'],
      '.yaml': ['yaml'],
      '.yml': ['yaml'],
      '.xml': ['xml'],
      '.md': ['markdown']
    };

    return extMap[extension.toLowerCase()] || [];
  }

  /**
   * Get related languages for smart filtering
   */
  private getRelatedLanguages(language: string): string[] {
    const relatedMap: Record<string, string[]> = {
      'typescript': ['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'json'],
      'javascript': ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'json'],
      'typescriptreact': ['typescriptreact', 'typescript', 'javascriptreact', 'javascript', 'css', 'scss'],
      'javascriptreact': ['javascriptreact', 'javascript', 'typescriptreact', 'typescript', 'css', 'scss'],
      'python': ['python', 'yaml', 'json'],
      'java': ['java', 'xml', 'json'],
      'csharp': ['csharp', 'xml', 'json'],
      'html': ['html', 'css', 'scss', 'javascript', 'typescript'],
      'css': ['css', 'scss', 'less', 'html'],
      'scss': ['scss', 'css', 'less', 'html']
    };

    return relatedMap[language.toLowerCase()] || [language];
  }

  /**
   * Estimate file size (simplified implementation)
   */
  private estimateFileSize(filePath: string): number {
    // This would use actual file system calls in production
    // For now, estimate based on file type
    const ext = path.extname(filePath).toLowerCase();
    const sizeEstimates: Record<string, number> = {
      '.ts': 5000,
      '.js': 4000,
      '.tsx': 6000,
      '.jsx': 5500,
      '.py': 3000,
      '.java': 7000,
      '.json': 2000,
      '.md': 1500
    };

    return sizeEstimates[ext] || 3000; // Default estimate
  }
}
