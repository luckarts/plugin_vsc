import * as vscode from 'vscode';
import { CodeParser } from './codeParser';
import { ActionExecutor } from './actionExecutor';
import {
  IActionButtonManager,
  IActionButton,
  ICodeAction,
  ActionType,
  RiskLevel,
  ActionException
} from './types';

/**
 * Manages action buttons in chat messages
 * Creates, renders, and handles interactions with Apply/Create buttons
 */
export class ActionButtonManager implements IActionButtonManager {
  private readonly codeParser: CodeParser;
  private readonly actionExecutor: ActionExecutor;
  private readonly activeButtons = new Map<string, IActionButton>();
  private readonly messageActions = new Map<string, ICodeAction[]>();

  constructor(actionExecutor: ActionExecutor) {
    this.codeParser = new CodeParser();
    this.actionExecutor = actionExecutor;
  }

  /**
   * Create action buttons for a message content
   * @param content The message content to analyze
   * @returns Array of action buttons
   */
  async createActionButtons(content: string): Promise<IActionButton[]> {
    try {
      // Parse code suggestions from content
      const actions = await this.codeParser.parseCodeSuggestions(content);
      
      if (actions.length === 0) {
        return [];
      }

      const buttons: IActionButton[] = [];

      for (const action of actions) {
        const button = this.createButtonForAction(action);
        buttons.push(button);
        this.activeButtons.set(button.id, button);
      }

      return buttons;

    } catch (error) {
      console.error('Failed to create action buttons:', error);
      return [];
    }
  }

  /**
   * Render action buttons as HTML
   * @param buttons Array of buttons to render
   * @returns HTML string for buttons
   */
  renderActionButtons(buttons: IActionButton[]): string {
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
  async handleButtonClick(buttonId: string, messageId: string): Promise<void> {
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
      } else {
        this.updateButtonVisual(buttonId, 'error');
        this.showErrorNotification(result);
        this.updateButtonState(buttonId, true); // Re-enable for retry
      }

    } catch (error) {
      console.error('Failed to handle button click:', error);
      this.updateButtonVisual(buttonId, 'error');
      this.updateButtonState(buttonId, true);
      
      vscode.window.showErrorMessage(
        `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update button enabled state
   * @param buttonId ID of the button to update
   * @param enabled New enabled state
   */
  updateButtonState(buttonId: string, enabled: boolean): void {
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
  getMessageActions(messageId: string): ICodeAction[] {
    return this.messageActions.get(messageId) || [];
  }

  /**
   * Store actions for a message
   * @param messageId Message ID
   * @param actions Actions to store
   */
  storeMessageActions(messageId: string, actions: ICodeAction[]): void {
    this.messageActions.set(messageId, actions);
  }

  /**
   * Clear actions for a message
   * @param messageId Message ID
   */
  clearMessageActions(messageId: string): void {
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
  private createButtonForAction(action: ICodeAction): IActionButton {
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
  private getButtonLabel(action: ICodeAction): string {
    switch (action.type) {
      case ActionType.CREATE_FILE:
        return 'Create File';
      case ActionType.CREATE_FUNCTION:
        return 'Add Function';
      case ActionType.CREATE_CLASS:
        return 'Add Class';
      case ActionType.CREATE_COMPONENT:
        return 'Create Component';
      case ActionType.APPLY_MODIFICATION:
        return 'Apply Changes';
      case ActionType.FIX_ERROR:
        return 'Fix Error';
      case ActionType.REFACTOR_CODE:
        return 'Refactor';
      case ActionType.ADD_IMPORT:
        return 'Add Import';
      case ActionType.REMOVE_CODE:
        return 'Remove Code';
      default:
        return 'Apply';
    }
  }

  /**
   * Get appropriate icon for button based on action type
   */
  private getButtonIcon(action: ICodeAction): string {
    switch (action.type) {
      case ActionType.CREATE_FILE:
        return '📄';
      case ActionType.CREATE_FUNCTION:
        return '⚡';
      case ActionType.CREATE_CLASS:
        return '🏗️';
      case ActionType.CREATE_COMPONENT:
        return '🧩';
      case ActionType.APPLY_MODIFICATION:
        return '✏️';
      case ActionType.FIX_ERROR:
        return '🔧';
      case ActionType.REFACTOR_CODE:
        return '♻️';
      case ActionType.ADD_IMPORT:
        return '📦';
      case ActionType.REMOVE_CODE:
        return '🗑️';
      default:
        return '✅';
    }
  }

  /**
   * Get tooltip text for button
   */
  private getButtonTooltip(action: ICodeAction): string {
    const riskText = this.getRiskText(action.metadata.riskLevel);
    const confidenceText = `${Math.round(action.metadata.confidence * 100)}% confidence`;
    
    return `${action.description}\n${riskText} • ${confidenceText}\n${action.metadata.estimatedImpact}`;
  }

  /**
   * Check if action should be enabled
   */
  private isActionEnabled(action: ICodeAction): boolean {
    // Disable critical risk actions by default
    if (action.metadata.riskLevel === RiskLevel.CRITICAL) {
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
  private renderSingleButton(button: IActionButton): string {
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
  private getRiskText(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return '🟢 Low Risk';
      case RiskLevel.MEDIUM:
        return '🟡 Medium Risk';
      case RiskLevel.HIGH:
        return '🟠 High Risk';
      case RiskLevel.CRITICAL:
        return '🔴 Critical Risk';
      default:
        return '⚪ Unknown Risk';
    }
  }

  /**
   * Update button visual state
   */
  private updateButtonVisual(buttonId: string, state: 'loading' | 'success' | 'error' | 'enabled' | 'disabled'): void {
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
  private showSuccessNotification(result: any): void {
    const message = result.message || 'Action completed successfully';
    
    if (result.filesCreated.length > 0) {
      vscode.window.showInformationMessage(
        `${message}. Created: ${result.filesCreated.join(', ')}`,
        'Open Files'
      ).then(selection => {
        if (selection === 'Open Files') {
          result.filesCreated.forEach((file: string) => {
            vscode.workspace.openTextDocument(file).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          });
        }
      });
    } else if (result.filesModified.length > 0) {
      vscode.window.showInformationMessage(
        `${message}. Modified: ${result.filesModified.join(', ')}`,
        'View Changes'
      ).then(selection => {
        if (selection === 'View Changes') {
          // Open the first modified file
          if (result.filesModified[0]) {
            vscode.workspace.openTextDocument(result.filesModified[0]).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          }
        }
      });
    } else {
      vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Show error notification
   */
  private showErrorNotification(result: any): void {
    const message = result.message || 'Action failed';
    const errors = result.errors || [];
    
    if (errors.length > 0) {
      vscode.window.showErrorMessage(
        `${message}: ${errors.join(', ')}`,
        'Show Details'
      ).then(selection => {
        if (selection === 'Show Details') {
          // Show detailed error information
          const errorDetails = [
            `Action failed: ${message}`,
            '',
            'Errors:',
            ...errors.map((error: string) => `• ${error}`),
            '',
            'Warnings:',
            ...(result.warnings || []).map((warning: string) => `• ${warning}`)
          ].join('\n');

          vscode.workspace.openTextDocument({
            content: errorDetails,
            language: 'plaintext'
          }).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        }
      });
    } else {
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Send message to webview
   */
  private sendWebviewMessage(message: any): void {
    // This would be implemented to communicate with the chat webview
    // For now, we'll just log the message
    console.log('Webview message:', message);
  }
}
