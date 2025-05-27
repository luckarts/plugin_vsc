import { ApiKeyValidator } from './apiKeyValidator';
import { IApiKeyValidationResult, AuthenticationError } from './types'; // Assuming AuthenticationError might be useful for some mock errors
import * as vscode from 'vscode';

// Mock global fetch
global.fetch = jest.fn();

// Mock vscode.workspace.getConfiguration
// jest.spyOn(vscode.workspace, 'getConfiguration') is problematic if vscode is not fully mocked.
// A simpler approach for this context is to mock the parts of vscode we need.
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
  },
  // Mock other vscode APIs if they were used by the class, e.g. window for showInformationMessage
}));


describe('ApiKeyValidator', () => {
  let validator: ApiKeyValidator;
  const mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    (global.fetch as jest.Mock).mockReset();
    mockGetConfiguration.mockReset();

    // Default mock implementation for getConfiguration
    mockGetConfiguration.mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === 'apiKeyValidationTimeout') {
          return 500; // Use a short, controllable timeout for tests
        }
        return undefined;
      }),
      update: jest.fn(), // Mock other methods if used
      has: jest.fn(), // Mock other methods if used
      inspect: jest.fn(), // Mock other methods if used
    });

    validator = new ApiKeyValidator();
  });

  describe('validateKeyFormat', () => {
    // Test cases for validateKeyFormat will go here
    it('should return true for a valid API key format', () => {
      // Access private method for testing - common in Jest but might need ts-ignore or helper
      // For simplicity, we'll assume direct testing of private methods is acceptable here or refactor if needed
      // If direct private access is an issue, test via validateApiKey focusing on keyFormat detail
      const result = (validator as any).validateKeyFormat('sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
      expect(result).toBe(true);
    });

    it('should return false for an invalid prefix', () => {
      const result = (validator as any).validateKeyFormat('pk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxx');
      expect(result).toBe(false);
    });

    it('should return false for a key that is too short', () => {
      const result = (validator as any).validateKeyFormat('sk-ant-short');
      expect(result).toBe(false);
    });

    it('should return false for an empty string', () => {
      const result = (validator as any).validateKeyFormat('');
      expect(result).toBe(false);
    });
    
    it('should return false for a null key', () => {
      const result = (validator as any).validateKeyFormat(null as any);
      expect(result).toBe(false);
    });

    it('should return false for an undefined key', () => {
      const result = (validator as any).validateKeyFormat(undefined as any);
      expect(result).toBe(false);
    });
  });

  describe('validateApiKey', () => {
    const validKey = 'sk-ant-validkey123456789012345678901234567890';

    it('should validate a correct API key successfully with HTTP 200', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}), // Mock JSON response
      });

      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(true);
      expect(result.details?.keyFormat).toBe(true);
      expect(result.details?.apiConnection).toBe(true);
      expect(result.details?.authentication).toBe(true);
      expect(result.details?.permissions).toBe(true);
      expect(result.details?.statusCode).toBe(200);
      expect(result.error).toBeUndefined();
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('API key is valid and has necessary permissions.');
    });

    it('should handle HTTP 401 Unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API Key' } }),
      });
      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(true);
      expect(result.details?.apiConnection).toBe(true);
      expect(result.details?.authentication).toBe(false);
      expect(result.details?.permissions).toBe(false);
      expect(result.details?.statusCode).toBe(401);
      expect(result.details?.errorType).toBe('auth');
      expect(result.error).toBe('API key is invalid, revoked, or lacks permissions.');
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Authentication failed: The API key is invalid, revoked, or not authorized. Please check your key and Anthropic account.');
    });

    it('should handle HTTP 403 Forbidden', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Forbidden' } }),
      });
      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(true);
      expect(result.details?.apiConnection).toBe(true);
      expect(result.details?.authentication).toBe(false);
      expect(result.details?.permissions).toBe(false);
      expect(result.details?.statusCode).toBe(403);
      expect(result.details?.errorType).toBe('auth');
      expect(result.error).toBe('API key is invalid, revoked, or lacks permissions.');
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Authentication failed: The API key is invalid, revoked, or not authorized. Please check your key and Anthropic account.');
    });
    
    it('should handle HTTP 400 Bad Request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Bad Request' } }),
      });
      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(true);
      expect(result.details?.apiConnection).toBe(true);
      expect(result.details?.authentication).toBe(true); // Key itself not rejected
      expect(result.details?.permissions).toBe(false);
      expect(result.details?.statusCode).toBe(400);
      expect(result.details?.errorType).toBe('badrequest');
      expect(result.error).toBe('Bad request. Check model access, account quota, or request format.');
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Bad request: There might be an issue with the request configuration, model access, or your account quota. Please check Anthropic dashboard.');
    });

    it('should handle HTTP 429 Too Many Requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });
      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(true);
      expect(result.details?.apiConnection).toBe(true);
      expect(result.details?.authentication).toBe(true); // Key itself not rejected
      expect(result.details?.permissions).toBe(false);
      expect(result.details?.statusCode).toBe(429);
      expect(result.details?.errorType).toBe('ratelimit');
      expect(result.error).toBe('Rate limit exceeded or quota issue. Please try again later or check your Anthropic plan.');
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Rate limit exceeded or quota issue. Please check your Anthropic plan or try again later.');
    });

    it('should handle HTTP 500 Internal Server Error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server Error' } }),
      });
      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(true);
      expect(result.details?.apiConnection).toBe(true);
      expect(result.details?.authentication).toBe(true); // Key itself not rejected
      expect(result.details?.permissions).toBe(false);
      expect(result.details?.statusCode).toBe(500);
      expect(result.details?.errorType).toBe('server');
      expect(result.error).toBe('Anthropic API server error. Please try again later.');
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Anthropic API server error. Please try again later.');
    });

    it('should handle Network Error (fetch throws)', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));
      
      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(true); // Format check passes before fetch
      expect(result.details?.apiConnection).toBe(false);
      expect(result.details?.authentication).toBe(false);
      expect(result.details?.permissions).toBe(false);
      expect(result.details?.errorType).toBe('network');
      expect(result.error).toBe('Network error: Unable to reach Anthropic API.');
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Network error: Unable to connect to Anthropic API. Please check your internet connection.');
    });

    it('should handle Timeout (AbortError)', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_resolve, reject) => {
          setTimeout(() => {
            // Simulate AbortController behavior
            const error = new Error('The operation was aborted.');
            error.name = 'AbortError';
            reject(error);
          }, 600); // Longer than the 500ms timeout set in beforeEach
        });
      });

      const result = await validator.validateApiKey(validKey);
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(true);
      expect(result.details?.apiConnection).toBe(false);
      expect(result.details?.authentication).toBe(false);
      expect(result.details?.permissions).toBe(false);
      expect(result.details?.errorType).toBe('timeout');
      expect(result.error).toBe('API request timed out.');
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('API request timed out. Please check your internet connection or try again later.');
    });
    
    it('should handle invalid key format before attempting API call', async () => {
      const invalidFormatKey = "invalid-key";
      const result = await validator.validateApiKey(invalidFormatKey);
      
      expect(result.isValid).toBe(false);
      expect(result.details?.keyFormat).toBe(false);
      // apiConnection, authentication, permissions should be false or undefined as the call shouldn't proceed
      expect(result.details?.apiConnection).toBe(false); // Default value
      expect(result.details?.authentication).toBe(false); // Default value
      expect(result.details?.permissions).toBe(false); // Default value
      expect(result.error).toBe('Invalid API key format. Claude API keys should start with "sk-ant-"');
      expect((global.fetch as jest.Mock)).not.toHaveBeenCalled();
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Invalid API key format. Ensure it starts with "sk-ant-" and is copied correctly.');
    });
  });
  
  describe('getValidationErrorMessage', () => {
    // Basic cases are tested within validateApiKey tests. Add specific edge cases if any.
    it('should return default error for unknown error type if error message is also missing', () => {
        const result: IApiKeyValidationResult = {
            isValid: false,
            details: {
                keyFormat: true,
                apiConnection: true,
                authentication: true,
                permissions: false,
                errorType: 'unknown', // Unknown error type
            }
            // No specific error message
        };
        expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('An unknown error occurred during API key validation.');
    });

    it('should return provided error message even for unknown error type', () => {
        const result: IApiKeyValidationResult = {
            isValid: false,
            error: "A very specific custom error.",
            details: {
                keyFormat: true,
                apiConnection: true,
                authentication: true,
                permissions: false,
                errorType: 'unknown',
            }
        };
        expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('A very specific custom error.');
    });
    
    it('should return fallback message for apiConnection false if no errorType', () => {
       const result: IApiKeyValidationResult = {
            isValid: false,
            details: {
                keyFormat: true,
                apiConnection: false,
            }
        };
        expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Cannot connect to Claude API. Please check your internet connection.');
    });

    it('should return fallback message for authentication false if no errorType and apiConnection not explicitly false', () => {
       const result: IApiKeyValidationResult = {
            isValid: false,
            details: {
                keyFormat: true,
                apiConnection: undefined, // or true
                authentication: false,
            }
        };
        expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('API key authentication failed. It might be invalid or revoked.');
    });
    
    it('should return fallback message for permissions false if no specific errorType and other flags seem ok', () => {
       const result: IApiKeyValidationResult = {
            isValid: false,
            details: {
                keyFormat: true,
                apiConnection: true, 
                authentication: true,
                permissions: false,
                // No errorType
            }
        };
        // This scenario should ideally be covered by an errorType. If not, this is the fallback.
        expect(ApiKeyValidator.getValidationErrorMessage(result))
          .toBe('API key seems valid but lacks permissions for the test operation, or another issue occurred (e.g. rate limit, server error).');
    });

    it('should return generic fallback if no details and no error', () => {
      const result: IApiKeyValidationResult = {
        isValid: false,
      };
      expect(ApiKeyValidator.getValidationErrorMessage(result)).toBe('Unknown validation error. Please check the logs for more details.');
    });
  });
});
