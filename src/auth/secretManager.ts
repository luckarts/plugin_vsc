import * as vscode from 'vscode';
import { ISecretManager } from './types';

/**
 * Secure secret manager using VSCode's SecretStorage API
 * Provides secure storage for Claude API keys
 */
export class SecretManager implements ISecretManager {
  private static readonly API_KEY_SECRET_ID = 'codeAssist.claudeApiKey';
  private readonly secretStorage: vscode.SecretStorage;

  constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /**
   * Securely store the Claude API key
   * @param apiKey The API key to store
   */
  async storeApiKey(apiKey: string): Promise<void> {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key provided');
    }

    try {
      await this.secretStorage.store(SecretManager.API_KEY_SECRET_ID, apiKey.trim());
      vscode.window.showInformationMessage('Claude API key stored securely');
    } catch (error) {
      const errorMessage = `Failed to store API key: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Retrieve the stored Claude API key
   * @returns The stored API key or undefined if not found
   */
  async getApiKey(): Promise<string | undefined> {
    try {
      const apiKey = await this.secretStorage.get(SecretManager.API_KEY_SECRET_ID);
      return apiKey?.trim();
    } catch (error) {
      const errorMessage = `Failed to retrieve API key: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      return undefined;
    }
  }

  /**
   * Delete the stored Claude API key
   */
  async deleteApiKey(): Promise<void> {
    try {
      await this.secretStorage.delete(SecretManager.API_KEY_SECRET_ID);
      vscode.window.showInformationMessage('Claude API key removed from secure storage');
    } catch (error) {
      const errorMessage = `Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if an API key is stored
   * @returns True if an API key exists in storage
   */
  async hasApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      return !!apiKey && apiKey.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API key from environment variable
   * @param variableName Name of the environment variable
   * @returns The API key from environment or undefined
   */
  getApiKeyFromEnvironment(variableName: string = 'CLAUDE_API_KEY'): string | undefined {
    const apiKey = process.env[variableName];
    return apiKey?.trim();
  }

  /**
   * Migrate API key from configuration to secure storage
   * This helps users transition from the old insecure storage method
   */
  async migrateFromConfiguration(): Promise<boolean> {
    try {
      const config = vscode.workspace.getConfiguration('codeAssist');
      const configApiKey = config.get<string>('claudeApiKey');
      
      if (configApiKey && configApiKey.trim().length > 0) {
        // Store in secure storage
        await this.storeApiKey(configApiKey);
        
        // Clear from configuration
        await config.update('claudeApiKey', '', vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
          'API key migrated to secure storage. The key has been removed from your settings.'
        );
        return true;
      }
      return false;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to migrate API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }
}
