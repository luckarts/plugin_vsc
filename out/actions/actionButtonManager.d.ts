import { ActionExecutor } from './actionExecutor';
import { IActionButtonManager, IActionButton, ICodeAction } from './types';
/**
 * Manages action buttons in chat messages
 * Creates, renders, and handles interactions with Apply/Create buttons
 */
export declare class ActionButtonManager implements IActionButtonManager {
    private readonly codeParser;
    private readonly actionExecutor;
    private readonly activeButtons;
    private readonly messageActions;
    constructor(actionExecutor: ActionExecutor);
    /**
     * Create action buttons for a message content
     * @param content The message content to analyze
     * @returns Array of action buttons
     */
    createActionButtons(content: string): Promise<IActionButton[]>;
    /**
     * Render action buttons as HTML
     * @param buttons Array of buttons to render
     * @returns HTML string for buttons
     */
    renderActionButtons(buttons: IActionButton[]): string;
    /**
     * Handle button click events
     * @param buttonId ID of the clicked button
     * @param messageId ID of the message containing the button
     */
    handleButtonClick(buttonId: string, messageId: string): Promise<void>;
    /**
     * Update button enabled state
     * @param buttonId ID of the button to update
     * @param enabled New enabled state
     */
    updateButtonState(buttonId: string, enabled: boolean): void;
    /**
     * Get actions for a specific message
     * @param messageId Message ID
     * @returns Array of actions for the message
     */
    getMessageActions(messageId: string): ICodeAction[];
    /**
     * Store actions for a message
     * @param messageId Message ID
     * @param actions Actions to store
     */
    storeMessageActions(messageId: string, actions: ICodeAction[]): void;
    /**
     * Clear actions for a message
     * @param messageId Message ID
     */
    clearMessageActions(messageId: string): void;
    /**
     * Create a button for a specific action
     */
    private createButtonForAction;
    /**
     * Get appropriate label for button based on action type
     */
    private getButtonLabel;
    /**
     * Get appropriate icon for button based on action type
     */
    private getButtonIcon;
    /**
     * Get tooltip text for button
     */
    private getButtonTooltip;
    /**
     * Check if action should be enabled
     */
    private isActionEnabled;
    /**
     * Render a single button as HTML
     */
    private renderSingleButton;
    /**
     * Get human-readable risk text
     */
    private getRiskText;
    /**
     * Update button visual state
     */
    private updateButtonVisual;
    /**
     * Show success notification
     */
    private showSuccessNotification;
    /**
     * Show error notification
     */
    private showErrorNotification;
    /**
     * Send message to webview
     */
    private sendWebviewMessage;
}
//# sourceMappingURL=actionButtonManager.d.ts.map