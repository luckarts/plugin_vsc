import * as vscode from 'vscode';
import { IApiKeyValidator, IApiKeyValidationResult, AuthenticationError, AuthenticationException } from './types';

/**
 * Validates Claude API keys by testing format and connectivity
 */
export class ApiKeyValidator implements IApiKeyValidator {
  private readonly timeout: number;

  constructor() {
    const config = vscode.workspace.getConfiguration('codeAssist');
    this.timeout = config.get<number>('apiKeyValidationTimeout') || 10000;
  }

  /**
   * Validates the format and functionality of a Claude API key
   * @param apiKey The API key to validate
   * @returns Validation result with details
   */
  async validateApiKey(apiKey: string): Promise<IApiKeyValidationResult> {
    const result: IApiKeyValidationResult = {
      isValid: false,
      details: {
        keyFormat: false,
        apiConnection: false,
        permissions: false
      }
    };

    try {
      // Step 1: Validate key format
      result.details!.keyFormat = this.validateKeyFormat(apiKey);
      if (!result.details!.keyFormat) {
        result.error = 'Invalid API key format. Claude API keys should start with "sk-ant-"';
        return result;
      }

      // Step 2: Test API connection
      result.details!.apiConnection = await this.testConnection(apiKey);
      if (!result.details!.apiConnection) {
        result.error = 'Unable to connect to Claude API. Please check your internet connection and API key.';
        return result;
      }

      // Step 3: Test permissions (basic API call)
      result.details!.permissions = await this.testPermissions(apiKey);
      if (!result.details!.permissions) {
        result.error = 'API key does not have sufficient permissions or has been revoked.';
        return result;
      }

      result.isValid = true;
      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown validation error';
      return result;
    }
  }

  /**
   * Test basic connectivity to Claude API
   * @param apiKey The API key to test
   * @returns True if connection successful
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Even if the request fails, if we get a response, the connection works
      return response.status !== 0;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AuthenticationException(
          AuthenticationError.VALIDATION_TIMEOUT,
          'API key validation timed out'
        );
      }
      return false;
    }
  }

  /**
   * Validate the format of the API key
   * @param apiKey The API key to validate
   * @returns True if format is valid
   */
  private validateKeyFormat(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    const trimmedKey = apiKey.trim();
    
    // Claude API keys typically start with "sk-ant-" and have a specific length
    return trimmedKey.startsWith('sk-ant-') && trimmedKey.length > 20;
  }

  /**
   * Test if the API key has necessary permissions
   * @param apiKey The API key to test
   * @returns True if permissions are sufficient
   */
  private async testPermissions(apiKey: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for successful response or expected error codes
      return response.status === 200 || response.status === 400; // 400 might be rate limit or quota

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AuthenticationException(
          AuthenticationError.VALIDATION_TIMEOUT,
          'Permission test timed out'
        );
      }
      return false;
    }
  }

  /**
   * Get user-friendly error message for validation failures
   * @param result The validation result
   * @returns User-friendly error message
   */
  static getValidationErrorMessage(result: IApiKeyValidationResult): string {
    if (result.isValid) {
      return 'API key is valid';
    }

    if (!result.details?.keyFormat) {
      return 'Invalid API key format. Please ensure you have copied the complete key from Anthropic.';
    }

    if (!result.details?.apiConnection) {
      return 'Cannot connect to Claude API. Please check your internet connection.';
    }

    if (!result.details?.permissions) {
      return 'API key lacks necessary permissions or may be expired. Please check your Anthropic account.';
    }

    return result.error || 'Unknown validation error';
  }
}
