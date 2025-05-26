import * as vscode from 'vscode';

export class ClaudeClient {
  private apiKey: string | undefined;
  
  constructor() {
    this.apiKey = vscode.workspace.getConfiguration('codeAssist').get('claudeApiKey');
  }
  
  async getCompletion(query: string, codeContext: string[]): Promise<string> {
    if (!this.apiKey) {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your Claude API key',
        password: true
      });
      
      if (key) {
        this.apiKey = key;
        await vscode.workspace.getConfiguration('codeAssist').update('claudeApiKey', key, true);
      } else {
        throw new Error('API key required');
      }
    }
    
    // API call to Claude with context
    // ...
  }
}