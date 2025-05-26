import * as vscode from 'vscode';
import { IAuthenticationManager, IApiKeyValidationResult } from './types';
/**
 * Main authentication manager for Claude API
 * Handles API key configuration, validation, and management
 */
export declare class AuthenticationManager implements IAuthenticationManager {
    private readonly secretManager;
    private readonly validator;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize the authentication manager
     */
    initialize(): Promise<void>;
    /**
     * Get a valid API key, prompting user if necessary
     * @returns A valid API key
     */
    getValidApiKey(): Promise<string>;
    /**
     * Configure API key through user interface
     * @returns True if configuration was successful
     */
    configureApiKey(): Promise<boolean>;
    /**
     * Validate the currently configured API key
     * @returns Validation result
     */
    validateCurrentApiKey(): Promise<IApiKeyValidationResult>;
    /**
     * Revoke the current API key
     */
    revokeApiKey(): Promise<void>;
    /**
     * Check if user is authenticated with a valid API key
     * @returns True if authenticated
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Get API key from the configured source
     * @returns API key source information
     */
    private getApiKeySource;
    /**
     * Configure API key manually through input box
     */
    private configureApiKeyManually;
    /**
     * Configure to use environment variable
     */
    private configureEnvironmentVariable;
    /**
     * Load current authentication configuration
     */
    private loadConfiguration;
}
//# sourceMappingURL=authenticationManager.d.ts.map