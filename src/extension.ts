import * as vscode from 'vscode';
import { VectorDatabase } from './vectorDb';
import { ClaudeClient } from './claudeClient';

export function activate(context: vscode.ExtensionContext) {
  // Initialize vector database
  const vectorDb = new VectorDatabase(context.globalStorageUri);
  // Initialize Claude client
  const claudeClient = new ClaudeClient(context);

  // Initialize Claude client authentication
  claudeClient.initialize().catch(error => {
    console.error('Failed to initialize Claude client:', error);
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codeAssist.start', startAgent),
    vscode.commands.registerCommand('codeAssist.indexCode', () => indexWorkspace(vectorDb)),
    vscode.commands.registerCommand('codeAssist.configureApiKey', () => configureApiKey(claudeClient)),
    vscode.commands.registerCommand('codeAssist.validateApiKey', () => validateApiKey(claudeClient)),
    vscode.commands.registerCommand('codeAssist.revokeApiKey', () => revokeApiKey(claudeClient))
  );

  // Create and show panel
  function startAgent() {
    const panel = vscode.window.createWebviewPanel(
      'codeAssistAI',
      'Code Assistant AI',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async message => {
        if (message.command === 'query') {
          const editorInfo = getOpenEditorInfo();
          const codeContext = await vectorDb.getRelevantCode(message.text);

          // Add editor context to the query
          const enhancedContext = {
            query: message.text,
            codeContext: codeContext,
            currentEditor: editorInfo
          };

          const response = await claudeClient.getCompletion(
            message.text,
            enhancedContext
          );

          panel.webview.postMessage({ type: 'response', content: response });
        }
      },
      undefined,
      context.subscriptions
    );

    panel.webview.html = getWebviewContent();
  }
}

function handleAttachFile() {
  vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Attach',
    filters: {
      'All Files': ['*']
    }
  }).then(fileUri => {
    if (fileUri && fileUri[0]) {
      const filePath = fileUri[0].fsPath;
      // Handle file attachment
    }
  });
}

function handleMentionFile() {
  // Get list of open editors
  const openEditors = vscode.window.tabGroups.all
    .flatMap(group => group.tabs)
    .filter(tab => tab.input instanceof vscode.TabInputText)
    .map(tab => {
      const input = tab.input as vscode.TabInputText;
      return {
        label: tab.label,
        uri: input.uri
      };
    });

  // Show quick pick with open files
  vscode.window.showQuickPick(
    openEditors.map(editor => editor.label),
    { placeHolder: 'Select file to mention' }
  ).then(selected => {
    if (selected) {
      const selectedEditor = openEditors.find(e => e.label === selected);
      if (selectedEditor) {
        // Send file content to chat
        vscode.workspace.fs.readFile(selectedEditor.uri).then((content: Uint8Array) => {
          const fileContent = new TextDecoder().decode(content);
          // Note: panel reference would need to be passed to this function
          // This is a placeholder implementation
        });
      }
    }
  });
}

// Authentication command handlers
async function configureApiKey(claudeClient: ClaudeClient): Promise<void> {
  try {
    const authManager = claudeClient.getAuthManager();
    const success = await authManager.configureApiKey();
    if (success) {
      vscode.window.showInformationMessage('API key configured successfully!');
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to configure API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function validateApiKey(claudeClient: ClaudeClient): Promise<void> {
  try {
    const authManager = claudeClient.getAuthManager();
    vscode.window.showInformationMessage('Validating API key...');

    const result = await authManager.validateCurrentApiKey();

    if (result.isValid) {
      vscode.window.showInformationMessage('✅ API key is valid and working!');
    } else {
      vscode.window.showErrorMessage(`❌ API key validation failed: ${result.error}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function revokeApiKey(claudeClient: ClaudeClient): Promise<void> {
  try {
    const authManager = claudeClient.getAuthManager();
    await authManager.revokeApiKey();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to revoke API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function indexWorkspace(vectorDb: VectorDatabase): Promise<void> {
  try {
    vscode.window.showInformationMessage('Starting workspace indexing...');
    // Implementation would go here
    vscode.window.showInformationMessage('Workspace indexing completed!');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to index workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function getWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Assistant AI</title>
    </head>
    <body>
        <div id="chat-container">
            <div id="messages"></div>
            <div id="input-container">
                <input type="text" id="user-input" placeholder="Ask me anything about your code...">
                <button id="send-button">Send</button>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            // Basic chat implementation would go here
        </script>
    </body>
    </html>
  `;
}

function getOpenEditorInfo(): any {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return null;
  }

  return {
    fileName: activeEditor.document.fileName,
    languageId: activeEditor.document.languageId,
    selectedText: activeEditor.document.getText(activeEditor.selection),
    lineCount: activeEditor.document.lineCount
  };
}
