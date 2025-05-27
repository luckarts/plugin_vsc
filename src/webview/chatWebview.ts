import * as vscode from 'vscode';
import * as path from 'path';
import { IChatMessage, IChatState, IWebviewMessage, WebviewMessageType, IChatConfig } from './types';
import { ClaudeClient } from '../claudeClient';
import { VectorDatabase } from '../vectorDb';
import {
  ActionButtonManager,
  ActionExecutor,
  PreviewManager,
  ContextMenuManager,
  UndoManager
} from '../actions';

/**
 * Advanced chat webview with modern UI and intelligent features
 */
export class ChatWebview {
  private panel: vscode.WebviewPanel;
  private readonly claudeClient: ClaudeClient;
  private readonly vectorDb: VectorDatabase;
  private readonly context: vscode.ExtensionContext;
  private readonly actionButtonManager: ActionButtonManager;
  private readonly actionExecutor: ActionExecutor;
  private readonly previewManager: PreviewManager;
  private readonly contextMenuManager: ContextMenuManager;
  private readonly undoManager: UndoManager;
  private chatState: IChatState;
  private config: IChatConfig;

  constructor(
    context: vscode.ExtensionContext,
    claudeClient: ClaudeClient,
    vectorDb: VectorDatabase
  ) {
    this.context = context;
    this.claudeClient = claudeClient;
    this.vectorDb = vectorDb;

    // Initialize action managers
    this.actionExecutor = new ActionExecutor();
    this.actionButtonManager = new ActionButtonManager(this.actionExecutor);
    this.previewManager = new PreviewManager(context);
    this.contextMenuManager = new ContextMenuManager(context);
    this.undoManager = new UndoManager(context);

    // Initialize chat state
    this.chatState = {
      messages: [],
      isLoading: false,
      currentInput: '',
      theme: 'auto',
      suggestions: [],
      attachedFiles: []
    };

    // Initialize configuration
    this.config = this.loadConfig();

    // Create webview panel
    this.panel = vscode.window.createWebviewPanel(
      'codeAssistChat',
      'Code Assistant AI',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media'),
          vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')
        ]
      }
    );

    this.setupWebview();
    this.setupMessageHandling();
  }

  /**
   * Setup webview content and styling
   */
  private setupWebview(): void {
    this.panel.webview.html = this.getWebviewContent();

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.dispose();
    });

    // Handle theme changes
    vscode.window.onDidChangeActiveColorTheme(() => {
      this.updateTheme();
    });

    // Send initial state
    this.postMessage({
      type: WebviewMessageType.INIT,
      payload: {
        state: this.chatState,
        config: this.config,
        theme: this.getCurrentTheme()
      }
    });
  }

  /**
   * Setup message handling between webview and extension
   */
  private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(async (message: IWebviewMessage) => {
      try {
        await this.handleWebviewMessage(message);
      } catch (error) {
        console.error('Error handling webview message:', error);
        this.postMessage({
          type: WebviewMessageType.ERROR,
          payload: {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          }
        });
      }
    });
  }

  /**
   * Handle messages from webview
   */
  private async handleWebviewMessage(message: IWebviewMessage): Promise<void> {
    switch (message.type) {
      case WebviewMessageType.SEND_MESSAGE:
        await this.handleSendMessage(message.payload);
        break;

      case WebviewMessageType.ATTACH_FILE:
        await this.handleAttachFile();
        break;

      case WebviewMessageType.MENTION_FILE:
        await this.handleMentionFile();
        break;

      case WebviewMessageType.CLEAR_CHAT:
        this.handleClearChat();
        break;

      case WebviewMessageType.EXPORT_CHAT:
        await this.handleExportChat();
        break;

      case WebviewMessageType.ACTION_BUTTON_CLICK:
        await this.handleActionButtonClick(message.payload);
        break;

      case WebviewMessageType.CONTEXT_MENU_ACTION:
        await this.handleContextMenuAction(message.payload);
        break;

      case WebviewMessageType.UNDO_ACTION:
        await this.handleUndoAction();
        break;

      case WebviewMessageType.REDO_ACTION:
        await this.handleRedoAction();
        break;

      case WebviewMessageType.SHOW_PREVIEW:
        await this.handleShowPreview(message.payload);
        break;

      default:
        console.warn('Unknown webview message type:', message.type);
    }
  }

  /**
   * Handle sending a message to Claude
   */
  private async handleSendMessage(payload: { content: string; attachedFiles?: string[] }): Promise<void> {
    const { content, attachedFiles = [] } = payload;

    if (!content.trim()) {
      return;
    }

    // Add user message
    const userMessage: IChatMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      metadata: {
        attachedFiles
      }
    };

    this.addMessage(userMessage);

    // Show loading state
    this.setLoading(true);

    try {
      // Get relevant code context from vector database
      const relevantCode = await this.vectorDb.getRelevantCode(content, 5);

      // Prepare enhanced context
      const enhancedContext = {
        codeContext: relevantCode,
        currentEditor: this.getCurrentEditorInfo(),
        attachedFiles: await this.getAttachedFilesContent(attachedFiles)
      };

      // Get response from Claude
      const startTime = Date.now();
      const response = await this.claudeClient.getCompletion(content, enhancedContext);
      const processingTime = Date.now() - startTime;

      // Create action buttons for the response
      const actionButtons = await this.actionButtonManager.createActionButtons(response);

      // Add assistant response
      const assistantMessage: IChatMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        isMarkdown: true,
        metadata: {
          codeContext: relevantCode,
          relevantChunks: relevantCode.length,
          processingTime,
          model: 'claude-3-sonnet',
          actionButtons: actionButtons.length > 0 ? actionButtons : undefined
        }
      };

      this.addMessage(assistantMessage);

      // Store actions for this message
      if (actionButtons.length > 0) {
        this.actionButtonManager.storeMessageActions(assistantMessage.id, actionButtons.map(btn => btn.action));
      }

    } catch (error) {
      // Add error message
      const errorMessage: IChatMessage = {
        id: this.generateMessageId(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: Date.now()
      };

      this.addMessage(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle file attachment
   */
  private async handleAttachFile(): Promise<void> {
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: {
        'Code Files': ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'cs', 'cpp', 'c', 'go', 'rs'],
        'Text Files': ['txt', 'md', 'json', 'xml', 'yaml', 'yml'],
        'All Files': ['*']
      }
    });

    if (fileUris && fileUris.length > 0) {
      const filePaths = fileUris.map(uri => uri.fsPath);
      this.chatState.attachedFiles.push(...filePaths);

      this.postMessage({
        type: WebviewMessageType.FILE_ATTACHED,
        payload: { files: filePaths }
      });
    }
  }

  /**
   * Handle file mention (@file)
   */
  private async handleMentionFile(): Promise<void> {
    const openEditors = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .filter(tab => tab.input instanceof vscode.TabInputText)
      .map(tab => ({
        label: path.basename((tab.input as vscode.TabInputText).uri.fsPath),
        detail: (tab.input as vscode.TabInputText).uri.fsPath,
        uri: (tab.input as vscode.TabInputText).uri
      }));

    if (openEditors.length === 0) {
      vscode.window.showInformationMessage('No open files to mention');
      return;
    }

    const selected = await vscode.window.showQuickPick(openEditors, {
      placeHolder: 'Select a file to mention in the chat'
    });

    if (selected) {
      this.postMessage({
        type: WebviewMessageType.MENTION_FILE,
        payload: {
          fileName: selected.label,
          filePath: selected.detail
        }
      });
    }
  }

  /**
   * Clear chat history
   */
  private handleClearChat(): void {
    this.chatState.messages = [];
    this.chatState.attachedFiles = [];
    this.updateWebviewState();
  }

  /**
   * Export chat to file
   */
  private async handleExportChat(): Promise<void> {
    if (this.chatState.messages.length === 0) {
      vscode.window.showInformationMessage('No messages to export');
      return;
    }

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`chat-export-${Date.now()}.md`),
      filters: {
        'Markdown': ['md'],
        'Text': ['txt'],
        'JSON': ['json']
      }
    });

    if (saveUri) {
      const content = this.exportChatToMarkdown();
      await vscode.workspace.fs.writeFile(saveUri, new TextEncoder().encode(content));
      vscode.window.showInformationMessage('Chat exported successfully');
    }
  }

  /**
   * Handle action button clicks
   */
  private async handleActionButtonClick(payload: any): Promise<void> {
    try {
      const { buttonId, messageId } = payload;

      if (!buttonId || !messageId) {
        throw new Error('Invalid action button click payload');
      }

      // Handle the button click
      await this.actionButtonManager.handleButtonClick(buttonId, messageId);

      // Send update to webview to reflect button state changes
      this.postMessage({
        type: WebviewMessageType.ACTION_BUTTON_UPDATE,
        payload: { buttonId, status: 'completed' }
      });

    } catch (error) {
      console.error('Failed to handle action button click:', error);
      vscode.window.showErrorMessage(
        `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle context menu actions
   */
  private async handleContextMenuAction(payload: any): Promise<void> {
    try {
      const { actionId, elementId } = payload;

      switch (actionId) {
        case 'apply':
          // Handle apply action
          break;
        case 'create':
          // Handle create action
          break;
        case 'copy':
          // Handle copy action
          await vscode.env.clipboard.writeText(payload.content || '');
          vscode.window.showInformationMessage('Code copied to clipboard');
          break;
        case 'goto':
          // Handle go to action
          if (payload.filePath) {
            const uri = vscode.Uri.file(payload.filePath);
            await vscode.window.showTextDocument(uri);
          }
          break;
        case 'preview':
          // Handle preview action
          await this.handleShowPreview(payload);
          break;
        case 'edit':
          // Handle edit action
          break;
      }

    } catch (error) {
      console.error('Failed to handle context menu action:', error);
      vscode.window.showErrorMessage(
        `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle undo action
   */
  private async handleUndoAction(): Promise<void> {
    try {
      const result = await this.undoManager.undoLastAction();

      if (result.success) {
        vscode.window.showInformationMessage(result.message);
      } else {
        vscode.window.showWarningMessage(result.message);
      }

    } catch (error) {
      console.error('Failed to undo action:', error);
      vscode.window.showErrorMessage('Failed to undo action');
    }
  }

  /**
   * Handle redo action
   */
  private async handleRedoAction(): Promise<void> {
    try {
      const result = await this.undoManager.redoLastAction();

      if (result.success) {
        vscode.window.showInformationMessage(result.message);
      } else {
        vscode.window.showWarningMessage(result.message);
      }

    } catch (error) {
      console.error('Failed to redo action:', error);
      vscode.window.showErrorMessage('Failed to redo action');
    }
  }

  /**
   * Handle show preview action
   */
  private async handleShowPreview(payload: any): Promise<void> {
    try {
      // This would show the preview manager
      // Implementation depends on the specific preview type
      console.log('Show preview:', payload);

    } catch (error) {
      console.error('Failed to show preview:', error);
      vscode.window.showErrorMessage('Failed to show preview');
    }
  }

  /**
   * Add message to chat
   */
  private addMessage(message: IChatMessage): void {
    this.chatState.messages.push(message);
    this.updateWebviewState();
  }

  /**
   * Set loading state
   */
  private setLoading(isLoading: boolean): void {
    this.chatState.isLoading = isLoading;
    this.postMessage({
      type: isLoading ? WebviewMessageType.LOADING_START : WebviewMessageType.LOADING_END,
      payload: { isLoading }
    });
  }

  /**
   * Update webview state
   */
  private updateWebviewState(): void {
    this.postMessage({
      type: WebviewMessageType.CONFIG_UPDATE,
      payload: { state: this.chatState }
    });
  }

  /**
   * Post message to webview
   */
  private postMessage(message: IWebviewMessage): void {
    this.panel.webview.postMessage(message);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current editor information
   */
  private getCurrentEditorInfo(): any {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return null;
    }

    return {
      fileName: path.basename(activeEditor.document.fileName),
      filePath: activeEditor.document.fileName,
      language: activeEditor.document.languageId,
      selectedText: activeEditor.document.getText(activeEditor.selection),
      lineCount: activeEditor.document.lineCount
    };
  }

  /**
   * Get content of attached files
   */
  private async getAttachedFilesContent(filePaths: string[]): Promise<any[]> {
    const filesContent = [];

    for (const filePath of filePaths) {
      try {
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder().decode(content);

        filesContent.push({
          path: filePath,
          name: path.basename(filePath),
          content: text.substring(0, 5000) // Limit content size
        });
      } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
      }
    }

    return filesContent;
  }

  /**
   * Load configuration
   */
  private loadConfig(): IChatConfig {
    const config = vscode.workspace.getConfiguration('codeAssist');

    return {
      maxMessages: config.get('maxMessages', 100),
      enableMarkdown: config.get('enableMarkdown', true),
      enableCodeHighlight: config.get('enableCodeHighlight', true),
      enableAutoComplete: config.get('enableAutoComplete', true),
      theme: config.get('theme', 'auto'),
      fontSize: config.get('fontSize', 14),
      showTimestamps: config.get('showTimestamps', true),
      enableSounds: config.get('enableSounds', false)
    };
  }

  /**
   * Get current theme
   */
  private getCurrentTheme(): 'light' | 'dark' {
    const theme = vscode.window.activeColorTheme;
    return theme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark';
  }

  /**
   * Update theme
   */
  private updateTheme(): void {
    this.postMessage({
      type: WebviewMessageType.THEME_CHANGED,
      payload: { theme: this.getCurrentTheme() }
    });
  }

  /**
   * Export chat to markdown
   */
  private exportChatToMarkdown(): string {
    const lines = ['# Code Assistant AI Chat Export', ''];

    for (const message of this.chatState.messages) {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);

      lines.push(`## ${role} - ${timestamp}`);
      lines.push('');
      lines.push(message.content);
      lines.push('');

      if (message.metadata) {
        lines.push('**Metadata:**');
        lines.push(`- Processing time: ${message.metadata.processingTime}ms`);
        lines.push(`- Relevant chunks: ${message.metadata.relevantChunks}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(): string {
    return this.getWebviewHTML();
  }

  /**
   * Generate complete HTML for the webview
   */
  private getWebviewHTML(): string {
    const nonce = this.generateNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Code Assistant AI</title>
    <style>
        ${this.getWebviewCSS()}
    </style>
</head>
<body>
    <div id="app">
        <!-- Header with toolbar -->
        <header class="chat-header">
            <div class="header-title">
                <span class="title-icon">🤖</span>
                <h1>Code Assistant AI</h1>
                <span class="status-indicator" id="statusIndicator"></span>
            </div>
            <div class="toolbar">
                <button class="toolbar-btn" id="attachBtn" title="Attach File (Ctrl+Shift+A)">
                    <span class="icon">📎</span>
                </button>
                <button class="toolbar-btn" id="mentionBtn" title="Mention File (@)">
                    <span class="icon">@</span>
                </button>
                <button class="toolbar-btn" id="clearBtn" title="Clear Chat (Ctrl+Shift+C)">
                    <span class="icon">🗑️</span>
                </button>
                <button class="toolbar-btn" id="exportBtn" title="Export Chat">
                    <span class="icon">💾</span>
                </button>
                <button class="toolbar-btn" id="settingsBtn" title="Settings">
                    <span class="icon">⚙️</span>
                </button>
            </div>
        </header>

        <!-- Messages container -->
        <main class="chat-container">
            <div class="messages-wrapper">
                <div id="messagesContainer" class="messages-container">
                    <!-- Welcome message -->
                    <div class="message system-message">
                        <div class="message-content">
                            <h3>👋 Welcome to Code Assistant AI!</h3>
                            <p>I'm here to help you with your code. You can:</p>
                            <ul>
                                <li>Ask questions about your codebase</li>
                                <li>Get code suggestions and explanations</li>
                                <li>Attach files with 📎 or mention them with @</li>
                                <li>Use <code>Ctrl+Enter</code> to send messages</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Loading indicator -->
                <div id="loadingIndicator" class="loading-indicator hidden">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span class="loading-text">Claude is thinking...</span>
                </div>
            </div>
        </main>

        <!-- Input area -->
        <footer class="input-area">
            <!-- Attached files display -->
            <div id="attachedFiles" class="attached-files hidden"></div>

            <!-- Auto-complete suggestions -->
            <div id="suggestions" class="suggestions hidden"></div>

            <!-- Input container -->
            <div class="input-container">
                <div class="input-wrapper">
                    <textarea
                        id="messageInput"
                        class="message-input"
                        placeholder="Ask me anything about your code... (Ctrl+Enter to send)"
                        rows="1"
                        maxlength="4000"
                    ></textarea>
                    <div class="input-actions">
                        <button id="sendBtn" class="send-btn" title="Send Message (Ctrl+Enter)">
                            <span class="icon">➤</span>
                        </button>
                    </div>
                </div>
                <div class="input-footer">
                    <span class="char-count" id="charCount">0/4000</span>
                    <span class="shortcuts-hint">Ctrl+Enter to send • @ to mention files • 📎 to attach</span>
                </div>
            </div>
        </footer>
    </div>

    <script nonce="${nonce}">
        ${this.getWebviewJavaScript()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate a nonce for CSP
   */
  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Dispose webview resources
   */
  public dispose(): void {
    this.panel.dispose();
    this.previewManager.dispose();
    this.undoManager.dispose();
  }

  /**
   * Show the webview panel
   */
  public show(): void {
    this.panel.reveal(vscode.ViewColumn.Two);
  }

  /**
   * Generate CSS styles with VSCode theme support
   */
  private getWebviewCSS(): string {
    return `
      /* CSS Variables for VSCode theme integration */
      :root {
        --vscode-font-family: var(--vscode-font-family);
        --vscode-font-size: var(--vscode-font-size);
        --vscode-font-weight: var(--vscode-font-weight);

        /* Colors */
        --bg-primary: var(--vscode-editor-background);
        --bg-secondary: var(--vscode-sideBar-background);
        --bg-tertiary: var(--vscode-input-background);
        --text-primary: var(--vscode-editor-foreground);
        --text-secondary: var(--vscode-descriptionForeground);
        --text-muted: var(--vscode-disabledForeground);
        --border-color: var(--vscode-panel-border);
        --accent-color: var(--vscode-focusBorder);
        --success-color: var(--vscode-terminal-ansiGreen);
        --warning-color: var(--vscode-terminal-ansiYellow);
        --error-color: var(--vscode-terminal-ansiRed);

        /* Buttons */
        --btn-bg: var(--vscode-button-background);
        --btn-fg: var(--vscode-button-foreground);
        --btn-hover-bg: var(--vscode-button-hoverBackground);
        --btn-secondary-bg: var(--vscode-button-secondaryBackground);
        --btn-secondary-fg: var(--vscode-button-secondaryForeground);

        /* Input */
        --input-bg: var(--vscode-input-background);
        --input-fg: var(--vscode-input-foreground);
        --input-border: var(--vscode-input-border);
        --input-focus-border: var(--vscode-inputOption-activeBorder);

        /* Code */
        --code-bg: var(--vscode-textCodeBlock-background);
        --code-border: var(--vscode-textBlockQuote-border);

        /* Scrollbar */
        --scrollbar-bg: var(--vscode-scrollbarSlider-background);
        --scrollbar-hover-bg: var(--vscode-scrollbarSlider-hoverBackground);
        --scrollbar-active-bg: var(--vscode-scrollbarSlider-activeBackground);
      }

      /* Reset and base styles */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--text-primary);
        background: var(--bg-primary);
        overflow: hidden;
        height: 100vh;
      }

      #app {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
      }

      /* Header styles */
      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
      }

      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .title-icon {
        font-size: 20px;
      }

      .header-title h1 {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--success-color);
        margin-left: 8px;
      }

      .status-indicator.loading {
        background: var(--warning-color);
        animation: pulse 1.5s infinite;
      }

      .status-indicator.error {
        background: var(--error-color);
      }

      /* Toolbar styles */
      .toolbar {
        display: flex;
        gap: 4px;
      }

      .toolbar-btn {
        background: transparent;
        border: 1px solid transparent;
        border-radius: 4px;
        padding: 6px 8px;
        cursor: pointer;
        color: var(--text-secondary);
        transition: all 0.2s ease;
        font-size: 14px;
      }

      .toolbar-btn:hover {
        background: var(--btn-secondary-bg);
        color: var(--btn-secondary-fg);
        border-color: var(--border-color);
      }

      .toolbar-btn:active {
        transform: translateY(1px);
      }

      /* Main chat container */
      .chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .messages-wrapper {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        scroll-behavior: smooth;
      }

      .messages-container {
        max-width: 100%;
        margin: 0 auto;
      }

      /* Message styles */
      .message {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        animation: slideIn 0.3s ease-out;
      }

      .message.user-message {
        align-items: flex-end;
      }

      .message.assistant-message {
        align-items: flex-start;
      }

      .message.system-message {
        align-items: center;
      }

      .message-content {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 12px;
        word-wrap: break-word;
        line-height: 1.5;
      }

      .user-message .message-content {
        background: var(--accent-color);
        color: var(--btn-fg);
        border-bottom-right-radius: 4px;
      }

      .assistant-message .message-content {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-bottom-left-radius: 4px;
      }

      .system-message .message-content {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 8px;
        text-align: center;
        max-width: 90%;
      }

      .message-meta {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 4px;
        padding: 0 4px;
      }

      /* Code highlighting */
      .message-content pre {
        background: var(--code-bg);
        border: 1px solid var(--code-border);
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        overflow-x: auto;
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
      }

      .message-content code {
        background: var(--code-bg);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em;
      }

      .message-content pre code {
        background: transparent;
        padding: 0;
      }

      /* Action Buttons Styles */
      .action-buttons-container {
        margin: 16px 0;
        padding: 16px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .action-buttons-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .action-buttons-title {
        font-weight: 600;
        color: var(--vscode-foreground);
        font-size: 14px;
      }

      .action-buttons-count {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 8px;
        border-radius: 12px;
      }

      .action-buttons-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .action-button {
        display: flex;
        flex-direction: column;
        padding: 12px;
        border: 1px solid var(--vscode-button-border);
        border-radius: 6px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }

      .action-button:hover {
        background: var(--vscode-button-hoverBackground);
        border-color: var(--vscode-focusBorder);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .action-button.disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--vscode-button-secondaryBackground);
      }

      .button-main {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .button-icon {
        font-size: 16px;
        min-width: 20px;
        text-align: center;
      }

      .button-label {
        font-weight: 500;
        flex: 1;
        font-size: 13px;
      }

      .button-confidence {
        font-size: 11px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }

      .button-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 6px;
      }

      .button-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        background: var(--vscode-inputOption-activeBackground);
        color: var(--vscode-inputOption-activeForeground);
      }

      .action-button.risk-low {
        border-left: 4px solid #28a745;
      }

      .action-button.risk-medium {
        border-left: 4px solid #ffc107;
      }

      .action-button.risk-high {
        border-left: 4px solid #fd7e14;
      }

      .action-button.risk-critical {
        border-left: 4px solid #dc3545;
      }

      .action-button .button-status.loading .status-icon {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Enhanced animations and transitions */
      .action-button {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .action-button:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow:
          0 8px 25px rgba(0, 0, 0, 0.15),
          0 0 0 1px var(--vscode-focusBorder);
      }

      .action-button:active {
        transform: translateY(0) scale(0.98);
        transition: all 0.1s ease;
      }

      @keyframes successBounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -8px, 0);
        }
        70% {
          transform: translate3d(0, -4px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }

      .success-bounce {
        animation: successBounce 1s ease-in-out;
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
      }

      .error-shake {
        animation: shake 0.5s ease-in-out;
      }

      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .fade-in-scale {
        animation: fadeInScale 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Context menu animations */
      .context-menu .menu-dropdown {
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: all 0.2s ease;
      }

      .context-menu .menu-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      /* Notification animations */
      @keyframes notificationSlideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .notification {
        animation: notificationSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Loading indicator */
      .loading-indicator {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        color: var(--text-secondary);
      }

      .loading-indicator.hidden {
        display: none;
      }

      .loading-dots {
        display: flex;
        gap: 4px;
      }

      .loading-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent-color);
        animation: bounce 1.4s infinite ease-in-out both;
      }

      .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

      /* Input area */
      .input-area {
        flex-shrink: 0;
        background: var(--bg-secondary);
        border-top: 1px solid var(--border-color);
        padding: 16px;
      }

      .attached-files {
        margin-bottom: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .attached-files.hidden {
        display: none;
      }

      .attached-file {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .attached-file .remove-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
      }

      .suggestions {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        margin-bottom: 8px;
        max-height: 200px;
        overflow-y: auto;
      }

      .suggestions.hidden {
        display: none;
      }

      .suggestion-item {
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
      }

      .suggestion-item:last-child {
        border-bottom: none;
      }

      .suggestion-item:hover {
        background: var(--btn-secondary-bg);
      }

      .suggestion-item.selected {
        background: var(--accent-color);
        color: var(--btn-fg);
      }

      /* Input container */
      .input-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .input-wrapper {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: var(--input-bg);
        border: 1px solid var(--input-border);
        border-radius: 8px;
        padding: 8px;
      }

      .input-wrapper:focus-within {
        border-color: var(--input-focus-border);
      }

      .message-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--input-fg);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        resize: none;
        min-height: 20px;
        max-height: 120px;
        line-height: 1.4;
      }

      .message-input::placeholder {
        color: var(--text-muted);
      }

      .input-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .send-btn {
        background: var(--btn-bg);
        color: var(--btn-fg);
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        font-size: 16px;
      }

      .send-btn:hover {
        background: var(--btn-hover-bg);
      }

      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .input-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: var(--text-muted);
      }

      .char-count {
        font-family: monospace;
      }

      .shortcuts-hint {
        font-style: italic;
      }

      /* Animations */
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      /* Scrollbar styling */
      .messages-wrapper::-webkit-scrollbar {
        width: 8px;
      }

      .messages-wrapper::-webkit-scrollbar-track {
        background: transparent;
      }

      .messages-wrapper::-webkit-scrollbar-thumb {
        background: var(--scrollbar-bg);
        border-radius: 4px;
      }

      .messages-wrapper::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-hover-bg);
      }

      .messages-wrapper::-webkit-scrollbar-thumb:active {
        background: var(--scrollbar-active-bg);
      }

      /* Responsive design */
      @media (max-width: 600px) {
        .chat-header {
          padding: 8px 12px;
        }

        .messages-wrapper {
          padding: 12px;
        }

        .message-content {
          max-width: 95%;
        }

        .toolbar {
          gap: 2px;
        }

        .toolbar-btn {
          padding: 4px 6px;
          font-size: 12px;
        }
      }

      /* Utility classes */
      .hidden {
        display: none !important;
      }

      .fade-in {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .shake {
        animation: shake 0.5s ease-in-out;
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
    `;
  }

  /**
   * Generate JavaScript for webview interactivity
   */
  private getWebviewJavaScript(): string {
    return `
      // VSCode API
      const vscode = acquireVsCodeApi();

      // State management
      let chatState = {
        messages: [],
        isLoading: false,
        currentInput: '',
        theme: 'auto',
        suggestions: [],
        attachedFiles: []
      };

      let config = {
        maxMessages: 100,
        enableMarkdown: true,
        enableCodeHighlight: true,
        enableAutoComplete: true,
        theme: 'auto',
        fontSize: 14,
        showTimestamps: true,
        enableSounds: false
      };

      // DOM elements
      let messagesContainer;
      let messageInput;
      let sendBtn;
      let loadingIndicator;
      let statusIndicator;
      let charCount;
      let attachedFilesContainer;
      let suggestionsContainer;

      // Initialize when DOM is ready
      document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        setupEventListeners();
        setupKeyboardShortcuts();
        autoResizeTextarea();
      });

      // Initialize DOM elements
      function initializeElements() {
        messagesContainer = document.getElementById('messagesContainer');
        messageInput = document.getElementById('messageInput');
        sendBtn = document.getElementById('sendBtn');
        loadingIndicator = document.getElementById('loadingIndicator');
        statusIndicator = document.getElementById('statusIndicator');
        charCount = document.getElementById('charCount');
        attachedFilesContainer = document.getElementById('attachedFiles');
        suggestionsContainer = document.getElementById('suggestions');
      }

      // Setup event listeners
      function setupEventListeners() {
        // Send button
        sendBtn.addEventListener('click', sendMessage);

        // Input events
        messageInput.addEventListener('input', handleInputChange);
        messageInput.addEventListener('keydown', handleKeyDown);
        messageInput.addEventListener('paste', handlePaste);

        // Toolbar buttons
        document.getElementById('attachBtn').addEventListener('click', () => {
          vscode.postMessage({ type: 'attachFile' });
        });

        document.getElementById('mentionBtn').addEventListener('click', () => {
          vscode.postMessage({ type: 'mentionFile' });
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
          if (confirm('Are you sure you want to clear the chat history?')) {
            vscode.postMessage({ type: 'clearChat' });
          }
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
          vscode.postMessage({ type: 'exportChat' });
        });

        // Message from extension
        window.addEventListener('message', handleExtensionMessage);
      }

      // Setup keyboard shortcuts
      function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
          // Ctrl+Enter or Cmd+Enter to send
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
          }

          // Ctrl+Shift+A to attach file
          if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            vscode.postMessage({ type: 'attachFile' });
          }

          // Ctrl+Shift+C to clear chat
          if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            if (confirm('Are you sure you want to clear the chat history?')) {
              vscode.postMessage({ type: 'clearChat' });
            }
          }

          // Escape to close suggestions
          if (e.key === 'Escape') {
            hideSuggestions();
          }

          // Arrow keys for suggestion navigation
          if (suggestionsContainer && !suggestionsContainer.classList.contains('hidden')) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              selectCurrentSuggestion();
            }
          }
        });
      }

      // Handle input changes
      function handleInputChange() {
        const value = messageInput.value;
        chatState.currentInput = value;

        // Update character count
        updateCharCount(value.length);

        // Auto-resize textarea
        autoResizeTextarea();

        // Handle auto-complete
        if (config.enableAutoComplete) {
          handleAutoComplete(value);
        }

        // Update send button state
        updateSendButtonState();
      }

      // Handle key down events
      function handleKeyDown(e) {
        // Enter without modifiers - new line (default behavior)
        // Ctrl+Enter - send message (handled in global shortcuts)

        // Tab for auto-complete
        if (e.key === 'Tab' && !suggestionsContainer.classList.contains('hidden')) {
          e.preventDefault();
          selectCurrentSuggestion();
        }

        // @ symbol for file mention
        if (e.key === '@') {
          setTimeout(() => {
            showFileSuggestions();
          }, 0);
        }
      }

      // Handle paste events
      function handlePaste(e) {
        // Handle pasted files or images
        const items = e.clipboardData?.items;
        if (items) {
          for (let item of items) {
            if (item.kind === 'file') {
              e.preventDefault();
              // Handle file paste (could be implemented later)
              showNotification('File pasting not yet supported. Use the attach button instead.', 'warning');
            }
          }
        }
      }

      // Send message
      function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || chatState.isLoading) {
          return;
        }

        // Add user message to UI immediately
        addMessageToUI({
          id: generateId(),
          role: 'user',
          content: content,
          timestamp: Date.now(),
          metadata: {
            attachedFiles: [...chatState.attachedFiles]
          }
        });

        // Clear input
        messageInput.value = '';
        chatState.currentInput = '';
        updateCharCount(0);
        autoResizeTextarea();
        clearAttachedFiles();
        hideSuggestions();

        // Send to extension
        vscode.postMessage({
          type: 'sendMessage',
          payload: {
            content: content,
            attachedFiles: [...chatState.attachedFiles]
          }
        });

        // Reset attached files
        chatState.attachedFiles = [];
      }

      // Handle messages from extension
      function handleExtensionMessage(event) {
        const message = event.data;

        switch (message.type) {
          case 'init':
            chatState = { ...chatState, ...message.payload.state };
            config = { ...config, ...message.payload.config };
            updateTheme(message.payload.theme);
            break;

          case 'messageResponse':
            addMessageToUI(message.payload.message);
            break;

          case 'loadingStart':
            setLoadingState(true);
            break;

          case 'loadingEnd':
            setLoadingState(false);
            break;

          case 'error':
            showNotification(message.payload.message, 'error');
            setLoadingState(false);
            break;

          case 'themeChanged':
            updateTheme(message.payload.theme);
            break;

          case 'fileAttached':
            addAttachedFiles(message.payload.files);
            break;

          case 'mentionFile':
            insertFileReference(message.payload.fileName, message.payload.filePath);
            break;

          case 'configUpdate':
            if (message.payload.state) {
              chatState = { ...chatState, ...message.payload.state };
              renderMessages();
            }
            break;
        }
      }

      // Add message to UI
      function addMessageToUI(message) {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
        scrollToBottom();

        // Add to state
        chatState.messages.push(message);

        // Limit messages
        if (chatState.messages.length > config.maxMessages) {
          chatState.messages = chatState.messages.slice(-config.maxMessages);
          renderMessages();
        }
      }

      // Create message element
      function createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = \`message \${message.role}-message fade-in\`;
        messageDiv.setAttribute('data-message-id', message.id);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Process content based on type
        if (message.isMarkdown && config.enableMarkdown) {
          contentDiv.innerHTML = renderMarkdown(message.content);
        } else {
          contentDiv.textContent = message.content;
        }

        messageDiv.appendChild(contentDiv);

        // Add action buttons if available
        if (message.metadata?.actionButtons && message.metadata.actionButtons.length > 0) {
          const buttonsHTML = ActionButtonsManager.createActionButtonsHTML(message.metadata.actionButtons);
          const buttonsContainer = document.createElement('div');
          buttonsContainer.innerHTML = buttonsHTML;
          messageDiv.appendChild(buttonsContainer.firstElementChild);
        }

        // Add metadata if available
        if (config.showTimestamps || message.metadata) {
          const metaDiv = document.createElement('div');
          metaDiv.className = 'message-meta';

          let metaText = '';
          if (config.showTimestamps) {
            metaText += new Date(message.timestamp).toLocaleTimeString();
          }

          if (message.metadata?.processingTime) {
            metaText += \` • \${message.metadata.processingTime}ms\`;
          }

          if (message.metadata?.relevantChunks) {
            metaText += \` • \${message.metadata.relevantChunks} context chunks\`;
          }

          if (message.metadata?.actionButtons && message.metadata.actionButtons.length > 0) {
            metaText += \` • \${message.metadata.actionButtons.length} action\${message.metadata.actionButtons.length > 1 ? 's' : ''} available\`;
          }

          metaDiv.textContent = metaText;
          messageDiv.appendChild(metaDiv);
        }

        return messageDiv;
      }

      // Simple markdown renderer
      function renderMarkdown(text) {
        return text
          // Code blocks
          .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
          // Inline code
          .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
          // Bold
          .replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>')
          // Italic
          .replace(/\\*([^\\*]+)\\*/g, '<em>$1</em>')
          // Links
          .replace(/\\[([^\\]]+)\\]\\(([^\\)]+)\\)/g, '<a href="$2" target="_blank">$1</a>')
          // Line breaks
          .replace(/\\n/g, '<br>');
      }

      // Set loading state
      function setLoadingState(isLoading) {
        chatState.isLoading = isLoading;

        if (isLoading) {
          loadingIndicator.classList.remove('hidden');
          statusIndicator.classList.add('loading');
          sendBtn.disabled = true;
        } else {
          loadingIndicator.classList.add('hidden');
          statusIndicator.classList.remove('loading');
          sendBtn.disabled = false;
        }

        updateSendButtonState();
        scrollToBottom();
      }

      // Update character count
      function updateCharCount(count) {
        charCount.textContent = \`\${count}/4000\`;

        if (count > 3800) {
          charCount.style.color = 'var(--error-color)';
        } else if (count > 3500) {
          charCount.style.color = 'var(--warning-color)';
        } else {
          charCount.style.color = 'var(--text-muted)';
        }
      }

      // Auto-resize textarea
      function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
      }

      // Update send button state
      function updateSendButtonState() {
        const hasContent = messageInput.value.trim().length > 0;
        const canSend = hasContent && !chatState.isLoading;

        sendBtn.disabled = !canSend;
        sendBtn.style.opacity = canSend ? '1' : '0.5';
      }

      // Scroll to bottom
      function scrollToBottom() {
        setTimeout(() => {
          const wrapper = document.querySelector('.messages-wrapper');
          wrapper.scrollTop = wrapper.scrollHeight;
        }, 100);
      }

      // Update theme
      function updateTheme(theme) {
        document.body.setAttribute('data-theme', theme);
      }

      // Show notification
      function showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = \`notification notification-\${type}\`;
        notification.textContent = message;
        notification.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 6px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        \`;

        document.body.appendChild(notification);

        setTimeout(() => {
          notification.remove();
        }, 3000);
      }

      // Generate unique ID
      function generateId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }

      // Render all messages
      function renderMessages() {
        messagesContainer.innerHTML = '';

        // Add welcome message
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'message system-message';
        welcomeDiv.innerHTML = \`
          <div class="message-content">
            <h3>👋 Welcome to Code Assistant AI!</h3>
            <p>I'm here to help you with your code. You can:</p>
            <ul>
              <li>Ask questions about your codebase</li>
              <li>Get code suggestions and explanations</li>
              <li>Attach files with 📎 or mention them with @</li>
              <li>Use <code>Ctrl+Enter</code> to send messages</li>
            </ul>
          </div>
        \`;
        messagesContainer.appendChild(welcomeDiv);

        // Add all messages
        chatState.messages.forEach(message => {
          const messageElement = createMessageElement(message);
          messagesContainer.appendChild(messageElement);
        });

        scrollToBottom();
      }

      // File attachment functions
      function addAttachedFiles(files) {
        chatState.attachedFiles.push(...files);
        renderAttachedFiles();
      }

      function renderAttachedFiles() {
        if (chatState.attachedFiles.length === 0) {
          attachedFilesContainer.classList.add('hidden');
          return;
        }

        attachedFilesContainer.classList.remove('hidden');
        attachedFilesContainer.innerHTML = '';

        chatState.attachedFiles.forEach((file, index) => {
          const fileDiv = document.createElement('div');
          fileDiv.className = 'attached-file';
          fileDiv.innerHTML = \`
            <span>📄 \${file.split('/').pop()}</span>
            <button class="remove-btn" onclick="removeAttachedFile(\${index})">×</button>
          \`;
          attachedFilesContainer.appendChild(fileDiv);
        });
      }

      function removeAttachedFile(index) {
        chatState.attachedFiles.splice(index, 1);
        renderAttachedFiles();
      }

      function clearAttachedFiles() {
        chatState.attachedFiles = [];
        renderAttachedFiles();
      }

      // Auto-complete functions
      function handleAutoComplete(value) {
        // Simple auto-complete logic
        if (value.endsWith('@')) {
          showFileSuggestions();
        } else if (value.includes('@') && !value.endsWith(' ')) {
          // Filter file suggestions based on input
          const query = value.split('@').pop().toLowerCase();
          // This would be enhanced with actual file suggestions
        } else {
          hideSuggestions();
        }
      }

      function showFileSuggestions() {
        // This would show actual file suggestions
        // For now, just show a placeholder
        suggestionsContainer.innerHTML = '<div class="suggestion-item">Type to search files...</div>';
        suggestionsContainer.classList.remove('hidden');
      }

      function hideSuggestions() {
        suggestionsContainer.classList.add('hidden');
      }

      function navigateSuggestions(direction) {
        // Navigate through suggestions with arrow keys
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        let selected = suggestionsContainer.querySelector('.suggestion-item.selected');

        if (!selected && direction === 1) {
          items[0]?.classList.add('selected');
        } else if (selected) {
          selected.classList.remove('selected');
          const index = Array.from(items).indexOf(selected);
          const newIndex = Math.max(0, Math.min(items.length - 1, index + direction));
          items[newIndex]?.classList.add('selected');
        }
      }

      function selectCurrentSuggestion() {
        const selected = suggestionsContainer.querySelector('.suggestion-item.selected');
        if (selected) {
          // Insert the selected suggestion
          const text = selected.textContent;
          insertFileReference(text, text);
          hideSuggestions();
        }
      }

      function insertFileReference(fileName, filePath) {
        const currentValue = messageInput.value;
        const atIndex = currentValue.lastIndexOf('@');

        if (atIndex !== -1) {
          const beforeAt = currentValue.substring(0, atIndex);
          const afterAt = currentValue.substring(messageInput.selectionStart);
          messageInput.value = beforeAt + '@' + fileName + ' ' + afterAt;
        } else {
          messageInput.value += '@' + fileName + ' ';
        }

        messageInput.focus();
        handleInputChange();
      }

      // Action Buttons JavaScript
      class ActionButtonsManager {
        constructor() {
          this.activeButtons = new Map();
          this.init();
        }

        init() {
          // Set up event delegation for button clicks
          document.addEventListener('click', (event) => {
            const button = event.target.closest('.action-button');
            if (button && !button.classList.contains('disabled')) {
              this.handleButtonClick(button);
            }
          });
        }

        handleButtonClick(buttonElement) {
          const buttonId = buttonElement.dataset.buttonId;
          const messageId = this.findMessageId(buttonElement);

          if (!buttonId || !messageId) {
            console.error('Missing button ID or message ID');
            return;
          }

          // Update button to loading state
          this.setButtonLoading(buttonElement, true);

          // Send message to extension
          vscode.postMessage({
            type: 'ACTION_BUTTON_CLICK',
            payload: { buttonId, messageId }
          });

          this.activeButtons.set(buttonId, buttonElement);
        }

        setButtonLoading(buttonElement, isLoading) {
          const statusElement = buttonElement.querySelector('.button-status');
          const iconElement = statusElement.querySelector('.status-icon');
          const textElement = statusElement.querySelector('.status-text');

          if (isLoading) {
            buttonElement.classList.add('loading', 'disabled');
            statusElement.className = 'button-status loading';
            iconElement.textContent = '⏳';
            textElement.textContent = 'Processing...';
          } else {
            buttonElement.classList.remove('loading', 'disabled');
            statusElement.className = 'button-status ready';
            iconElement.textContent = '⏳';
            textElement.textContent = 'Ready';
          }
        }

        findMessageId(buttonElement) {
          const messageElement = buttonElement.closest('.message');
          return messageElement ? messageElement.dataset.messageId : null;
        }

        static createActionButtonsHTML(buttons) {
          if (!buttons || buttons.length === 0) {
            return '';
          }

          const buttonElements = buttons.map(button =>
            ActionButtonsManager.createSingleButtonHTML(button)
          ).join('');

          return \`
            <div class="action-buttons-container">
              <div class="action-buttons-header">
                <span class="action-buttons-title">💡 Quick Actions</span>
                <span class="action-buttons-count">\${buttons.length} action\${buttons.length > 1 ? 's' : ''} available</span>
              </div>
              <div class="action-buttons-list">
                \${buttonElements}
              </div>
            </div>
          \`;
        }

        static createSingleButtonHTML(button) {
          const riskClass = \`risk-\${button.action.metadata.riskLevel}\`;
          const enabledClass = button.enabled ? 'enabled' : 'disabled';
          const confidencePercent = Math.round(button.action.metadata.confidence * 100);

          return \`
            <div class="action-button \${riskClass} \${enabledClass}"
                 data-button-id="\${button.id}"
                 title="\${button.tooltip}"
                 tabindex="0">
              <div class="button-main">
                <span class="button-icon">\${button.icon}</span>
                <span class="button-label">\${button.label}</span>
                <span class="button-confidence">\${confidencePercent}%</span>
              </div>
              <div class="button-details">
                <span class="button-risk">\${ActionButtonsManager.getRiskText(button.action.metadata.riskLevel)}</span>
                <span class="button-impact">\${button.action.metadata.estimatedImpact}</span>
              </div>
              <div class="button-status" id="status-\${button.id}">
                <span class="status-icon">⏳</span>
                <span class="status-text">Ready</span>
              </div>
            </div>
          \`;
        }

        static getRiskText(riskLevel) {
          switch (riskLevel) {
            case 'low': return '🟢 Low Risk';
            case 'medium': return '🟡 Medium Risk';
            case 'high': return '🟠 High Risk';
            case 'critical': return '🔴 Critical Risk';
            default: return '⚪ Unknown Risk';
          }
        }
      }

      // Initialize action buttons manager
      window.actionButtonsManager = new ActionButtonsManager();

      // Initialize auto-complete
      window.removeAttachedFile = removeAttachedFile;
    `;
  }
}
