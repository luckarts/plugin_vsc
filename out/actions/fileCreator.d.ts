import { IFileCreator, ICodeAction, IActionResult, IValidationResult } from './types';
/**
 * Creates new files based on code actions
 * Handles file path suggestion, validation, and creation
 */
export declare class FileCreator implements IFileCreator {
    private readonly workspaceRoot;
    constructor();
    /**
     * Create a new file based on action
     * @param action The action containing file creation details
     * @returns Result of file creation
     */
    createFile(action: ICodeAction): Promise<IActionResult>;
    /**
     * Suggest an appropriate file path based on content and language
     * @param content The file content
     * @param language The programming language
     * @returns Suggested file path
     */
    suggestFilePath(content: string, language: string): string;
    /**
     * Validate a file path
     * @param filePath The file path to validate
     * @returns Validation result
     */
    validateFilePath(filePath: string): IValidationResult;
    /**
     * Ensure directory exists for file path
     * @param filePath The file path
     */
    ensureDirectoryExists(filePath: string): Promise<void>;
    /**
     * Extract name from content based on language
     */
    private extractNameFromContent;
    /**
     * Get file extension for language
     */
    private getExtensionForLanguage;
    /**
     * Suggest appropriate directory based on content and language
     */
    private suggestDirectory;
    /**
     * Check if file name is valid
     */
    private isValidFileName;
    /**
     * Check if file exists
     */
    private fileExists;
    /**
     * Confirm file overwrite
     */
    private confirmOverwrite;
    /**
     * Prepare final file content with proper formatting
     */
    private prepareFileContent;
    /**
     * Check if file header should be added
     */
    private shouldAddFileHeader;
    /**
     * Generate file header comment
     */
    private generateFileHeader;
}
//# sourceMappingURL=fileCreator.d.ts.map