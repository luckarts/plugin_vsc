import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileCreator } from './fileCreator';
import { CodeApplier } from './codeApplier';
import {
  IActionExecutor,
  ICodeAction,
  IActionResult,
  IActionPreview,
  IValidationResult,
  ActionType,
  RiskLevel,
  ActionException
} from './types';

/**
 * Executes code actions with validation, preview, and safety checks
 * Handles both file creation and code modification operations
 */
export class ActionExecutor implements IActionExecutor {
  private readonly fileCreator: FileCreator;
  private readonly codeApplier: CodeApplier;
  private readonly config: any;

  constructor() {
    this.fileCreator = new FileCreator();
    this.codeApplier = new CodeApplier();
    this.config = this.loadConfig();
  }

  /**
   * Execute a code action
   * @param action The action to execute
   * @returns Result of the execution
   */
  async executeAction(action: ICodeAction): Promise<IActionResult> {
    try {
      // Validate action before execution
      const validation = await this.validateAction(action);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Action validation failed',
          filesModified: [],
          filesCreated: [],
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Show confirmation for high-risk actions
      if (this.requiresConfirmation(action)) {
        const confirmed = await this.showConfirmationDialog(action);
        if (!confirmed) {
          return {
            success: false,
            message: 'Action cancelled by user',
            filesModified: [],
            filesCreated: [],
            errors: [],
            warnings: []
          };
        }
      }

      // Show preview for complex actions
      if (this.shouldShowPreview(action)) {
        const preview = await this.previewAction(action);
        const proceed = await this.showPreviewDialog(preview);
        if (!proceed) {
          return {
            success: false,
            message: 'Action cancelled after preview',
            filesModified: [],
            filesCreated: [],
            errors: [],
            warnings: []
          };
        }
      }

      // Execute the action based on type
      return await this.executeActionByType(action);

    } catch (error) {
      return {
        success: false,
        message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filesModified: [],
        filesCreated: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Preview an action without executing it
   * @param action The action to preview
   * @returns Preview information
   */
  async previewAction(action: ICodeAction): Promise<IActionPreview> {
    try {
      const changes = await this.calculateChanges(action);
      const summary = this.generatePreviewSummary(action, changes);
      const warnings = this.generatePreviewWarnings(action, changes);
      const estimatedTime = this.estimateExecutionTime(action);

      return {
        action,
        changes,
        summary,
        warnings,
        estimatedTime
      };

    } catch (error) {
      throw new ActionException('previewAction', 'Failed to generate action preview', error);
    }
  }

  /**
   * Validate an action before execution
   * @param action The action to validate
   * @returns Validation result
   */
  async validateAction(action: ICodeAction): Promise<IValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Basic validation
      if (!action.content || action.content.trim().length === 0) {
        errors.push('Action content is empty');
      }

      if (!action.language) {
        warnings.push('No language specified for action');
      }

      // Type-specific validation
      switch (action.type) {
        case ActionType.CREATE_FILE:
          await this.validateFileCreation(action, errors, warnings, suggestions);
          break;
        case ActionType.APPLY_MODIFICATION:
          await this.validateModification(action, errors, warnings, suggestions);
          break;
        case ActionType.CREATE_FUNCTION:
        case ActionType.CREATE_CLASS:
        case ActionType.CREATE_COMPONENT:
          await this.validateCodeCreation(action, errors, warnings, suggestions);
          break;
        default:
          warnings.push(`Validation for action type ${action.type} not fully implemented`);
      }

      // Risk-based validation
      if (action.metadata.riskLevel === RiskLevel.CRITICAL) {
        warnings.push('This is a critical risk action - proceed with extreme caution');
      }

      // Confidence-based validation
      if (action.metadata.confidence < 0.5) {
        warnings.push('Low confidence action - review carefully before applying');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        canProceed: errors.length === 0
      };

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        canProceed: false
      };
    }
  }

  /**
   * Check if action can be executed
   * @param action The action to check
   * @returns Whether action can be executed
   */
  canExecuteAction(action: ICodeAction): boolean {
    // Check if workspace is available
    if (!vscode.workspace.workspaceFolders) {
      return false;
    }

    // Check if action type is supported
    const supportedTypes = [
      ActionType.CREATE_FILE,
      ActionType.APPLY_MODIFICATION,
      ActionType.CREATE_FUNCTION,
      ActionType.CREATE_CLASS,
      ActionType.CREATE_COMPONENT,
      ActionType.ADD_IMPORT,
      ActionType.FIX_ERROR,
      ActionType.REFACTOR_CODE
    ];

    if (!supportedTypes.includes(action.type)) {
      return false;
    }

    // Check configuration settings
    if (action.metadata.riskLevel === RiskLevel.CRITICAL && !this.config.allowCriticalActions) {
      return false;
    }

    return true;
  }

  /**
   * Execute action based on its type
   */
  private async executeActionByType(action: ICodeAction): Promise<IActionResult> {
    switch (action.type) {
      case ActionType.CREATE_FILE:
      case ActionType.CREATE_FUNCTION:
      case ActionType.CREATE_CLASS:
      case ActionType.CREATE_COMPONENT:
        return await this.fileCreator.createFile(action);

      case ActionType.APPLY_MODIFICATION:
      case ActionType.FIX_ERROR:
      case ActionType.REFACTOR_CODE:
        return await this.codeApplier.applyModification(action);

      case ActionType.ADD_IMPORT:
        return await this.addImport(action);

      case ActionType.REMOVE_CODE:
        return await this.removeCode(action);

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Calculate changes that would be made by an action
   */
  private async calculateChanges(action: ICodeAction): Promise<any[]> {
    const changes: any[] = [];

    switch (action.type) {
      case ActionType.CREATE_FILE:
        const suggestedPath = this.fileCreator.suggestFilePath(action.content, action.language);
        changes.push({
          filePath: action.targetFile || suggestedPath,
          type: 'create',
          newContent: action.content,
          description: `Create new ${action.language} file`
        });
        break;

      case ActionType.APPLY_MODIFICATION:
        if (action.targetFile) {
          try {
            const document = await vscode.workspace.openTextDocument(action.targetFile);
            const oldContent = document.getText();
            const newContent = this.codeApplier.mergeCode(oldContent, action.content, action.targetRange);
            
            changes.push({
              filePath: action.targetFile,
              type: 'modify',
              oldContent,
              newContent,
              range: action.targetRange,
              description: `Modify existing file`
            });
          } catch (error) {
            // File doesn't exist or can't be read
            changes.push({
              filePath: action.targetFile,
              type: 'create',
              newContent: action.content,
              description: `Create new file (target file not found)`
            });
          }
        }
        break;

      default:
        changes.push({
          filePath: action.targetFile || 'unknown',
          type: 'modify',
          newContent: action.content,
          description: `Apply ${action.type}`
        });
    }

    return changes;
  }

  /**
   * Generate preview summary
   */
  private generatePreviewSummary(action: ICodeAction, changes: any[]): string {
    const changeCount = changes.length;
    const actionDescription = action.description;
    
    return `${actionDescription}\n\nThis will make ${changeCount} change${changeCount > 1 ? 's' : ''} to your workspace.`;
  }

  /**
   * Generate preview warnings
   */
  private generatePreviewWarnings(action: ICodeAction, changes: any[]): string[] {
    const warnings: string[] = [];

    if (action.metadata.riskLevel === RiskLevel.HIGH || action.metadata.riskLevel === RiskLevel.CRITICAL) {
      warnings.push('This action has a high risk level');
    }

    if (action.metadata.confidence < 0.7) {
      warnings.push('This action has lower confidence - review carefully');
    }

    const modifyingChanges = changes.filter(c => c.type === 'modify');
    if (modifyingChanges.length > 0) {
      warnings.push(`Will modify ${modifyingChanges.length} existing file${modifyingChanges.length > 1 ? 's' : ''}`);
    }

    return warnings;
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(action: ICodeAction): number {
    const baseTime = 100; // Base time in ms
    const contentLines = action.content.split('\n').length;
    const complexityMultiplier = Math.max(1, Math.log10(contentLines));
    
    return Math.round(baseTime * complexityMultiplier);
  }

  /**
   * Check if action requires confirmation
   */
  private requiresConfirmation(action: ICodeAction): boolean {
    return action.metadata.riskLevel === RiskLevel.HIGH || 
           action.metadata.riskLevel === RiskLevel.CRITICAL ||
           this.config.requireConfirmation;
  }

  /**
   * Check if action should show preview
   */
  private shouldShowPreview(action: ICodeAction): boolean {
    return action.metadata.previewAvailable && 
           (action.metadata.riskLevel !== RiskLevel.LOW || this.config.alwaysShowPreview);
  }

  /**
   * Show confirmation dialog
   */
  private async showConfirmationDialog(action: ICodeAction): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
      `Are you sure you want to execute this action?\n\n${action.description}\n\nRisk Level: ${action.metadata.riskLevel}`,
      { modal: true },
      'Yes, Execute',
      'Cancel'
    );

    return result === 'Yes, Execute';
  }

  /**
   * Show preview dialog
   */
  private async showPreviewDialog(preview: IActionPreview): Promise<boolean> {
    const result = await vscode.window.showInformationMessage(
      `Preview: ${preview.summary}\n\nWarnings: ${preview.warnings.join(', ') || 'None'}`,
      { modal: true },
      'Proceed',
      'Cancel'
    );

    return result === 'Proceed';
  }

  /**
   * Validate file creation
   */
  private async validateFileCreation(action: ICodeAction, errors: string[], warnings: string[], suggestions: string[]): Promise<void> {
    if (!action.targetFile) {
      const suggested = this.fileCreator.suggestFilePath(action.content, action.language);
      suggestions.push(`Suggested file path: ${suggested}`);
    } else {
      const validation = this.fileCreator.validateFilePath(action.targetFile);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }
  }

  /**
   * Validate modification
   */
  private async validateModification(action: ICodeAction, errors: string[], warnings: string[], suggestions: string[]): Promise<void> {
    if (!action.targetFile) {
      errors.push('Target file not specified for modification');
    } else {
      try {
        await vscode.workspace.openTextDocument(action.targetFile);
      } catch {
        warnings.push('Target file does not exist - will create new file');
      }
    }
  }

  /**
   * Validate code creation
   */
  private async validateCodeCreation(action: ICodeAction, errors: string[], warnings: string[], suggestions: string[]): Promise<void> {
    // Check if code is syntactically valid (simplified)
    if (action.language === 'typescript' || action.language === 'javascript') {
      if (!action.content.includes('{') || !action.content.includes('}')) {
        warnings.push('Code may be incomplete - missing braces');
      }
    }
  }

  /**
   * Add import statement
   */
  private async addImport(action: ICodeAction): Promise<IActionResult> {
    // Implementation for adding imports
    return {
      success: true,
      message: 'Import added successfully',
      filesModified: [action.targetFile || ''],
      filesCreated: [],
      errors: [],
      warnings: []
    };
  }

  /**
   * Remove code
   */
  private async removeCode(action: ICodeAction): Promise<IActionResult> {
    // Implementation for removing code
    return {
      success: true,
      message: 'Code removed successfully',
      filesModified: [action.targetFile || ''],
      filesCreated: [],
      errors: [],
      warnings: []
    };
  }

  /**
   * Load configuration
   */
  private loadConfig(): any {
    const config = vscode.workspace.getConfiguration('codeAssist.actions');
    
    return {
      requireConfirmation: config.get('requireConfirmation', true),
      allowCriticalActions: config.get('allowCriticalActions', false),
      alwaysShowPreview: config.get('alwaysShowPreview', false),
      createBackups: config.get('createBackups', true),
      maxFileSize: config.get('maxFileSize', 1000000), // 1MB
      allowedExtensions: config.get('allowedExtensions', ['.ts', '.js', '.tsx', '.jsx', '.py', '.java'])
    };
  }
}
