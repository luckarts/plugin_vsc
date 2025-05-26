/**
 * Types and interfaces for authentication module
 */
export interface IApiKeyValidationResult {
    isValid: boolean;
    error?: string;
    details?: {
        keyFormat: boolean;
        apiConnection: boolean;
        permissions: boolean;
    };
}
export interface IAuthenticationConfig {
    useEnvironmentVariable: boolean;
    environmentVariableName: string;
    autoValidateApiKey: boolean;
    apiKeyValidationTimeout: number;
}
export interface ISecretManager {
    storeApiKey(apiKey: string): Promise<void>;
    getApiKey(): Promise<string | undefined>;
    deleteApiKey(): Promise<void>;
    hasApiKey(): Promise<boolean>;
}
export interface IApiKeyValidator {
    validateApiKey(apiKey: string): Promise<IApiKeyValidationResult>;
    testConnection(apiKey: string): Promise<boolean>;
}
export interface IAuthenticationManager {
    initialize(): Promise<void>;
    getValidApiKey(): Promise<string>;
    configureApiKey(): Promise<boolean>;
    validateCurrentApiKey(): Promise<IApiKeyValidationResult>;
    revokeApiKey(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
}
export declare enum AuthenticationError {
    NO_API_KEY = "NO_API_KEY",
    INVALID_API_KEY = "INVALID_API_KEY",
    VALIDATION_TIMEOUT = "VALIDATION_TIMEOUT",
    NETWORK_ERROR = "NETWORK_ERROR",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export declare class AuthenticationException extends Error {
    readonly errorType: AuthenticationError;
    readonly details?: any | undefined;
    constructor(errorType: AuthenticationError, message: string, details?: any | undefined);
}
export interface IClaudeApiResponse {
    id?: string;
    type?: string;
    role?: string;
    content?: any;
    model?: string;
    stop_reason?: string;
    stop_sequence?: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}
export interface IApiKeySource {
    type: 'environment' | 'secure_storage' | 'configuration';
    value: string;
    isValid: boolean;
}
//# sourceMappingURL=types.d.ts.map