import * as vscode from 'vscode';

/**
 * Legacy MemoryManager for conversation history
 * @deprecated Use the new intelligent memory system in src/memory/
 */
export class LegacyMemoryManager {
  private conversationHistory: Array<{role: string, content: string}> = [];
  private storageUri: vscode.Uri;

  constructor(globalStorageUri: vscode.Uri) {
    this.storageUri = vscode.Uri.joinPath(globalStorageUri, 'conversations');
    this.initStorage();
  }

  private async initStorage() {
    try {
      await vscode.workspace.fs.stat(this.storageUri);
    } catch {
      await vscode.workspace.fs.createDirectory(this.storageUri);
    }
  }

  addMessage(role: 'user' | 'assistant', content: string) {
    this.conversationHistory.push({ role, content });
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  async saveConversation(name: string) {
    const conversationUri = vscode.Uri.joinPath(this.storageUri, `${name}.json`);
    const data = JSON.stringify(this.conversationHistory, null, 2);
    await vscode.workspace.fs.writeFile(
      conversationUri,
      new TextEncoder().encode(data)
    );
  }

  async loadConversation(name: string) {
    const conversationUri = vscode.Uri.joinPath(this.storageUri, `${name}.json`);
    try {
      const data = await vscode.workspace.fs.readFile(conversationUri);
      this.conversationHistory = JSON.parse(new TextDecoder().decode(data));
      return this.conversationHistory;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load conversation: ${error}`);
      return [];
    }
  }

  clearConversation() {
    this.conversationHistory = [];
  }
}

// Re-export for backward compatibility
export const MemoryManager = LegacyMemoryManager;