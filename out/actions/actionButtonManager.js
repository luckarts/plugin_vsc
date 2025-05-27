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
exports.ActionButtonManager = void 0;
const vscode = __importStar(require("vscode"));
const codeParser_1 = require("./codeParser");
const types_1 = require("./types");
/**
 * Manages action buttons in chat messages
 * Creates, renders, and handles interactions with Apply/Create buttons
 */
class ActionButtonManager {
    constructor(actionExecutor) {
        this.activeButtons = new Map();
        this.messageActions = new Map();
        this.codeParser = new codeParser_1.CodeParser();
        this.actionExecutor = actionExecutor;
    }
    /**
     * Create action buttons for a message content
     * @param content The message content to analyze
     * @returns Array of action buttons
     */
    async createActionButtons(content) {
        try {
            // Parse code suggestions from content
            const actions = await this.codeParser.parseCodeSuggestions(content);
            if (actions.length === 0) {
                return [];
            }
            const buttons = [];
            for (const action of actions) {
                const button = this.createButtonForAction(action);
                buttons.push(button);
                this.activeButtons.set(button.id, button);
            }
            return buttons;
        }
        catch (error) {
            console.error('Failed to create action buttons:', error);
            return [];
        }
    }
    /**
     * Render action buttons as HTML
     * @param buttons Array of buttons to render
     * @returns HTML string for buttons
     */
    renderActionButtons(buttons) {
        if (buttons.length === 0) {
            return '';
        }
        const buttonElements = buttons.map(button => this.renderSingleButton(button));
        return `
      <div class="action-buttons-container">
        <div class="action-buttons-header">
          <span class="action-buttons-title">💡 Quick Actions</span>
          <span class="action-buttons-count">${buttons.length} action${buttons.length > 1 ? 's' : ''} available</span>
        </div>
        <div class="action-buttons-list">
          ${buttonElements.join('')}
        </div>
      </div>
    `;
    }
    /**
     * Handle button click events
     * @param buttonId ID of the clicked button
     * @param messageId ID of the message containing the button
     */
    async handleButtonClick(buttonId, messageId) {
        try {
            const button = this.activeButtons.get(buttonId);
            if (!button) {
                throw new Error(`Button ${buttonId} not found`);
            }
            if (!button.enabled) {
                vscode.window.showWarningMessage('This action is currently disabled');
                return;
            }
            // Update button state to show loading
            this.updateButtonState(buttonId, false);
            this.updateButtonVisual(buttonId, 'loading');
            // Execute the action
            const result = await this.actionExecutor.executeAction(button.action);
            // Update button based on result
            if (result.success) {
                this.updateButtonVisual(buttonId, 'success');
                this.showSuccessNotification(result);
            }
            else {
                this.updateButtonVisual(buttonId, 'error');
                this.showErrorNotification(result);
                this.updateButtonState(buttonId, true); // Re-enable for retry
            }
        }
        catch (error) {
            console.error('Failed to handle button click:', error);
            this.updateButtonVisual(buttonId, 'error');
            this.updateButtonState(buttonId, true);
            vscode.window.showErrorMessage(`Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update button enabled state
     * @param buttonId ID of the button to update
     * @param enabled New enabled state
     */
    updateButtonState(buttonId, enabled) {
        const button = this.activeButtons.get(buttonId);
        if (button) {
            button.enabled = enabled;
            this.updateButtonVisual(buttonId, enabled ? 'enabled' : 'disabled');
        }
    }
    /**
     * Get actions for a specific message
     * @param messageId Message ID
     * @returns Array of actions for the message
     */
    getMessageActions(messageId) {
        return this.messageActions.get(messageId) || [];
    }
    /**
     * Store actions for a message
     * @param messageId Message ID
     * @param actions Actions to store
     */
    storeMessageActions(messageId, actions) {
        this.messageActions.set(messageId, actions);
    }
    /**
     * Clear actions for a message
     * @param messageId Message ID
     */
    clearMessageActions(messageId) {
        this.messageActions.delete(messageId);
        // Remove associated buttons
        for (const [buttonId, button] of this.activeButtons) {
            if (button.id.startsWith(messageId)) {
                this.activeButtons.delete(buttonId);
            }
        }
    }
    /**
     * Create a button for a specific action
     */
    createButtonForAction(action) {
        const buttonId = `btn_${action.id}`;
        return {
            id: buttonId,
            type: action.type,
            label: this.getButtonLabel(action),
            icon: this.getButtonIcon(action),
            tooltip: this.getButtonTooltip(action),
            enabled: this.isActionEnabled(action),
            action
        };
    }
    /**
     * Get appropriate label for button based on action type
     */
    getButtonLabel(action) {
        switch (action.type) {
            case types_1.ActionType.CREATE_FILE:
                return 'Create File';
            case types_1.ActionType.CREATE_FUNCTION:
                return 'Add Function';
            case types_1.ActionType.CREATE_CLASS:
                return 'Add Class';
            case types_1.ActionType.CREATE_COMPONENT:
                return 'Create Component';
            case types_1.ActionType.APPLY_MODIFICATION:
                return 'Apply Changes';
            case types_1.ActionType.FIX_ERROR:
                return 'Fix Error';
            case types_1.ActionType.REFACTOR_CODE:
                return 'Refactor';
            case types_1.ActionType.ADD_IMPORT:
                return 'Add Import';
            case types_1.ActionType.REMOVE_CODE:
                return 'Remove Code';
            default:
                return 'Apply';
        }
    }
    /**
     * Get appropriate icon for button based on action type
     */
    getButtonIcon(action) {
        switch (action.type) {
            case types_1.ActionType.CREATE_FILE:
                return '📄';
            case types_1.ActionType.CREATE_FUNCTION:
                return '⚡';
            case types_1.ActionType.CREATE_CLASS:
                return '🏗️';
            case types_1.ActionType.CREATE_COMPONENT:
                return '🧩';
            case types_1.ActionType.APPLY_MODIFICATION:
                return '✏️';
            case types_1.ActionType.FIX_ERROR:
                return '🔧';
            case types_1.ActionType.REFACTOR_CODE:
                return '♻️';
            case types_1.ActionType.ADD_IMPORT:
                return '📦';
            case types_1.ActionType.REMOVE_CODE:
                return '🗑️';
            default:
                return '✅';
        }
    }
    /**
     * Get tooltip text for button
     */
    getButtonTooltip(action) {
        const riskText = this.getRiskText(action.metadata.riskLevel);
        const confidenceText = `${Math.round(action.metadata.confidence * 100)}% confidence`;
        return `${action.description}\n${riskText} • ${confidenceText}\n${action.metadata.estimatedImpact}`;
    }
    /**
     * Check if action should be enabled
     */
    isActionEnabled(action) {
        // Disable critical risk actions by default
        if (action.metadata.riskLevel === types_1.RiskLevel.CRITICAL) {
            return false;
        }
        // Disable if confidence is too low
        if (action.metadata.confidence < 0.3) {
            return false;
        }
        return true;
    }
    /**
     * Render a single button as HTML
     */
    renderSingleButton(button) {
        const riskClass = `risk-${button.action.metadata.riskLevel}`;
        const enabledClass = button.enabled ? 'enabled' : 'disabled';
        const confidencePercent = Math.round(button.action.metadata.confidence * 100);
        return `
      <div class="action-button ${riskClass} ${enabledClass}" 
           data-button-id="${button.id}"
           title="${button.tooltip}">
        <div class="button-main">
          <span class="button-icon">${button.icon}</span>
          <span class="button-label">${button.label}</span>
          <span class="button-confidence">${confidencePercent}%</span>
        </div>
        <div class="button-details">
          <span class="button-risk">${this.getRiskText(button.action.metadata.riskLevel)}</span>
          <span class="button-impact">${button.action.metadata.estimatedImpact}</span>
        </div>
        <div class="button-status" id="status-${button.id}">
          <span class="status-icon">⏳</span>
          <span class="status-text">Ready</span>
        </div>
      </div>
    `;
    }
    /**
     * Get human-readable risk text
     */
    getRiskText(riskLevel) {
        switch (riskLevel) {
            case types_1.RiskLevel.LOW:
                return '🟢 Low Risk';
            case types_1.RiskLevel.MEDIUM:
                return '🟡 Medium Risk';
            case types_1.RiskLevel.HIGH:
                return '🟠 High Risk';
            case types_1.RiskLevel.CRITICAL:
                return '🔴 Critical Risk';
            default:
                return '⚪ Unknown Risk';
        }
    }
    /**
     * Update button visual state
     */
    updateButtonVisual(buttonId, state) {
        // This would send a message to the webview to update the button appearance
        // Implementation depends on the webview communication system
        const statusElement = `status-${buttonId}`;
        const stateConfig = {
            loading: { icon: '⏳', text: 'Processing...', class: 'loading' },
            success: { icon: '✅', text: 'Applied!', class: 'success' },
            error: { icon: '❌', text: 'Failed', class: 'error' },
            enabled: { icon: '⏳', text: 'Ready', class: 'ready' },
            disabled: { icon: '⏸️', text: 'Disabled', class: 'disabled' }
        };
        const config = stateConfig[state];
        // Send update message to webview
        this.sendWebviewMessage({
            type: 'updateButtonStatus',
            buttonId,
            status: config
        });
    }
    /**
     * Show success notification
     */
    showSuccessNotification(result) {
        const message = result.message || 'Action completed successfully';
        if (result.filesCreated.length > 0) {
            vscode.window.showInformationMessage(`${message}. Created: ${result.filesCreated.join(', ')}`, 'Open Files').then(selection => {
                if (selection === 'Open Files') {
                    result.filesCreated.forEach((file) => {
                        vscode.workspace.openTextDocument(file).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                    });
                }
            });
        }
        else if (result.filesModified.length > 0) {
            vscode.window.showInformationMessage(`${message}. Modified: ${result.filesModified.join(', ')}`, 'View Changes').then(selection => {
                if (selection === 'View Changes') {
                    // Open the first modified file
                    if (result.filesModified[0]) {
                        vscode.workspace.openTextDocument(result.filesModified[0]).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                    }
                }
            });
        }
        else {
            vscode.window.showInformationMessage(message);
        }
    }
    /**
     * Show error notification
     */
    showErrorNotification(result) {
        const message = result.message || 'Action failed';
        const errors = result.errors || [];
        if (errors.length > 0) {
            vscode.window.showErrorMessage(`${message}: ${errors.join(', ')}`, 'Show Details').then(selection => {
                if (selection === 'Show Details') {
                    // Show detailed error information
                    const errorDetails = [
                        `Action failed: ${message}`,
                        '',
                        'Errors:',
                        ...errors.map((error) => `• ${error}`),
                        '',
                        'Warnings:',
                        ...(result.warnings || []).map((warning) => `• ${warning}`)
                    ].join('\n');
                    vscode.workspace.openTextDocument({
                        content: errorDetails,
                        language: 'plaintext'
                    }).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });
        }
        else {
            vscode.window.showErrorMessage(message);
        }
    }
    /**
     * Send message to webview
     */
    sendWebviewMessage(message) {
        // This would be implemented to communicate with the chat webview
        // For now, we'll just log the message
        console.log('Webview message:', message);
    }
}
exports.ActionButtonManager = ActionButtonManager;
//# sourceMappingURL=actionButtonManager.js.map