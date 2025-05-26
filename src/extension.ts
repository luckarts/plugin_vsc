import * as vscode from 'vscode';
import { VectorDatabase } from './vectorDb';
import { ClaudeClient } from './claudeClient';

export function activate(context: vscode.ExtensionContext) {
  // Initialize vector database
  const vectorDb = new VectorDatabase(context.globalStorageUri);
  // Initialize Claude client
  const claudeClient = new ClaudeClient();
  
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codeAssist.start', startAgent),
    vscode.commands.registerCommand('codeAssist.indexCode', () => indexWorkspace(vectorDb))
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
        vscode.workspace.fs.readFile(selectedEditor.uri).then(content => {
          const fileContent = new TextDecoder().decode(content);
          panel.webview.postMessage({
            type: 'fileContent',
            name: selected,
            content: fileContent
          });
        });
      }
    }
  });
}

function getOpenEditorInfo() {
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
