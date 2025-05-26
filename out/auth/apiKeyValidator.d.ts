import { IApiKeyValidator, IApiKeyValidationResult } from './types';
/**
 * Validates Claude API keys by testing format and connectivity
 */
export declare class ApiKeyValidator implements IApiKeyValidator {
    private readonly timeout;
    constructor();
    /**
     * Validates the format and functionality of a Claude API key
     * @param apiKey The API key to validate
     * @returns Validation result with details
     */
    validateApiKey(apiKey: string): Promise<IApiKeyValidationResult>;
    /**
     * Test basic connectivity to Claude API
     * @param apiKey The API key to test
     * @returns True if connection successful
     */
    testConnection(apiKey: string): Promise<boolean>;
    /**
     * Validate the format of the API key
     * @param apiKey The API key to validate
     * @returns True if format is valid
     */
    private validateKeyFormat;
    /**
     * Test if the API key has necessary permissions
     * @param apiKey The API key to test
     * @returns True if permissions are sufficient
     */
    private testPermissions;
    /**
     * Get user-friendly error message for validation failures
     * @param result The validation result
     * @returns User-friendly error message
     */
    static getValidationErrorMessage(result: IApiKeyValidationResult): string;
}
//# sourceMappingURL=apiKeyValidator.d.ts.map