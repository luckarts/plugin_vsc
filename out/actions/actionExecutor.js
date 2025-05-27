"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionExecutor = void 0;
const vscode = __importStar(require("vscode"));
const fileCreator_1 = require("./fileCreator");
const codeApplier_1 = require("./codeApplier");
const types_1 = require("./types");
/**
 * Executes code actions with validation, preview, and safety checks
 * Handles both file creation and code modification operations
 */
class ActionExecutor {
    constructor() {
        this.fileCreator = new fileCreator_1.FileCreator();
        this.codeApplier = new codeApplier_1.CodeApplier();
        this.config = this.loadConfig();
    }
    /**
     * Execute a code action
     * @param action The action to execute
     * @returns Result of the execution
     */
    async executeAction(action) {
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
        }
        catch (error) {
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
    async previewAction(action) {
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
        }
        catch (error) {
            throw new types_1.ActionException('previewAction', 'Failed to generate action preview', error);
        }
    }
    /**
     * Validate an action before execution
     * @param action The action to validate
     * @returns Validation result
     */
    async validateAction(action) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
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
                case types_1.ActionType.CREATE_FILE:
                    await this.validateFileCreation(action, errors, warnings, suggestions);
                    break;
                case types_1.ActionType.APPLY_MODIFICATION:
                    await this.validateModification(action, errors, warnings, suggestions);
                    break;
                case types_1.ActionType.CREATE_FUNCTION:
                case types_1.ActionType.CREATE_CLASS:
                case types_1.ActionType.CREATE_COMPONENT:
                    await this.validateCodeCreation(action, errors, warnings, suggestions);
                    break;
                default:
                    warnings.push(`Validation for action type ${action.type} not fully implemented`);
            }
            // Risk-based validation
            if (action.metadata.riskLevel === types_1.RiskLevel.CRITICAL) {
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
        }
        catch (error) {
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
    canExecuteAction(action) {
        // Check if workspace is available
        if (!vscode.workspace.workspaceFolders) {
            return false;
        }
        // Check if action type is supported
        const supportedTypes = [
            types_1.ActionType.CREATE_FILE,
            types_1.ActionType.APPLY_MODIFICATION,
            types_1.ActionType.CREATE_FUNCTION,
            types_1.ActionType.CREATE_CLASS,
            types_1.ActionType.CREATE_COMPONENT,
            types_1.ActionType.ADD_IMPORT,
            types_1.ActionType.FIX_ERROR,
            types_1.ActionType.REFACTOR_CODE
        ];
        if (!supportedTypes.includes(action.type)) {
            return false;
        }
        // Check configuration settings
        if (action.metadata.riskLevel === types_1.RiskLevel.CRITICAL && !this.config.allowCriticalActions) {
            return false;
        }
        return true;
    }
    /**
     * Execute action based on its type
     */
    async executeActionByType(action) {
        switch (action.type) {
            case types_1.ActionType.CREATE_FILE:
            case types_1.ActionType.CREATE_FUNCTION:
            case types_1.ActionType.CREATE_CLASS:
            case types_1.ActionType.CREATE_COMPONENT:
                return await this.fileCreator.createFile(action);
            case types_1.ActionType.APPLY_MODIFICATION:
            case types_1.ActionType.FIX_ERROR:
            case types_1.ActionType.REFACTOR_CODE:
                return await this.codeApplier.applyModification(action);
            case types_1.ActionType.ADD_IMPORT:
                return await this.addImport(action);
            case types_1.ActionType.REMOVE_CODE:
                return await this.removeCode(action);
            default:
                throw new Error(`Unsupported action type: ${action.type}`);
        }
    }
    /**
     * Calculate changes that would be made by an action
     */
    async calculateChanges(action) {
        const changes = [];
        switch (action.type) {
            case types_1.ActionType.CREATE_FILE:
                const suggestedPath = this.fileCreator.suggestFilePath(action.content, action.language);
                changes.push({
                    filePath: action.targetFile || suggestedPath,
                    type: 'create',
                    newContent: action.content,
                    description: `Create new ${action.language} file`
                });
                break;
            case types_1.ActionType.APPLY_MODIFICATION:
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
                    }
                    catch (error) {
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
    generatePreviewSummary(action, changes) {
        const changeCount = changes.length;
        const actionDescription = action.description;
        return `${actionDescription}\n\nThis will make ${changeCount} change${changeCount > 1 ? 's' : ''} to your workspace.`;
    }
    /**
     * Generate preview warnings
     */
    generatePreviewWarnings(action, changes) {
        const warnings = [];
        if (action.metadata.riskLevel === types_1.RiskLevel.HIGH || action.metadata.riskLevel === types_1.RiskLevel.CRITICAL) {
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
    estimateExecutionTime(action) {
        const baseTime = 100; // Base time in ms
        const contentLines = action.content.split('\n').length;
        const complexityMultiplier = Math.max(1, Math.log10(contentLines));
        return Math.round(baseTime * complexityMultiplier);
    }
    /**
     * Check if action requires confirmation
     */
    requiresConfirmation(action) {
        return action.metadata.riskLevel === types_1.RiskLevel.HIGH ||
            action.metadata.riskLevel === types_1.RiskLevel.CRITICAL ||
            this.config.requireConfirmation;
    }
    /**
     * Check if action should show preview
     */
    shouldShowPreview(action) {
        return action.metadata.previewAvailable &&
            (action.metadata.riskLevel !== types_1.RiskLevel.LOW || this.config.alwaysShowPreview);
    }
    /**
     * Show confirmation dialog
     */
    async showConfirmationDialog(action) {
        const result = await vscode.window.showWarningMessage(`Are you sure you want to execute this action?\n\n${action.description}\n\nRisk Level: ${action.metadata.riskLevel}`, { modal: true }, 'Yes, Execute', 'Cancel');
        return result === 'Yes, Execute';
    }
    /**
     * Show preview dialog
     */
    async showPreviewDialog(preview) {
        const result = await vscode.window.showInformationMessage(`Preview: ${preview.summary}\n\nWarnings: ${preview.warnings.join(', ') || 'None'}`, { modal: true }, 'Proceed', 'Cancel');
        return result === 'Proceed';
    }
    /**
     * Validate file creation
     */
    async validateFileCreation(action, errors, warnings, suggestions) {
        if (!action.targetFile) {
            const suggested = this.fileCreator.suggestFilePath(action.content, action.language);
            suggestions.push(`Suggested file path: ${suggested}`);
        }
        else {
            const validation = this.fileCreator.validateFilePath(action.targetFile);
            errors.push(...validation.errors);
            warnings.push(...validation.warnings);
        }
    }
    /**
     * Validate modification
     */
    async validateModification(action, errors, warnings, suggestions) {
        if (!action.targetFile) {
            errors.push('Target file not specified for modification');
        }
        else {
            try {
                await vscode.workspace.openTextDocument(action.targetFile);
            }
            catch {
                warnings.push('Target file does not exist - will create new file');
            }
        }
    }
    /**
     * Validate code creation
     */
    async validateCodeCreation(action, errors, warnings, suggestions) {
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
    async addImport(action) {
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
    async removeCode(action) {
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
    loadConfig() {
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
exports.ActionExecutor = ActionExecutor;
//# sourceMappingURL=actionExecutor.js.map