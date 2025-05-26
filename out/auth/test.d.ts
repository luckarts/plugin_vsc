/**
 * Test file for authentication module
 * This file can be used to manually test authentication functionality
 */
import * as vscode from 'vscode';
/**
 * Test the authentication module functionality
 * This function can be called from the extension for testing purposes
 */
export declare function testAuthenticationModule(context: vscode.ExtensionContext): Promise<void>;
/**
 * Test API key validation with a real key
 * This should only be called with a valid API key for testing
 */
export declare function testApiKeyValidation(apiKey: string): Promise<void>;
/**
 * Test the complete authentication flow
 */
export declare function testAuthenticationFlow(context: vscode.ExtensionContext): Promise<void>;
/**
 * Register test commands for manual testing
 */
export declare function registerTestCommands(context: vscode.ExtensionContext): void;
//# sourceMappingURL=test.d.ts.map