import * as vscode from 'vscode';
import { ClaudeClient } from '../claudeClient';
import { VectorDatabase } from '../vectorDb';
/**
 * Advanced chat webview with modern UI and intelligent features
 */
export declare class ChatWebview {
    private panel;
    private readonly claudeClient;
    private readonly vectorDb;
    private readonly context;
    private readonly actionButtonManager;
    private readonly actionExecutor;
    private readonly previewManager;
    private readonly contextMenuManager;
    private readonly undoManager;
    private chatState;
    private config;
    constructor(context: vscode.ExtensionContext, claudeClient: ClaudeClient, vectorDb: VectorDatabase);
    /**
     * Setup webview content and styling
     */
    private setupWebview;
    /**
     * Setup message handling between webview and extension
     */
    private setupMessageHandling;
    /**
     * Handle messages from webview
     */
    private handleWebviewMessage;
    /**
     * Handle sending a message to Claude
     */
    private handleSendMessage;
    /**
     * Handle file attachment
     */
    private handleAttachFile;
    /**
     * Handle file mention (@file)
     */
    private handleMentionFile;
    /**
     * Clear chat history
     */
    private handleClearChat;
    /**
     * Export chat to file
     */
    private handleExportChat;
    /**
     * Handle action button clicks
     */
    private handleActionButtonClick;
    /**
     * Handle context menu actions
     */
    private handleContextMenuAction;
    /**
     * Handle undo action
     */
    private handleUndoAction;
    /**
     * Handle redo action
     */
    private handleRedoAction;
    /**
     * Handle show preview action
     */
    private handleShowPreview;
    /**
     * Add message to chat
     */
    private addMessage;
    /**
     * Set loading state
     */
    private setLoading;
    /**
     * Update webview state
     */
    private updateWebviewState;
    /**
     * Post message to webview
     */
    private postMessage;
    /**
     * Generate unique message ID
     */
    private generateMessageId;
    /**
     * Get current editor information
     */
    private getCurrentEditorInfo;
    /**
     * Get content of attached files
     */
    private getAttachedFilesContent;
    /**
     * Load configuration
     */
    private loadConfig;
    /**
     * Get current theme
     */
    private getCurrentTheme;
    /**
     * Update theme
     */
    private updateTheme;
    /**
     * Export chat to markdown
     */
    private exportChatToMarkdown;
    /**
     * Get webview HTML content
     */
    private getWebviewContent;
    /**
     * Generate complete HTML for the webview
     */
    private getWebviewHTML;
    /**
     * Generate a nonce for CSP
     */
    private generateNonce;
    /**
     * Dispose webview resources
     */
    dispose(): void;
    /**
     * Show the webview panel
     */
    show(): void;
    /**
     * Generate CSS styles with VSCode theme support
     */
    private getWebviewCSS;
    /**
     * Generate JavaScript for webview interactivity
     */
    private getWebviewJavaScript;
}
//# sourceMappingURL=chatWebview.d.ts.map