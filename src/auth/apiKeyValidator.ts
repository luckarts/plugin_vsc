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

      // Step 1: Validate key format (remains the same)
      result.details!.keyFormat = this.validateKeyFormat(apiKey);
      if (!result.details!.keyFormat) {
        result.error = 'Invalid API key format. Claude API keys should start with "sk-ant-"';
        // No need to set errorType here as keyFormat failure is specific enough
        return result;
      }

      // Step 2: Test API permissions and connection (primary validation)
      const permissionResult = await this.testPermissions(apiKey);
      
      result.details = { ...result.details, ...permissionResult.details };
      result.error = permissionResult.error; // Overwrite error if permission test provides one

      if (!permissionResult.isValid) {
        // isValid will be false if any check in testPermissions fails
        return result;
      }
      
      // If testPermissions is successful, all checks have passed
      result.isValid = true;
      // Clear any intermediate error messages if validation is ultimately successful
      if (result.isValid) {
        result.error = undefined;
      }
      return result;

    } catch (error) {
      // This catch block might handle unexpected errors during the orchestration
      // or errors from validateKeyFormat if it were to throw.
      result.error = error instanceof Error ? error.message : 'Unknown validation error';
      if (error instanceof AuthenticationException) {
        result.details!.errorType = this.mapAuthErrorToErrorType(error.errorType);
      } else {
        result.details!.errorType = 'unknown';
      }
      return result;
    }
  }

  /**
   * Test basic network reachability.
   * This is a quick check. More detailed validation happens in testPermissions.
   * @param apiKey (unused, but kept for interface consistency if needed later)
   * @returns True if the Anthropic API domain is reachable.
   */
  async testConnection(_apiKey: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout / 2); // Shorter timeout for a quick check

      // Using a HEAD request to a known Anthropic endpoint (e.g., base API URL or docs)
      // For this example, let's assume a HEAD request to the messages endpoint is light enough.
      // If not, a more suitable, lightweight endpoint should be identified.
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'HEAD', // Using HEAD to be lighter, assuming server supports it for this path
        headers: {
          // Minimal headers for a reachability test
          'anthropic-version': '2023-06-01'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.status !== 0; // Any response means the server is reachable
    } catch (error) {
      // Network errors (DNS, connection refused, etc.) or AbortError (timeout)
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
    return trimmedKey.startsWith('sk-ant-') && trimmedKey.length > 20;
  }

  /**
   * Test if the API key has necessary permissions and handles various API responses.
   * @param apiKey The API key to test
   * @returns IApiKeyValidationResult with detailed success/failure information.
   */
  private async testPermissions(apiKey: string): Promise<IApiKeyValidationResult> {
    const result: IApiKeyValidationResult = {
      isValid: false,
      details: {
        apiConnection: false,
        authentication: false,
        permissions: false,
        errorType: 'unknown',
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeout);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229', // Or a more lightweight model if available
          max_tokens: 1, // Minimal tokens for a test
          messages: [{ role: 'user', content: 'test' }] // Minimal valid payload
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      result.details!.statusCode = response.status;
      result.details!.apiConnection = true; // If we got a response, connection is true

      if (response.status === 200) {
        result.isValid = true;
        result.details!.authentication = true;
        result.details!.permissions = true;
        result.error = undefined; // Clear error on success
      } else if (response.status === 401 || response.status === 403) {
        result.error = 'API key is invalid, revoked, or lacks permissions.';
        result.details!.authentication = false; // Key not accepted
        result.details!.permissions = false;
        result.details!.errorType = 'auth';
      } else if (response.status === 400) {
        result.error = 'Bad request. Check model access, account quota, or request format.';
        result.details!.authentication = true; // Key was likely fine, but request was bad
        result.details!.permissions = false;
        result.details!.errorType = 'badrequest';
      } else if (response.status === 429) {
        result.error = 'Rate limit exceeded or quota issue. Please try again later or check your Anthropic plan.';
        result.details!.authentication = true; // Key is fine
        result.details!.permissions = false; // But cannot perform action now
        result.details!.errorType = 'ratelimit';
      } else if (response.status >= 500) {
        result.error = 'Anthropic API server error. Please try again later.';
        result.details!.authentication = true; // Assume key is fine, server issue
        result.details!.permissions = false;
        result.details!.errorType = 'server';
      } else {
        result.error = `Unexpected API response status: ${response.status}.`;
        result.details!.errorType = 'unknown';
      }
    } catch (error) {
      result.details!.apiConnection = false; // Network or other fetch-level error
      if (error instanceof Error && error.name === 'AbortError') {
        result.error = 'API request timed out.';
        result.details!.errorType = 'timeout';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        // This can catch network errors like DNS resolution failure, host unreachable
        result.error = 'Network error: Unable to reach Anthropic API.';
        result.details!.errorType = 'network';
      }
      else {
        result.error = 'Failed to test permissions due to an unexpected error.';
        result.details!.errorType = 'unknown';
        if (error instanceof AuthenticationException) { // Propagate if it's already one of ours
            throw error;
        }
      }
    }
    return result;
  }
  
  private mapAuthErrorToErrorType(authError: AuthenticationError): IApiKeyValidationResult['details']['errorType'] {
    switch (authError) {
      case AuthenticationError.VALIDATION_TIMEOUT:
        return 'timeout';
      case AuthenticationError.NETWORK_ERROR:
        return 'network';
      case AuthenticationError.PERMISSION_DENIED:
      case AuthenticationError.INVALID_API_KEY: // map invalid key to auth error type
        return 'auth';
      default:
        return 'unknown';
    }
  }

  /**
   * Get user-friendly error message for validation failures
   * @param result The validation result
   * @returns User-friendly error message
   */
  static getValidationErrorMessage(result: IApiKeyValidationResult): string {
    if (result.isValid) {
      return 'API key is valid and has necessary permissions.';
    }

    // Order of checks matters for providing the most relevant error message.
    if (!result.details?.keyFormat) {
      return result.error || 'Invalid API key format. Ensure it starts with "sk-ant-" and is copied correctly.';
    }

    // Specific error types from testPermissions
    if (result.details?.errorType) {
      switch (result.details.errorType) {
        case 'network':
          return result.error || 'Network error: Unable to connect to Anthropic API. Please check your internet connection.';
        case 'timeout':
          return result.error || 'API request timed out. Please check your internet connection or try again later.';
        case 'auth':
          return result.error || 'Authentication failed: The API key is invalid, revoked, or not authorized. Please check your key and Anthropic account.';
        case 'permission': // Should ideally be covered by 'auth' or a successful (200) 'permissions: true'
          return result.error || 'Permission denied: The API key may lack specific permissions for this operation.';
        case 'ratelimit':
          return result.error || 'Rate limit exceeded or quota issue. Please check your Anthropic plan or try again later.';
        case 'server':
          return result.error || 'Anthropic API server error. Please try again later.';
        case 'badrequest':
          return result.error || 'Bad request: There might be an issue with the request configuration, model access, or your account quota. Please check Anthropic dashboard.';
        case 'unknown':
          return result.error || 'An unknown error occurred during API key validation.';
      }
    }
    
    // Fallback messages based on boolean flags, though errorType should be more specific.
    if (result.details?.apiConnection === false) { // Explicitly check for false, as undefined means not checked or irrelevant
      return 'Cannot connect to Claude API. Please check your internet connection.';
    }

    if (result.details?.authentication === false) {
      return 'API key authentication failed. It might be invalid or revoked.';
    }
    
    if (result.details?.permissions === false) {
      // This message might be too generic if errorType has already provided a specific one.
      // Consider if this is still needed or if errorType covers all permission-like issues.
      return 'API key seems valid but lacks permissions for the test operation, or another issue occurred (e.g. rate limit, server error).';
    }

    return result.error || 'Unknown validation error. Please check the logs for more details.';
  }
}
