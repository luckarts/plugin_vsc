import { ICodeApplier, ICodeAction, IActionResult, IRange } from './types';
/**
 * Applies code modifications to existing files
 * Handles merging, backup creation, and intelligent code placement
 */
export declare class CodeApplier implements ICodeApplier {
    private readonly backupDirectory;
    constructor();
    /**
     * Apply modification to existing file
     * @param action The modification action
     * @returns Result of the modification
     */
    applyModification(action: ICodeAction): Promise<IActionResult>;
    /**
     * Find the best location to insert new code
     * @param content The code to insert
     * @param targetFile The target file path
     * @returns Range where code should be inserted, or null for append
     */
    findTargetLocation(content: string, targetFile: string): Promise<IRange | null>;
    /**
     * Merge new code with existing content
     * @param existingContent Current file content
     * @param newContent New code to add
     * @param range Optional range for insertion
     * @returns Merged content
     */
    mergeCode(existingContent: string, newContent: string, range?: IRange): string;
    /**
     * Create backup of file before modification
     * @param filePath Path to file to backup
     * @returns Path to backup file
     */
    createBackup(filePath: string): Promise<string>;
    /**
     * Analyze where to insert new code
     */
    private analyzeInsertionPoint;
    /**
     * Analyze the type of content being inserted
     */
    private analyzeContentType;
    /**
     * Find insertion point for imports
     */
    private findImportInsertionPoint;
    /**
     * Find insertion point for functions
     */
    private findFunctionInsertionPoint;
    /**
     * Find insertion point for classes
     */
    private findClassInsertionPoint;
    /**
     * Find insertion point for types/interfaces
     */
    private findTypeInsertionPoint;
    /**
     * Find insertion point for exports
     */
    private findExportInsertionPoint;
    /**
     * Find general insertion point
     */
    private findGeneralInsertionPoint;
    /**
     * Adjust indentation of new lines based on context
     */
    private adjustIndentation;
    /**
     * Detect indentation pattern from context
     */
    private detectIndentation;
    /**
     * Highlight changes in the editor
     */
    private highlightChanges;
    /**
     * Ensure backup directory exists
     */
    private ensureBackupDirectoryExists;
}
//# sourceMappingURL=codeApplier.d.ts.map