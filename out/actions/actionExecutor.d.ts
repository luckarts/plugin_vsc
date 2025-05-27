import { IActionExecutor, ICodeAction, IActionResult, IActionPreview, IValidationResult } from './types';
/**
 * Executes code actions with validation, preview, and safety checks
 * Handles both file creation and code modification operations
 */
export declare class ActionExecutor implements IActionExecutor {
    private readonly fileCreator;
    private readonly codeApplier;
    private readonly config;
    constructor();
    /**
     * Execute a code action
     * @param action The action to execute
     * @returns Result of the execution
     */
    executeAction(action: ICodeAction): Promise<IActionResult>;
    /**
     * Preview an action without executing it
     * @param action The action to preview
     * @returns Preview information
     */
    previewAction(action: ICodeAction): Promise<IActionPreview>;
    /**
     * Validate an action before execution
     * @param action The action to validate
     * @returns Validation result
     */
    validateAction(action: ICodeAction): Promise<IValidationResult>;
    /**
     * Check if action can be executed
     * @param action The action to check
     * @returns Whether action can be executed
     */
    canExecuteAction(action: ICodeAction): boolean;
    /**
     * Execute action based on its type
     */
    private executeActionByType;
    /**
     * Calculate changes that would be made by an action
     */
    private calculateChanges;
    /**
     * Generate preview summary
     */
    private generatePreviewSummary;
    /**
     * Generate preview warnings
     */
    private generatePreviewWarnings;
    /**
     * Estimate execution time
     */
    private estimateExecutionTime;
    /**
     * Check if action requires confirmation
     */
    private requiresConfirmation;
    /**
     * Check if action should show preview
     */
    private shouldShowPreview;
    /**
     * Show confirmation dialog
     */
    private showConfirmationDialog;
    /**
     * Show preview dialog
     */
    private showPreviewDialog;
    /**
     * Validate file creation
     */
    private validateFileCreation;
    /**
     * Validate modification
     */
    private validateModification;
    /**
     * Validate code creation
     */
    private validateCodeCreation;
    /**
     * Add import statement
     */
    private addImport;
    /**
     * Remove code
     */
    private removeCode;
    /**
     * Load configuration
     */
    private loadConfig;
}
//# sourceMappingURL=actionExecutor.d.ts.map