import * as vscode from 'vscode';
import { AuthenticationManager } from './auth/authenticationManager';
import { AuthenticationException, IClaudeApiResponse } from './auth/types';

export class ClaudeClient {
  private authManager: AuthenticationManager;

  constructor(context: vscode.ExtensionContext) {
    this.authManager = new AuthenticationManager(context);
  }

  /**
   * Initialize the Claude client
   */
  async initialize(): Promise<void> {
    await this.authManager.initialize();
  }

  /**
   * Get completion from Claude API with enhanced context
   * @param query User query
   * @param enhancedContext Enhanced context with code and editor info
   * @returns Claude's response
   */
  async getCompletion(query: string, enhancedContext: any): Promise<string> {
    try {
      const apiKey = await this.authManager.getValidApiKey();

      const messages = this.buildMessages(query, enhancedContext);
      const response = await this.callClaudeApi(apiKey, messages);

      return this.extractContentFromResponse(response);

    } catch (error) {
      if (error instanceof AuthenticationException) {
        // Handle authentication errors gracefully
        vscode.window.showErrorMessage(
          `Authentication error: ${error.message}`,
          'Configure API Key'
        ).then((selection: string | undefined) => {
          if (selection === 'Configure API Key') {
            vscode.commands.executeCommand('codeAssist.configureApiKey');
          }
        });
        throw error;
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Claude API error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  /**
   * Test the connection to Claude API
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const apiKey = await this.authManager.getValidApiKey();

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build messages array for Claude API
   * @param query User query
   * @param enhancedContext Context information
   * @returns Messages array
   */
  private buildMessages(query: string, enhancedContext: any): Array<{role: string, content: string}> {
    const messages: Array<{role: string, content: string}> = [];

    // Add system context if available
    if (enhancedContext.codeContext && enhancedContext.codeContext.length > 0) {
      const contextMessage = `Here is relevant code context:\n\n${enhancedContext.codeContext.join('\n\n')}`;
      messages.push({ role: 'user', content: contextMessage });
    }

    // Add current editor context if available
    if (enhancedContext.currentEditor) {
      const editorMessage = `Current file: ${enhancedContext.currentEditor.fileName}\nSelected text: ${enhancedContext.currentEditor.selectedText || 'None'}`;
      messages.push({ role: 'user', content: editorMessage });
    }

    // Add the main query
    messages.push({ role: 'user', content: query });

    return messages;
  }

  /**
   * Make API call to Claude
   * @param apiKey API key
   * @param messages Messages array
   * @returns API response
   */
  private async callClaudeApi(apiKey: string, messages: any[]): Promise<IClaudeApiResponse> {
    const config = vscode.workspace.getConfiguration('codeAssist');
    const maxTokens = config.get<number>('maxContextLength') || 10000;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: Math.min(maxTokens, 4096),
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Extract content from Claude API response
   * @param response API response
   * @returns Extracted content
   */
  private extractContentFromResponse(response: IClaudeApiResponse): string {
    if (response.content && Array.isArray(response.content)) {
      return response.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }

    if (typeof response.content === 'string') {
      return response.content;
    }

    return 'No response content received from Claude API';
  }

  /**
   * Get authentication manager instance
   * @returns Authentication manager
   */
  getAuthManager(): AuthenticationManager {
    return this.authManager;
  }
}